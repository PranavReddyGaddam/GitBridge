#!/usr/bin/env python3
"""
Development startup script for GitBridge backend.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables from the backend directory
backend_dir = Path(__file__).parent
load_dotenv(backend_dir / ".env")

def main():
    """Start the FastAPI development server."""
    import uvicorn
    
    # Check if required environment variables are set
    required_vars = ["OPENROUTER_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📝 Please check your .env file in the backend directory.")
        sys.exit(1)
    
    print("🚀 Starting GitBridge backend...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main() 