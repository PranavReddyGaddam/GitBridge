# GitBridge - AI-Powered GitHub Repository Assistant

A sophisticated full-stack application that transforms GitHub repositories into interactive experiences. GitBridge provides three powerful modes: **Podcast Generation**, **Architecture Diagrams**, and **Voice Conversations** - all powered by advanced AI and repository analysis.

## ✨ Features

### 🎙️ **Talk Mode (Voice Interface)**
- **Intelligent Voice Conversations**: Talk naturally with AI about your repository
- **Repository-Aware AI**: AI analyzes your codebase and provides contextual responses
- **Auto-Introduction**: AI introduces itself with repository-specific insights
- **Real-time Voice Pipeline**: Speech-to-Text → AI Processing → Text-to-Speech
- **Interactive Voice Bubbles**: Beautiful glassmorphism UI with state animations

### 🎧 **Podcast Mode**
- **AI-Generated Podcasts**: Convert repositories into engaging audio content
- **Streaming Generation**: Real-time progress with live audio segments
- **Voice Customization**: Multiple voice options and settings
- **Smart Caching**: Efficient storage and retrieval of generated content

### 📊 **Diagram Mode**
- **Architecture Visualization**: Auto-generate Mermaid diagrams from code structure
- **Repository Analysis**: Deep understanding of project architecture
- **Interactive Diagrams**: Clickable and explorable visual representations

### 🚀 **Core Capabilities**
- **GitHub Integration**: Deep repository analysis and file structure parsing
- **AI-Powered Insights**: Advanced LLM processing for contextual understanding
- **Modern UI/UX**: Responsive design with smooth animations and loading states
- **Multi-Modal Interface**: Text, voice, and visual interactions

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **Custom UI Components** (LoaderOne, VoiceBubble, etc.)

### Backend
- **FastAPI** with Python 3.12
- **GitHub API Integration** for repository analysis
- **OpenRouter API** for LLM processing (Qwen/Cerebras)
- **AWS Polly** for text-to-speech (with pyttsx3 fallback)
- **Faster-Whisper** for speech-to-text
- **Silero VAD** for voice activity detection
- **S3 Storage** with hybrid caching system

### AI & Voice Services
- **Speech-to-Text**: Faster-Whisper with VAD preprocessing
- **Language Model**: Advanced conversational AI via OpenRouter
- **Text-to-Speech**: AWS Polly with local fallback
- **Repository Analysis**: Intelligent code structure understanding

## 📁 Project Structure

```
GitBridge/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Reusable UI components
│   │   │   │   ├── loader.tsx
│   │   │   │   └── ...
│   │   │   ├── TalkTab.tsx          # Voice interface
│   │   │   ├── PodcastPlayer.tsx    # Audio playback
│   │   │   ├── MermaidDiagram.tsx   # Diagram display
│   │   │   ├── VoiceBubble.tsx      # Interactive voice UI
│   │   │   └── threads.tsx          # Background animation
│   │   ├── services/
│   │   │   └── api.ts       # Backend communication
│   │   ├── App.tsx          # Main application
│   │   └── index.css        # Global styles
│   ├── package.json
│   └── tailwind.config.js
├── backend/                  # FastAPI Python backend
│   ├── features/
│   │   ├── voice/           # Voice interface services
│   │   │   ├── routes.py    # Voice API endpoints
│   │   │   ├── stt.py       # Speech-to-text service
│   │   │   ├── llm.py       # Language model service
│   │   │   ├── tts.py       # Text-to-speech service
│   │   │   └── state.py     # Session management
│   │   ├── podcast/         # Podcast generation
│   │   │   ├── routes.py
│   │   │   ├── services.py
│   │   │   └── services_llm.py
│   │   └── diagram/         # Diagram generation
│   │       ├── routes.py
│   │       └── services.py
│   ├── services/
│   │   ├── github.py        # GitHub API integration
│   │   ├── storage.py       # File storage management
│   │   └── s3_storage.py    # S3 integration
│   ├── main.py              # FastAPI application
│   ├── start.py             # Development server
│   └── requirement.txt      # Python dependencies
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16+ and npm/yarn
- **Python** 3.12+
- **Git**

### Environment Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd GitBridge
```

2. **Backend Setup:**
```bash
cd backend
pip install -r requirement.txt
```

Create `.env` file in backend directory:
```env
# Required for AI features
OPENROUTER_API_KEY=your_openrouter_key

# Optional: For production TTS (fallback available)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# Optional: For GitHub API (public repos work without)
GITHUB_PAT=your_github_token
```

3. **Frontend Setup:**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start Backend** (from root directory):
```bash
python -m backend.start
```
Backend runs on: http://localhost:8000

2. **Start Frontend** (from frontend directory):
```bash
npm start
```
Frontend runs on: http://localhost:3000

## 🎯 Usage Guide

### 🗣️ Talk Mode
1. Enter a GitHub repository URL
2. Switch to "Talk" tab
3. Click "Start" - AI analyzes the repo and introduces itself
4. Click the voice bubble to start talking
5. Have natural conversations about the codebase

### 🎧 Podcast Mode
1. Enter repository URL
2. Stay on "Podcast" tab
3. Customize voice settings (optional)
4. Click "Generate" for AI-generated podcast content
5. Listen to streaming audio segments

### 📊 Diagram Mode
1. Enter repository URL
2. Switch to "Diagram" tab
3. Click "Generate" for architecture visualization
4. Explore the interactive Mermaid diagram

## 🔧 API Endpoints

### Voice Interface
- `POST /api/voice/analyze-repo` - Repository analysis with AI insights
- `POST /api/voice/stt` - Speech-to-text conversion
- `POST /api/voice/ask` - Conversational AI responses
- `POST /api/voice/tts` - Text-to-speech synthesis
- `GET /api/voice/introduction-audio` - Auto-generated introduction

### Content Generation
- `POST /api/generate-diagram` - Mermaid diagram generation
- `GET /api/generate-podcast` - Streaming podcast generation
- `POST /api/parse-repo` - Repository structure analysis

## 🎨 Customization

### Voice Settings
- Modify voice IDs in `TalkTab.tsx`
- Adjust TTS parameters in `backend/features/voice/tts.py`

### UI Themes
- Update colors in `tailwind.config.js`
- Modify animations in component files
- Customize voice bubble appearance in `TalkTab.tsx`

### AI Behavior
- Adjust system prompts in `backend/features/voice/llm.py`
- Modify response length limits
- Configure conversation context handling

## 🔍 Development

### Backend Development
```bash
# API documentation
http://localhost:8000/docs

# Health check
http://localhost:8000/health

# Hot reload enabled for development
```

### Frontend Development
```bash
# Development server with hot reload
npm start

# Build for production
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (both frontend and backend)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 🎬 Demo Features

- **Real-time Voice Processing**: Natural conversation flow
- **Repository Intelligence**: Context-aware responses about your code
- **Multi-modal Interaction**: Voice, text, and visual elements
- **Streaming Content**: Live audio generation and playback
- **Beautiful UI**: Glassmorphism effects and smooth animations

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**GitBridge** - Transforming how developers interact with repositories through AI-powered voice, podcasts, and visual insights. 🚀