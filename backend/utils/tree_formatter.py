from typing import List, Dict, Any
import re

def format_file_tree(files: List[Dict[str, Any]]) -> str:
    """
    Format GitHub repository files into a clean indented tree structure.
    
    Args:
        files: List of file objects from GitHub API
        
    Returns:
        Formatted tree string with emoji icons
    """
    if not files:
        return "📁 (empty repository)"
    
    # Sort files: directories first, then files, both alphabetically
    sorted_files = sorted(files, key=lambda x: (x['type'] != 'dir', x['path'].lower()))
    
    tree_lines = []
    
    for file_info in sorted_files:
        path = file_info['path']
        file_type = file_info['type']
        
        # Calculate indentation level
        indent_level = path.count('/')
        indent = "  " * indent_level
        
        # Get the name (last part of path)
        name = path.split('/')[-1]
        
        # Choose appropriate emoji
        if file_type == 'dir':
            icon = "📁"
        else:
            # File type specific icons
            extension = name.split('.')[-1].lower() if '.' in name else ''
            icon = get_file_icon(extension, name)
        
        tree_lines.append(f"{indent}{icon} {name}")
    
    return "\n".join(tree_lines)

def get_file_icon(extension: str, filename: str) -> str:
    """Get appropriate emoji icon for file type."""
    
    # Common file extensions
    icon_map = {
        # Code files
        'py': '🐍', 'js': '📜', 'ts': '📜', 'jsx': '⚛️', 'tsx': '⚛️',
        'java': '☕', 'cpp': '⚙️', 'c': '⚙️', 'cs': '💎', 'php': '🐘',
        'rb': '💎', 'go': '🐹', 'rs': '🦀', 'swift': '🍎', 'kt': '☕',
        'scala': '☕', 'hs': 'λ', 'ml': '🐫', 'clj': '🍃', 'lisp': '🍃',
        
        # Web files
        'html': '🌐', 'htm': '🌐', 'css': '🎨', 'scss': '🎨', 'sass': '🎨',
        'xml': '📄', 'json': '📄', 'yaml': '📄', 'yml': '📄', 'toml': '📄',
        'ini': '⚙️', 'cfg': '⚙️', 'conf': '⚙️',
        
        # Data files
        'csv': '📊', 'xlsx': '📊', 'xls': '📊', 'db': '🗄️', 'sql': '🗄️',
        'md': '📝', 'txt': '📄', 'rst': '📝', 'adoc': '📝',
        
        # Media files
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
        'mp4': '🎥', 'avi': '🎥', 'mov': '🎥', 'mp3': '🎵', 'wav': '🎵',
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'ppt': '📗', 'pptx': '📗',
        
        # Archive files
        'zip': '📦', 'tar': '📦', 'gz': '📦', 'rar': '📦', '7z': '📦',
        
        # Config files
        'gitignore': '🚫', 'dockerfile': '🐳', 'docker-compose': '🐳',
        'package.json': '📦', 'requirements.txt': '🐍', 'pom.xml': '☕',
        'gemfile': '💎', 'cargo.toml': '🦀', 'go.mod': '🐹',
    }
    
    # Check for special filenames first
    if filename.lower() in icon_map:
        return icon_map[filename.lower()]
    
    # Check for extensions
    if extension in icon_map:
        return icon_map[extension]
    
    # Default file icon
    return "📄"

def clean_tree_output(tree_str: str) -> str:
    """
    Clean and format the tree output for better readability.
    """
    lines = tree_str.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Remove excessive whitespace
        line = line.strip()
        if line:
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines) 