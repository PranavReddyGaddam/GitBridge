import logging
from typing import List, Tuple
import numpy as np
import torch
import soundfile as sf
from faster_whisper import WhisperModel
from silero_vad import get_speech_timestamps
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
        try:
            audio, sr = sf.read(wav_path)
            if sr != 16000:
                logger.warning(f"Resampling from {sr} to 16000 Hz is recommended.")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            audio = np.array(audio, dtype=np.float32)
            if len(audio) == 0 or np.all(audio == 0):
                return []
            audio = np.nan_to_num(audio, nan=0.0, posinf=1.0, neginf=-1.0)
            max_val = np.abs(audio).max()
            if max_val > 1.0:
                audio = audio / max_val
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return []

        try:
            audio_tensor = torch.from_numpy(audio)
            speech_timestamps = get_speech_timestamps(
                audio_tensor, 
                self.vad_model, 
                sampling_rate=sr,
                threshold=0.5,
                min_speech_duration_ms=250,
                min_silence_duration_ms=100
            )
            if not speech_timestamps:
                speech_timestamps = [{'start': 0, 'end': len(audio)}]
        except Exception as e:
            logger.error(f"VAD failed: {e}")
            speech_timestamps = [{'start': 0, 'end': len(audio)}]

        async def transcribe_chunk(start, end):
            chunk = audio[start:end]
            try:
                segments, _ = await asyncio.to_thread(self.model.transcribe, chunk, language="en", beam_size=1)
                return [
                    (float(seg.start + start / sr), float(seg.end + start / sr), seg.text.strip())
                    for seg in segments if seg.text.strip()
                ]
            except Exception as e:
                logger.error(f"Whisper failed on chunk {start}-{end}: {e}")
                return []

        tasks = [transcribe_chunk(ts['start'], ts['end']) for ts in speech_timestamps if ts['end'] - ts['start'] > int(0.1 * sr)]
        all_results = await asyncio.gather(*tasks)
        return [item for sublist in all_results for item in sublist] 