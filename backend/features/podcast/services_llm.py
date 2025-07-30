import os
import requests
import json
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class PodcastLLMService:
    """LLM service specifically for podcast script generation."""
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")
        
        self.url = "https://openrouter.ai/api/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "GitBridge-Podcast-Generator"
        }
        
        # Voice ID to speaker name mapping
        self.voice_mapping = {
            "BWGwF36RwZsLxWHtzZ3e": "Keiron",     # Keiron Welch
            "4VhEioWwLzhlRxXpucCZ": "Leon",       # Leon
            "sScFwemjGrAkDDiTXWMH": "Kelly",      # Kelly
            "GsjQ0ydx7QzhDLqInGtT": "Olivia",     # Olivia J
        }
    
    def get_speaker_names(self, voice_settings: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Get speaker names from voice settings.
        
        Returns:
            Dictionary with HOST and EXPERT mapped to actual speaker names
        """
        if not voice_settings:
            return {"HOST": "Host", "EXPERT": "Expert"}
        
        host_name = self.voice_mapping.get(voice_settings.get("host_voice_id", ""), "Host")
        expert_name = self.voice_mapping.get(voice_settings.get("expert_voice_id", ""), "Expert")
        
        return {"HOST": host_name, "EXPERT": expert_name}
    
    async def generate_podcast_script(
        self, 
        file_tree: str, 
        readme_content: Optional[str] = None,
        repo_name: str = "Unknown Repository",
        target_duration: int = 300,  # 5 minutes fixed
        voice_settings: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Complete 3-step pipeline to generate podcast script.
        
        Args:
            file_tree: Formatted file tree string
            readme_content: Optional README content
            repo_name: Name of the repository
            target_duration: Fixed at 300 seconds (5 minutes)
            
        Returns:
            Dictionary with podcast script and metadata
        """
        # Get speaker names from voice settings
        speaker_names = self.get_speaker_names(voice_settings)
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Step 1: Analyze repository and identify key discussion points
                analysis = await self.analyze_repository_for_podcast(file_tree, readme_content, repo_name)
                
                # Step 2: Structure conversation flow and key topics
                conversation_structure = await self.create_conversation_structure(analysis, target_duration, speaker_names)
                
                # Step 3: Generate natural dialogue script
                script = await self.generate_dialogue_script(conversation_structure, repo_name, target_duration, speaker_names)
                
                # Parse and format the script
                formatted_script = self.parse_script_format(script, speaker_names)
                
                # Generate metadata
                metadata = {
                    "repo_name": repo_name,
                    "episode_title": f"Deep Dive: Understanding {repo_name}",
                    "estimated_duration": self.estimate_duration(formatted_script),
                    "key_topics": self.extract_key_topics(analysis),
                    "generated_at": datetime.now().isoformat(),
                    "script_length": len(formatted_script)
                }
                
                return {
                    "podcast_script": formatted_script,
                    "metadata": metadata,
                    "raw_analysis": analysis
                }
                
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                continue
        
        raise Exception("Failed to generate podcast script after all retry attempts")
    
    async def analyze_repository_for_podcast(
        self, 
        file_tree: str, 
        readme_content: Optional[str] = None,
        repo_name: str = "Unknown Repository"
    ) -> str:
        """
        Step 1: Analyze repository structure and identify key discussion points for podcast.
        """
        
        prompt = f"""You are analyzing a GitHub repository to create talking points for an educational tech podcast.

Repository: {repo_name}

File Tree:
{file_tree}

README Content:
{readme_content or "No README available"}

Your task is to analyze this repository and identify:
1. What type of project this is (web app, API, library, etc.)
2. Key architectural decisions and patterns
3. Interesting technical choices worth discussing
4. Technologies and frameworks used
5. Complex or noteworthy parts that would be educational
6. Potential pain points or challenges the developers likely faced
7. Best practices or anti-patterns visible in the structure
8. Development workflow and project organization
9. Notable dependencies and their purposes
10. Scalability considerations and design patterns

Focus on aspects that would be interesting to discuss in a 5-minute educational podcast between a curious host and a technical expert who understands this codebase. You have enough time to cover 3-4 major topics in good depth, so prioritize the most educational and engaging aspects.

Provide a comprehensive analysis that will serve as the foundation for creating an engaging technical discussion."""

        response = await self._call_openrouter(prompt, max_tokens=2000)
        return response.strip()
    
    async def create_conversation_structure(
        self, 
        analysis: str, 
        target_duration: int = 300,
        speaker_names: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Step 2: Create a structured conversation flow optimized for 5-minute format.
        """
        # Get speaker names, defaulting to generic names if not provided
        names = speaker_names or {"HOST": "Host", "EXPERT": "Expert"}
        host_name = names["HOST"]
        expert_name = names["EXPERT"]
        
        prompt = f"""Based on the following repository analysis, create a structured conversation outline for a 5-minute tech podcast.

Repository Analysis:
{analysis}

Create a natural conversation structure with these sections:
1. Introduction (30-45 seconds) - {host_name} introduces the project and {expert_name}
2. Project Overview (60-90 seconds) - What is this project and why does it matter?
3. Architecture Deep Dive (120-150 seconds) - Key technical decisions and structure
4. Implementation Highlights (60-90 seconds) - Specific interesting code choices or patterns
5. Wrap-up (30-45 seconds) - Key takeaways and final thoughts

Target total duration: 5 minutes (300 seconds)

For each section, provide:
- Suggested time allocation (flexible within ranges above)
- 3-4 key talking points prioritized by educational value
- Natural questions {host_name} might ask to guide the conversation
- Technical concepts {expert_name} should explain clearly
- Smooth transitions between topics

Design this as a natural, engaging conversation between:
- {host_name.upper()}: Curious technical interviewer who asks insightful questions and helps explain concepts for the audience
- {expert_name.upper()}: Knowledgeable developer who understands this codebase deeply and can explain technical details in an accessible way

Focus on creating an educational yet entertaining discussion that covers the most interesting aspects of the repository. Since you have 5 minutes, you can explore 3-4 major topics with good depth and provide concrete examples from the codebase."""

        response = await self._call_openrouter(prompt, max_tokens=1500)
        return response.strip()
    
    async def generate_dialogue_script(
        self, 
        conversation_structure: str, 
        repo_name: str,
        target_duration: int = 300,
        speaker_names: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Step 3: Generate natural dialogue script optimized for 5-minute format.
        """
        # Get speaker names, defaulting to generic names if not provided
        names = speaker_names or {"HOST": "Host", "EXPERT": "Expert"}
        host_name = names["HOST"]
        expert_name = names["EXPERT"]
        
        prompt = f"""Create a natural, engaging 5-minute podcast script based on this conversation structure for the {repo_name} repository.

{conversation_structure}

Generate a complete dialogue script between {host_name.upper()} and {expert_name.upper()} that feels like a natural conversation between two tech enthusiasts discussing an interesting project.

SCRIPT REQUIREMENTS:
1. Target duration: 5 minutes (aim for 290-310 seconds)
2. Use timestamps every 15-30 seconds to track progress
3. End around 05:00 (give or take 15 seconds for natural flow)
4. Include natural conversation elements: brief pauses, "um", "you know", clarifications
5. {host_name} asks insightful follow-up questions that listeners would want to know
6. {expert_name} provides concrete examples from the codebase when possible
7. Smooth transitions between topics that feel organic
8. Balance technical depth with accessibility

CONVERSATION STYLE:
- Natural pace - not rushed but not slow
- {expert_name} explains concepts clearly without being condescending  
- {host_name} shows genuine curiosity and asks for clarification when needed
- Include brief moments of enthusiasm when discussing interesting technical choices
- Occasional friendly interruptions and "ah, that makes sense" moments
- Like two developers having coffee and discussing a cool project they discovered

FORMAT:
TIMESTAMP | SPEAKER | DIALOGUE

Example opening:
00:00 | {host_name.upper()} | Welcome to TechDive! I'm {host_name}, and today we're exploring {repo_name}. I'm joined by {expert_name} who's been diving deep into this codebase. So, what caught your attention about this project?

00:15 | {expert_name.upper()} | Thanks for having me, {host_name}! You know, what really stood out to me was...

Continue the natural conversation until around 05:00. Focus on making it educational, engaging, and authentic - like listening to two passionate developers share their insights about a project they find genuinely interesting."""

        response = await self._call_openrouter(prompt, max_tokens=4000)
        return response.strip()
    
    def parse_script_format(self, raw_script: str, speaker_names: Optional[Dict[str, str]] = None) -> List[Dict[str, str]]:
        """
        Parse the raw script into structured format.
        Map actual speaker names back to HOST/EXPERT for TTS compatibility.
        """
        # Create reverse mapping for speaker names
        name_to_role = {}
        if speaker_names:
            for role, name in speaker_names.items():
                name_to_role[name.upper()] = role
        
        script_lines = []
        lines = raw_script.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            # Parse format: TIMESTAMP | SPEAKER | DIALOGUE
            if '|' in line:
                parts = line.split('|', 2)
                if len(parts) >= 3:
                    timestamp = parts[0].strip()
                    speaker = parts[1].strip().upper()
                    text = parts[2].strip()
                    
                    # Map speaker name back to role (HOST/EXPERT) for TTS compatibility
                    mapped_speaker = name_to_role.get(speaker, speaker)
                    
                    # Validate timestamp format
                    if re.match(r'^\d{2}:\d{2}$', timestamp):
                        script_lines.append({
                            "timestamp": timestamp,
                            "speaker": mapped_speaker,
                            "text": text
                        })
        
        return script_lines
    
    def estimate_duration(self, script: List[Dict[str, str]]) -> str:
        """
        Estimate total duration based on script length and speaking rate.
        Optimized for 5-minute podcast format.
        """
        total_words = sum(len(segment["text"].split()) for segment in script)
        
        # Speaking rate for natural tech podcast conversation:
        # - Includes pauses, technical explanations, and natural speech patterns
        # - 140-160 words per minute (accounting for technical discussion pace)
        estimated_minutes = total_words / 150
        
        # Round to nearest 15-second interval for practical purposes
        total_seconds = estimated_minutes * 60
        rounded_seconds = round(total_seconds / 15) * 15
        
        minutes = int(rounded_seconds // 60)
        seconds = int(rounded_seconds % 60)
        
        return f"{minutes:02d}:{seconds:02d}"
    
    def extract_key_topics(self, analysis: str) -> List[str]:
        """
        Extract key topics from the analysis for metadata.
        """
        # Simple keyword extraction - could be enhanced with NLP
        keywords = []
        common_tech_terms = [
            # Languages & Frameworks
            "React", "Vue", "Angular", "Node.js", "TypeScript", "JavaScript", "Java",
            "Python", "Go", "Ruby", "Ruby on Rails", "PHP", "Laravel", "Swift", "Kotlin",
            "C++", "C#", "Django", "Flask", "FastAPI",

            # Web & API
            "API", "REST", "RESTful", "GraphQL", "gRPC", "WebSocket", "OpenAPI", "Swagger",
            "OAuth", "JWT", "CORS", "authentication", "authorization",

            # Databases
            "database", "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Firebase",
            "Elasticsearch", "Supabase", "Hasura",

            # DevOps & Cloud
            "Docker", "Dockerfile", "docker-compose.yml", "Kubernetes", "Helm", "Terraform",
            "Ansible", "NGINX", "Apache", "CI/CD", "GitHub Actions", "Jenkins", "Netlify",
            "Vercel", "AWS", "GCP", "Azure", "Prometheus", "Grafana",

            # Build Tools & Config
            "npm", "yarn", "pip", "Maven", "Gradle", "Makefile", "CMake", "Webpack", "Vite",
            "Babel", "tsconfig.json", "package.json", "pyproject.toml", "requirements.txt",
            ".env", ".gitignore", ".prettierrc", ".eslintrc",

            # Testing & Code Quality
            "testing", "unit tests", "integration tests", "Jest", "PyTest", "Mocha", "Chai",
            "Cypress", "Vitest", "Snapshot Testing", "Mocking", "Test Coverage", "linting",
            "Prettier", "ESLint", "Husky", "Commitizen", "Conventional Commits",

            # Frontend UI/UX
            "frontend", "backend", "TailwindCSS", "Bootstrap", "Material UI", "SCSS",
            "Figma", "Storybook", "Chakra UI", "Emotion", "Shadcn/ui",

            # Architecture
            "microservices", "monorepo", "polyrepo", "architecture", "design patterns",
            "SDK", "CLI", "ENV Variables", "API Key",

            # AI/ML & Vector Search
            "Jupyter", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch",
            "HuggingFace", "LangChain", "LlamaIndex", "OpenAI", "RAG", "vector database",
            "embeddings", "Pinecone", "Weaviate", "Milvus", "LLM", "AutoGen",
            "prompt engineering",

            # Git & Version Control
            "git", "commit", "branch", "merge", "rebase", "pull request", "fork", "upstream",
            "main", "master", "feature branch", "submodule",

            # File Structure & Build Artifacts
            "src", "dist", "build", "public", "assets", "node_modules", "venv",

            # Security
            "XSS", "CSRF", "encryption", "hashing", "SSL", "HTTPS", "firewall",
            "rate limiting", "CAPTCHA", "CSP",

            # Monitoring & Observability
            "logging", "tracing", "observability", "New Relic", "Sentry", "DataDog",
            "OpenTelemetry", "event tracking",

            # Automation & Scheduling
            "async", "webhook", "cron job", "scheduler",

            # Repo Meta
            "README", "LICENSE", "CONTRIBUTING", "changelog", "semantic versioning",
            "deployment"
        ]
        
        analysis_lower = analysis.lower()
        for term in common_tech_terms:
            if term.lower() in analysis_lower:
                keywords.append(term)
        
        return keywords[:8]  # Limit to top 8 topics
    
    async def _call_openrouter(
        self, 
        prompt: str, 
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> str:
        """
        Make API call to OpenRouter using Cerebras provider.
        """
        payload = {
            "model": "qwen/qwen3-32b",
            "provider": {
                "only": ["Cerebras"]
            },
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert at creating engaging, educational technical content for podcasts. You understand code architecture and can explain complex concepts in an accessible, conversational way."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        response = requests.post(self.url, headers=self.headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"] 