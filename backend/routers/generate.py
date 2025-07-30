from fastapi import APIRouter, HTTPException
from backend.features.diagram.models import GenerateDiagramRequest, GenerateDiagramResponse, ErrorResponse
from backend.features.diagram.services import LLMService
from backend.services.exceptions import (
    RateLimitExceededException,
    AuthenticationException,
    APITimeoutException,
    LLMServiceException,
    GitBridgeAPIException
)

router = APIRouter()
llm_service = LLMService()

@router.post("/generate-diagram", response_model=GenerateDiagramResponse)
async def generate_diagram(request: GenerateDiagramRequest):
    """
    Generate a Mermaid.js diagram from file tree and README content.
    
    Args:
        request: Contains file tree and optional README content
        
    Returns:
        Mermaid.js diagram code and explanation
    """
    try:
        # Validate input
        if not request.file_tree or request.file_tree.strip() == "":
            raise HTTPException(status_code=400, detail="File tree is required")
        
        # Generate diagram using the 3-step pipeline
        result = await llm_service.generate_diagram_pipeline(
            file_tree=request.file_tree,
            readme_content=request.readme_content
        )
        
        return GenerateDiagramResponse(
            diagram_code=result["diagram_code"],
            explanation=result["explanation"]
        )
        
    except RateLimitExceededException as e:
        raise HTTPException(status_code=429, detail=e.message)
    except AuthenticationException as e:
        raise HTTPException(status_code=401, detail=e.message)
    except APITimeoutException as e:
        raise HTTPException(status_code=408, detail=e.message)
    except LLMServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GitBridgeAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate diagram: {str(e)}")

@router.post("/test-llm")
async def test_llm_prompt(request: dict):
    """
    Test endpoint for LLM prompts (for debugging).
    
    Args:
        request: Dictionary with prompt and optional parameters
        
    Returns:
        LLM response
    """
    try:
        prompt = request.get("prompt")
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        response = llm_service.run_prompt(prompt)
        
        return {"response": response}
        
    except RateLimitExceededException as e:
        raise HTTPException(status_code=429, detail=e.message)
    except AuthenticationException as e:
        raise HTTPException(status_code=401, detail=e.message)
    except APITimeoutException as e:
        raise HTTPException(status_code=408, detail=e.message)
    except LLMServiceException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except GitBridgeAPIException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM test failed: {str(e)}")

@router.get("/health/llm")
async def llm_health_check():
    """
    Health check for LLM service.
    
    Returns:
        LLM service status
    """
    try:
        # Test with a simple prompt
        test_prompt = "Hello, this is a health check. Please respond with 'OK'."
        response = llm_service.run_prompt(test_prompt)
        
        return {
            "status": "healthy",
            "response": response.strip(),
            "model": "qwen/qwen3-32b"
        }
        
    except RateLimitExceededException as e:
        raise HTTPException(status_code=429, detail=e.message)
    except AuthenticationException as e:
        raise HTTPException(status_code=401, detail=e.message)
    except APITimeoutException as e:
        raise HTTPException(status_code=408, detail=e.message)
    except LLMServiceException as e:
        raise HTTPException(status_code=503, detail=f"LLM service unhealthy: {e.message}")
    except GitBridgeAPIException as e:
        raise HTTPException(status_code=503, detail=f"LLM service unhealthy: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM service unhealthy: {str(e)}") 