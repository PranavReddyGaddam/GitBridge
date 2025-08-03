import asyncio
from typing import Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import tempfile

from backend.features.podcast.services_llm import PodcastLLMService
from backend.features.podcast.tts import TTSService
from backend.features.podcast.streaming_tts import StreamingTTSService
from backend.services.github import GitHubService
from backend.services.hybrid_storage import HybridStorageService
from backend.features.diagram.models import (
    GeneratePodcastRequest, GeneratePodcastResponse, PodcastCacheEntry,
    PodcastFiles, PodcastMetadata, VoiceSettings, StreamingPodcastResponse
)

class PodcastService:
    """Main service that orchestrates podcast generation."""
    
    def __init__(self):
        self.llm_service = PodcastLLMService()
        self.tts_service = TTSService()
        self.streaming_tts_service = StreamingTTSService()
        self.github_service = GitHubService()
        self.storage_service = HybridStorageService()
    
    async def generate_podcast(
        self, 
        request: GeneratePodcastRequest
    ) -> GeneratePodcastResponse:
        """
        Generate a complete podcast from a GitHub repository.
        
        Args:
            request: Podcast generation request
            
        Returns:
            Response with podcast files and metadata
        """
        # Set default voice settings if not provided
        voice_settings = request.voice_settings or VoiceSettings()
        
        # Generate cache key
        cache_key = self.storage_service.generate_cache_key(
            str(request.repo_url), 
            300,  # Fixed 5 minutes
            voice_settings
        )
        
        # Check cache first
        if self.storage_service.cache_exists(cache_key):
            cached_entry = self.storage_service.load_cache_entry(cache_key)
            if cached_entry:
                # Update access statistics
                self.storage_service.update_cache_access(cache_key)
                
                return GeneratePodcastResponse(
                    status="success",
                    cache_key=cache_key,
                    files=cached_entry.files,
                    metadata=cached_entry.metadata,
                    estimated_cost=0.0,  # No cost for cached result
                    from_cache=True
                )
        
        try:
            # Extract repository data
            repo_data = await self.github_service.get_repository_data(str(request.repo_url))
            
            # Generate podcast script using LLM
            script_result = await self.llm_service.generate_podcast_script(
                file_tree=repo_data['file_tree'],
                readme_content=repo_data.get('readme_content'),
                repo_name=repo_data['repo_name'],
                target_duration=300,  # Fixed 5 minutes
                voice_settings=voice_settings.dict() if voice_settings else None
            )
            
            # Estimate TTS cost
            cost_info = self.tts_service.estimate_generation_cost(script_result['podcast_script'])
            
            # Get file paths for this generation
            files = self.storage_service.get_file_paths(cache_key)
            
            # Update TTS voice settings if custom ones provided
            if voice_settings:
                voice_mapping = self.tts_service.create_voice_mapping(
                    voice_settings.host_voice_id,
                    voice_settings.expert_voice_id
                )
                self.tts_service.update_voice_settings(voice_settings.dict())
            else:
                voice_mapping = None

            # --- FIX: Always generate audio to a local temp file, then upload to S3 if needed ---
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmpfile:
                local_audio_path = tmpfile.name
            try:
                # Generate audio using TTS to local temp file
                await self.tts_service.convert_script_to_audio(
                    script=script_result['podcast_script'],
                    voice_mapping=voice_mapping,
                    output_path=local_audio_path
                )

                # If using S3, upload the local file and update files.audio_file_path
                if self.storage_service.use_s3:
                    s3_audio_path = files.audio_file_path  # This is the s3://... path
                    self.storage_service.upload_audio_file(local_audio_path, s3_audio_path)
                    files.audio_file_path = s3_audio_path
                else:
                    # For local, move/copy to the final destination
                    import shutil
                    shutil.move(local_audio_path, files.audio_file_path)
                    files.audio_file_path = files.audio_file_path
            finally:
                # Clean up temp file if it still exists
                import os
                if os.path.exists(local_audio_path):
                    os.remove(local_audio_path)
            # --- END FIX ---
            
            # Create metadata
            metadata = PodcastMetadata(
                repo_name=script_result['metadata']['repo_name'],
                episode_title=script_result['metadata']['episode_title'],
                estimated_duration=script_result['metadata']['estimated_duration'],
                key_topics=script_result['metadata']['key_topics'],
                generated_at=datetime.now(),
                script_length=script_result['metadata']['script_length'],
                actual_cost=cost_info['estimated_cost_usd']
            )
            
            # Save script and metadata files
            self.storage_service.save_podcast_files(files, script_result['podcast_script'], metadata)
            
            # Create cache entry
            cache_entry = PodcastCacheEntry(
                cache_key=cache_key,
                repo_url=str(request.repo_url),
                duration=300,  # Fixed 5 minutes
                voice_settings=voice_settings,
                files=files,
                metadata=metadata,
                created_at=datetime.now(),
                last_accessed=datetime.now(),
                access_count=1,
                repo_content_hash=self.storage_service.get_repo_content_hash(str(request.repo_url)),
                estimated_cost=cost_info['estimated_cost_usd']
            )
            
            # Save to cache
            self.storage_service.save_cache_entry(cache_entry)
            
            return GeneratePodcastResponse(
                status="success",
                cache_key=cache_key,
                files=files,
                metadata=metadata,
                estimated_cost=cost_info['estimated_cost_usd'],
                from_cache=False
            )
            
        except Exception as e:
            raise Exception(f"Failed to generate podcast: {str(e)}")
    
    async def generate_podcast_streaming(
        self, 
        request: GeneratePodcastRequest
    ) -> AsyncGenerator[StreamingPodcastResponse, None]:
        """
        Generate podcast with streaming updates for progressive loading.
        
        Args:
            request: Podcast generation request
            
        Yields:
            Streaming responses with progress updates
        """
        voice_settings = request.voice_settings or VoiceSettings()
        cache_key = self.storage_service.generate_cache_key(
            str(request.repo_url), 
            300,  # Fixed 5 minutes
            voice_settings
        )
        
        # Check cache first
        if self.storage_service.cache_exists(cache_key):
            cached_entry = self.storage_service.load_cache_entry(cache_key)
            if cached_entry:
                self.storage_service.update_cache_access(cache_key)
                
                yield StreamingPodcastResponse(
                    segment_index=0,
                    total_segments=1,
                    audio_chunk_url=cached_entry.files.audio_file_path,
                    progress=1.0,
                    status="complete",
                    message="Retrieved from cache",
                    cache_key=cache_key,
                    audio_url=cached_entry.files.audio_file_path,
                    script_url=cached_entry.files.script_file_path
                )
                return
        
        try:
            # Step 1: Extract repository data
            yield StreamingPodcastResponse(
                segment_index=0,
                total_segments=0,
                progress=0.1,
                status="generating",
                message="Extracting repository data..."
            )
            
            repo_data = await self.github_service.get_repository_data(str(request.repo_url))
            
            # Step 2: Generate script
            yield StreamingPodcastResponse(
                segment_index=0,
                total_segments=0,
                progress=0.3,
                status="generating",
                message="Generating podcast script..."
            )
            
            script_result = await self.llm_service.generate_podcast_script(
                file_tree=repo_data['file_tree'],
                readme_content=repo_data.get('readme_content'),
                repo_name=repo_data['repo_name'],
                target_duration=300,  # Fixed 5 minutes
                voice_settings=voice_settings.dict() if voice_settings else None
            )
            
            script_segments = script_result['podcast_script']
            total_segments = len(script_segments)
            
            yield StreamingPodcastResponse(
                segment_index=0,
                total_segments=total_segments,
                progress=0.4,
                status="generating",
                message=f"Starting audio generation for {total_segments} segments..."
            )
            
            # Get file paths
            files = self.storage_service.get_file_paths(cache_key)
            
            # Setup voice settings
            if voice_settings:
                voice_mapping = self.streaming_tts_service.create_voice_mapping(
                    voice_settings.host_voice_id,
                    voice_settings.expert_voice_id
                )
                self.streaming_tts_service.update_voice_settings(voice_settings.dict())
            else:
                voice_mapping = None
            
            # Step 3: Generate audio with streaming segments
            yield StreamingPodcastResponse(
                segment_index=0,
                total_segments=total_segments,
                progress=0.4,
                status="generating",
                message="Starting audio generation..."
            )
            
            # Stream audio generation segment by segment
            async for segment_update in self.streaming_tts_service.convert_script_to_audio_streaming(
                script=script_segments,
                cache_key=cache_key,
                voice_mapping=voice_mapping,
                output_path=files.audio_file_path
            ):
                # Convert streaming TTS response to podcast streaming response
                if segment_update['status'] == 'segment_ready':
                    yield StreamingPodcastResponse(
                        segment_index=segment_update['segment_index'],
                        total_segments=segment_update['total_segments'],
                        segment_url=segment_update['segment_url'],
                        progress=0.4 + (segment_update['progress'] * 0.5),  # 40% to 90%
                        status="segment_ready",
                        message=segment_update['message'],
                        duration_ms=segment_update['duration_ms']
                    )
                elif segment_update['status'] == 'complete':
                    # Audio generation complete, continue to metadata
                    break
            
            # Create metadata and save files
            metadata = PodcastMetadata(
                repo_name=script_result['metadata']['repo_name'],
                episode_title=script_result['metadata']['episode_title'],
                estimated_duration=script_result['metadata']['estimated_duration'],
                key_topics=script_result['metadata']['key_topics'],
                generated_at=datetime.now(),
                script_length=script_result['metadata']['script_length']
            )
            
            self.storage_service.save_podcast_files(files, script_segments, metadata)
            
            # Save to cache
            cache_entry = PodcastCacheEntry(
                cache_key=cache_key,
                repo_url=str(request.repo_url),
                duration=300,  # Fixed 5 minutes
                voice_settings=voice_settings,
                files=files,
                metadata=metadata,
                created_at=datetime.now(),
                last_accessed=datetime.now(),
                access_count=1,
                repo_content_hash=self.storage_service.get_repo_content_hash(str(request.repo_url)),
                estimated_cost=0.0
            )
            
            self.storage_service.save_cache_entry(cache_entry)
            
            # Final completion response
            yield StreamingPodcastResponse(
                segment_index=total_segments,
                total_segments=total_segments,
                audio_chunk_url=files.audio_file_path,
                progress=1.0,
                status="complete",
                message="Podcast generation complete!",
                cache_key=cache_key,
                audio_url=files.audio_file_path,
                script_url=files.script_file_path
            )
            
        except Exception as e:
            yield StreamingPodcastResponse(
                segment_index=0,
                total_segments=0,
                progress=0.0,
                status="error",
                message=f"Error: {str(e)}"
            )
    
    def get_cached_podcasts(self, limit: int = 50):
        """Get list of cached podcasts."""
        return self.storage_service.get_cached_podcasts(limit)
    
    def get_storage_stats(self):
        """Get storage statistics."""
        return self.storage_service.get_storage_stats()
    
    def cleanup_old_files(self, days_old: int = 30):
        """Clean up old podcast files."""
        return self.storage_service.cleanup_old_files(days_old) 