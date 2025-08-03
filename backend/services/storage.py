import os
import json
import hashlib
import sys
from pathlib import Path
from typing import Dict, Optional, List, Union
from datetime import datetime

# Add the backend directory to the path for imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import using direct module paths
from features.diagram.models import PodcastCacheEntry, VoiceSettings, PodcastFiles, PodcastMetadata

class FileStorageService:
    """File storage service for podcast files and metadata."""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent / "storage"
        self.podcasts_dir = self.base_dir / "podcasts"
        self.cache_dir = self.base_dir / "cache"
        
        # Ensure directories exist
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure all required directories exist."""
        directories = [
            self.base_dir,
            self.podcasts_dir,
            self.podcasts_dir / "audio",
            self.podcasts_dir / "scripts", 
            self.podcasts_dir / "metadata",
            self.cache_dir
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def generate_cache_key(self, repo_url: str, duration: int, voice_settings: VoiceSettings) -> str:
        """Generate a unique cache key for the podcast configuration."""
        # Create a hash from the parameters
        data = {
            "repo_url": repo_url,
            "duration": duration,
            "voice_settings": voice_settings.dict()
        }
        
        data_str = json.dumps(data, sort_keys=True)
        cache_key = hashlib.md5(data_str.encode()).hexdigest()
        return cache_key
    
    def get_repo_content_hash(self, repo_url: str) -> str:
        """Generate a content hash for repository (simplified for Phase 1)."""
        # For Phase 1, we'll use a simple hash of URL + timestamp
        # In Phase 2, this should check actual repo content
        timestamp = datetime.now().strftime("%Y%m%d")
        content = f"{repo_url}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_file_paths(self, cache_key: str) -> PodcastFiles:
        """Get file paths for a given cache key."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        return PodcastFiles(
            audio_file_path=str(self.podcasts_dir / "audio" / f"podcast_{cache_key}_{timestamp}.wav"),
            script_file_path=str(self.podcasts_dir / "scripts" / f"script_{cache_key}_{timestamp}.json"),
            metadata_file_path=str(self.podcasts_dir / "metadata" / f"metadata_{cache_key}_{timestamp}.json")
        )
    
    def save_cache_entry(self, cache_entry: PodcastCacheEntry) -> None:
        """Save cache entry to file."""
        cache_file = self.cache_dir / f"{cache_entry.cache_key}.json"
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_entry.dict(), f, indent=2, default=str, ensure_ascii=False)
    
    def load_cache_entry(self, cache_key: str) -> Optional[PodcastCacheEntry]:
        """Load cache entry from file."""
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        if not cache_file.exists():
            return None
        
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert string dates back to datetime objects
            data['created_at'] = datetime.fromisoformat(data['created_at'])
            data['last_accessed'] = datetime.fromisoformat(data['last_accessed'])
            data['metadata']['generated_at'] = datetime.fromisoformat(data['metadata']['generated_at'])
            
            return PodcastCacheEntry(**data)
        except Exception as e:
            print(f"Error loading cache entry {cache_key}: {e}")
            return None
    
    def update_cache_access(self, cache_key: str) -> None:
        """Update cache access statistics."""
        cache_entry = self.load_cache_entry(cache_key)
        if cache_entry:
            cache_entry.last_accessed = datetime.now()
            cache_entry.access_count += 1
            self.save_cache_entry(cache_entry)
    
    def cache_exists(self, cache_key: str) -> bool:
        """Check if cache entry exists and files are valid."""
        cache_entry = self.load_cache_entry(cache_key)
        if not cache_entry:
            return False
        
        # Check if all files exist
        files = cache_entry.files
        return (
            os.path.exists(files.audio_file_path) and
            os.path.exists(files.script_file_path) and
            os.path.exists(files.metadata_file_path)
        )
    
    def save_podcast_files(self, files: PodcastFiles, script_data: List[Dict], metadata: PodcastMetadata) -> None:
        """Save podcast script and metadata files."""
        # Save script
        with open(files.script_file_path, 'w', encoding='utf-8') as f:
            json.dump(script_data, f, indent=2, ensure_ascii=False)
        
        # Save metadata
        with open(files.metadata_file_path, 'w', encoding='utf-8') as f:
            json.dump(metadata.dict(), f, indent=2, default=str, ensure_ascii=False)
    
    def get_cached_podcasts(self, limit: int = 50) -> List[PodcastCacheEntry]:
        """Get list of cached podcasts."""
        cache_files = list(self.cache_dir.glob("*.json"))
        podcasts = []
        
        for cache_file in cache_files[:limit]:
            cache_key = cache_file.stem
            cache_entry = self.load_cache_entry(cache_key)
            if cache_entry:
                podcasts.append(cache_entry)
        
        # Sort by last accessed (most recent first)
        podcasts.sort(key=lambda x: x.last_accessed, reverse=True)
        return podcasts
    
    def cleanup_old_files(self, days_old: int = 30) -> None:
        """Clean up files older than specified days."""
        cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
        
        for cache_file in self.cache_dir.glob("*.json"):
            if cache_file.stat().st_mtime < cutoff_date:
                cache_entry = self.load_cache_entry(cache_file.stem)
                if cache_entry:
                    # Remove associated files
                    files = cache_entry.files
                    for file_path in [files.audio_file_path, files.script_file_path, files.metadata_file_path]:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                
                # Remove cache file
                cache_file.unlink()
    
    def get_storage_stats(self) -> Dict[str, any]:
        """Get storage statistics."""
        cache_files = list(self.cache_dir.glob("*.json"))
        audio_files = list((self.podcasts_dir / "audio").glob("*.wav"))
        
        total_size = 0
        for audio_file in audio_files:
            if audio_file.exists():
                total_size += audio_file.stat().st_size
        
        return {
            "cached_podcasts": len(cache_files),
            "audio_files": len(audio_files),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "storage_path": str(self.base_dir)
        } 