import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import parse, generate

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
app.include_router(parse.router, prefix="/api", tags=["parse"])
app.include_router(generate.router, prefix="/api", tags=["generate"])

@app.get("/")
async def root():
    return {"message": "GitBridge API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 