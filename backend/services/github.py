import os
import sys
from typing import Optional, Dict, Any, List
from github import Github
from github.Repository import Repository
from github.ContentFile import ContentFile
from pathlib import Path

# Add the backend directory to the path for imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import using direct module paths
from utils.tree_formatter import format_file_tree, clean_tree_output

class GitHubService:
    def __init__(self):
        self.github_token = os.getenv("GITHUB_PAT")
        if self.github_token:
            self.github = Github(self.github_token)
        else:
            # Use unauthenticated access (limited rate)
            self.github = Github()
    
    def parse_repo_url(self, repo_url: str) -> tuple[str, str]:
        """
        Parse GitHub URL to extract owner and repo name.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Tuple of (owner, repo_name)
        """
        # Handle various GitHub URL formats
        url = repo_url.strip()
        
        # Remove trailing slash
        if url.endswith('/'):
            url = url[:-1]
        
        # Extract owner and repo from URL
        if 'github.com' in url:
            # https://github.com/owner/repo
            parts = url.split('github.com/')[-1].split('/')
            if len(parts) >= 2:
                return parts[0], parts[1]
        
        # Handle direct owner/repo format
        if '/' in url and 'github.com' not in url:
            parts = url.split('/')
            if len(parts) >= 2:
                return parts[0], parts[1]
        
        raise ValueError(f"Invalid GitHub repository URL: {repo_url}")
    
    async def get_repository_data(self, repo_url: str) -> Dict[str, Any]:
        """
        Fetch repository data including file tree and README.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Dictionary containing repository data
        """
        try:
            owner, repo_name = self.parse_repo_url(repo_url)
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            
            # Get repository metadata
            repo_data = {
                "repo_name": repo.name,
                "repo_description": repo.description,
                "file_tree": "",
                "readme_content": None
            }
            
            # Get file tree
            contents = repo.get_contents("")
            file_tree = self._get_file_tree_recursive(contents)
            nested_tree = self.build_nested_tree(file_tree)
            pretty_tree = self.pretty_print_tree(nested_tree)
            repo_data["file_tree"] = pretty_tree
            
            # Get README content
            readme_content = await self._get_readme_content(repo)
            if readme_content:
                repo_data["readme_content"] = readme_content
            
            return repo_data
            
        except Exception as e:
            raise Exception(f"Failed to fetch repository data: {str(e)}")
    
    def _get_file_tree_recursive(self, contents: List[ContentFile], parent_path: str = "") -> List[Dict[str, Any]]:
        """
        Recursively get file tree from GitHub contents.
        
        Args:
            contents: List of GitHub content files
            parent_path: Path to parent directory (for recursion)
            
        Returns:
            List of file dictionaries
        """
        files = []
        
        for content in contents:
            file_info = {
                "path": content.path,
                "type": content.type,
                "name": content.name
            }
            files.append(file_info)
            
            # Recursively get contents of directories
            if content.type == "dir":
                try:
                    sub_contents = content.get_contents()
                    sub_files = self._get_file_tree_recursive(sub_contents, content.path)
                    files.extend(sub_files)
                except Exception:
                    # Skip directories that can't be accessed
                    continue
        
        return files
    
    def build_nested_tree(self, files: List[Dict[str, Any]]) -> dict:
        """
        Build a nested dictionary representing the file tree.
        """
        tree = {}
        for file in files:
            parts = file["path"].split("/")
            current = tree
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    current[part] = {"type": file["type"]}
                else:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
        return tree
    
    def pretty_print_tree(self, tree: dict, indent: int = 0) -> str:
        """
        Pretty-print the nested tree with indentation and emoji.
        """
        lines = []
        for name, value in sorted(tree.items()):
            icon = "📁" if isinstance(value, dict) and value.get("type", "dir") == "dir" else "📄"
            lines.append("  " * indent + f"{icon} {name}")
            if isinstance(value, dict) and "type" not in value:
                lines.append(self.pretty_print_tree(value, indent + 1))
        return "\n".join(lines)
    
    async def _get_readme_content(self, repo: Repository) -> Optional[str]:
        """
        Get README content from repository.
        
        Args:
            repo: GitHub repository object
            
        Returns:
            README content as string or None
        """
        readme_variants = [
            "README.md", "README.rst", "README.txt", "README",
            "readme.md", "readme.rst", "readme.txt", "readme"
        ]
        
        for readme_name in readme_variants:
            try:
                readme = repo.get_contents(readme_name)
                if readme and hasattr(readme, 'decoded_content'):
                    return readme.decoded_content.decode('utf-8')
            except Exception:
                continue
        
        return None
    
    def get_repo_info(self, repo_url: str) -> Dict[str, Any]:
        """
        Get basic repository information.
        
        Args:
            repo_url: GitHub repository URL
            
        Returns:
            Basic repository information
        """
        try:
            owner, repo_name = self.parse_repo_url(repo_url)
            repo = self.github.get_repo(f"{owner}/{repo_name}")
            
            return {
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "language": repo.language,
                "stars": repo.stargazers_count,
                "forks": repo.forks_count,
                "url": repo.html_url,
                "created_at": repo.created_at.isoformat() if repo.created_at else None,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None
            }
        except Exception as e:
            raise Exception(f"Failed to get repository info: {str(e)}") 