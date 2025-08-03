import os
import json
import hashlib
import sys
from pathlib import Path
from typing import Dict, Optional, List, Union, BinaryIO
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Add the backend directory to the path for imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import using direct module paths
from features.diagram.models import PodcastCacheEntry, VoiceSettings, PodcastFiles, PodcastMetadata

class S3StorageService:
    """S3 storage service for podcast files and metadata with CDN support."""
    
    def __init__(self, bucket_name: str = None, cdn_domain: str = None):
        self.bucket_name = bucket_name or os.getenv('S3_BUCKET_NAME', 'gitbridge-podcasts')
        self.cdn_domain = cdn_domain or os.getenv('CDN_DOMAIN')
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=self.region
        )
        
        # Optional CloudFront client for CDN operations
        if self.cdn_domain:
            self.cloudfront_client = boto3.client('cloudfront')
        else:
            self.cloudfront_client = None
    
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
        """Generate a content hash for repository."""
        timestamp = datetime.now().strftime("%Y%m%d")
        content = f"{repo_url}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_s3_paths(self, cache_key: str) -> PodcastFiles:
        """Get S3 paths for a given cache key."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        return PodcastFiles(
            audio_file_path=f"s3://{self.bucket_name}/audio/podcast_{cache_key}_{timestamp}.wav",
            script_file_path=f"s3://{self.bucket_name}/scripts/script_{cache_key}_{timestamp}.json",
            metadata_file_path=f"s3://{self.bucket_name}/metadata/metadata_{cache_key}_{timestamp}.json"
        )
    
    def get_cdn_url(self, s3_path: str) -> str:
        """Convert S3 path to CDN URL if CDN is configured."""
        if not self.cdn_domain:
            return s3_path
        
        # Extract the key from s3://bucket/key format
        if s3_path.startswith(f"s3://{self.bucket_name}/"):
            key = s3_path[len(f"s3://{self.bucket_name}/"):]
            return f"https://{self.cdn_domain}/{key}"
        
        return s3_path
    
    def upload_file(self, file_path: str, s3_key: str, content_type: str = None) -> bool:
        """Upload a file to S3."""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_file(
                file_path, 
                self.bucket_name, 
                s3_key,
                ExtraArgs=extra_args
            )
            return True
        except (ClientError, NoCredentialsError) as e:
            print(f"Error uploading {file_path} to S3: {e}")
            return False
    
    def upload_fileobj(self, file_obj: BinaryIO, s3_key: str, content_type: str = None) -> bool:
        """Upload a file object to S3."""
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.upload_fileobj(
                file_obj, 
                self.bucket_name, 
                s3_key,
                ExtraArgs=extra_args
            )
            return True
        except (ClientError, NoCredentialsError) as e:
            print(f"Error uploading file object to S3: {e}")
            return False
    
    def download_file(self, s3_key: str, local_path: str) -> bool:
        """Download a file from S3 to local path."""
        try:
            self.s3_client.download_file(self.bucket_name, s3_key, local_path)
            return True
        except (ClientError, NoCredentialsError) as e:
            print(f"Error downloading {s3_key} from S3: {e}")
            return False
    
    def get_file_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL for file access."""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )
            return url
        except (ClientError, NoCredentialsError) as e:
            print(f"Error generating presigned URL for {s3_key}: {e}")
            return None
    
    def file_exists(self, s3_key: str) -> bool:
        """Check if a file exists in S3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            raise
    
    def save_cache_entry(self, cache_entry: PodcastCacheEntry) -> None:
        """Save cache entry to S3."""
        cache_key = cache_entry.cache_key
        s3_key = f"cache/{cache_key}.json"
        
        # Convert to JSON string
        cache_data = cache_entry.dict()
        cache_json = json.dumps(cache_data, indent=2, default=str, ensure_ascii=False)
        
        # Upload to S3
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=cache_json.encode('utf-8'),
            ContentType='application/json'
        )
    
    def load_cache_entry(self, cache_key: str) -> Optional[PodcastCacheEntry]:
        """Load cache entry from S3."""
        s3_key = f"cache/{cache_key}.json"
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            data = json.loads(response['Body'].read().decode('utf-8'))
            
            # Convert string dates back to datetime objects
            data['created_at'] = datetime.fromisoformat(data['created_at'])
            data['last_accessed'] = datetime.fromisoformat(data['last_accessed'])
            data['metadata']['generated_at'] = datetime.fromisoformat(data['metadata']['generated_at'])
            
            return PodcastCacheEntry(**data)
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return None
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
        
        # Check if all files exist in S3
        files = cache_entry.files
        audio_key = files.audio_file_path.replace(f"s3://{self.bucket_name}/", "")
        script_key = files.script_file_path.replace(f"s3://{self.bucket_name}/", "")
        metadata_key = files.metadata_file_path.replace(f"s3://{self.bucket_name}/", "")
        
        return (
            self.file_exists(audio_key) and
            self.file_exists(script_key) and
            self.file_exists(metadata_key)
        )
    
    def save_podcast_files(self, files: PodcastFiles, script_data: List[Dict], metadata: PodcastMetadata) -> None:
        """Save podcast script and metadata files to S3."""
        # Extract S3 keys from file paths
        script_key = files.script_file_path.replace(f"s3://{self.bucket_name}/", "")
        metadata_key = files.metadata_file_path.replace(f"s3://{self.bucket_name}/", "")
        
        # Save script
        script_json = json.dumps(script_data, indent=2, ensure_ascii=False)
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=script_key,
            Body=script_json.encode('utf-8'),
            ContentType='application/json'
        )
        
        # Save metadata
        metadata_json = json.dumps(metadata.dict(), indent=2, default=str, ensure_ascii=False)
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=metadata_key,
            Body=metadata_json.encode('utf-8'),
            ContentType='application/json'
        )
    
    def upload_audio_file(self, local_audio_path: str, s3_audio_path: str) -> bool:
        """Upload audio file to S3."""
        audio_key = s3_audio_path.replace(f"s3://{self.bucket_name}/", "")
        return self.upload_file(local_audio_path, audio_key, 'audio/wav')
    
    def get_cached_podcasts(self, limit: int = 50) -> List[PodcastCacheEntry]:
        """Get list of cached podcasts from S3."""
        try:
            # List objects in cache directory
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='cache/',
                MaxKeys=limit
            )
            
            podcasts = []
            for obj in response.get('Contents', []):
                cache_key = obj['Key'].replace('cache/', '').replace('.json', '')
                cache_entry = self.load_cache_entry(cache_key)
                if cache_entry:
                    podcasts.append(cache_entry)
            
            # Sort by last accessed (most recent first)
            podcasts.sort(key=lambda x: x.last_accessed, reverse=True)
            return podcasts
        except (ClientError, NoCredentialsError) as e:
            print(f"Error listing cached podcasts: {e}")
            return []
    
    def cleanup_old_files(self, days_old: int = 30) -> None:
        """Clean up files older than specified days."""
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        try:
            # List all cache entries
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='cache/'
            )
            
            for obj in response.get('Contents', []):
                cache_key = obj['Key'].replace('cache/', '').replace('.json', '')
                cache_entry = self.load_cache_entry(cache_key)
                
                if cache_entry and cache_entry.created_at < cutoff_date:
                    # Remove associated files
                    files = cache_entry.files
                    for file_path in [files.audio_file_path, files.script_file_path, files.metadata_file_path]:
                        s3_key = file_path.replace(f"s3://{self.bucket_name}/", "")
                        try:
                            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                        except ClientError:
                            pass  # File might already be deleted
                    
                    # Remove cache file
                    try:
                        self.s3_client.delete_object(Bucket=self.bucket_name, Key=obj['Key'])
                    except ClientError:
                        pass
        except (ClientError, NoCredentialsError) as e:
            print(f"Error during cleanup: {e}")
    
    def get_storage_stats(self) -> Dict[str, any]:
        """Get storage statistics from S3."""
        try:
            # Count cache entries
            cache_response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='cache/'
            )
            cache_count = len(cache_response.get('Contents', []))
            
            # Count audio files
            audio_response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='audio/'
            )
            audio_count = len(audio_response.get('Contents', []))
            
            # Calculate total size
            total_size = 0
            for obj in audio_response.get('Contents', []):
                total_size += obj['Size']
            
            return {
                "cached_podcasts": cache_count,
                "audio_files": audio_count,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "storage_type": "S3",
                "bucket_name": self.bucket_name,
                "cdn_domain": self.cdn_domain
            }
        except (ClientError, NoCredentialsError) as e:
            print(f"Error getting storage stats: {e}")
            return {
                "cached_podcasts": 0,
                "audio_files": 0,
                "total_size_mb": 0,
                "storage_type": "S3",
                "error": str(e)
            }
    
    def migrate_from_local(self, local_storage_service) -> None:
        """Migrate all local files to S3."""
        print("Starting migration from local storage to S3...")
        
        # Get all cached podcasts from local storage
        local_podcasts = local_storage_service.get_cached_podcasts()
        
        for podcast in local_podcasts:
            print(f"Migrating podcast {podcast.cache_key}...")
            
            # Upload cache entry
            self.save_cache_entry(podcast)
            
            # Upload associated files
            files = podcast.files
            
            # Upload audio file
            if os.path.exists(files.audio_file_path):
                self.upload_audio_file(files.audio_file_path, files.audio_file_path)
            
            # Upload script file
            if os.path.exists(files.script_file_path):
                script_key = files.script_file_path.replace(f"s3://{self.bucket_name}/", "")
                self.upload_file(files.script_file_path, script_key, 'application/json')
            
            # Upload metadata file
            if os.path.exists(files.metadata_file_path):
                metadata_key = files.metadata_file_path.replace(f"s3://{self.bucket_name}/", "")
                self.upload_file(files.metadata_file_path, metadata_key, 'application/json')
        
        print(f"Migration completed. {len(local_podcasts)} podcasts migrated to S3.") 