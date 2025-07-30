import logging
import numpy as np
import time
import torch
from silero_vad import get_speech_timestamps, collect_chunks
from typing import Callable, List, Dict, Optional

logger = logging.getLogger("voice.vad")

class VoiceActivityDetector:
    def __init__(
        self, 
        sample_rate: int = 16000, 
        threshold: float = 0.5, 
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
        window_size_samples: int = 1024
    ):
        """
        Simple VAD implementation using batch processing approach
        """
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms
        self.window_size_samples = window_size_samples
        
        # Load the model using the official way
        try:
            self.model, utils = torch.hub.load(
                repo_or_dir='snakers4/silero-vad',
                model='silero_vad',
                force_reload=False,
                onnx=False
            )
            self.model.eval()
            logger.info("Silero VAD model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Silero VAD model: {e}")
            raise
        
        self.reset_stream()

    def reset_stream(self):
        """Reset streaming state"""
        self.stream_buffer = []
        self.is_speech = False
        self.current_segment = []
        self.segments = []
        self.silence_counter = 0
        self.last_event_time = None
        self.accumulated_audio = []

    def detect_segments(self, audio: np.ndarray, sample_rate: int = None) -> List[Dict]:
        """
        Batch VAD: Returns list of speech segments
        """
        try:
            sr = sample_rate or self.sample_rate
            
            # Ensure audio is float32
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)
            
            # Normalize audio if needed
            if audio.max() > 1.0:
                audio = audio / 32768.0
            
            t0 = time.time()
            speech_timestamps = get_speech_timestamps(
                audio, 
                self.model, 
                sampling_rate=sr,
                threshold=self.threshold,
                min_speech_duration_ms=self.min_speech_duration_ms,
                min_silence_duration_ms=self.min_silence_duration_ms
            )
            logger.info(f"Detected {len(speech_timestamps)} speech segments in {time.time()-t0:.2f}s.")
            return speech_timestamps
        except Exception as e:
            logger.error(f"VAD batch detection failed: {e}")
            return []

    def collect_chunks(self, audio: np.ndarray, speech_timestamps: list):
        """
        Helper to extract audio chunks for each segment
        """
        try:
            return collect_chunks(audio, speech_timestamps)
        except Exception as e:
            logger.error(f"Failed to collect chunks: {e}")
            return []

    def stream_step(self, frame: np.ndarray, threshold: float = None, on_speech_start: Optional[Callable]=None, on_speech_end: Optional[Callable]=None) -> Dict:
        """
        Simple streaming VAD using accumulated buffer approach
        """
        try:
            # Ensure frame is float32
            if frame.dtype != np.float32:
                frame = frame.astype(np.float32)
            
            # Normalize if needed
            if frame.max() > 1.0:
                frame = frame / 32768.0
            
            # Add to accumulated audio
            self.accumulated_audio.extend(frame)
            
            # Keep a reasonable buffer size (e.g., 2 seconds)
            max_buffer_size = self.sample_rate * 2
            if len(self.accumulated_audio) > max_buffer_size:
                self.accumulated_audio = self.accumulated_audio[-max_buffer_size:]
            
            # Process current buffer to detect speech
            if len(self.accumulated_audio) >= self.window_size_samples:
                audio_array = np.array(self.accumulated_audio)
                
                # Use batch VAD on the accumulated audio
                speech_timestamps = self.detect_segments(audio_array)
                
                current_time = len(self.accumulated_audio) / self.sample_rate
                is_speech = False
                
                # Check if current position is in any speech segment
                for segment in speech_timestamps:
                    start_time = segment['start'] / self.sample_rate
                    end_time = segment['end'] / self.sample_rate
                    
                    # Check if we're currently in a speech segment
                    if start_time <= current_time <= end_time:
                        is_speech = True
                        break
                
                event = None
                confidence = 1.0 if is_speech else 0.0
                
                # Detect state changes
                if is_speech and not self.is_speech:
                    # Speech started
                    self.is_speech = True
                    self.current_segment = [frame]
                    event = 'speech_start'
                    self.last_event_time = time.time()
                    if on_speech_start:
                        on_speech_start()
                        
                elif is_speech and self.is_speech:
                    # Continue speech
                    self.current_segment.append(frame)
                    
                elif not is_speech and self.is_speech:
                    # Speech ended
                    self.is_speech = False
                    if len(self.current_segment) > 0:
                        self.segments.append(np.concatenate(self.current_segment))
                    event = 'speech_end'
                    self.current_segment = []
                    self.last_event_time = time.time()
                    if on_speech_end:
                        on_speech_end()
                
                return {
                    'is_speech': is_speech,
                    'confidence': confidence,
                    'event': event,
                    'segments': self.segments.copy() if event == 'speech_end' else []
                }
            
            # Not enough data yet
            return {
                'is_speech': self.is_speech,
                'confidence': 0.0,
                'event': None,
                'segments': []
            }
            
        except Exception as e:
            logger.error(f"VAD stream_step failed: {e}")
            return {'is_speech': False, 'confidence': 0.0, 'event': None, 'segments': []}

    def get_segments(self) -> List[np.ndarray]:
        """
        Return all completed speech segments (audio arrays)
        """
        return self.segments.copy()

    def debug_plot(self, audio: np.ndarray, speech_timestamps: list):
        """
        Placeholder for a method to visualize VAD decisions
        """
        logger.info("Debug plot not implemented yet.")
        pass