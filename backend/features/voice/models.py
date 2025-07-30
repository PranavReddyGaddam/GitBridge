from pydantic import BaseModel

class LLMRequest(BaseModel):
    transcript: str
    context: dict = None

class TTSRequest(BaseModel):
    text: str 