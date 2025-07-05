from fastapi import APIRouter, HTTPException
from models.schema import ParseRepoRequest, ParseRepoResponse, ErrorResponse
from services.github import GitHubService

router = APIRouter()
github_service = GitHubService()

@router.post("/parse-repo", response_model=ParseRepoResponse)
async def parse_repository(request: ParseRepoRequest):
    """
    Parse a GitHub repository and return its file tree and README content.
    
    Args:
        request: Contains the GitHub repository URL
        
    Returns:
        Repository data including file tree and README content
    """
    try:
        # Convert URL to string for processing
        repo_url = str(request.repo_url)
        
        # Fetch repository data
        repo_data = await github_service.get_repository_data(repo_url)
        
        return ParseRepoResponse(
            file_tree=repo_data["file_tree"],
            readme_content=repo_data["readme_content"],
            repo_name=repo_data["repo_name"],
            repo_description=repo_data["repo_description"]
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse repository: {str(e)}")

@router.get("/repo-info/{repo_url:path}")
async def get_repository_info(repo_url: str):
    """
    Get basic information about a GitHub repository.
    
    Args:
        repo_url: GitHub repository URL
        
    Returns:
        Basic repository information
    """
    try:
        # Decode URL if needed
        import urllib.parse
        decoded_url = urllib.parse.unquote(repo_url)
        
        repo_info = github_service.get_repo_info(decoded_url)
        return repo_info
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get repository info: {str(e)}") 