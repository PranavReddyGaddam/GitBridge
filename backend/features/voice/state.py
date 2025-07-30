import threading
from typing import List, Dict, Optional

class VoiceSessionState:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.state = "idle"  # idle, listening, processing, speaking
        self.history: List[Dict[str, str]] = []  # [{role, content}]
        self.context: Dict = {}  # repo/file context, user prefs, etc.
        self.last_transcript: str = ""
        self.interrupted: bool = False
        self.lock = threading.Lock()

    def set_state(self, new_state: str):
        with self.lock:
            self.state = new_state

    def get_state(self) -> str:
        with self.lock:
            return self.state

    def add_message(self, role: str, content: str):
        with self.lock:
            self.history.append({"role": role, "content": content})

    def get_history(self) -> List[Dict[str, str]]:
        with self.lock:
            return list(self.history)

    def set_context(self, context: dict):
        with self.lock:
            self.context = context.copy()

    def get_context(self) -> Dict:
        with self.lock:
            return self.context.copy()

    def set_last_transcript(self, transcript: str):
        with self.lock:
            self.last_transcript = transcript

    def get_last_transcript(self) -> str:
        with self.lock:
            return self.last_transcript

    def interrupt(self):
        with self.lock:
            self.interrupted = True

    def clear_interrupt(self):
        with self.lock:
            self.interrupted = False

    def is_interrupted(self) -> bool:
        with self.lock:
            return self.interrupted

    def clear_history(self):
        with self.lock:
            self.history.clear()

    def reset(self):
        with self.lock:
            self.state = "idle"
            self.history.clear()
            self.context.clear()
            self.last_transcript = ""
            self.interrupted = False

# (Optional) Global session manager for multi-user support
class VoiceSessionManager:
    def __init__(self):
        self.sessions: Dict[str, VoiceSessionState] = {}
        self.lock = threading.Lock()

    def get_session(self, session_id: str) -> VoiceSessionState:
        with self.lock:
            if session_id not in self.sessions:
                self.sessions[session_id] = VoiceSessionState(session_id)
            return self.sessions[session_id] 