import { useState, useEffect, useRef } from 'react'
import Navbar from './components/Navbar'
import PodcastPlayer from './components/PodcastPlayer'
import Threads from './components/threads'
import MermaidDiagram from './components/MermaidDiagram'
import { CaptionsDisplay } from './components/PodcastPlayer'
import captionsRaw from '../sample_captions.txt?raw'
import './App.css'


type TabProps = {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  diagramGenerated?: boolean;
  podcastGenerated?: boolean;
  onGenerate?: () => void;
};

function DiagramTab({ repoUrl, diagramGenerated, diagramData, loading, error }: TabProps & { diagramData?: any; loading?: boolean; error?: string | null }) {
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (diagramGenerated && imageRef.current) {
      imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [diagramGenerated]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-[700px] h-[700px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-700">Generating diagram...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-[700px] h-[700px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Error generating diagram</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
      {diagramGenerated && diagramData && (
        <div className="flex justify-center items-center w-full min-h-[700px]" ref={imageRef}>
          <div className="bg-white rounded-2xl shadow-xl flex items-center justify-center w-[700px] h-[700px]">
            <MermaidDiagram 
              zoomingEnabled 
              diagramCode={diagramData.diagram_code}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PodcastTab({ repoUrl, podcastGenerated }: TabProps) {
  const [captionsOn, setCaptionsOn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<Caption[]>([]);

  // Parse captions when duration is set
  useEffect(() => {
    if (duration > 0) {
      setCaptions(parseCaptions(captionsRaw, duration));
    }
  }, [duration]);

  const currentCaption = captions.find(
    (cap: Caption) => currentTime >= cap.start && currentTime < cap.end
  );

  // Ref for podcast card
  const podcastCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (podcastGenerated && podcastCardRef.current) {
      podcastCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [podcastGenerated]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto" style={{ marginTop: '12rem' }}>
      {/* <h1 className="text-4xl md:text-5xl font-bold mb-4">Repository to podcast</h1> */}
      {/* <p className="text-lg mb-2">Transform any GitHub repository into an engaging audio podcast.</p>
      <p className="mb-2">Perfect for learning about projects while on the go.</p>
      <p className="text-sm mb-8">Generate AI-powered discussions about code, architecture, and project insights</p> */}
      {podcastGenerated && (
        <div className="w-full flex flex-col items-center mt-4" ref={podcastCardRef}>
          <PodcastPlayer
            src="/podcast.mp3"
            artwork="/Pranav.jpeg"
            title="Sample Podcast Episode"
            artist="GitBridge AI"
            captionsOn={captionsOn}
            onCaptionsToggle={setCaptionsOn}
            speed={speed}
            onSpeedChange={setSpeed}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
          />
        </div>
      )}
    </div>
  );
}

function TalkTab({ }: { repoUrl: string; setRepoUrl: (url: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center w-full max-w-2xl mx-auto">
    
    </div>
  );
}

function AnimatedHero() {
  const words = [
    { text: "podcasts", color: "#3B82F6" },
    { text: "visualizations", color: "#6366F1" },
    { text: "conversations", color: "#94A3B8" },
  ];
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<any>(null);

  // Add a '.' at the end of each word for the animation
  const animatedWord = words[index].text + ".";

  // For pixel-perfect alignment, use the longest word (with dot) for width reservation
  const maxWord = words.reduce((a, b) => (a.text.length > b.text.length ? a : b)).text + ".";

  useEffect(() => {
    if (typing) {
      if (charIndex < animatedWord.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(animatedWord.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        }, 120);
      } else {
        timeoutRef.current = setTimeout(() => setTyping(false), 1400);
      }
    } else {
      if (charIndex > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(animatedWord.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        }, 80);
      } else {
        setTyping(true);
        setIndex((index + 1) % words.length);
      }
    }
    return () => clearTimeout(timeoutRef.current);
  }, [charIndex, typing, index, animatedWord]);

  const currentColor = words[index].color;

  // Add this above the component for cursor animation
  const showCursor = typing || charIndex !== 0;

  return (
    <div className="w-full flex flex-col items-center mt-6 md:mt-10 px-2">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-5xl md:text-[84px] font-semibold font-[Inter] tracking-tight text-blue-900 text-center">GitHub to</span>
        <span
          className="flex flex-col items-center justify-center mt-2"
        >
          {/* Block-level container for fixed width */}
          <span
            className="inline-block relative text-3xl sm:text-5xl md:text-[84px] font-semibold font-[Inter] tracking-tight typing-container whitespace-nowrap text-center"
            style={{ color: currentColor, minWidth: '1ch' }}
          >
            {/* Hidden span to reserve full width, always present and static */}
            <span
              aria-hidden="true"
              className="invisible select-none"
              style={{ display: 'inline-block', minWidth: '1ch' }}
            >
              {maxWord}
            </span>
            {/* Animated text overlays the reserved width */}
            <span
              className="absolute left-0 top-0 w-full text-center flex justify-center items-center"
              style={{ pointerEvents: 'none' }}
            >
              <span>{displayed}</span>
              {/* Blinking cursor, only show when typing or deleting */}
              {showCursor && (
                <span className="ml-1 animate-blink" style={{ borderRight: `4px solid ${currentColor}`, height: '1em', display: 'inline-block', width: '0.5ch' }} />
              )}
            </span>
          </span>
        </span>
      </div>
      {/* Add a clear vertical gap below the hero text */}
      <div className="h-8 md:h-16" />
    </div>
  );
}

// Helper to parse captions (copy from PodcastPlayer if not already in App)
type Caption = {
  role: string;
  text: string;
  start: number;
  end: number;
};
function parseCaptions(raw: string, duration: number): Caption[] {
  const lines = raw.trim().split('\n').filter(Boolean);
  const n = lines.length;
  const segment = duration / n;
  const captions: Caption[] = lines.map((line: string, i: number) => {
    const [role, ...textArr] = line.split(':');
    return {
      role: role.trim(),
      text: textArr.join(':').trim(),
      start: i * segment,
      end: (i + 1) * segment,
    };
  });
  return captions;
}

function App() {
  const [tab, setTab] = useState<'' | 'diagram' | 'podcast' | 'talk'>('');
  const [repoUrl, setRepoUrl] = useState('');
  const [diagramGenerated, setDiagramGenerated] = useState(false);
  const [podcastGenerated, setPodcastGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagramData, setDiagramData] = useState<any>(null);

  // Captions and podcast player state
  const [captionsOn, setCaptionsOn] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<Caption[]>([]);

  // Parse captions when duration is set
  useEffect(() => {
    if (duration > 0) {
      setCaptions(parseCaptions(captionsRaw, duration));
    }
  }, [duration]);

  const currentCaption = captions.find(
    (cap: Caption) => currentTime >= cap.start && currentTime < cap.end
  );

  // Ref for podcast card
  const podcastCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (podcastGenerated && podcastCardRef.current) {
      podcastCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [podcastGenerated]);

  // Handle Generate button logic with backend integration
  const handleGo = async () => {
    if (!repoUrl || !tab) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (tab === 'diagram' || tab === '') {
        // Step 1: Parse repository
        console.log('Parsing repository:', repoUrl);
        const parseResponse = await fetch('http://localhost:8000/api/parse-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl })
        });
        
        if (!parseResponse.ok) {
          throw new Error(`Failed to parse repository: ${parseResponse.statusText}`);
        }
        
        const parseData = await parseResponse.json();
        console.log('Repository parsed successfully:', parseData);
        
        // Step 2: Generate diagram
        console.log('Generating diagram...');
        const diagramResponse = await fetch('http://localhost:8000/api/generate-diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            file_tree: parseData.file_tree, 
            readme_content: parseData.readme_content 
          })
        });
        
        if (!diagramResponse.ok) {
          throw new Error(`Failed to generate diagram: ${diagramResponse.statusText}`);
        }
        
        const diagramResult = await diagramResponse.json();
        console.log('Diagram generated successfully:', diagramResult);
        
        setDiagramData(diagramResult);
        setDiagramGenerated(true);
      }
      
      if (tab === 'podcast' || tab === '') {
        setPodcastGenerated(true);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Reset both states when repoUrl changes
  const handleRepoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    setDiagramGenerated(false);
    setPodcastGenerated(false);
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10">
        <Threads color={[0, 0, 1]} amplitude={1} distance={0.3} enableMouseInteraction />
      </div>
      <Navbar />
      {/* Move hero text even higher */}
      <div style={{ marginTop: '2vh' }}>
        <AnimatedHero />
      </div>
      {/* Input Card (reduce margin to connect with hero text) */}
      <div className="flex flex-col items-center w-full z-30 px-2" style={{ marginBottom: '0.5rem', marginTop: '1.5rem' }}>
        <div className="relative w-full max-w-2xl mx-auto rounded-2xl p-10 shadow-2xl bg-gradient-to-br from-blue-900/60 via-blue-700/40 to-blue-400/30 backdrop-blur-lg border border-blue-200/30 transition-all duration-300">
          <div className="flex flex-col md:flex-row items-center gap-2 mb-4 w-full">
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              className="w-full md:w-auto flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-base md:text-lg bg-transparent placeholder:font-medium placeholder-[#475569] text-[#0F172A]"
              value={repoUrl}
              onChange={handleRepoUrlChange}
            />
            <button
              className="w-full md:w-auto mt-2 md:mt-0 md:ml-2 px-6 md:px-8 py-2 rounded-lg bg-blue-500 text-white font-bold shadow hover:bg-blue-600 transition-colors text-base md:text-lg h-12 min-w-[120px] flex items-center justify-center disabled:bg-blue-200 disabled:text-black-900"
              disabled={!repoUrl || !tab || loading}
              onClick={handleGo}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </div>
              ) : (
                'Generate'
              )}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-2 md:gap-4 w-full">
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'diagram' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('diagram')}
            >
              Diagram
            </button>
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'podcast' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('podcast')}
            >
              Podcast
            </button>
            <button
              className={`w-full sm:w-auto px-4 md:px-6 py-2 rounded-xl font-semibold text-base md:text-lg transition-colors border border-blue-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${tab === 'talk' ? 'bg-white/90 text-blue-900 shadow font-bold' : 'bg-blue-100/40 text-blue-800 hover:bg-white/60'} hover:shadow`}
              onClick={() => setTab('talk')}
            >
              Talk
            </button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 z-10">
        {tab === 'diagram' && (
          <DiagramTab
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            diagramGenerated={diagramGenerated}
            diagramData={diagramData}
            loading={loading}
            error={error}
          />
        )}
        {tab === 'podcast' && podcastGenerated && (
          <div className="w-full flex flex-col items-center mt-12" ref={podcastCardRef}>
            <PodcastPlayer
              src="/podcast.mp3"
              artwork="/Pranav.jpeg"
              title="Sample Podcast Episode"
              artist="GitBridge AI"
              captionsOn={captionsOn}
              onCaptionsToggle={setCaptionsOn}
              speed={speed}
              onSpeedChange={setSpeed}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />
          </div>
        )}
        {tab === 'talk' && (
          <TalkTab
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
          />
        )}
      </main>
      {/* CaptionsDisplay area: always present, fixed min-height to prevent layout shift */}
      <div className="w-full flex flex-col items-center mt-8 min-h-[56px]">
        {captionsOn && (
          <CaptionsDisplay
            caption={currentCaption || null}
            currentTime={currentTime}
            playbackRate={speed}
          />
        )}
      </div>
    </div>
  );
}

export default App
