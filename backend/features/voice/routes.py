from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Response, Query
from fastapi.responses import StreamingResponse, JSONResponse
from .stt import SpeechToTextService
from .llm import LLMService
from .tts import TTSService
from .state import VoiceSessionManager
from backend.services.github import GitHubService
from backend.features.podcast.services_llm import PodcastLLMService
import io
import logging
import os
import tempfile
from pydub import AudioSegment

logger = logging.getLogger("voice.routes")

router = APIRouter()

# Initialize services and session manager
stt_service = SpeechToTextService()
llm_service = LLMService()
tts_service = TTSService()
session_manager = VoiceSessionManager()
github_service = GitHubService()
podcast_llm_service = PodcastLLMService()

def get_session_id(request: Request) -> str:
    # Try to get session_id from header, query param, or fallback to client IP
    sid = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
    if not sid:
        sid = request.client.host  # fallback (not secure for prod)
    return sid

@router.post('/stt')
async def stt_endpoint(request: Request, audio: UploadFile = File(...)):
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    try:
        audio_bytes = await audio.read()
        logger.info(f"Received audio file: {audio.filename}, content_type: {audio.content_type}, size: {len(audio_bytes)} bytes")
        
        # Create temporary files for input and output
        with tempfile.NamedTemporaryFile(suffix='.tmp', delete=False) as tmp_input:
            tmp_input.write(audio_bytes)
            tmp_input.flush()
            tmp_input_path = tmp_input.name
            
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_output:
            tmp_output_path = tmp_output.name
        
        try:
            # Convert audio to WAV format using pydub
            logger.info("Converting audio to WAV format...")
            
            # Try to detect format from content type or filename
            if audio.content_type:
                if 'webm' in audio.content_type:
                    audio_format = 'webm'
                elif 'mp3' in audio.content_type:
                    audio_format = 'mp3'
                elif 'wav' in audio.content_type:
                    audio_format = 'wav'
                elif 'ogg' in audio.content_type:
                    audio_format = 'ogg'
                else:
                    audio_format = None
            else:
                audio_format = None
            
            # Load audio with pydub (auto-detect format if not specified)
            try:
                if audio_format:
                    audio_segment = AudioSegment.from_file(tmp_input_path, format=audio_format)
                else:
                    audio_segment = AudioSegment.from_file(tmp_input_path)
                
                # Convert to mono, 16kHz WAV
                audio_segment = audio_segment.set_channels(1)  # Convert to mono
                audio_segment = audio_segment.set_frame_rate(16000)  # Set to 16kHz
                
                # Export as WAV
                audio_segment.export(tmp_output_path, format="wav")
                logger.info(f"Successfully converted audio to WAV: {tmp_output_path}")
                
            except Exception as e:
                logger.error(f"Audio conversion failed: {e}")
                raise HTTPException(status_code=400, detail=f"Unsupported audio format: {e}")
            
            # Now transcribe the converted WAV file
            transcript_segments = await stt_service.transcribe(tmp_output_path)
            
        finally:
            # Clean up temporary files
            if os.path.exists(tmp_input_path):
                os.remove(tmp_input_path)
            if os.path.exists(tmp_output_path):
                os.remove(tmp_output_path)
        
        # Combine segments into a single transcript
        transcript = " ".join([seg[2] for seg in transcript_segments])
        logger.info(f"Final transcript: {transcript}")
        
        session.set_last_transcript(transcript)
        session.add_message("user", transcript)
        return {"transcript": transcript, "segments": transcript_segments}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")

@router.post('/ask')
async def ask_endpoint(request: Request, body: dict):
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    transcript = body.get("transcript")
    if not transcript:
        raise HTTPException(status_code=400, detail="Missing transcript")
    session.add_message("user", transcript)
    # Prepare context with full history
    context = {"messages": session.get_history()}
    try:
        response = await llm_service.ask(transcript, context=context)
        session.add_message("assistant", response)
        return {"response": response}
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="LLM failed")

@router.post('/tts-download')
async def tts_download_endpoint(request: Request, body: dict):
    """
    Alternative TTS endpoint that returns audio as a downloadable file.
    Better compatibility with FastAPI docs interface.
    """
    text = body.get("text")
    voice_id = body.get("voice_id", "Matthew")
    language_code = body.get("language_code", "en-US")
    use_cache = body.get("use_cache", False)
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")
    
    logger.info(f"TTS download request: text='{text[:50]}...', voice_id={voice_id}")
    
    try:
        audio_bytes = tts_service.synthesize_speech(
            text=text,
            voice_id=voice_id,
            language_code=language_code,
            use_cache=use_cache
        )
        
        if not audio_bytes:
            logger.error("TTS service returned None/empty audio")
            raise HTTPException(status_code=500, detail="No audio generated")
        
        logger.info(f"TTS download success: Generated {len(audio_bytes)} bytes of audio")
        
        # Return as file response (forces download)
        from fastapi.responses import Response
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"attachment; filename=tts_{voice_id}_{len(text)[:10]}.mp3",
                "Content-Length": str(len(audio_bytes))
            }
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"TTS download error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS download failed: {str(e)}")

@router.post('/tts')
async def tts_endpoint(request: Request, body: dict):
    text = body.get("text")
    voice_id = body.get("voice_id", "Matthew")
    language_code = body.get("language_code", "en-US")
    use_cache = body.get("use_cache", False)
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")
    
    logger.info(f"TTS request: text='{text[:50]}...', voice_id={voice_id}")
    
    try:
        audio_bytes = tts_service.synthesize_speech(
            text=text,
            voice_id=voice_id,
            language_code=language_code,
            use_cache=use_cache
        )
        
        if not audio_bytes:
            logger.error("TTS service returned None/empty audio")
            raise HTTPException(status_code=500, detail="No audio generated")
        
        logger.info(f"TTS success: Generated {len(audio_bytes)} bytes of audio")
        
        # Create proper streaming response with headers
        response = StreamingResponse(
            io.BytesIO(audio_bytes), 
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f"attachment; filename=tts_audio_{voice_id}.mp3",
                "Content-Length": str(len(audio_bytes)),
                "Accept-Ranges": "bytes"
            }
        )
        return response
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS failed: {str(e)}")

@router.get('/status')
def status_endpoint(request: Request):
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    return {"state": session.get_state()}

@router.post('/interrupt')
def interrupt_endpoint(request: Request):
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    session.interrupt()
    return {"status": "interrupted"}

@router.get('/voices')
def voices_endpoint(language_code: str = Query("en-US")):
    try:
        voices = tts_service.list_voices(language_code=language_code)
        return JSONResponse(content={"voices": voices})
    except Exception as e:
        logger.error(f"Voices error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list voices")

@router.post('/analyze-repo')
async def analyze_repo_for_voice(request: Request, body: dict):
    """
    Analyze a GitHub repository for voice conversations and generate an introduction.
    """
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    
    try:
        repo_url = body.get("repo_url")
        if not repo_url:
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        logger.info(f"Analyzing repository for voice: {repo_url}")
        
        # Step 1: Get repository data using existing GitHub service
        repo_data = await github_service.get_repository_data(repo_url)
        
        # Step 2: Analyze repository using podcast LLM service for rich insights
        analysis = await podcast_llm_service.analyze_repository_for_podcast(
            file_tree=repo_data["file_tree"],
            readme_content=repo_data["readme_content"],
            repo_name=repo_data["repo_name"]
        )
        
        # Step 3: Create system context for the voice AI
        system_context = f"""You are an AI assistant with deep knowledge of the GitHub repository: {repo_data["repo_name"]}

Repository Description: {repo_data.get("repo_description", "No description available")}

REPOSITORY ANALYSIS:
{analysis}

FILE STRUCTURE:
{repo_data["file_tree"]}

README CONTENT:
{repo_data.get("readme_content", "No README available")}

You should provide helpful, accurate information about this specific repository. You can discuss:
- The repository's architecture, structure, and organization
- Technologies, frameworks, and dependencies used
- Code patterns and best practices evident in the codebase
- Potential improvements or optimizations
- How different components work together
- Development workflow and project setup
- Specific files and their purposes

Keep your responses conversational and helpful as if you're pair programming with the user. Always reference specific parts of the codebase when relevant."""

        # Step 4: Initialize session with rich context
        session.clear_history()  # Clear any existing history
        session.add_message("system", system_context)
        
        # Step 5: Generate personalized introduction
        repo_name = repo_data["repo_name"]
        introduction_text = f"""Hello! I'm your AI assistant, and I'm excited to discuss the {repo_name} repository with you today. 

I've analyzed the codebase and I'm ready to help you understand its architecture, explore the code structure, discuss best practices, or answer any questions you might have about this project. 

What would you like to know about {repo_name}?"""

        # Step 6: Store introduction text in session context for later retrieval
        session.set_context({
            'repo_name': repo_name,
            'repo_description': repo_data.get("repo_description", ""),
            'introduction_text': introduction_text,
            'analysis_summary': analysis[:500] + "..." if len(analysis) > 500 else analysis
        })
        
        # Step 7: Generate introduction audio
        logger.info("Generating introduction audio...")
        introduction_audio = tts_service.synthesize_speech(
            text=introduction_text,
            voice_id="Matthew",
            language_code="en-US",
            use_cache=False
        )
        
        if not introduction_audio:
            logger.error("Failed to generate introduction audio")
            raise HTTPException(status_code=500, detail="Failed to generate introduction audio")
        
        logger.info(f"Successfully analyzed repository and generated introduction for {repo_name}")
        
        return {
            "success": True,
            "repo_name": repo_name,
            "repo_description": repo_data.get("repo_description", ""),
            "analysis_summary": analysis[:500] + "..." if len(analysis) > 500 else analysis,
            "introduction_text": introduction_text,
            "introduction_audio_size": len(introduction_audio)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Repository analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {str(e)}")

@router.get('/introduction-audio')
async def get_introduction_audio(request: Request):
    """
    Get the introduction audio for the current session.
    """
    session_id = get_session_id(request)
    session = session_manager.get_session(session_id)
    
    try:
        # Get the stored introduction text from session context
        context = session.get_context()
        intro_text = context.get('introduction_text')
        
        if not intro_text:
            # Fallback to generic introduction
            intro_text = "Hello! I'm ready to discuss your repository. What would you like to know?"
        
        audio_bytes = tts_service.synthesize_speech(
            text=intro_text,
            voice_id="Matthew",
            language_code="en-US",
            use_cache=False
        )
        
        if not audio_bytes:
            raise HTTPException(status_code=500, detail="Failed to generate audio")
        
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=intro.mp3",
                "Content-Length": str(len(audio_bytes)),
                "Accept-Ranges": "bytes"
            }
        )
        
    except Exception as e:
        logger.error(f"Introduction audio error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get introduction audio: {str(e)}") 