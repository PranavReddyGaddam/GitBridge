from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any

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