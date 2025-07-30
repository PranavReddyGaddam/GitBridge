from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from typing import List
import json
import os

from backend.features.diagram.models import (
    GeneratePodcastRequest, GeneratePodcastResponse, 
    ErrorResponse, PodcastCacheEntry, StreamingPodcastResponse
)
from backend.features.podcast.services import PodcastService
from backend.services.exceptions import (
    RateLimitExceededException,
    AuthenticationException,
    APITimeoutException,
    LLMServiceException,
    GitBridgeAPIException
)

router = APIRouter()
podcast_service = PodcastService()

@router.post("/generate-podcast", response_model=GeneratePodcastResponse)
async def generate_podcast(request: GeneratePodcastRequest):
    """
    Generate a complete podcast from a GitHub repository.
    
    Args:
        request: Contains repo URL, duration, and voice settings
        
    Returns:
        Podcast files, metadata, and generation info
    """
    try:
        # Validate input
        if not request.repo_url:
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        # Generate podcast
        result = await podcast_service.generate_podcast(request)
        
        return result
        
    except RateLimitExceededException as e:
        raise HTTPException(status_code=429, detail=e.message)
    except AuthenticationException as e:
        raise HTTPException(status_code=401, detail=e.message)
    except APITimeoutException as e:
        raise HTTPException(status_code=408, detail=e.message)
    except LLMServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GitBridgeAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate podcast: {str(e)}")

@router.post("/generate-podcast-stream")
async def generate_podcast_stream(request: GeneratePodcastRequest):
    """
    Generate podcast with streaming updates for progressive loading.
    
    Args:
        request: Contains repo URL, duration, and voice settings
        
    Returns:
        Server-sent events stream with generation progress
    """
    try:
        # Validate input
        if not request.repo_url:
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        async def event_stream():
            try:
                async for update in podcast_service.generate_podcast_streaming(request):
                    # Format as server-sent events
                    data = json.dumps(update.dict())
                    yield f"data: {data}\n\n"
                    
                    # End stream on completion or error
                    if update.status in ["complete", "error"]:
                        break
                        
            except Exception as e:
                error_update = StreamingPodcastResponse(
                    segment_index=0,
                    total_segments=0,
                    progress=0.0,
                    status="error",
                    message=f"Stream error: {str(e)}"
                )
                data = json.dumps(error_update.dict())
                yield f"data: {data}\n\n"
        
        return StreamingResponse(
            event_stream(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start podcast stream: {str(e)}")

@router.get("/podcast-audio/{cache_key}")
async def serve_podcast_audio(cache_key: str):
    """
    Serve podcast audio file.
    
    Args:
        cache_key: Cache key identifying the podcast
        
    Returns:
        Audio file response
    """
    try:
        # Load cache entry
        cache_entry = podcast_service.storage_service.load_cache_entry(cache_key)
        if not cache_entry:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Check if audio file exists
        audio_path = cache_entry.files.audio_file_path
        
        # Handle S3 files
        if audio_path.startswith('s3://'):
            # Get presigned URL from S3
            url = podcast_service.storage_service.get_file_url(audio_path)
            if url:
                # Redirect to S3 URL
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=url)
            else:
                raise HTTPException(status_code=404, detail="Audio file not accessible")
        
        # Handle local files
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Update access statistics
        podcast_service.storage_service.update_cache_access(cache_key)
        
        # Serve file
        return FileResponse(
            path=audio_path,
            media_type="audio/wav",
            filename=f"podcast_{cache_entry.metadata.repo_name}_{cache_key[:8]}.wav"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve audio: {str(e)}")

@router.get("/file-url")
async def get_file_url(path: str):
    """
    Get presigned URL for S3 files.
    
    Args:
        path: S3 path (s3://bucket/key)
        
    Returns:
        Presigned URL for file access
    """
    try:
        if not path.startswith('s3://'):
            raise HTTPException(status_code=400, detail="Only S3 paths are supported")
        
        # Get presigned URL
        url = podcast_service.storage_service.get_file_url(path)
        if not url:
            raise HTTPException(status_code=404, detail="File not accessible")
        
        return {"url": url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get file URL: {str(e)}")

@router.get("/podcast-segment/{cache_key}/{segment_index}")
async def serve_podcast_segment(cache_key: str, segment_index: int):
    """
    Serve individual podcast audio segment for streaming playback.
    
    Args:
        cache_key: Cache key identifying the podcast
        segment_index: Index of the audio segment to serve
        
    Returns:
        Audio segment file response
    """
    try:
        # Load cache entry to verify podcast exists
        cache_entry = podcast_service.storage_service.load_cache_entry(cache_key)
        if not cache_entry:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Check if segment file exists
        segment_path = f"podcast_cache/{cache_key}/segments/segment_{segment_index:03d}.wav"
        if not os.path.exists(segment_path):
            raise HTTPException(status_code=404, detail="Audio segment not found")
        
        # Update access statistics
        podcast_service.storage_service.update_cache_access(cache_key)
        
        # Serve segment file
        return FileResponse(
            path=segment_path,
            media_type="audio/wav",
            filename=f"segment_{segment_index:03d}.wav"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve audio segment: {str(e)}")

@router.get("/podcast-script/{cache_key}")
async def get_podcast_script(cache_key: str):
    """
    Get podcast script data.
    
    Args:
        cache_key: Cache key identifying the podcast
        
    Returns:
        Podcast script and metadata
    """
    try:
        # Load cache entry
        cache_entry = podcast_service.storage_service.load_cache_entry(cache_key)
        if not cache_entry:
            raise HTTPException(status_code=404, detail="Podcast not found")
        
        # Load script file
        script_path = cache_entry.files.script_file_path
        if script_path.startswith('s3://'):
            # Fetch from S3
            from backend.services.s3_storage import S3StorageService
            s3_service = S3StorageService()
            bucket = s3_service.bucket_name
            s3_key = script_path.replace(f's3://{bucket}/', '')
            import boto3
            s3 = boto3.client('s3')
            obj = s3.get_object(Bucket=bucket, Key=s3_key)
            script_data = obj['Body'].read().decode('utf-8')
            import json
            script_data = json.loads(script_data)
        else:
            import os
            if not os.path.exists(script_path):
                raise HTTPException(status_code=404, detail="Script file not found")
            with open(script_path, 'r', encoding='utf-8') as f:
                import json
                script_data = json.load(f)
        
        # Update access statistics
        podcast_service.storage_service.update_cache_access(cache_key)
        
        return {
            "cache_key": cache_key,
            "script": script_data,
            "metadata": cache_entry.metadata.dict(),
            "files": cache_entry.files.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get script: {str(e)}")

@router.get("/cached-podcasts", response_model=List[PodcastCacheEntry])
async def get_cached_podcasts(limit: int = 50):
    """
    Get list of cached podcasts.
    
    Args:
        limit: Maximum number of podcasts to return
        
    Returns:
        List of cached podcast entries
    """
    try:
        podcasts = podcast_service.get_cached_podcasts(limit)
        return podcasts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cached podcasts: {str(e)}")

@router.get("/storage-stats")
async def get_storage_stats():
    """
    Get storage statistics.
    
    Returns:
        Storage usage information
    """
    try:
        stats = podcast_service.get_storage_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get storage stats: {str(e)}")

@router.delete("/cleanup-old-files")
async def cleanup_old_files(background_tasks: BackgroundTasks, days_old: int = 30):
    """
    Clean up old podcast files (runs in background).
    
    Args:
        days_old: Remove files older than this many days
        
    Returns:
        Cleanup status
    """
    try:
        # Run cleanup in background
        background_tasks.add_task(podcast_service.cleanup_old_files, days_old)
        
        return {
            "status": "cleanup_started",
            "message": f"Cleaning up files older than {days_old} days",
            "background": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start cleanup: {str(e)}")

@router.get("/health/podcast")
async def podcast_health_check():
    """
    Health check for podcast service.
    
    Returns:
        Podcast service status
    """
    try:
        # Check if all services are available
        stats = podcast_service.get_storage_stats()
        
        return {
            "status": "healthy",
            "storage_stats": stats,
            "services": {
                "llm_service": "available",
                "tts_service": "available", 
                "github_service": "available",
                "storage_service": "available"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Podcast service unhealthy: {str(e)}") 