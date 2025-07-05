# GitBridge Backend

FastAPI backend for GitHub repository diagram generator.

## 🚀 Features

- **Repository Parsing**: Fetch and parse GitHub repositories
- **LLM Integration**: 3-step prompt pipeline using OpenRouter + Qwen
- **Mermaid Diagrams**: Generate system architecture diagrams
- **RESTful API**: Clean, documented API endpoints
- **Docker Ready**: Containerized deployment

## 📋 Requirements

- Python 3.11+
- GitHub Personal Access Token (optional)
- OpenRouter API Key (required)

## 🛠️ Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv myenv
   source myenv/bin/activate  # On Windows: myenv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirement.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

## 🔧 Configuration

### Environment Variables

Copy `env.example` to `.env` and configure:

```env
# Required
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional (for higher GitHub rate limits)
GITHUB_PAT=your_github_personal_access_token_here

# Optional settings
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### API Keys

1. **OpenRouter API Key** (Required):
   - Sign up at [OpenRouter](https://openrouter.ai)
   - Get your API key from the dashboard
   - Add to `OPENROUTER_API_KEY` in `.env`

2. **GitHub Personal Access Token** (Optional):
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Create a new token with `repo` scope
   - Add to `GITHUB_PAT` in `.env`

## 🚀 Running the Application

### Development

```bash
# Using the startup script
python start.py

# Or directly with uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production with Docker

```bash
# Build the image
docker build -t gitbridge-backend .

# Run the container
docker run -p 8000:8000 --env-file .env gitbridge-backend
```

## 📚 API Endpoints

### Core Endpoints

- `POST /api/parse-repo` - Parse GitHub repository
- `POST /api/generate-diagram` - Generate Mermaid diagram
- `GET /api/repo-info/{repo_url}` - Get repository info

### Health & Testing

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api/health/llm` - LLM service health
- `POST /api/test-llm` - Test LLM prompts

### Documentation

- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

## 🔄 API Usage Examples

### Parse Repository

```bash
curl -X POST "http://localhost:8000/api/parse-repo" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/username/repository"
  }'
```

### Generate Diagram

```bash
curl -X POST "http://localhost:8000/api/generate-diagram" \
  -H "Content-Type: application/json" \
  -d '{
    "file_tree": "📁 project\n  📄 README.md\n  📁 src\n    📄 main.py",
    "readme_content": "# My Project\nThis is a sample project..."
  }'
```

## 🏗️ Architecture

### Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── routers/             # API route handlers
│   ├── parse.py        # Repository parsing endpoints
│   └── generate.py     # Diagram generation endpoints
├── services/            # Business logic
│   ├── github.py       # GitHub API integration
│   └── llm.py          # LLM prompt pipeline
├── models/              # Pydantic schemas
│   └── schema.py       # Request/response models
├── utils/               # Utility functions
│   └── tree_formatter.py # File tree formatting
├── db/                  # Database (future)
│   ├── models.py       # Database models
│   └── session.py      # Database session
└── Dockerfile          # Container configuration
```

### LLM Pipeline

The diagram generation uses a 3-step pipeline:

1. **System Design Explanation**: Analyze file tree + README
2. **File Mapping**: Map explanation to specific files/directories
3. **Mermaid Generation**: Create diagram code from analysis

## 🧪 Testing

### Manual Testing

1. **Health Check:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **LLM Health Check:**
   ```bash
   curl http://localhost:8000/api/health/llm
   ```

3. **Test LLM Prompt:**
   ```bash
   curl -X POST "http://localhost:8000/api/test-llm" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, this is a test."}'
   ```

## 🐳 Docker

### Build Image

```bash
docker build -t gitbridge-backend .
```

### Run Container

```bash
docker run -p 8000:8000 --env-file .env gitbridge-backend
```

### Docker Compose (Future)

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - ENVIRONMENT=production
```

## 🔮 Future Enhancements

- [ ] Database integration with Drizzle ORM
- [ ] Caching with Redis
- [ ] User authentication
- [ ] Rate limiting
- [ ] Background job processing
- [ ] WebSocket support for real-time updates
- [ ] Multiple LLM provider support
- [ ] Diagram template system

## 🐛 Troubleshooting

### Common Issues

1. **Missing API Keys:**
   - Ensure `OPENROUTER_API_KEY` is set in `.env`
   - Verify the API key is valid

2. **GitHub Rate Limits:**
   - Add `GITHUB_PAT` to `.env` for higher limits
   - Check GitHub API status

3. **LLM Service Errors:**
   - Check OpenRouter API status
   - Verify model availability
   - Check API key permissions

4. **Import Errors:**
   - Ensure virtual environment is activated
   - Check Python path configuration

## 📄 License

This project is part of GitBridge. 