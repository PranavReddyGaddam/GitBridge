import io
import asyncio
from typing import Dict, List, Optional, AsyncGenerator
from pydub import AudioSegment
import requests
from .tts import TTSService
import tempfile
import os

class StreamingTTSService(TTSService):
    """
    Extended TTS service that supports streaming audio generation.
    Generates and serves individual audio segments as they're created.
    """
    
    def __init__(self):
        super().__init__()
        
    async def convert_script_to_audio_streaming(
        self,
        script: List[Dict[str, str]],
        cache_key: str,
        voice_mapping: Optional[Dict[str, str]] = None,
        output_path: str = "podcast_output.wav"
    ) -> AsyncGenerator[Dict, None]:
        """
        Convert script to audio with streaming segment delivery.
        
        Args:
            script: List of script segments with timestamp, speaker, text
            cache_key: Cache key for storing segments
            voice_mapping: Optional custom voice ID mapping {speaker: voice_id}
            output_path: Output file path for the final audio
            
        Yields:
            Dict with segment info: {
                'segment_index': int,
                'total_segments': int, 
                'segment_url': str,
                'progress': float,
                'status': str,
                'duration_ms': int
            }
        """
        if not script:
            raise ValueError("Script cannot be empty")
        
        # Use custom voices or defaults
        voices = voice_mapping or self.default_voices
        
        # Create directory for streaming segments
        segments_dir = f"podcast_cache/{cache_key}/segments"
        os.makedirs(segments_dir, exist_ok=True)
        
        total_segments = len(script)
        audio_segments = []
        
        print(f"Converting {total_segments} script segments to audio with streaming...")
        
        for i, segment in enumerate(script):
            speaker = segment["speaker"].upper()
            text = segment["text"]
            
            print(f"Processing segment {i+1}/{total_segments}: {speaker}")
            
            # Get voice ID for speaker
            voice_id = voices.get(speaker, self.default_voices.get("HOST"))
            
            # Generate audio for this segment
            print(f"📡 Calling ElevenLabs API for segment {i+1}...")
            audio_data = await self.text_to_speech(text, voice_id)
            print(f"✅ Received {len(audio_data)} bytes from ElevenLabs")
            
            # Convert to AudioSegment
            print(f"🎵 Converting MP3 bytes to AudioSegment...")
            try:
                audio_segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
                print(f"✅ AudioSegment created: {len(audio_segment)}ms duration")
            except Exception as e:
                print(f"❌ Failed to create AudioSegment: {e}")
                raise
            
            # Add natural pause after each segment
            pause_duration = 750 if speaker == "HOST" else 500
            silence = AudioSegment.silent(duration=pause_duration)
            final_segment = audio_segment + silence
            
            # Save individual segment
            segment_path = f"{segments_dir}/segment_{i:03d}.wav"
            final_segment.export(segment_path, format="wav")
            
            # Store for final combination
            audio_segments.append(final_segment)
            
            # Yield streaming response for this segment
            segment_url = f"/api/podcast-segment/{cache_key}/{i}"
            progress = (i + 1) / total_segments
            
            yield {
                'segment_index': i,
                'total_segments': total_segments,
                'segment_url': segment_url,
                'progress': progress * 0.9,  # Reserve 10% for final processing
                'status': 'segment_ready',
                'duration_ms': len(final_segment),
                'message': f"Segment {i+1}/{total_segments} ready"
            }
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.1)
        
        # Combine all segments for final file
        print("Combining audio segments for final file...")
        final_audio = sum(audio_segments)
        
        # Add intro/outro
        final_audio = self.add_intro_outro(final_audio)

        # --- FIX: Always export final audio to a local temp file, then upload to S3 if needed ---
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmpfile:
            local_final_path = tmpfile.name
        try:
            print(f"[DEBUG] About to export final audio. output_path: {output_path}")
            print(f"[DEBUG] Exporting final file to {local_final_path} (temp file)...")
            final_audio.export(local_final_path, format="wav")
            print(f"[DEBUG] Successfully exported to {local_final_path}")

            # If output_path is an S3 URI, upload the local file
            if output_path.startswith('s3://'):
                print(f"[DEBUG] Detected S3 URI for output_path: {output_path}")
                from services.s3_storage import S3StorageService
                s3_service = S3StorageService()
                bucket = s3_service.bucket_name
                s3_key = output_path.replace(f's3://{bucket}/', '')
                try:
                    upload_result = s3_service.upload_file(local_final_path, s3_key, content_type='audio/wav')
                    print(f"[DEBUG] S3 upload result: {upload_result}")
                    if upload_result:
                        print(f"[DEBUG] Uploaded final audio to S3: {output_path}")
                    else:
                        print(f"[DEBUG] S3 upload failed for {output_path}")
                except Exception as e:
                    print(f"[DEBUG] Exception during S3 upload: {e}")
            else:
                # For local, move/copy to the final destination
                import shutil
                shutil.move(local_final_path, output_path)
                print(f"[DEBUG] Moved final audio to {output_path}")
        finally:
            # Clean up temp file if it still exists
            if os.path.exists(local_final_path):
                os.remove(local_final_path)
                print(f"[DEBUG] Cleaned up temp file: {local_final_path}")
        # --- END FIX ---
        
        # Final completion response
        yield {
            'segment_index': total_segments,
            'total_segments': total_segments,
            'segment_url': None,
            'progress': 1.0,
            'status': 'complete',
            'duration_ms': len(final_audio),
            'message': 'Audio generation complete!'
        }
    
    def get_segment_path(self, cache_key: str, segment_index: int) -> str:
        """Get the file path for a specific audio segment."""
        return f"podcast_cache/{cache_key}/segments/segment_{segment_index:03d}.wav"
    
    def segment_exists(self, cache_key: str, segment_index: int) -> bool:
        """Check if a specific audio segment exists."""
        segment_path = self.get_segment_path(cache_key, segment_index)
        return os.path.exists(segment_path) 