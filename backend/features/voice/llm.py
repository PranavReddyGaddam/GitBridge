import logging
import httpx
import asyncio
import os
from typing import Dict, Any, Optional, List

logger = logging.getLogger("voice.llm")

CONVERSATIONAL_SYSTEM_PROMPT = (
    "You are GitBridge Voice, a friendly, conversational AI voice assistant for developers. "
    "Answer questions clearly and concisely, using short sentences (1–3 per response) and natural, speakable language. "
    "Use a warm, approachable tone, like a helpful colleague. Use contractions and avoid sounding robotic. "
    "Break down complex ideas into simple steps if needed. Reference the user's context (like repo or file) when possible. "
    "If context is missing, ask clarifying questions. Invite follow-up questions and acknowledge interruptions gracefully. "
    "Be polite and professional—thank the user when appropriate, and avoid sarcasm or overly casual language. "
    "If you're unsure, admit it and offer to help further. Keep answers brief unless the user asks for more detail."
)

class LLMService:
    def __init__(self, model: str = "qwen/qwen3-32b", api_key: Optional[str] = None, temperature: float = 0.7):
        self.model = model
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")
        self.temperature = temperature
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"

    async def ask(
        self,
        transcript: str,
        context: Optional[Dict[str, Any]] = None,
        abort_event: Optional[asyncio.Event] = None
    ) -> str:
        """
        Send transcript + context to Qwen via OpenRouter (Cerebras only), return response.
        If abort_event is set and triggered, cancel the request.
        Supports full conversation history if context['messages'] is provided.
        """
        # Determine system prompt
        system_prompt = (context.get("system") if context and context.get("system") else CONVERSATIONAL_SYSTEM_PROMPT)
        # Build messages array
        messages: List[Dict[str, str]] = []
        if context and "messages" in context and isinstance(context["messages"], list):
            # If the first message is not a system prompt, prepend it
            if not context["messages"] or context["messages"][0].get("role") != "system":
                messages.append({"role": "system", "content": system_prompt})
            messages.extend(context["messages"])
        else:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ]
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "provider": {"only": ["Cerebras"]},
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": 600  # Limit response to ~2400 chars to avoid TTS length issues
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                req = client.post(self.api_url, headers=headers, json=payload)
                if abort_event:
                    done, pending = await asyncio.wait([req, abort_event.wait()], return_when=asyncio.FIRST_COMPLETED)
                    if abort_event.is_set():
                        logger.warning("LLM request aborted by user.")
                        return "[Interrupted]"
                    response = done.pop().result()
                else:
                    response = await req
                response.raise_for_status()
                data = response.json()
                # Extract response text (update as per OpenRouter API)
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            return "[Error: LLM unavailable]" 