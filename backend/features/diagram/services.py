import os
import requests
import json
import re
import sys
from typing import Dict, Any, Optional, List
from pathlib import Path

# Add the backend directory to the path for imports
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import using direct module paths
from features.diagram.models import LLMPromptRequest, LLMPromptResponse
from services.exceptions import (
    RateLimitExceededException, 
    AuthenticationException, 
    APITimeoutException,
    LLMServiceException
)

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")
        
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "GitBridge-Diagram-Generator"
        }
        
        self.base_system_message = (
            "You are a helpful assistant. Answer clearly and concisely."
        )
    
    async def generate_system_design_explanation(
        self, 
        file_tree: str, 
        readme_content: Optional[str] = None
    ) -> str:
        """
        Step 1: Generate system design explanation from file tree and README.
        
        Args:
            file_tree: Formatted file tree string
            readme_content: Optional README content
            
        Returns:
            System design explanation
        """
        max_retries = 2
        for attempt in range(max_retries):
            try:
                prompt = self._build_system_design_prompt(file_tree, readme_content)
                response = await self._call_openrouter(prompt, max_tokens=1500)
                return response.strip()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                continue
    
    async def map_explanation_to_files(
        self, 
        explanation: str, 
        file_tree: str
    ) -> str:
        """
        Step 2: Map system design explanation to relevant file/directory paths.
        
        Args:
            explanation: System design explanation from step 1
            file_tree: Formatted file tree string
            
        Returns:
            Mapping of explanation to file paths
        """
        max_retries = 2
        for attempt in range(max_retries):
            try:
                prompt = self._build_file_mapping_prompt(explanation, file_tree)
                response = await self._call_openrouter(prompt, max_tokens=1000)
                return response.strip()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                continue
    
    @staticmethod
    def remove_unsupported_mermaid_syntax(mermaid_code: str) -> str:
        """
        Remove unsupported Mermaid syntax and problematic references from the diagram code.
        """
        lines = mermaid_code.splitlines()
        filtered = []
        
        for line in lines:
            line = line.strip()
            
            # Remove style lines
            if line.startswith('style '):
                continue
                
            # Remove any dynamic import references
            if 'import(' in line or 'require(' in line:
                continue
                
            # Remove any module references that might cause issues
            if 'module:' in line or 'dynamic:' in line:
                continue
                
            # Remove any problematic click events that reference non-existent files
            if line.startswith('click ') and ('flowDiagram' in line or '.js' in line):
                continue
                
            # Keep the line if it passes all filters
            filtered.append(line)
        
        return '\n'.join(filtered)

    @staticmethod
    def validate_mermaid_code(mermaid_code: str) -> bool:
        """
        Validate that the generated code looks like valid Mermaid syntax.
        """
        if not mermaid_code or len(mermaid_code.strip()) < 50:
            return False
        
        # Check for basic Mermaid keywords
        mermaid_keywords = ['flowchart', 'graph', 'classDef', 'subgraph', '-->', '---']
        has_keywords = any(keyword in mermaid_code for keyword in mermaid_keywords)
        
        # Check for basic structure
        has_structure = ('flowchart' in mermaid_code or 'graph' in mermaid_code) and ('-->' in mermaid_code or '---' in mermaid_code)
        
        return has_keywords and has_structure

    async def generate_mermaid_diagram(
        self, 
        explanation: str, 
        file_mapping: str
    ) -> str:
        """
        Step 3: Generate Mermaid.js diagram code from explanation and file mapping.
        
        Args:
            explanation: System design explanation
            file_mapping: File mapping from step 2
            
        Returns:
            Mermaid.js diagram code
        """
        max_retries = 2
        for attempt in range(max_retries):
            try:
                prompt = self._build_mermaid_prompt(explanation, file_mapping)
                response = await self._call_openrouter(prompt, max_tokens=2000)
                mermaid_code = self.remove_unsupported_mermaid_syntax(response)
                
                # Validate the generated code
                if self.validate_mermaid_code(mermaid_code):
                    return mermaid_code
                else:
                    raise Exception("Generated Mermaid code is invalid")
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                continue
    
    async def generate_diagram_pipeline(
        self,
        file_tree: str,
        readme_content: Optional[str] = None,
    ) -> dict:
        """
        Complete 3-step pipeline to generate Mermaid diagram and explanation.
        
        Args:
            file_tree: Formatted file tree string
            readme_content: Optional README content
            
        Returns:
            Dictionary with diagram_code and explanation
        """
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Step 1: Generate system design explanation
                explanation = await self.generate_system_design_explanation(file_tree, readme_content)
                
                # Step 2: Map explanation to files
                file_mapping = await self.map_explanation_to_files(explanation, file_tree)
                
                # Step 3: Generate Mermaid diagram
                mermaid_code = await self.generate_mermaid_diagram(explanation, file_mapping)
                mermaid_code = self.remove_unsupported_mermaid_syntax(mermaid_code)
                
                # Validate that we got a reasonable diagram
                if mermaid_code and len(mermaid_code.strip()) > 50:
                    return {"diagram_code": mermaid_code, "explanation": explanation}
                else:
                    raise Exception("Generated diagram is too short or empty")
                    
            except Exception as e:
                if attempt == max_retries - 1:
                    # Last attempt failed, raise the error
                    raise e
                # Continue to next attempt
                continue
        
        raise Exception("Failed to generate diagram after all retry attempts")
    
    def _make_request(self, messages: List[Dict]) -> str:
        """
        Make API call to OpenRouter using requests library.
        
        Args:
            messages: List of message dictionaries with role and content
            
        Returns:
            Generated response text
        """
        payload = {
            "model": "qwen/qwen3-32b",
            "provider": {
                "only": ["Cerebras"]
            },
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 12000
        }

        try:
            response = requests.post(self.url, headers=self.headers, json=payload, timeout=60)

            # Handle specific HTTP status codes
            if response.status_code == 429:
                raise RateLimitExceededException("Rate limit exceeded. Please wait a few minutes before trying again.")
            elif response.status_code == 401:
                raise AuthenticationException("Invalid API key or authentication failed.")
            elif response.status_code == 403:
                raise AuthenticationException("Access forbidden. Please check your API key permissions.")
            elif response.status_code == 408:
                raise APITimeoutException("Request timed out. Please try again.")
            
            response.raise_for_status()
            response_data = response.json()
            return response_data["choices"][0]["message"]["content"]

        except requests.exceptions.Timeout:
            raise APITimeoutException("Request timed out. The repository might be too large.")
        
        except requests.exceptions.ConnectionError:
            raise LLMServiceException("Failed to connect to AI service. Please check your internet connection.", 503)
        
        except (RateLimitExceededException, AuthenticationException, APITimeoutException):
            # Re-raise our custom exceptions
            raise
            
        except requests.exceptions.RequestException as e:
            # Handle other HTTP errors
            if hasattr(e, 'response') and e.response is not None:
                if e.response.status_code == 429:
                    raise RateLimitExceededException()
                elif e.response.status_code == 401:
                    raise AuthenticationException()
                elif e.response.status_code == 408:
                    raise APITimeoutException()
            
            raise LLMServiceException(f"OpenRouter API request failed: {str(e)}", 502)

        except Exception as e:
            raise LLMServiceException(f"Unexpected error in LLM service: {str(e)}", 500)

    def run_prompt(self, user_prompt: str) -> str:
        """
        Run a simple prompt with the LLM.
        
        Args:
            user_prompt: The user's prompt
            
        Returns:
            Generated response text
        """
        messages = [
            {"role": "system", "content": self.base_system_message},
            {"role": "user", "content": user_prompt}
        ]
        return self._make_request(messages)

    async def _call_openrouter(
        self, 
        prompt: str, 
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> str:
        """
        Make API call to OpenRouter (async wrapper for compatibility).
        
        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Generated response text
        """
        messages = [
            {"role": "system", "content": self.base_system_message},
            {"role": "user", "content": prompt}
        ]
        return self._make_request(messages)
    
    def _build_system_design_prompt(self, file_tree: str, readme_content: Optional[str] = None) -> str:
        """Build prompt for system design explanation."""
        SYSTEM_PROMPT_EXPLANATION_QWEN = """
You are GitBridge AI, a senior software architecture assistant. Your job is to help engineers understand how to draw the most accurate system architecture diagram of a given GitHub project.

You will receive:
- A complete file tree, marked by <file_tree>...</file_tree>
- A README file, marked by <readme>...</readme>

Your task:
1. Analyze the purpose and type of the project (e.g. full-stack app, tool, compiler, library)
2. Identify major architectural components (e.g. frontend, backend, database, APIs, workers)
3. Explain how the project is structured, including key interactions
4. Mention any notable design patterns, frameworks, or stack details

Then, output a detailed, step-by-step description enclosed in `<explanation>...</explanation>` tags. This description will later be used to draw the architecture diagram.

Be specific, clear, and avoid vague language. Do not include Mermaid or diagrams yet.
"""
        
        prompt = f"{SYSTEM_PROMPT_EXPLANATION_QWEN}\n\n<file_tree>\n{file_tree}\n</file_tree>\n"
        
        if readme_content:
            prompt += f"<readme>\n{readme_content}\n</readme>\n"
        
        return prompt
    
    def _build_file_mapping_prompt(self, explanation: str, file_tree: str) -> str:
        """Build prompt for mapping explanation to file paths."""
        SYSTEM_PROMPT_COMPONENT_MAP_QWEN = """
You are GitBridge AI, an expert in mapping software architecture components to their codebase locations.

You will receive:
- A system design explanation inside <explanation>...</explanation>
- A file tree inside <file_tree>...</file_tree>

Your task is to:
- Identify the key components mentioned in the explanation
- Match them to the most likely directory or file path in the file tree

Respond using this format:
<component_mapping>
1. [Component Name]: [File or Directory Path]
2. [Component Name]: [File or Directory Path]
...
</component_mapping>

Only include valid paths from the file tree. Do not invent files. Be as specific as possible, but skip uncertain components.
"""
        
        prompt = f"{SYSTEM_PROMPT_COMPONENT_MAP_QWEN}\n\n<explanation>\n{explanation}\n</explanation>\n\n<file_tree>\n{file_tree}\n</file_tree>"
        
        return prompt
    
    def _build_mermaid_prompt(self, explanation: str, file_mapping: str) -> str:
        """Build prompt for generating Mermaid diagram."""
        SYSTEM_PROMPT_MERMAID = '''
You are a principal software engineer tasked with creating a system design diagram using Mermaid.js based on a detailed explanation. Your goal is to accurately represent the architecture and design of the project as described in the explanation.

The detailed explanation of the design will be enclosed in <explanation> tags in the users message.

Also, sourced from the explanation, as a bonus, a few of the identified components have been mapped to their paths in the project file tree, whether it is a directory or file which will be enclosed in <component_mapping> tags in the users message.

To create the Mermaid.js diagram:

1. Carefully read and analyze the provided design explanation.
2. Identify the main components, services, and their relationships within the system.
3. Determine the appropriate Mermaid.js diagram type to use (e.g., flowchart, sequence diagram, class diagram, architecture, etc.) based on the nature of the system described.
4. Create the Mermaid.js code to represent the design, ensuring that:
   a. All major components are included
   b. Relationships between components are clearly shown
   c. The diagram accurately reflects the architecture described in the explanation
   d. The layout is logical and easy to understand

Guidelines for diagram components and relationships:
- Use appropriate shapes for different types of components (e.g., rectangles for services, cylinders for databases, etc.)
- Use clear and concise labels for each component
- Show the direction of data flow or dependencies using arrows
- Group related components together if applicable
- Include any important notes or annotations mentioned in the explanation
- Just follow the explanation. It will have everything you need.

IMPORTANT!!: Please orient and draw the diagram as vertically as possible. You must avoid long horizontal lists of nodes and sections!

IMPORTANT: Do NOT use the 'style' keyword for subgraphs or any subgraph styling. Only use 'classDef' and assign classes to nodes for coloring and styling. Do not use any Mermaid features that are not supported in version 11.7.0. Only use valid syntax for Mermaid 11.7.0.

You must include click events for components of the diagram that have been specified in the provided <component_mapping>:
- Do not try to include the full url. This will be processed by another program afterwards. All you need to do is include the path.
- For example:
  - This is a correct click event: `click Example "app/example.js"`
  - This is an incorrect click event: `click Example "https://github.com/username/repo/blob/main/app/example.js"`
- Do this for as many components as specified in the component mapping, include directories and files.
  - If you believe the component contains files and is a directory, include the directory path.
  - If you believe the component references a specific file, include the file path.
- Make sure to include the full path to the directory or file exactly as specified in the component mapping.
- It is very important that you do this for as many files as possible. The more the better.
- IMPORTANT: Only use simple file paths, avoid any JavaScript files (.js), TypeScript files (.ts), or any files that might cause dynamic imports.
- IMPORTANT: THESE PATHS ARE FOR CLICK EVENTS ONLY, these paths should not be included in the diagram's node's names. Only for the click events. Paths should not be seen by the user.

Your output should be valid Mermaid.js code that can be rendered into a diagram.

Do not include an init declaration such as `%%{init: {'key':'etc'}}%%`. This is handled externally. Just return the diagram code.

Your response must strictly be just the Mermaid.js code, without any additional text or explanations.
No code fence or markdown ticks needed, simply return the Mermaid.js code.

Ensure that your diagram adheres strictly to the given explanation, without adding or omitting any significant components or relationships. 

For general direction, the provided example below is how you should structure your code:

flowchart TD 
    %% or graph TD, your choice

    %% Global entities
    A("Entity A"):::external
    %% more...

    %% Subgraphs and modules
    subgraph "Layer A"
        A1("Module A"):::example
        %% more modules...
        %% inner subgraphs if needed...
    end

    %% more subgraphs, modules, etc...

    %% Connections
    A -->|"relationship"| B
    %% and a lot more...

    %% Click Events
    click A1 "example/example.js"
    %% and a lot more...

    %% Styles
    classDef frontend %%...
    %% and a lot more...

EXTREMELY Important notes on syntax!!! (PAY ATTENTION TO THIS):
- Make sure to add colour to the diagram!!! This is extremely critical.
- Use these specific color schemes for different component types:
  * Frontend/UI components: fill:#E3F2FD,stroke:#1976D2 (light blue)
  * Backend/API components: fill:#FFF8E1,stroke:#F57C00 (light orange)
  * Database/Storage: fill:#F3E5F5,stroke:#7B1FA2 (light purple)
  * External services: fill:#E8F5E8,stroke:#388E3C (light green)
  * Documentation: fill:#FCE4EC,stroke:#C2185B (light pink)
'''
        prompt = f"{SYSTEM_PROMPT_MERMAID}\n\n<explanation>\n{explanation}\n</explanation>\n\n<component_mapping>\n{file_mapping}\n</component_mapping>"
        return prompt
    
    def _extract_mermaid_code(self, response: str) -> str:
        """Extract Mermaid code from LLM response."""
        # Look for mermaid code blocks
        if "```mermaid" in response:
            start = response.find("```mermaid") + 10
            end = response.find("```", start)
            if end != -1:
                return response[start:end].strip()
        
        # Look for graph or flowchart keywords
        if "graph" in response or "flowchart" in response:
            # Try to extract the diagram code
            lines = response.split('\n')
            diagram_lines = []
            in_diagram = False
            
            for line in lines:
                if any(keyword in line.lower() for keyword in ['graph', 'flowchart', 'class', 'sequence']):
                    in_diagram = True
                
                if in_diagram:
                    diagram_lines.append(line)
                
                if in_diagram and line.strip() == '':
                    break
            
            if diagram_lines:
                return '\n'.join(diagram_lines).strip()
        
        # If no clear pattern found, return the whole response
        return response.strip() 