"""
Custom exceptions for GitBridge backend services.
"""

class GitBridgeAPIException(Exception):
    """Base exception for all GitBridge API errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class RateLimitExceededException(GitBridgeAPIException):
    """Exception raised when API rate limit is exceeded."""
    def __init__(self, message: str = "Rate limit exceeded. Please wait a few minutes and try again."):
        super().__init__(message, status_code=429)

class AuthenticationException(GitBridgeAPIException):
    """Exception raised when API authentication fails."""
    def __init__(self, message: str = "Authentication failed. Please check API credentials."):
        super().__init__(message, status_code=401)

class APITimeoutException(GitBridgeAPIException):
    """Exception raised when API request times out."""
    def __init__(self, message: str = "Request timed out. Please try again."):
        super().__init__(message, status_code=408)

class APIQuotaExceededException(GitBridgeAPIException):
    """Exception raised when API quota is exceeded."""
    def __init__(self, message: str = "API quota exceeded. Please check your account limits."):
        super().__init__(message, status_code=429)

class RepositoryNotFoundException(GitBridgeAPIException):
    """Exception raised when GitHub repository is not found."""
    def __init__(self, message: str = "Repository not found. Please check the URL and ensure it's public."):
        super().__init__(message, status_code=404)

class LLMServiceException(GitBridgeAPIException):
    """Exception raised when LLM service encounters an error."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message, status_code) 