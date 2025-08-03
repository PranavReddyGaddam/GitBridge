from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ParseRepoRequest(BaseModel):
    repo_url: HttpUrl

class ParseRepoResponse(BaseModel):
    file_tree: str
    readme_content: Optional[str] = None
    repo_name: str
    repo_description: Optional[str] = None

class GenerateDiagramRequest(BaseModel):
    file_tree: str
    readme_content: Optional[str] = None

class GenerateDiagramResponse(BaseModel):
    diagram_code: str
    explanation: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

class LLMPromptRequest(BaseModel):
    prompt: str
    model: str = "qwen/qwen2.5-32b-instruct"
    max_tokens: int = 4000
    temperature: float = 0.7

class LLMPromptResponse(BaseModel):
    response: str
    usage: Optional[Dict[str, Any]] = None

# Podcast-related models
class PodcastDuration(int, Enum):
    ONE_MINUTE = 60
    TWO_MINUTES = 120
    THREE_MINUTES = 180

class VoiceSettings(BaseModel):
    host_voice_id: str = "zGjIP4SZlMnY9m93k97r"  # Default Hope - Podcaster
    expert_voice_id: str = "L0Dsvb3SLTyegXwtm47J"  # Default Archer - Conversational
    stability: float = 0.75
    similarity_boost: float = 0.75
    style: float = 0.5
    use_speaker_boost: bool = True

class GeneratePodcastRequest(BaseModel):
    repo_url: HttpUrl
    duration: PodcastDuration = PodcastDuration.TWO_MINUTES
    voice_settings: Optional[VoiceSettings] = None

class PodcastSegment(BaseModel):
    timestamp: str
    speaker: str
    text: str

class PodcastMetadata(BaseModel):
    repo_name: str
    episode_title: str
    estimated_duration: str
    key_topics: List[str]
    generated_at: datetime
    script_length: int
    actual_cost: Optional[float] = None

class PodcastFiles(BaseModel):
    audio_file_path: str
    script_file_path: str
    metadata_file_path: str

class GeneratePodcastResponse(BaseModel):
    status: str
    cache_key: str
    files: PodcastFiles
    metadata: PodcastMetadata
    estimated_cost: float
    from_cache: bool = False

class PodcastCacheEntry(BaseModel):
    cache_key: str
    repo_url: str
    duration: int
    voice_settings: VoiceSettings
    files: PodcastFiles
    metadata: PodcastMetadata
    created_at: datetime
    last_accessed: datetime
    access_count: int
    repo_content_hash: str
    estimated_cost: float

class StreamingPodcastResponse(BaseModel):
    segment_index: int
    total_segments: int
    audio_chunk_url: Optional[str] = None
    segment_url: Optional[str] = None
    progress: float
    status: str  # "generating", "segment_ready", "complete", "error"
    message: Optional[str] = None
    duration_ms: Optional[int] = None
    cache_key: Optional[str] = None
    audio_url: Optional[str] = None
    script_url: Optional[str] = None 