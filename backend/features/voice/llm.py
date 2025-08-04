import logging
import httpx
import asyncio
import os
from typing import Dict, Any, Optional, List

logger = logging.getLogger("voice.llm")

CONVERSATIONAL_SYSTEM_PROMPT = (
    "You are GitBridge Voice, a friendly, conversational AI voice assistant for developers. "
    "CRITICAL: NEVER use emojis, bullet points, or any visual formatting in your responses. "
    "Answer questions in a natural, flowing conversational style that's optimized for text-to-speech. "
    "Use complete sentences that flow together naturally, avoiding choppy or robotic language. "
    "Break down complex technical concepts using relatable analogies and metaphors when helpful. "
    "Use contractions, natural pauses, and conversational transitions like 'you see', 'now', 'so', 'well'. "
    "Keep responses concise but complete - aim for 2-4 sentences that tell a complete thought. "
    "Reference the user's context (like repo or file) when possible. "
    "If context is missing, ask clarifying questions. Invite follow-up questions and acknowledge interruptions gracefully. "
    "Be warm and approachable, like a helpful colleague explaining something over coffee. "
    "If you're unsure, admit it and offer to help further. "
    "REMEMBER: Your responses will be converted to speech, so write as if you're speaking naturally."
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
        abort_event: Optional[asyncio.Event] = None,
        stream: bool = False
    ) -> str:
        """
        Send transcript + context to Qwen via OpenRouter (Cerebras only), return response.
        If abort_event is set and triggered, cancel the request.
        Supports full conversation history if context['messages'] is provided.
        If stream=True, returns partial responses as they arrive.
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
        
        # Truncate context to last 6 exchanges (12 messages + system) to reduce latency
        if len(messages) > 13:  # system + 12 messages (6 exchanges)
            # Keep system message and last 12 messages
            messages = [messages[0]] + messages[-12:]
            logger.info(f"Truncated context from {len(context['messages'])} to 12 messages for latency optimization")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "provider": {"only": ["Cerebras"]},
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": 600,  # Limit response to ~2400 chars to avoid TTS length issues
            "stream": stream
        }
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                if stream:
                    # Handle streaming response
                    async with client.stream("POST", self.api_url, headers=headers, json=payload) as response:
                        response.raise_for_status()
                        full_response = ""
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                data = line[6:]  # Remove "data: " prefix
                                if data == "[DONE]":
                                    break
                                try:
                                    import json
                                    chunk = json.loads(data)
                                    if chunk.get("choices") and chunk["choices"][0].get("delta", {}).get("content"):
                                        content = chunk["choices"][0]["delta"]["content"]
                                        full_response += content
                                        # Here you could yield partial content for real-time streaming
                                        logger.debug(f"Streaming chunk: {content}")
                                except Exception as e:
                                    logger.warning(f"Failed to parse streaming chunk: {e}")
                                    continue
                        return full_response
                else:
                    # Handle non-streaming response
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