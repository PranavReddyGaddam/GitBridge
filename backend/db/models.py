# Database models for future Drizzle ORM integration
# This is a placeholder for future database functionality

from typing import Optional
from datetime import datetime

# Example models (not implemented yet)
class Repository:
    """Repository model for storing parsed repository data."""
    id: str
    name: str
    description: Optional[str]
    file_tree: str
    readme_content: Optional[str]
    created_at: datetime
    updated_at: datetime

class Diagram:
    """Diagram model for storing generated diagrams."""
    id: str
    repository_id: str
    diagram_code: str
    explanation: Optional[str]
    created_at: datetime

class User:
    """User model for future authentication."""
    id: str
    email: str
    github_username: Optional[str]
    created_at: datetime 