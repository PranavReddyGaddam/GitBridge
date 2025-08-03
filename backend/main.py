import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Add the current directory to Python path for relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import routers directly from their modules
from features.diagram.routes import router as diagram_router
from routers.generate import router as generate_router
from features.podcast.routes import router as podcast_router
from features.voice.routes import router as voice_router

# Load environment variables from the backend directory
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

app = FastAPI(
    title="GitBridge API",
    description="GitHub repository diagram generator backend",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(diagram_router, prefix="/api", tags=["parse"])
app.include_router(generate_router, prefix="/api", tags=["generate"])
app.include_router(podcast_router, prefix="/api", tags=["podcast"])
app.include_router(voice_router, prefix="/api/voice", tags=["voice"])

@app.get("/")
async def root():
    return {"message": "GitBridge API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/analyze-repo")
async def analyze_repo(request: dict):
    """
    Analyze a GitHub repository to provide context for voice conversations.
    This is a simplified version that provides basic repository information.
    """
    try:
        repo_url = request.get("repo_url", "")
        if not repo_url:
            raise HTTPException(status_code=400, detail="Repository URL is required")
        
        # Extract owner and repo name from URL
        import re
        match = re.search(r"github\.com/([^/]+)/([^/]+)", repo_url)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid GitHub repository URL")
        
        owner, repo_name = match.groups()
        
        # For now, return basic information
        # In a full implementation, you could use GitHub API to fetch real data
        repo_info = {
            "structure": {
                "owner": owner,
                "name": repo_name,
                "type": "repository"
            },
            "key_files": ["README.md", "package.json", "src/", "docs/"],
            "technologies": ["JavaScript", "TypeScript", "Python", "React"],
            "description": f"Repository {owner}/{repo_name} - A software project hosted on GitHub."
        }
        
        return repo_info
        
    except HTTPException:
        raise
    except Exception as e:
        # Fallback response for any errors
        return {
            "structure": {"type": "unknown"},
            "key_files": [],
            "technologies": [],
            "description": "Repository analysis not available"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 