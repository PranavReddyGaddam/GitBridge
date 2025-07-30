import os
import logging
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from typing import Optional, List, Dict
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger("voice.tts")

class TTSService:
    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        # Initialize AWS Polly only if credentials are available
        self.polly = None
        self.s3_client = None
        self.s3_bucket = os.getenv("TTS_S3_BUCKET")
        
        if self.aws_access_key_id and self.aws_secret_access_key:
            try:
                self.polly = boto3.client(
                    "polly",
                    aws_access_key_id=self.aws_access_key_id,
                    aws_secret_access_key=self.aws_secret_access_key,
                    region_name=self.aws_region
                )
                # S3 caching setup (optional, not enabled by default)
                if self.s3_bucket:
                    self.s3_client = boto3.client(
                        "s3",
                        aws_access_key_id=self.aws_access_key_id,
                        aws_secret_access_key=self.aws_secret_access_key,
                        region_name=self.aws_region
                    )
                logger.info("TTS initialized with AWS Polly")
            except Exception as e:
                logger.error(f"Failed to initialize AWS Polly: {e}")
                self.polly = None
        else:
            logger.warning("AWS credentials not found. TTS will return mock responses.")

    def synthesize_speech(
        self,
        text: str,
        voice_id: str = "Matthew",
        language_code: str = "en-US",
        engine: str = "neural",
        text_type: str = "text",
        retries: int = 2,
        use_cache: bool = False
    ) -> Optional[bytes]:
        """
        Synthesize speech using Amazon Polly if available, otherwise return mock audio.
        """
        if not self.polly:
            logger.info(f"AWS Polly not available. Returning mock audio for: '{text[:50]}...'")
            # Return a simple mock MP3 response for testing
            mock_mp3_data = b'\xff\xfb\x90\x00' + b'Mock TTS Audio Data - ' + text.encode()[:100] + b'\x00' * 500
            return mock_mp3_data
        
        cache_key = None
        if use_cache and self.s3_client and self.s3_bucket:
            import hashlib
            hash_input = f"{text}|{voice_id}|{language_code}|{engine}|{text_type}".encode()
            cache_key = f"tts_cache/{hashlib.sha256(hash_input).hexdigest()}.mp3"
            # Try to fetch from S3
            try:
                obj = self.s3_client.get_object(Bucket=self.s3_bucket, Key=cache_key)
                logger.info(f"TTS cache hit: {cache_key}")
                return obj["Body"].read()
            except self.s3_client.exceptions.NoSuchKey:
                logger.info(f"TTS cache miss: {cache_key}")   
            except Exception as e:
                logger.warning(f"TTS S3 cache error: {e}")
        
        # Synthesize with Polly
        for attempt in range(retries + 1):
            try:
                response = self.polly.synthesize_speech(
                    Text=text,
                    VoiceId=voice_id,
                    OutputFormat="mp3",
                    Engine=engine,
                    LanguageCode=language_code,
                    TextType=text_type
                )
                audio_stream = response.get("AudioStream")
                if audio_stream:
                    audio_bytes = audio_stream.read()
                    logger.info(f"Polly synthesis succeeded (voice={voice_id}, len={len(audio_bytes)})")
                    # Optionally cache to S3
                    if use_cache and self.s3_client and self.s3_bucket and cache_key:
                        try:
                            self.s3_client.put_object(Bucket=self.s3_bucket, Key=cache_key, Body=audio_bytes, ContentType="audio/mpeg")
                            logger.info(f"TTS audio cached to S3: {cache_key}")
                        except Exception as e:
                            logger.warning(f"Failed to cache TTS audio to S3: {e}")
                    return audio_bytes
                else:
                    logger.error("No AudioStream in Polly response.")
                    return None
            except (BotoCoreError, ClientError) as e:
                logger.error(f"Polly synthesis failed (attempt {attempt+1}): {e}")
                if attempt == retries:
                    return None
        return None

    def list_voices(self, language_code: str = "en-US") -> List[Dict]:
        """
        List available Polly voices for a given language code.
        Returns mock voices if AWS Polly is not available.
        """
        if not self.polly:
            # Return mock voices when AWS is not available
            return [
                {"VoiceId": "Matthew", "Name": "Matthew (Mock)", "Gender": "Male", "Engine": ["standard"], "LanguageCode": "en-US"},
                {"VoiceId": "Joanna", "Name": "Joanna (Mock)", "Gender": "Female", "Engine": ["standard"], "LanguageCode": "en-US"},
            ]
        
        try:
            response = self.polly.describe_voices(LanguageCode=language_code)
            voices = response.get("Voices", [])
            return [
                {
                    "VoiceId": v["Id"],
                    "Name": v.get("Name"),
                    "Gender": v.get("Gender"),
                    "Engine": v.get("SupportedEngines", []),
                    "LanguageCode": v.get("LanguageCode")
                }
                for v in voices
            ]
        except Exception as e:
            logger.error(f"Failed to list Polly voices: {e}")
            return []

# Note: For streaming audio, use FastAPI's StreamingResponse in your route, passing the bytes from synthesize_speech(). 