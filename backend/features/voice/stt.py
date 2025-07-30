import logging
from typing import List, Tuple
import numpy as np
import torch
import soundfile as sf
from faster_whisper import WhisperModel
from silero_vad import get_speech_timestamps, collect_chunks
import asyncio

logger = logging.getLogger("voice.stt")

class SpeechToTextService:
    def __init__(self, model_size: str = "tiny", device: str = None):
        self.model_size = model_size
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        try:
            self.model = WhisperModel(model_size, device=self.device, compute_type="float16" if self.device=="cuda" else "int8")
            logger.info(f"Loaded Faster-Whisper model: {model_size} on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load Faster-Whisper: {e}")
            raise

        # Load Silero VAD model
        try:
            self.vad_model, _ = torch.hub.load(
                repo_or_dir='snakers4/silero-vad',
                model='silero_vad',
                force_reload=False,
                onnx=False
            )
            self.vad_model.eval()
            logger.info("Loaded Silero VAD model successfully")
        except Exception as e:
            logger.error(f"Failed to load Silero VAD model: {e}")
            raise

    async def transcribe(self, wav_path: str) -> List[Tuple[float, float, str]]:
        """
        Transcribe a local .wav file (mono, 16kHz) using VAD and Faster-Whisper.
        Returns: List of (start_time, end_time, text)
        """
        try:
            audio, sr = sf.read(wav_path)
            logger.info(f"Loaded audio: shape={audio.shape}, sr={sr}, dtype={audio.dtype}")
            
            if sr != 16000:
                logger.warning(f"Resampling from {sr} to 16000 Hz is recommended.")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)  # Convert to mono
            
            # Ensure audio is float32 and properly normalized
            audio = np.array(audio, dtype=np.float32)
            
            # Check for empty or invalid audio
            if len(audio) == 0:
                logger.error("Audio file is empty")
                return []
            
            # Check for and handle NaN/inf values
            if np.any(np.isnan(audio)) or np.any(np.isinf(audio)):
                logger.warning("Audio contains NaN or infinite values, cleaning...")
                audio = np.nan_to_num(audio, nan=0.0, posinf=1.0, neginf=-1.0)
            
            # Normalize audio to [-1, 1] range if needed
            max_val = np.abs(audio).max()
            if max_val > 1.0:
                logger.info(f"Normalizing audio from max value {max_val}")
                audio = audio / max_val
            elif max_val == 0.0:
                logger.error("Audio is silent (all zeros)")
                return []
            
            # Ensure minimum length (at least 0.1 seconds)
            min_samples = int(0.1 * sr)
            if len(audio) < min_samples:
                logger.error(f"Audio too short: {len(audio)} samples < {min_samples} minimum")
                return []
            
            logger.info(f"Processed audio: shape={audio.shape}, range=[{audio.min():.3f}, {audio.max():.3f}]")
            
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return []

        # VAD chunking with correct parameters
        try:
            # Convert to torch tensor for VAD model
            audio_tensor = torch.from_numpy(audio)
            
            speech_timestamps = get_speech_timestamps(
                audio_tensor, 
                self.vad_model, 
                sampling_rate=sr,
                threshold=0.5,
                min_speech_duration_ms=250,
                min_silence_duration_ms=100
            )
            logger.info(f"VAD detected {len(speech_timestamps)} speech segments")
            
            if len(speech_timestamps) == 0:
                logger.warning("No speech detected in audio")
                return []
                
        except Exception as e:
            logger.error(f"VAD failed: {e}")
            # Fallback: treat entire audio as speech
            logger.info("Using fallback: treating entire audio as speech")
            speech_timestamps = [{'start': 0, 'end': len(audio)}]

        results = []
        for i, ts in enumerate(speech_timestamps):
            start, end = ts['start'], ts['end']
            
            # Ensure valid indices
            start = max(0, min(start, len(audio)))
            end = max(start, min(end, len(audio)))
            
            if end - start < int(0.1 * sr):  # Skip segments shorter than 100ms
                logger.info(f"Skipping short segment {i}: {end-start} samples")
                continue
                
            chunk = audio[start:end]
            logger.info(f"Processing segment {i}: {start}-{end} ({len(chunk)} samples)")
            
            # Run whisper on each chunk
            try:
                segments, _ = await asyncio.to_thread(self.model.transcribe, chunk, language="en", beam_size=1)
                for seg in segments:
                    text = seg.text.strip()
                    if text:  # Only add non-empty transcriptions
                        start_time = float(seg.start + start/sr)
                        end_time = float(seg.end + start/sr)
                        results.append((start_time, end_time, text))
                        logger.info(f"Transcribed segment: '{text}'")
            except Exception as e:
                logger.error(f"Whisper failed on chunk {start}-{end}: {e}")
                
        return results 