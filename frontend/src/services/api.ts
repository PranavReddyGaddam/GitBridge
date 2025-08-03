// API service for GitBridge backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Debug: Log the API base URL
console.log('API_BASE_URL:', API_BASE_URL);

// Types for API requests and responses
export interface GeneratePodcastRequest {
  repo_url: string;
  duration_minutes: number;
  voice_settings?: {
    host_voice_id?: string;
    expert_voice_id?: string;
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface PodcastFiles {
  audio_file_path: string;
  script_file_path: string;
  metadata_file_path: string;
}

export interface PodcastMetadata {
  repo_name: string;
  repo_url: string;
  duration_minutes: number;
  total_words: number;
  estimated_cost: number;
  generation_timestamp: string;
  voice_settings: {
    host_voice_id?: string;
    expert_voice_id?: string;
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface GeneratePodcastResponse {
  success: boolean;
  cache_key: string;
  files: PodcastFiles;
  metadata: PodcastMetadata;
  generation_time_seconds: number;
  audio_url: string;
  script_url: string;
}

export interface StreamingPodcastResponse {
  segment_index: number;
  total_segments: number;
  progress: number;
  status: 'processing' | 'complete' | 'error' | 'segment_ready';
  message: string;
  cache_key?: string;
  audio_url?: string;
  script_url?: string;
  segment_url?: string;
  duration_ms?: number;
}

export interface PodcastCacheEntry {
  cache_key: string;
  repo_url: string;
  duration: number;
  voice_settings: {
    host_voice_id: string;
    expert_voice_id: string;
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  files: PodcastFiles;
  metadata: PodcastMetadata;
  created_at: string;
  last_accessed: string;
  access_count: number;
  repo_content_hash: string;
  estimated_cost: number;
}

// API Service Class
export class PodcastAPIService {
  
  /**
   * Generate a complete podcast from repository URL
   */
  static async generatePodcast(request: GeneratePodcastRequest): Promise<GeneratePodcastResponse> {
    const response = await fetch(`${API_BASE_URL}/api/generate-podcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate podcast with streaming progress updates
   */
  static async *generatePodcastStreaming(request: GeneratePodcastRequest): AsyncGenerator<StreamingPodcastResponse, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/api/generate-podcast-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as StreamingPodcastResponse;
              
              // Stop if complete or error
              if (data.status === 'complete' || data.status === 'error') {
                return;
              }
            } catch {
              console.warn('Failed to parse streaming data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get audio file URL for a podcast
   * Handles both local and S3/CDN URLs
   */
  static getPodcastAudioUrl(cacheKey: string): string {
    return `${API_BASE_URL}/api/podcast-audio/${cacheKey}`;
  }

  /**
   * Get direct file URL (for S3/CDN files)
   */
  static getDirectFileUrl(filePath: string, cacheKey?: string): string {
    // If it's already a full URL (S3/CDN), return as is
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    
    // If it's an S3 path, we need to get a presigned URL from the backend
    if (filePath.startsWith('s3://')) {
      // This will be handled by the backend API
      return `${API_BASE_URL}/api/file-url?path=${encodeURIComponent(filePath)}`;
    }
    
    // For local files, return the API endpoint
    if (cacheKey) {
      return `${API_BASE_URL}/api/podcast-audio/${cacheKey}`;
    }
    
    // Fallback for unknown file types
    return filePath;
  }

  /**
   * Get podcast script and captions
   */
  static async getPodcastScript(cacheKey: string): Promise<{
    cache_key: string;
    script: Array<{
      role: string;
      text: string;
      start: number;
      end: number;
    }>;
    metadata: PodcastMetadata;
    files: PodcastFiles;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/podcast-script/${cacheKey}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get list of cached podcasts
   */
  static async getCachedPodcasts(limit: number = 50): Promise<PodcastCacheEntry[]> {
    const response = await fetch(`${API_BASE_URL}/api/cached-podcasts?limit=${limit}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Download audio file
   */
  static async downloadAudio(cacheKey: string, filename?: string): Promise<void> {
    const response = await fetch(this.getPodcastAudioUrl(cacheKey));
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `podcast_${cacheKey}.wav`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Download transcript/script
   */
  static async downloadScript(cacheKey: string, filename?: string): Promise<void> {
    const scriptData = await this.getPodcastScript(cacheKey);
    
    const blob = new Blob([JSON.stringify(scriptData.script, null, 2)], {
      type: 'application/json'
    });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `podcast_script_${cacheKey}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Convenience exports
export const {
  generatePodcast,
  generatePodcastStreaming,
  getPodcastAudioUrl,
  getPodcastScript,
  getCachedPodcasts,
  downloadAudio,
  downloadScript,
} = PodcastAPIService; 