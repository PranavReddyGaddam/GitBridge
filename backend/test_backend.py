#!/usr/bin/env python3
"""
Simple test script for GitBridge backend.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def test_github_service():
    """Test GitHub service functionality."""
    from services.github import GitHubService
    
    print("🧪 Testing GitHub Service...")
    
    try:
        github_service = GitHubService()
        
        # Test URL parsing
        test_url = "https://github.com/facebook/react"
        owner, repo = github_service.parse_repo_url(test_url)
        print(f"✅ URL parsing: {owner}/{repo}")
        
        # Test basic repo info (without full data fetch)
        repo_info = github_service.get_repo_info(test_url)
        print(f"✅ Repository info: {repo_info['name']} - {repo_info['description']}")
        
    except Exception as e:
        print(f"❌ GitHub service test failed: {e}")

async def test_llm_service():
    """Test LLM service functionality."""
    from services.llm import LLMService
    
    print("🧪 Testing LLM Service...")
    
    try:
        llm_service = LLMService()
        
        # Test simple prompt using the new method
        test_prompt = "Hello, this is a test. Please respond with 'OK'."
        response = llm_service.run_prompt(test_prompt)
        print(f"✅ LLM test response: {response.strip()}")
        
    except Exception as e:
        print(f"❌ LLM service test failed: {e}")

async def test_tree_formatter():
    """Test tree formatter functionality."""
    from utils.tree_formatter import format_file_tree, get_file_icon
    
    print("🧪 Testing Tree Formatter...")
    
    # Test file icons
    test_files = [
        {"path": "src/main.py", "type": "file", "name": "main.py"},
        {"path": "src/utils", "type": "dir", "name": "utils"},
        {"path": "README.md", "type": "file", "name": "README.md"},
        {"path": "package.json", "type": "file", "name": "package.json"}
    ]
    
    formatted_tree = format_file_tree(test_files)
    print("✅ Tree formatting:")
    print(formatted_tree)
    
    # Test file icons
    print(f"✅ File icons: {get_file_icon('py', 'main.py')} {get_file_icon('md', 'README.md')}")

def main():
    """Run all tests."""
    print("🚀 Starting GitBridge Backend Tests...")
    print("=" * 50)
    
    # Check environment
    print("🔍 Environment Check:")
    print(f"   OpenRouter API Key: {'✅ Set' if os.getenv('OPENROUTER_API_KEY') else '❌ Missing'}")
    print(f"   GitHub PAT: {'✅ Set' if os.getenv('GITHUB_PAT') else '⚠️  Not set (optional)'}")
    print()
    
    # Run tests
    asyncio.run(test_tree_formatter())
    print()
    
    try:
        asyncio.run(test_github_service())
        print()
    except Exception as e:
        print(f"⚠️  GitHub test skipped: {e}")
        print()
    
    try:
        asyncio.run(test_llm_service())
        print()
    except Exception as e:
        print(f"⚠️  LLM test skipped: {e}")
        print()
    
    print("✅ Tests completed!")

if __name__ == "__main__":
    main() 