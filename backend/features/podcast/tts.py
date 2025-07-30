import os
import requests
import json
from typing import Dict, List, Optional, Tuple
import io
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Direct FFmpeg configuration for Windows development
try:
    from pydub import AudioSegment
    
    # Direct path to winget FFmpeg (most reliable for Windows development)
    winget_ffmpeg = "C:\\Users\\Pranav Reddy\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe"
    winget_ffprobe = "C:\\Users\\Pranav Reddy\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffprobe.exe"
    
    if os.path.exists(winget_ffmpeg) and os.path.exists(winget_ffprobe):
        # Set the exact paths
        AudioSegment.converter = winget_ffmpeg
        AudioSegment.ffmpeg = winget_ffmpeg
        AudioSegment.ffprobe = winget_ffprobe
        print(f"✅ Using winget FFmpeg: {winget_ffmpeg}")
        print(f"✅ Using winget ffprobe: {winget_ffprobe}")
    else:
        # Fallback to bundled FFmpeg
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            AudioSegment.converter = ffmpeg_exe
            AudioSegment.ffmpeg = ffmpeg_exe
            AudioSegment.ffprobe = ffmpeg_exe.replace('ffmpeg', 'ffprobe')
            print(f"✅ Using bundled FFmpeg: {ffmpeg_exe}")
        except ImportError:
            print("⚠️ No FFmpeg found - install system FFmpeg or imageio-ffmpeg")
            
except Exception as e:
    print(f"⚠️ Could not configure FFmpeg: {e}")

class TTSService:
    """ElevenLabs Text-to-Speech service for backend."""
    
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY")
        if not self.api_key:
            raise ValueError("ELEVENLABS_API_KEY environment variable is required")
        
        self.base_url = "https://api.elevenlabs.io/v1"
        self.headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        # Default voice IDs (you can customize these)
        self.default_voices = {
            "HOST": "zGjIP4SZlMnY9m93k97r",      # Hope - Podcaster
            "EXPERT": "L0Dsvb3SLTyegXwtm47J"     # Archer - Conversational
        }
        
        # TTS settings
        self.voice_settings = {
            "stability": 0.75,
            "similarity_boost": 0.75,
            "style": 0.5,
            "use_speaker_boost": True
        }
    
    def update_voice_settings(self, voice_settings: Dict):
        """Update voice settings from user preferences."""
        self.voice_settings.update(voice_settings)
    
    async def convert_script_to_audio(
        self,
        script: List[Dict[str, str]],
        voice_mapping: Optional[Dict[str, str]] = None,
        output_path: str = "podcast_output.wav"
    ) -> str:
        """
        Convert a complete podcast script to audio.
        
        Args:
            script: List of script segments with timestamp, speaker, text
            voice_mapping: Optional custom voice ID mapping {speaker: voice_id}
            output_path: Output file path for the final audio
            
        Returns:
            Path to the generated audio file
        """
        if not script:
            raise ValueError("Script cannot be empty")
        
        # Use the pre-configured pydub with imageio-ffmpeg
        try:
            from pydub.silence import split_on_silence
            print(f"🔧 Pydub AudioSegment.converter: {AudioSegment.converter}")
            print(f"🔧 Pydub AudioSegment.ffmpeg: {AudioSegment.ffmpeg}")
            print(f"🔧 Pydub AudioSegment.ffprobe: {AudioSegment.ffprobe}")
        except ImportError:
            raise ImportError("pydub is required for audio processing. Install with: pip install pydub")
        
        # Use custom voices or defaults
        voices = voice_mapping or self.default_voices
        
        # Generate audio segments for each line
        print(f"Converting {len(script)} script segments to audio...")
        audio_segments = []
        
        for i, segment in enumerate(script):
            speaker = segment["speaker"].upper()
            text = segment["text"]
            
            print(f"Processing segment {i+1}/{len(script)}: {speaker}")
            
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
            
            # Add natural pause after each segment (0.5-1 second)
            pause_duration = 750 if speaker == "HOST" else 500  # Host gets slightly longer pauses
            silence = AudioSegment.silent(duration=pause_duration)
            
            audio_segments.append(audio_segment + silence)
        
        # Combine all audio segments
        print("Combining audio segments...")
        final_audio = sum(audio_segments)
        
        # Add intro/outro music bed (optional)
        final_audio = self.add_intro_outro(final_audio)
        
        # Export as WAV
        print(f"📁 Exporting to {output_path}...")
        try:
            final_audio.export(output_path, format="wav")
            print(f"✅ Successfully exported to {output_path}")
        except Exception as e:
            print(f"❌ Failed to export audio: {e}")
            raise
        
        return output_path
    
    async def text_to_speech(
        self,
        text: str,
        voice_id: str,
        model_id: str = "eleven_multilingual_v2"
    ) -> bytes:
        """
        Convert text to speech using ElevenLabs API.
        
        Args:
            text: Text to convert
            voice_id: ElevenLabs voice ID
            model_id: Model to use for generation
            
        Returns:
            Audio data as bytes
        """
        url = f"{self.base_url}/text-to-speech/{voice_id}"
        
        data = {
            "text": text,
            "model_id": model_id,
            "voice_settings": self.voice_settings
        }
        
        response = requests.post(url, json=data, headers=self.headers)
        
        if response.status_code != 200:
            raise Exception(f"ElevenLabs API error: {response.status_code} - {response.text}")
        
        return response.content
    
    def add_intro_outro(self, audio):
        """
        Add intro and outro to the podcast (optional background music or jingles).
        
        Args:
            audio: Main podcast audio
            
        Returns:
            Audio with intro/outro added
        """
        try:
            from pydub.generators import Sine
            
            # Create simple intro/outro tones (you can replace with actual music files)
            intro_tone = self.generate_simple_tone(frequency=440, duration=2000)  # 2 seconds
            outro_tone = self.generate_simple_tone(frequency=330, duration=2000)  # 2 seconds
            
            # Fade in/out the main audio
            audio_with_fades = audio.fade_in(1000).fade_out(1000)
            
            # Combine: intro + main audio + outro
            final_audio = intro_tone + audio_with_fades + outro_tone
            
            return final_audio
        except ImportError:
            # If pydub.generators is not available, just return the original audio
            return audio.fade_in(1000).fade_out(1000)
    
    def generate_simple_tone(self, frequency: int, duration: int):
        """
        Generate a simple tone for intro/outro.
        
        Args:
            frequency: Frequency in Hz
            duration: Duration in milliseconds
            
        Returns:
            AudioSegment with the tone
        """
        try:
            from pydub.generators import Sine
            
            tone = Sine(frequency).to_audio_segment(duration=duration)
            # Make it quieter (background level)
            return tone - 20  # Reduce volume by 20dB
        except ImportError:
            # Return silence if generators not available
            return AudioSegment.silent(duration=duration)
    
    async def get_available_voices(self) -> List[Dict[str, str]]:
        """
        Get list of available voices from ElevenLabs.
        
        Returns:
            List of voice information
        """
        url = f"{self.base_url}/voices"
        headers = {"xi-api-key": self.api_key}
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            raise Exception(f"Failed to get voices: {response.status_code} - {response.text}")
        
        voices_data = response.json()
        
        # Extract useful information
        voices = []
        for voice in voices_data.get("voices", []):
            voices.append({
                "voice_id": voice["voice_id"],
                "name": voice["name"],
                "category": voice.get("category", "Unknown"),
                "description": voice.get("description", "No description")
            })
        
        return voices
    
    def estimate_generation_cost(self, script: List[Dict[str, str]]) -> Dict[str, float]:
        """
        Estimate the cost of generating audio for the script.
        
        Args:
            script: Podcast script
            
        Returns:
            Cost estimation information
        """
        total_characters = sum(len(segment["text"]) for segment in script)
        
        # ElevenLabs pricing (approximate - check current rates)
        cost_per_character = 0.00003  # $0.03 per 1000 characters
        estimated_cost = total_characters * cost_per_character
        
        return {
            "total_characters": total_characters,
            "estimated_cost_usd": round(estimated_cost, 4),
            "estimated_minutes": total_characters / 800  # Rough estimate: 800 chars per minute
        }
    
    def create_voice_mapping(self, host_voice_id: str, expert_voice_id: str) -> Dict[str, str]:
        """
        Create a voice mapping for different speakers.
        
        Args:
            host_voice_id: ElevenLabs voice ID for the host
            expert_voice_id: ElevenLabs voice ID for the expert
            
        Returns:
            Voice mapping dictionary
        """
        return {
            "HOST": host_voice_id,
            "EXPERT": expert_voice_id
        } 