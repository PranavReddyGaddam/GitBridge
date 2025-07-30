import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Optional, List, Union
from datetime import datetime
from backend.features.diagram.models import PodcastCacheEntry, VoiceSettings, PodcastFiles, PodcastMetadata

from .storage import FileStorageService
from .s3_storage import S3StorageService

class HybridStorageService:
    """Hybrid storage service that can use both local and S3 storage."""
    
    def __init__(self, use_s3: bool = True, bucket_name: str = None, cdn_domain: str = None):
        self.use_s3 = use_s3 and self._check_s3_credentials()
        self.local_storage = FileStorageService()
        
        if self.use_s3:
            self.s3_storage = S3StorageService(bucket_name, cdn_domain)
            print("Using S3 storage with CDN support")
        else:
            self.s3_storage = None
            print("Using local storage (S3 credentials not configured)")
    
    def _check_s3_credentials(self) -> bool:
        """Check if S3 credentials are properly configured."""
        required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
        return all(os.getenv(var) for var in required_vars)
    
    def generate_cache_key(self, repo_url: str, duration: int, voice_settings: VoiceSettings) -> str:
        """Generate a unique cache key for the podcast configuration."""
        return self.local_storage.generate_cache_key(repo_url, duration, voice_settings)
    
    def get_repo_content_hash(self, repo_url: str) -> str:
        """Generate a content hash for repository."""
        return self.local_storage.get_repo_content_hash(repo_url)
    
    def get_file_paths(self, cache_key: str) -> PodcastFiles:
        """Get file paths for a given cache key."""
        if self.use_s3:
            return self.s3_storage.get_s3_paths(cache_key)
        else:
            return self.local_storage.get_file_paths(cache_key)
    
    def save_cache_entry(self, cache_entry: PodcastCacheEntry) -> None:
        """Save cache entry to storage."""
        if self.use_s3:
            self.s3_storage.save_cache_entry(cache_entry)
        else:
            self.local_storage.save_cache_entry(cache_entry)
    
    def load_cache_entry(self, cache_key: str) -> Optional[PodcastCacheEntry]:
        """Load cache entry from storage."""
        if self.use_s3:
            return self.s3_storage.load_cache_entry(cache_key)
        else:
            return self.local_storage.load_cache_entry(cache_key)
    
    def update_cache_access(self, cache_key: str) -> None:
        """Update cache access statistics."""
        if self.use_s3:
            self.s3_storage.update_cache_access(cache_key)
        else:
            self.local_storage.update_cache_access(cache_key)
    
    def cache_exists(self, cache_key: str) -> bool:
        """Check if cache entry exists and files are valid."""
        if self.use_s3:
            return self.s3_storage.cache_exists(cache_key)
        else:
            return self.local_storage.cache_exists(cache_key)
    
    def save_podcast_files(self, files: PodcastFiles, script_data: List[Dict], metadata: PodcastMetadata) -> None:
        """Save podcast script and metadata files."""
        if self.use_s3:
            self.s3_storage.save_podcast_files(files, script_data, metadata)
        else:
            self.local_storage.save_podcast_files(files, script_data, metadata)
    
    def upload_audio_file(self, local_audio_path: str, target_path: str) -> bool:
        """Upload audio file to storage."""
        if self.use_s3:
            return self.s3_storage.upload_audio_file(local_audio_path, target_path)
        else:
            # For local storage, just copy the file
            import shutil
            try:
                shutil.copy2(local_audio_path, target_path)
                return True
            except Exception as e:
                print(f"Error copying audio file: {e}")
                return False
    
    def get_cached_podcasts(self, limit: int = 50) -> List[PodcastCacheEntry]:
        """Get list of cached podcasts."""
        if self.use_s3:
            return self.s3_storage.get_cached_podcasts(limit)
        else:
            return self.local_storage.get_cached_podcasts(limit)
    
    def cleanup_old_files(self, days_old: int = 30) -> None:
        """Clean up files older than specified days."""
        if self.use_s3:
            self.s3_storage.cleanup_old_files(days_old)
        else:
            self.local_storage.cleanup_old_files(days_old)
    
    def get_storage_stats(self) -> Dict[str, any]:
        """Get storage statistics."""
        if self.use_s3:
            return self.s3_storage.get_storage_stats()
        else:
            return self.local_storage.get_storage_stats()
    
    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Get a URL for file access (CDN URL for S3, local path for local storage)."""
        if self.use_s3 and file_path.startswith("s3://"):
            # Extract S3 key and generate presigned URL
            s3_key = file_path.replace(f"s3://{self.s3_storage.bucket_name}/", "")
            return self.s3_storage.get_file_url(s3_key, expires_in)
        else:
            # For local storage, return the file path
            return file_path
    
    def migrate_to_s3(self) -> None:
        """Migrate all local files to S3."""
        if not self.use_s3:
            print("S3 is not configured. Cannot migrate.")
            return
        
        print("Starting migration from local storage to S3...")
        self.s3_storage.migrate_from_local(self.local_storage)
    
    def get_storage_type(self) -> str:
        """Get the current storage type being used."""
        return "S3" if self.use_s3 else "Local" 