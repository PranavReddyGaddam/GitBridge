import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Navbar from './components/Navbar'
import PodcastPlayer from './components/PodcastPlayer'
import Threads from './components/threads'
import MermaidDiagram from './components/MermaidDiagram'
import { CaptionsDisplay } from './components/PodcastPlayer'
import TalkTab from './components/TalkTab'
import captionsRaw from '../sample_captions.txt?raw'
import './App.css'
import { PodcastAPIService, type GeneratePodcastResponse, type StreamingPodcastResponse, type PodcastCacheEntry } from './services/api'
import VoiceCustomizationModal from './components/VoiceCustomizationModal'
// AudioSegment type is already defined in audioSegments state below
import { LoaderOne } from "@/components/ui/loader";
import { formatDuration } from './lib/utils'



type TabProps = {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  diagramGenerated?: boolean;
  podcastGenerated?: boolean;
  onGenerate?: () => void;
};

function DiagramTab({ diagramGenerated, diagramData, loading, error }: TabProps & { diagramData?: { diagram_code: string } | null; loading?: boolean; error?: string | null }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
        <div className="bg-neutral-200 rounded-2xl p-8 w-[1400px] h-[550px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Generating diagram...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
        <div className="bg-neutral-200 rounded-2xl shadow-xl p-8 w-[1400px] h-[550px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Error generating diagram</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
      {diagramGenerated && diagramData && (
        <div className="flex justify-center items-center w-[1400px] min-h-[550px]">
          <div className="bg-indigo-50 border-2 border-blue-900 shadow-2xl rounded-2xl flex items-center justify-center w-[1400px] min-h-[550px]">
            <MermaidDiagram diagramCode={diagramData.diagram_code} />
          </div>
        </div>
      )}
    </div>
  );
}


function AnimatedHero() {
  const words = [
    { text: "podcasts", color: "#3B82F6" },
    { text: "visualizations", color: "#6366F1" },
    { text: "conversations", color: "#94A3B8" },
  ];
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add a '.' at the end of each word for the animation
  const animatedWord = words[index].text + ".";

  // For pixel-perfect alignment, use the longest word (with dot) for width reservation
  const maxWord = words.reduce((a, b) => (a.text.length > b.text.length ? a : b)).text + ".";

  useEffect(() => {
    if (typing) {
      if (charIndex < animatedWord.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(animatedWord.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 120);
      } else {
        timeoutRef.current = setTimeout(() => setTyping(false), 1400);
      }
    } else {
      if (charIndex > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(animatedWord.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 80);
      } else {
        setTyping(true);
        setIndex((index + 1) % words.length);
      }
    }
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, typing, index, animatedWord, words.length]);

  const currentColor = words[index].color;

  // Add this above the component for cursor animation
  const showCursor = typing || charIndex !== 0;

  return (
    <div className="w-full flex flex-col items-center mt-6 md:mt-10 px-2">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-5xl md:text-[84px] font-semibold font-[Inter] tracking-tight text-blue-900 text-center">GitHub to</span>
        <span
          className="flex flex-col items-center justify-center mt-2"
        >
          {/* Block-level container for fixed width */}
          <span
            className="inline-block relative text-3xl sm:text-5xl md:text-[84px] font-semibold font-[Inter] tracking-tight typing-container whitespace-nowrap text-center"
            style={{ color: currentColor, minWidth: '1ch' }}
          >
            {/* Hidden span to reserve full width, always present and static */}
            <span
              aria-hidden="true"
              className="invisible select-none"
              style={{ display: 'inline-block', minWidth: '1ch' }}
            >
              {maxWord}
            </span>
            {/* Animated text overlays the reserved width */}
            <span
              className="absolute left-0 top-0 w-full text-center flex justify-center items-center"
              style={{ pointerEvents: 'none' }}
            >
              <span>{displayed}</span>
              {/* Blinking cursor, only show when typing or deleting */}
              {showCursor && (
                <span className="ml-1 animate-blink" style={{ borderRight: `4px solid ${currentColor}`, height: '1em', display: 'inline-block', width: '0.5ch' }} />
              )}
            </span>
          </span>
        </span>
      </div>
      {/* Add a clear vertical gap below the hero text */}
      <div className="h-8 md:h-16" />
    </div>
  );
}


// Helper to parse captions (copy from PodcastPlayer if not already in App)
type Caption = {
  role: string;
  text: string;
  start: number;
  end: number;
};
function parseCaptions(raw: string, duration: number): Caption[] {
  const lines = raw.trim().split('\n').filter(Boolean);
  const n = lines.length;
  const segment = duration / n;
  const captions: Caption[] = lines.map((line: string, i: number) => {
    const [role, ...textArr] = line.split(':');
    return {
      role: role.trim(),
      text: textArr.join(':').trim(),
      start: i * segment,
      end: (i + 1) * segment,
    };
  });
  return captions;
}

function App() {
  const [tab, setTab] = useState<'diagram' | 'podcast' | 'talk'>('diagram');
  const [repoUrl, setRepoUrl] = useState('');
  const [diagramGenerated, setDiagramGenerated] = useState(false);
  
  // Podcast generation states
  const [generatedPodcast, setGeneratedPodcast] = useState<GeneratePodcastResponse | null>(null);
  const [podcastCaptions, setPodcastCaptions] = useState<Caption[]>([]);
  const [streamingProgress, setStreamingProgress] = useState<StreamingPodcastResponse | null>(null);
  const [cachedPodcasts, setCachedPodcasts] = useState<PodcastCacheEntry[]>([]);
  const [loadingCachedPodcasts, setLoadingCachedPodcasts] = useState(false);
  
  // Streaming playback states
  const [audioSegments, setAudioSegments] = useState<Array<{
    index: number;
    url: string;
    duration_ms: number;
    loaded: boolean;
    played: boolean;
  }>>([]);

  
  // Voice customization states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    host_voice_id: "BWGwF36RwZsLxWHtzZ3e", // Default: Keiron Welch
    expert_voice_id: "4VhEioWwLzhlRxXpucCZ", // Default: Leon
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true
  });
  const [podcastGenerated, setPodcastGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<{ diagram_code: string } | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState(''); // Track the URL that was actually generated
  const [showPreviousPodcasts, setShowPreviousPodcasts] = useState(false);
  const [threadsOpacity, setThreadsOpacity] = useState(1);

  // Captions and podcast player state
  const [captionsOn, setCaptionsOn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<Caption[]>([]);

  // Add new state for voice interface
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [streamingAudioEnabled, setStreamingAudioEnabled] = useState(false);
  const [repoAnalysis, setRepoAnalysis] = useState<{
    success: boolean;
    repo_name: string;
    repo_description: string;
    analysis_summary: string;
    introduction_text: string;
    introduction_audio_size: number;
  } | null>(null);




  // Parse captions when duration is set
  useEffect(() => {
    if (duration > 0) {
      setCaptions(parseCaptions(captionsRaw, duration));
    }
  }, [duration]);

   // Debug generatedPodcast state changes
   useEffect(() => {
     if (generatedPodcast) {
       console.log('Generated podcast state updated:', {
         cache_key: generatedPodcast.cache_key,
         audio_url: generatedPodcast.audio_url,
         metadata: generatedPodcast.metadata
       });
     }
   }, [generatedPodcast]);

  // Ref for podcast card
  const podcastCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (podcastGenerated && podcastCardRef.current) {
      podcastCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [podcastGenerated]);

  // Load persisted data from sessionStorage with backend validation
  useEffect(() => {
    const loadPersistedState = async () => {
      // First, check if backend is reachable
      try {
        const healthResponse = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (!healthResponse.ok) {
          throw new Error('Backend health check failed');
        }
        
        // Backend is reachable, try to restore session state
        const savedDiagramData = sessionStorage.getItem('gitbridge-diagram-data');
        const savedDiagramUrl = sessionStorage.getItem('gitbridge-diagram-url');
        
        if (savedDiagramData && savedDiagramUrl) {
          try {
            const parsedData = JSON.parse(savedDiagramData);
            setDiagramData(parsedData);
            setDiagramGenerated(true);
            setLastGeneratedUrl(savedDiagramUrl);
            setRepoUrl(savedDiagramUrl); // Also restore the URL to the input field
            console.log('✅ Restored diagram state from current session');
          } catch (error) {
            console.error('Error parsing saved diagram data:', error);
            clearSessionState();
          }
        }
        
             } catch {
         console.log('❌ Backend not reachable or session invalid, clearing state');
         clearSessionState();
       }
    };
    
    const clearSessionState = () => {
      sessionStorage.removeItem('gitbridge-diagram-data');
      sessionStorage.removeItem('gitbridge-diagram-url');
      setDiagramData(null);
      setDiagramGenerated(false);
      setLastGeneratedUrl('');
    };
    
    loadPersistedState();
  }, []);

  // Get API base URL from environment variable or default to localhost
  const API_BASE_URL = useMemo(() => 
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', 
    []
  );



  const handleGo = async () => {
    if (tab === 'talk') {
      // Handle voice interface initialization with repository analysis
      if (!repoUrl) return;
      
      setVoiceLoading(true);
      
      try {
        // Analyze repository during loading
        const analysisResponse = await fetch(`${API_BASE_URL}/api/voice/analyze-repo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ repo_url: repoUrl }),
        });

        if (!analysisResponse.ok) {
          throw new Error(`Analysis failed: ${analysisResponse.status}`);
        }

        const analysisData = await analysisResponse.json();
        console.log('Repository analysis completed:', analysisData);
        
        // Store analysis data for the voice interface
        setRepoAnalysis(analysisData);
        
      } catch (error) {
        console.error('Repository analysis error:', error);
        // Continue with basic functionality even if analysis fails
      }
      
      // Complete loading and activate voice mode
      setVoiceLoading(false);
      setVoiceMode(true);
      
      return;
    }

    if (!repoUrl || !tab) return;
    
    // Reset states only when actually generating new content
    setLoading(true);
    setError(null);
    
    // Only reset the current tab's generated state if URL changed
    if (repoUrl !== lastGeneratedUrl) {
      if (tab === 'diagram') {
        setDiagramGenerated(false);
        setDiagramData(null);
      }
      if (tab === 'podcast') {
        setPodcastGenerated(false);
      }
    }
    
    if (!repoUrl.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL');
      setLoading(false);
      return;
    }
    
    try {
      if (tab === 'diagram') {
        // Step 1: Parse repository
        console.log('Parsing repository:', repoUrl);
        const parseResponse = await fetch(`${API_BASE_URL}/api/parse-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl })
        });
        
        if (!parseResponse.ok) {
          throw new Error(`Failed to parse repository: ${parseResponse.statusText}`);
        }
        
        const parseData = await parseResponse.json();
        console.log('Repository parsed successfully:', parseData);
        
        // Step 2: Generate diagram
        console.log('Generating diagram...');
        const diagramResponse = await fetch(`${API_BASE_URL}/api/generate-diagram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            file_tree: parseData.file_tree, 
            readme_content: parseData.readme_content 
          })
        });
        
        if (!diagramResponse.ok) {
          // Try to get more specific error information
          let errorMessage = `Failed to generate diagram: ${diagramResponse.statusText}`;
          try {
            const errorData = await diagramResponse.json();
            if (errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch {
            // If we can't parse error response, keep the generic message
          }
          
          // Create error object with status code
          const error = new Error(errorMessage) as Error & { statusCode?: number };
          error.statusCode = diagramResponse.status;
          throw error;
        }
        
        const diagramResult = await diagramResponse.json();
        console.log('Diagram generated successfully:', diagramResult);
        
        setDiagramData(diagramResult);
        setDiagramGenerated(true);
        setLastGeneratedUrl(repoUrl);
        
        // Persist to sessionStorage (session-only persistence)
        sessionStorage.setItem('gitbridge-diagram-data', JSON.stringify(diagramResult));
        sessionStorage.setItem('gitbridge-diagram-url', repoUrl);
      }
      
      if (tab === 'podcast') {
        // Ensure cached podcasts are loaded before checking
        if (cachedPodcasts.length === 0 && !loadingCachedPodcasts) {
          console.log('Loading cached podcasts before generation...');
          await loadCachedPodcasts();
        }

        // Check for existing cached podcast first
        console.log('Checking for cached podcast...');
        const existingPodcast = cachedPodcasts.find(podcast => 
          podcast.repo_url === repoUrl &&
          podcast.duration === 5 &&
          podcast.voice_settings.host_voice_id === voiceSettings.host_voice_id &&
          podcast.voice_settings.expert_voice_id === voiceSettings.expert_voice_id &&
          Math.abs(podcast.voice_settings.stability - voiceSettings.stability) < 0.01 &&
          Math.abs(podcast.voice_settings.similarity_boost - voiceSettings.similarity_boost) < 0.01
        );

        if (existingPodcast) {
          console.log('Found existing cached podcast:', existingPodcast);
          // Convert PodcastCacheEntry to GeneratePodcastResponse format
          const podcastResponse: GeneratePodcastResponse = {
            success: true,
            cache_key: existingPodcast.cache_key || '',
            files: existingPodcast.files || { audio_file_path: '', script_file_path: '', metadata_file_path: '' },
            metadata: existingPodcast.metadata || existingPodcast,
            generation_time_seconds: 0,
            audio_url: (existingPodcast.files?.audio_file_path) || '',
            script_url: (existingPodcast.files?.script_file_path) || ''
          };
          setGeneratedPodcast(podcastResponse);
          setPodcastGenerated(true);
          setLastGeneratedUrl(repoUrl);
          return;
        }

        console.log('No cached podcast found, generating new one...');
        
        // Create the request for the streaming endpoint
        const requestBody = {
          repo_url: repoUrl,
          duration_minutes: 5,
          voice_settings: {
            host_voice_id: voiceSettings.host_voice_id,
            expert_voice_id: voiceSettings.expert_voice_id,
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost
          }
        };
        
        // Reset states
        setStreamingProgress(null);
        setAudioSegments([]);
        setStreamingAudioEnabled(true);
        
        try {
          // Use the proper streaming API service
          for await (const update of PodcastAPIService.generatePodcastStreaming(requestBody)) {
            console.log('Received streaming update:', update);
            
            if (update.status === 'processing') {
              setStreamingProgress(update);
            } else if (update.status === 'segment_ready' && update.segment_url) {
              if (streamingAudioEnabled) {
                setAudioSegments(prev => [...prev, {
                  index: update.segment_index || 0,
                  url: update.segment_url!,
                  duration_ms: update.duration_ms || 0,
                  loaded: true,
                  played: false
                }]);
              }
            } else if (update.status === 'complete') {
              console.log('Podcast generation complete:', update);
              console.log('Complete update keys:', Object.keys(update));
              console.log('cache_key value:', update.cache_key);
              console.log('cache_key type:', typeof update.cache_key);
              
                             // Try to extract cache_key from audio URL if it's missing
               let finalCacheKey = update.cache_key;
               // Use type assertion to access potential additional fields
               const updateAny = update as StreamingPodcastResponse & { audio_chunk_url?: string };
               if (!finalCacheKey && updateAny.audio_chunk_url && typeof updateAny.audio_chunk_url === 'string') {
                 // Extract cache_key from S3 URL: s3://git-bridge/audio/podcast_{cache_key}_{timestamp}.wav
                 const urlMatch = updateAny.audio_chunk_url.match(/podcast_([a-f0-9]+)_\d{8}_\d{6}\.wav$/);
                 if (urlMatch) {
                   finalCacheKey = urlMatch[1];
                   console.log('Extracted cache_key from audio URL:', finalCacheKey);
                 }
               }
              
              // Check if we have the required cache_key
              if (!finalCacheKey) {
                console.error('Missing cache_key in complete update:', update);
                console.error('All update fields:', JSON.stringify(update, null, 2));
                throw new Error('Podcast generation completed but cache_key is missing');
              }
              
                             // Create a GeneratePodcastResponse from the streaming data
               const podcastResponse: GeneratePodcastResponse = {
                 success: true,
                 cache_key: finalCacheKey!,
                files: { 
                  audio_file_path: update.audio_url || '', 
                  script_file_path: update.script_url || '', 
                  metadata_file_path: '' 
                },
                metadata: {
                  repo_name: repoUrl.split('/').pop() || 'Unknown',
                  repo_url: repoUrl,
                  duration_minutes: 5,
                  total_words: 0,
                  estimated_cost: 0,
                  generation_timestamp: new Date().toISOString(),
                  voice_settings: voiceSettings
                },
                generation_time_seconds: 0,
                audio_url: update.audio_url || '',
                script_url: update.script_url || ''
              };
              
              console.log('Setting generated podcast with cache_key:', update.cache_key);
              setGeneratedPodcast(podcastResponse);
              setPodcastGenerated(true);
              setLastGeneratedUrl(repoUrl);
              break;
            } else if (update.status === 'error') {
              throw new Error(update.message || 'Podcast generation failed');
            }
          }
        } catch (error) {
          console.error('Podcast generation error:', error);
          throw error;
        }
        
        // Refresh cached podcasts to include the new one
        loadCachedPodcasts();
      }
    } catch (error) {
      console.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Only update repoUrl, don't reset generated states
  const handleRepoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    // Remove the automatic reset - let users keep their generated content
    // setDiagramGenerated(false);
    // setPodcastGenerated(false);
  };

  // Load cached podcasts
   const loadCachedPodcasts = useCallback(async () => {
    if (loadingCachedPodcasts) return;
    
    setLoadingCachedPodcasts(true);
    try {
      const cached = await PodcastAPIService.getCachedPodcasts(20);
      setCachedPodcasts(cached);
    } catch (error) {
      console.error('Failed to load cached podcasts:', error);
    } finally {
      setLoadingCachedPodcasts(false);
    }
   }, [loadingCachedPodcasts]);

  // Load a cached podcast
  const loadCachedPodcast = async (cacheEntry: PodcastCacheEntry) => {
    try {
      // Create GeneratePodcastResponse from cache entry
      const podcastResponse: GeneratePodcastResponse = {
        success: true,
        cache_key: cacheEntry.cache_key,
        files: cacheEntry.files,
        metadata: cacheEntry.metadata,
        generation_time_seconds: 0,
        audio_url: PodcastAPIService.getPodcastAudioUrl(cacheEntry.cache_key),
        script_url: cacheEntry.files.script_file_path
      };
      
      setGeneratedPodcast(podcastResponse);
      
      // Load captions
      const scriptData = await PodcastAPIService.getPodcastScript(cacheEntry.cache_key);
      setPodcastCaptions(scriptData.script);
      
      setPodcastGenerated(true);
      setLastGeneratedUrl(cacheEntry.repo_url);
    } catch (error) {
      console.error('Failed to load cached podcast:', error);
      alert('Failed to load cached podcast');
    }
  };

  // Load cached podcasts when podcast tab is selected
  useEffect(() => {
    if (tab === 'podcast') {
      loadCachedPodcasts();
    }
  }, [tab, loadCachedPodcasts]);

  // Add function to clear generated content
  const handleClearContent = () => {
    if (tab === 'talk') {
      setVoiceMode(false);
      setVoiceLoading(false);
      setRepoAnalysis(null);
      return;
    }
    
    if (tab === 'diagram') {
      setDiagramGenerated(false);
      setDiagramData(null);
      setError(null);
      
      // Clear persisted data
      sessionStorage.removeItem('gitbridge-diagram-data');
      sessionStorage.removeItem('gitbridge-diagram-url');
      setLastGeneratedUrl('');
    } else if (tab === 'podcast') {
      setPodcastGenerated(false);
      setPodcastCaptions([]);
      setStreamingProgress(null);
      setAudioSegments([]);
      

      
      setLastGeneratedUrl('');
    }
  };



  // Check if current tab has generated content
  const currentTabHasContent = 
    (tab === 'diagram' && diagramGenerated) || 
    (tab === 'podcast' && podcastGenerated) || 
    (tab === 'talk' && voiceMode); // talk doesn't have generated content yet

  // Scroll tracking for threads fade effect and animated beam
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const fadeStartDistance = 50; // Start fading after 50px scroll
      const fadeCompleteDistance = 300; // Complete fade at 300px scroll
      
      let opacity = 1;
      if (scrollPosition > fadeStartDistance) {
        const fadeRange = fadeCompleteDistance - fadeStartDistance;
        const scrollInFadeRange = scrollPosition - fadeStartDistance;
        opacity = Math.max(0, 1 - (scrollInFadeRange / fadeRange));
      }
      
      setThreadsOpacity(opacity);
    };

    // Throttle scroll events for better performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      <div 
        className="fixed inset-0 -z-10 transition-opacity duration-300 ease-out"
        style={{ opacity: threadsOpacity }}
      >
        <Threads color={[0.7, 0.65, 0.85]} amplitude={1} distance={0.3} enableMouseInteraction />
      </div>
      <Navbar />
      {/* Move hero text even higher */}
      <div style={{ marginTop: '2vh' }}>
        <AnimatedHero />
      </div>
      {/* Input Card (reduce margin to connect with hero text) */}
      <div className="flex flex-col items-center w-full z-30 px-2" style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl p-10 shadow-2xl bg-gradient-to-br from-blue-900/60 via-blue-700/40 to-blue-400/30 backdrop-blur-lg border border-blue-200/30 transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center gap-2 mb-4 w-full">
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              className="w-full md:w-auto flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base font-semibold bg-transparent placeholder:font-medium placeholder-[#475569] text-[#0F172A]"
              value={repoUrl}
              onChange={handleRepoUrlChange}
            />
            <div className="flex gap-2 w-full md:w-auto">
              <button
                className="flex-1 md:flex-none md:ml-2 px-6 md:px-8 py-2 rounded-lg bg-blue-500 text-white font-bold shadow hover:bg-blue-600 transition-colors text-base md:text-lg h-12 min-w-[120px] flex items-center justify-center disabled:bg-blue-200 disabled:text-black-900"
                disabled={!repoUrl || !tab || loading || voiceLoading}
                onClick={handleGo}
              >
                {loading || voiceLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 font-semibold border-b-2 border-white mr-2"></div>
                    {tab === 'talk' ? 'Starting...' : 'Generating...'}
                  </div>
                ) : (
                  tab === 'talk' ? 'Start' : 'Generate'
                )}
              </button>
              {currentTabHasContent && (
                <button
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition-colors text-sm h-12 flex items-center justify-center"
                  onClick={handleClearContent}
                  title="Clear generated content"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-4 w-full relative">
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'diagram' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('diagram')}
            >
              Diagram
            </button>
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'podcast' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('podcast')}
            >
              Podcast
            </button>
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'talk' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('talk')}
            >
              Talk
            </button>
          </div>
          
          {/* Duration Selector and Voice Settings - appears only when podcast tab is selected */}
          {tab === 'podcast' && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setShowVoiceModal(true)}
                className="rounded-md bg-white/50 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-blue-900 border border-blue-200/60 ring-1 ring-blue-100/60 shadow-sm cursor-pointer hover:bg-white/70 transition-colors h-10 flex items-center justify-center"
                title="Voice Settings"
              >
                Customize
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Main Content - Increased gap */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-32 z-10">
        {tab === 'diagram' && (
          <DiagramTab
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            diagramGenerated={diagramGenerated}
            diagramData={diagramData}
            loading={loading}
            error={error}
          />
        )}
        
        {/* Podcast Error Display */}
        {tab === 'podcast' && error && !loading && !streamingProgress && (
          <div className="w-full flex flex-col items-center mt-12">
            <div className="bg-neutral-200 rounded-2xl shadow-xl p-8 w-[700px] h-[450px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <p className="text-lg font-semibold text-gray-700 mb-2">Error generating podcast</p>
                <p className="text-sm text-gray-500">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        {tab === 'podcast' && (loading || (streamingProgress && streamingProgress.status !== 'complete')) && (
          <div className="w-full flex flex-col items-center mt-12 space-y-6">
            
            {/* Streaming Audio Player */}
            {streamingAudioEnabled && audioSegments.length > 0 && (
              <PodcastPlayer
                segments={audioSegments}
                isGenerating={loading || (streamingProgress?.status !== 'complete')}
                isComplete={streamingProgress?.status === 'complete'}
                artwork="/Pranav.jpeg"
                title={repoUrl.split('/').pop() ? `${repoUrl.split('/').pop()} Podcast (Live)` : "Live Podcast Generation"}
                artist="GitBridge AI"
              />
            )}
            
            <div className="bg-gradient-to-br from-blue-900/60 via-blue-700/40 to-blue-400/30 backdrop-blur-lg border border-blue-200/30 rounded-2xl p-8 w-[700px] h-[450px] flex flex-col items-center justify-center shadow-2xl">
              
              {/* Main Status */}
              <div className="text-center mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {streamingProgress?.status === 'processing' ? 'Generating Podcast...' : streamingProgress?.status === 'complete' ? 'Complete!' : 'Initializing...'}
                </h2>
                <p className="text-blue-100 text-lg">
                  {streamingProgress?.status === 'complete' ? 'Podcast generation complete!' : streamingProgress?.message || 'Setting up podcast generation'}
                </p>
              </div>

              {/* Progress Bar */}
              {streamingProgress && (
                <div className="w-full max-w-md mb-6">
                  <div className="flex justify-between text-sm text-blue-200 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(streamingProgress.progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200/20 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${streamingProgress.progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Segment Progress */}
              {streamingProgress && streamingProgress.total_segments > 0 && (
                <div className="w-full max-w-md mb-6">
                  <div className="flex justify-between text-sm text-blue-200 mb-2">
                    <span>Audio Segments</span>
                    <span>{streamingProgress.segment_index} / {streamingProgress.total_segments}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: streamingProgress.total_segments }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded ${
                          i < streamingProgress.segment_index 
                            ? 'bg-blue-400' 
                            : i === streamingProgress.segment_index 
                            ? 'bg-blue-300 animate-pulse' 
                            : 'bg-blue-200/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stage Indicators */}
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  !streamingProgress || streamingProgress.progress < 0.3 
                    ? 'bg-blue-500/50 text-white' 
                    : 'bg-green-500/50 text-green-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    !streamingProgress || streamingProgress.progress < 0.3 
                      ? 'bg-white animate-pulse' 
                      : 'bg-green-200'
                  }`} />
                  <span>Script Generation</span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  !streamingProgress || streamingProgress.progress < 0.3 
                    ? 'bg-blue-200/20 text-blue-200' 
                    : streamingProgress.progress < 0.9 
                    ? 'bg-blue-500/50 text-white' 
                    : 'bg-green-500/50 text-green-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    !streamingProgress || streamingProgress.progress < 0.3 
                      ? 'bg-blue-200/40' 
                      : streamingProgress.progress < 0.9 
                      ? 'bg-white animate-pulse' 
                      : 'bg-green-200'
                  }`} />
                  <span>Audio Generation</span>
                </div>
                
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  !streamingProgress || streamingProgress.progress < 0.9 
                    ? 'bg-blue-200/20 text-blue-200' 
                    : 'bg-green-500/50 text-green-100'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    !streamingProgress || streamingProgress.progress < 0.9 
                      ? 'bg-blue-200/40' 
                      : 'bg-green-200 animate-pulse'
                  }`} />
                  <span>Finalizing</span>
                </div>
              </div>

              {/* Time Estimate */}
              <p className="text-blue-200 text-sm mt-4">
                This usually takes 2-4 minutes depending on repository size
              </p>
            </div>
          </div>
        )}
        
        {tab === 'podcast' && (podcastGenerated && !loading) && (
          <div className="w-full flex flex-col items-center mt-12" ref={podcastCardRef}>
            <PodcastPlayer
               src={(() => {
                 if (generatedPodcast && generatedPodcast.cache_key) {
                   const audioUrl = PodcastAPIService.getPodcastAudioUrl(generatedPodcast.cache_key);
                   console.log('Using generated podcast audio URL:', audioUrl);
                   return audioUrl;
                 } else {
                   console.warn('No generated podcast or cache_key available, using sample audio');
                   return "/podcast.mp3";
                 }
               })()}
              artwork="/Pranav.jpeg"
              title={generatedPodcast ? `${generatedPodcast.metadata.repo_name} Podcast` : "Sample Podcast Episode"}
              artist="GitBridge AI"
              captionsOn={captionsOn}
              onCaptionsToggle={setCaptionsOn}
              speed={speed}
              onSpeedChange={setSpeed}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              cacheKey={generatedPodcast?.cache_key}
            />
            
            {/* CaptionsDisplay closer to the card */}
            <div className="w-full flex flex-col items-center mt-6 px-4">
              {captionsOn && (
                <CaptionsDisplay
                  caption={(generatedPodcast ? podcastCaptions : captions).find((cap: Caption) => currentTime >= cap.start && currentTime < cap.end) || null}
                  playbackRate={speed}
                />
              )}
            </div>
          </div>
        )}

        {/* Show completed streaming podcast player */}
        {tab === 'podcast' && streamingProgress?.status === 'complete' && audioSegments.length > 0 && (
          <div className="w-full flex flex-col items-center mt-12" ref={podcastCardRef}>
            <PodcastPlayer
              segments={audioSegments}
              isGenerating={false}
              isComplete={true}
              artwork="/Pranav.jpeg"
              title={repoUrl.split('/').pop() ? `${repoUrl.split('/').pop()} Podcast` : "Generated Podcast"}
              artist="GitBridge AI"
              captionsOn={captionsOn}
              onCaptionsToggle={setCaptionsOn}
              speed={speed}
              onSpeedChange={setSpeed}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />
            
            {/* CaptionsDisplay for streaming */}
            <div className="w-full flex flex-col items-center mt-6 px-4">
              {captionsOn && (
                <CaptionsDisplay
                  caption={captions.find((cap: Caption) => currentTime >= cap.start && currentTime < cap.end) || null}
                  playbackRate={speed}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Previous Podcasts Button and Modal */}
        {tab === 'podcast' && (
          <>
            {/* Fixed Button */}
            <button
              className="fixed bottom-6 right-6 z-50 rounded-md bg-white/80 backdrop-blur-sm px-4 py-2 text-base font-semibold text-blue-900 border border-blue-200/60 ring-1 ring-blue-100/60 shadow-lg cursor-pointer hover:bg-white/90 transition-colors"
              onClick={() => setShowPreviousPodcasts(true)}
            >
              Previous Podcasts
            </button>
            {/* Modal/Tooltip */}
            {showPreviousPodcasts && (
              <div className="fixed bottom-24 right-8 z-50 w-[350px] max-h-[70vh] overflow-y-auto overflow-x-hidden bg-gradient-to-br from-blue-900/60 via-blue-700/40 to-blue-400/30 backdrop-blur-lg border border-blue-200/30 rounded-2xl p-4 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                    </svg>
                    Previously Generated Podcasts
                  </h3>
                  <button
                    className="text-white text-xl font-bold hover:text-blue-200 transition-colors ml-2"
                    onClick={() => setShowPreviousPodcasts(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-2 max-h-[55vh] overflow-y-auto overflow-x-hidden">
                  {cachedPodcasts.length === 0 && (
                    <div className="text-blue-100 text-center py-6 text-sm">No podcasts found.</div>
                  )}
                  {cachedPodcasts.map((podcast) => (
                    <div
                      key={podcast.cache_key}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 hover:bg-white/20 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-md group"
                      onClick={() => { loadCachedPodcast(podcast); setShowPreviousPodcasts(false); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-base mb-1 truncate group-hover:text-blue-200 transition-colors">
                            {podcast.metadata.repo_name || 'Unknown Repository'}
                          </h4>
                          <p className="text-blue-100/80 text-xs break-all mb-2 font-medium">
                            {podcast.repo_url}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-blue-200 text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDuration(podcast.duration)}
                            </span>
                            <span className="text-xs text-blue-100/80 font-medium">
                              {new Date(podcast.last_accessed).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center text-blue-200/60 group-hover:text-blue-100 transition-colors ml-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {loadingCachedPodcasts && (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto"></div>
                    <p className="text-gray-300 mt-2 text-xs">Loading cached podcasts...</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {tab === 'talk' && (
          <>
            {voiceLoading && (
              <div className="w-full flex flex-col items-center mt-12">
                <LoaderOne />
                <p className="text-sm text-gray-500 text-center mt-4">Initializing voice interface...</p>
              </div>
            )}
            
                              {voiceMode && !voiceLoading && (
                    <TalkTab repoUrl={repoUrl} repoAnalysis={repoAnalysis} />
                  )}
            

          </>
        )}
      </main>
      {/* Voice Customization Modal */}
      <VoiceCustomizationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        voiceSettings={voiceSettings}
        onVoiceSettingsChange={setVoiceSettings}
      />
      <footer className="w-full flex items-center justify-center mt-16">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-medium text-base">
          Made by
          <a
            href="https://github.com/pranavreddygaddam"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-base ml-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent underline decoration-transparent transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 relative after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-gradient-to-r after:from-blue-400 after:to-purple-400 after:rounded-full after:scale-x-0 after:origin-left hover:after:scale-x-100 after:transition-transform after:duration-300"
            tabIndex={0}
            aria-label="Pranav Reddy Gaddam GitHub"
            style={{
              position: 'relative',
              display: 'inline-block',
            }}
          >
            Pranav Reddy Gaddam
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App
