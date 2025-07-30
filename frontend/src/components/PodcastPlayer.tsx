import React, { useRef, useState, useEffect, useMemo } from 'react';
import {FaVolumeUp } from 'react-icons/fa';
import { LuCaptions, LuCaptionsOff } from "react-icons/lu";
import skipBackIcon from '../assets/backward.svg';
import skipForwardIcon from '../assets/forward.svg';
import playIcon from '../assets/play.svg';
import pauseIcon from '../assets/pause.svg';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import ElasticSlider from './ElasticSlider';
import { RxDownload } from "react-icons/rx";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PodcastAPIService } from '../services/api';

// Audio segment interface for streaming
export interface AudioSegment {
  index: number;
  url: string;
  duration_ms: number;
  loaded: boolean;
  played: boolean;
}

interface PodcastPlayerProps {
  src?: string; // For complete files
  segments?: AudioSegment[]; // For streaming
  isGenerating?: boolean;
  isComplete?: boolean;
  artwork?: string;
  title?: string;
  artist?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSpeedChange?: (speed: number) => void;
  onCaptionsToggle?: (captionsOn: boolean) => void;
  captionsOn?: boolean;
  speed?: number;
  currentTime?: number;
  onDurationChange?: (duration: number) => void;
  cacheKey?: string; // For downloading files from backend
}

const speeds = [0.5, 1, 1.25, 1.5, 2];

// Helper to parse captions
type Caption = {
  role: string;
  text: string;
  start: number;
  end: number;
};

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  src,
  segments = [],
  isGenerating = false,
  isComplete = false,
  artwork = '/Pranav.jpeg',
  title = 'Sample Podcast Episode',
  artist = 'GitBridge AI',
  onTimeUpdate,
  onSpeedChange,
  onCaptionsToggle,
  captionsOn = false,
  speed: controlledSpeed,
  currentTime: controlledCurrentTime,
  onDurationChange,
  cacheKey,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);

  // Streaming-specific state
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const segmentStartTimes = useRef<number[]>([]);

  // Determine if we're in streaming mode
  const isStreamingMode = segments.length > 0 && !src;

  // Use controlled props if provided
  const effectiveSpeed = controlledSpeed !== undefined ? controlledSpeed : speed;
  const effectiveCurrentTime = controlledCurrentTime !== undefined ? controlledCurrentTime : 
    (isStreamingMode ? 
      // For streaming: calculate time across all segments
      (() => {
        let totalTime = 0;
        for (let i = 0; i < currentSegmentIndex; i++) {
          if (segments[i]?.loaded) {
            totalTime += segments[i].duration_ms / 1000;
          }
        }
        return totalTime + currentTime;
      })() 
      : currentTime);
  const effectiveCaptionsOn = captionsOn !== undefined ? captionsOn : false;

  // Calculate segment start times for streaming
  useEffect(() => {
    if (isStreamingMode) {
      let cumulativeTime = 0;
      segmentStartTimes.current = segments.map((segment) => {
        const startTime = cumulativeTime;
        cumulativeTime += segment.duration_ms / 1000;
        return startTime;
      });
      setDuration(cumulativeTime);
      if (onDurationChange) onDurationChange(cumulativeTime);
    }
  }, [segments, isStreamingMode, onDurationChange]);

  // Auto-play when first segment is available (streaming mode)
  useEffect(() => {
    if (isStreamingMode && segments.length > 0 && segments[0].loaded && !playing && isGenerating) {
      setPlaying(true);
    }
  }, [segments, isGenerating, isStreamingMode, playing]);

  // Handle segment completion and auto-advance (streaming mode)
  const handleSegmentEnd = () => {
    if (!isStreamingMode) return;
    
    const nextIndex = currentSegmentIndex + 1;
    
    if (nextIndex < segments.length && segments[nextIndex].loaded) {
      // Next segment is ready, advance
      setCurrentSegmentIndex(nextIndex);
      loadSegment(nextIndex);
    } else if (nextIndex >= segments.length && isComplete) {
      // All segments played and generation complete
      setPlaying(false);
    } else if (isGenerating) {
      // Wait for next segment to be ready
      setPlaying(false);
      // Will auto-resume when next segment loads
    }
  };

  const loadSegment = (index: number) => {
    if (!audioRef.current || !segments[index] || !isStreamingMode) return;

    setLoading(true);
    audioRef.current.src = segments[index].url;
    audioRef.current.load();

    // Remove previous listeners
    audioRef.current.oncanplay = null;
    audioRef.current.onerror = null;

    audioRef.current.oncanplay = () => {
      setLoading(false);
      if (playing) {
        audioRef.current?.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Audio play error:', err);
          }
        });
      }
    };

    audioRef.current.onerror = () => {
      setLoading(false);
      // Optionally show error to user
    };
  };

  // Updated play handler for both modes
  const handlePlay = () => {
    if (!audioRef.current) return;
    
    if (isStreamingMode) {
      // Load current segment if not loaded
      if (currentSegmentIndex < segments.length) {
        loadSegment(currentSegmentIndex);
      }
    }
    
    audioRef.current.play().then(() => {
      setPlaying(true);
    }).catch(console.error);
  };

  // Updated pause handler
  const handlePause = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setPlaying(false);
  };

  // Download handlers
  const handleDownloadAudio = async () => {
    if (cacheKey) {
      try {
        await PodcastAPIService.downloadAudio(cacheKey);
      } catch (error) {
        console.error('Failed to download audio:', error);
        alert('Failed to download audio');
      }
    } else {
      alert('No generated podcast to download');
    }
  };
  
  const handleDownloadTranscript = async () => {
    if (cacheKey) {
      try {
        await PodcastAPIService.downloadScript(cacheKey);
      } catch (error) {
        console.error('Failed to download transcript:', error);
        alert('Failed to download transcript');
      }
    } else {
      alert('No generated podcast transcript to download');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (playing) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.code === 'ArrowRight' && !isStreamingMode) {
        skip(15);
      } else if (e.code === 'ArrowLeft' && !isStreamingMode) {
        skip(-15);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, isStreamingMode]);

  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        if (isStreamingMode && currentSegmentIndex < segments.length) {
          loadSegment(currentSegmentIndex);
        } else if (!isStreamingMode) {
          audioRef.current.play().catch(console.error);
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing, isStreamingMode, currentSegmentIndex, segments]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = effectiveSpeed;
    }
  }, [volume, effectiveSpeed]);

  const onLoadedMetadata = () => {
    if (audioRef.current && !isStreamingMode) {
      setDuration(audioRef.current.duration);
      if (onDurationChange) onDurationChange(audioRef.current.duration);
      setLoading(false);
    } else if (isStreamingMode) {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      if (isStreamingMode) {
        const segmentTime = audioRef.current.currentTime;
        const globalTime = segmentStartTimes.current[currentSegmentIndex] + segmentTime;
        setCurrentTime(globalTime);
        if (onTimeUpdate) onTimeUpdate(globalTime);
      } else {
        setCurrentTime(audioRef.current.currentTime);
        if (onTimeUpdate) onTimeUpdate(audioRef.current.currentTime);
      }
    }
  };

  const onProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetTime = percent * duration;
    
    if (isStreamingMode) {
      // For streaming: only allow seeking within available content
      const availableTime = getAvailableStreamTime();
      if (targetTime <= availableTime) {
        seekToTimeInStreaming(targetTime);
      }
    } else {
      // Regular seeking for complete files
      audioRef.current.currentTime = targetTime;
    }
  };

  const seekToTimeInStreaming = (targetTime: number) => {
    if (!audioRef.current) return;
    
    // Find which segment contains this time
    let cumulativeTime = 0;
    for (let i = 0; i < segments.length; i++) {
      const segmentDuration = segments[i].duration_ms / 1000;
      if (targetTime <= cumulativeTime + segmentDuration && segments[i].loaded) {
        // This segment contains the target time
        setCurrentSegmentIndex(i);
        loadSegment(i);
        // Set time within the segment
        const segmentTime = targetTime - cumulativeTime;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = segmentTime;
          }
        }, 100); // Small delay to let segment load
        break;
      }
      cumulativeTime += segmentDuration;
    }
  };

  const getAvailableStreamTime = () => {
    let availableTime = 0;
    for (const segment of segments) {
      if (segment.loaded) {
        availableTime += segment.duration_ms / 1000;
      } else {
        break; // Stop at first non-loaded segment
      }
    }
    return availableTime;
  };

  const skip = (secs: number) => {
    if (audioRef.current) {
      if (isStreamingMode) {
        // For streaming: only skip within available content
        const availableTime = getAvailableStreamTime();
        const newTime = Math.min(
          Math.max(effectiveCurrentTime + secs, 0),
          availableTime
        );
        seekToTimeInStreaming(newTime);
      } else {
        // Regular skipping for complete files
        audioRef.current.currentTime = Math.min(
          Math.max(audioRef.current.currentTime + secs, 0),
          duration
        );
      }
    }
  };

  // Helper functions for streaming progress
  const getPlayableProgress = () => {
    if (!isStreamingMode) return 1;
    const loadedSegments = segments.filter(s => s.loaded).length;
    return segments.length > 0 ? loadedSegments / segments.length : 0;
  };

  // Dummy waveform visualization
  const renderWaveform = () => (
    <div className="flex items-end gap-1 h-8 w-full absolute left-0 bottom-0 pointer-events-none opacity-60">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="rounded bg-gradient-to-t from-blue-400/60 to-blue-200/80"
          style={{
            width: 3,
            height: `${6 + 18 * Math.abs(Math.sin(i / 4 + effectiveCurrentTime / 2))}px`,
            transition: 'height 0.2s',
          }}
        />
      ))}
    </div>
  );

  // When speed changes
  const handleSpeedChange = (v: string) => {
    const num = Number(v);
    setSpeed(num);
    if (onSpeedChange) onSpeedChange(num);
  };

  // When captions toggled
  const handleToggleCaptions = () => {
    const newVal = !effectiveCaptionsOn;
    if (onCaptionsToggle) onCaptionsToggle(newVal);
  };

  // Calculate effective duration for display
  const effectiveDuration = useMemo(() => {
    if (isStreamingMode) {
      // For streaming: show total duration of all loaded segments
      return segments.reduce((total, segment) => {
        return segment.loaded ? total + (segment.duration_ms / 1000) : total;
      }, 0);
    }
    return duration;
  }, [isStreamingMode, segments, duration]);



  return (
    <div
      className={`relative w-full max-w-xl mx-auto rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-blue-900/60 via-blue-700/40 to-blue-400/30 backdrop-blur-lg border border-blue-200/30 transition-all duration-300 ${hovered ? 'ring-4 ring-blue-400/40' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Podcast audio player"
    >
      {/* Ambient glow */}
      <div className="absolute -inset-2 z-0 rounded-2xl bg-gradient-to-br from-blue-400/30 to-blue-200/10 blur-2xl opacity-60 pointer-events-none" />
      {/* Artwork and metadata */}
      <div className="relative z-10 flex items-center gap-4 mb-4">
        <img
          src={artwork}
          alt="Podcast artwork"
          className="w-20 h-20 rounded-xl shadow-lg border-2 border-white/30 object-cover bg-blue-200/30"
        />
        <div className="flex-1 text-left">
          <div className="text-lg font-bold text-gray-900 drop-shadow mb-1 truncate">
            {title}
            {isStreamingMode && isGenerating && (
              <span className="text-blue-600 text-sm ml-2">• Generating...</span>
            )}
          </div>
          <div className="text-sm text-gray-700 font-medium truncate">{artist}</div>
        </div>
      </div>
      {/* Audio controls */}
      <div className="relative z-10 flex flex-col gap-1">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative w-full h-3 bg-blue-200/30 rounded-full cursor-pointer overflow-hidden mb-1"
          onClick={onProgressClick}
          aria-label="Seek bar"
        >
          {isStreamingMode ? (
            // For streaming: show available progress in background and current progress on top
            <>
              <div
                className="absolute top-0 left-0 h-full bg-blue-300/40 rounded-full transition-all duration-300"
                style={{ width: `${getPlayableProgress() * 100}%` }}
                title="Available content"
              />
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(effectiveCurrentTime / effectiveDuration) * 100 || 0}%` }}
                title="Current playback position"
              />
            </>
          ) : (
            // For complete files: regular progress bar
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(effectiveCurrentTime / duration) * 100 || 0}%` }}
            />
          )}
          {/* Waveform visualization */}
          {renderWaveform()}
        </div>
        {/* Time and controls */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-black font-mono w-14">
            {formatTime(effectiveCurrentTime)}
          </span>
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-full bg-blue-200/60 hover:bg-blue-300/80 transition flex items-center justify-center"
              onClick={() => skip(-15)}
              aria-label="Skip back 15 seconds"
            >
              <img src={skipBackIcon} alt="Skip back 15 seconds" style={{ width: 32, height: 32 }} />
            </button>
            <button
              className="p-3 rounded-full bg-blue-500 shadow-lg hover:bg-blue-600 transition text-white text-xl flex items-center justify-center"
              onClick={playing ? handlePause : handlePlay}
              disabled={isStreamingMode && segments.length === 0}
              aria-label={playing ? 'Pause' : 'Play'}
              style={{ width: 56, height: 56 }}
            >
              {playing ? (
                <img src={pauseIcon} alt="Pause" style={{ width: 32, height: 32 }} />
              ) : (
                <img src={playIcon} alt="Play" style={{ width: 32, height: 32 }} />
              )}
            </button>
            <button
              className="p-2 rounded-full bg-blue-200/60 hover:bg-blue-300/80 transition flex items-center justify-center"
              onClick={() => skip(15)}
              aria-label="Skip forward 15 seconds"
            >
              <img src={skipForwardIcon} alt="Skip forward 15 seconds" style={{ width: 32, height: 32 }} />
            </button>
          </div>
          <span className="text-sm text-black font-mono w-14 text-right">
            {formatTime(effectiveDuration)}
          </span>
        </div>
        {/* Volume */}
        <div className="flex items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-40 flex items-center">
              <ElasticSlider
                leftIcon={<FaVolumeUp size={18} />}
                startingValue={0}
                defaultValue={volume * 100}
                maxValue={100}
                isStepped
                stepSize={1}
                onChange={(v: number) => setVolume(v / 100)}
              />
            </div>
          </div>
          {/* Captions and speed */}
          <div className="flex items-center gap-4 justify-end flex-1 mr-2">
            <button
              onClick={handleToggleCaptions}
              className="h-10 w-10 rounded-md bg-white/50 backdrop-blur-sm border border-blue-200/60 ring-1 ring-blue-100/60 shadow-sm cursor-pointer flex items-center justify-center text-blue-900 hover:text-blue-600 transition"
              aria-label="Toggle Captions"
            >
              {effectiveCaptionsOn ? <LuCaptions size={22} /> : <LuCaptionsOff size={22} />}
            </button>
            <div className="relative w-fit">
              <Select value={effectiveSpeed.toString()} onValueChange={handleSpeedChange}>
                <SelectTrigger
                  className="rounded-md bg-white/50 backdrop-blur-sm px-2 py-0.5 text-xs font-semibold text-blue-900 border border-blue-200/60 ring-1 ring-blue-100/60 shadow-sm cursor-pointer flex items-center gap-1 h-10"
                >
                  <SelectValue className="text-left flex-1" />
                </SelectTrigger>
                <SelectContent
                  className="rounded-xl bg-blue-100/80 backdrop-blur-md shadow-xl border border-blue-200/60 py-1 px-0 text-sm text-blue-900 font-semibold"
                  align="end"
                >
                  {speeds.map((s) => (
                    <SelectItem
                      key={s}
                      value={s.toString()}
                      className="rounded px-4 py-2 cursor-pointer transition hover:bg-blue-200/60 focus:bg-blue-200/80 data-[state=checked]:bg-blue-300/80 data-[state=checked]:text-blue-900 flex items-center justify-between"
                    >
                      {s}x
                      <span className="ml-2 text-blue-600 data-[state=checked]:block hidden">
                        ✓
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-10 w-10 rounded-md bg-white/50 backdrop-blur-sm border border-blue-200/60 ring-1 ring-blue-100/60 shadow-sm cursor-pointer flex items-center justify-center text-blue-900 hover:text-blue-600 transition"
                  aria-label="Download"
                >
                  <RxDownload size={22} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="rounded-xl bg-blue-100/80 backdrop-blur-md shadow-xl border border-blue-200/60 py-1 px-0 text-sm text-blue-900 font-semibold"
                align="end"
              >
                <DropdownMenuItem
                  onClick={handleDownloadAudio}
                  className="rounded px-4 py-2 cursor-pointer transition hover:bg-blue-200/60 focus:bg-blue-200/80 text-blue-900"
                >
                  Download audio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDownloadTranscript}
                  className="rounded px-4 py-2 cursor-pointer transition hover:bg-blue-200/60 focus:bg-blue-200/80 text-blue-900"
                >
                  Download transcript
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={!isStreamingMode ? src : undefined}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleSegmentEnd}
        className="hidden"
      />
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-900/60 rounded-2xl z-20 animate-pulse">
          <span className="text-white text-lg font-semibold">Loading...</span>
        </div>
      )}
    </div>
  );
};

function formatTime(sec: number) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

// Enhanced CaptionsDisplay component with smooth word glow and line transitions
interface CaptionsDisplayProps {
  caption: Caption | null;
  playbackRate: number;
}

const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({ caption, playbackRate }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [previousCaption, setPreviousCaption] = useState<Caption | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevCaptionRef = useRef<Caption | null>(null);

  const words = caption ? caption.text.split(' ') : [];
  const prevWords = previousCaption ? previousCaption.text.split(' ') : [];

  useEffect(() => {
    if (!caption) return;
    
    // If the caption changed, start transition
    if (prevCaptionRef.current !== caption) {
      if (prevCaptionRef.current) {
        setPreviousCaption(prevCaptionRef.current);
        setIsTransitioning(true);
        
        // After transition delay, remove previous caption
        setTimeout(() => {
          setPreviousCaption(null);
          setIsTransitioning(false);
        }, 800);
      }
      
      setCurrentWordIndex(0);
      prevCaptionRef.current = caption;
    }
    
    if (currentWordIndex < words.length) {
      // Calculate word delay based on caption duration and playbackRate
      const duration = (caption.end - caption.start) / playbackRate;
      const wordDelay = duration / words.length;
      const timeout = setTimeout(() => {
        setCurrentWordIndex(v => v + 1);
      }, wordDelay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [caption, currentWordIndex, playbackRate, words.length]);

  if (!caption && !previousCaption) return null;

  return (
    <div className="relative w-full flex flex-col items-center h-24 overflow-hidden">
      {/* Previous line - moving up and fading out */}
      {previousCaption && (
        <div
          className={`absolute w-full text-center text-blue-900 text-xl font-inter select-none transition-all duration-800 ease-out ${
            isTransitioning ? 'transform -translate-y-8 opacity-0' : ''
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span className="font-semibold mr-2">{previousCaption.role}:</span>
          <span>{prevWords.join(' ')}</span>
        </div>
      )}
      
      {/* Current line - sliding in from below */}
      {caption && (
        <div
          className={`absolute w-full text-center text-blue-900 text-xl font-inter select-none transition-all duration-800 ease-out ${
            isTransitioning ? 'transform translate-y-8 opacity-0' : 'transform translate-y-0 opacity-100'
          }`}
          style={{ 
            fontFamily: 'Inter, sans-serif',
            top: previousCaption ? '32px' : '16px'
          }}
        >
          <span className="font-semibold mr-2">{caption.role}:</span>
          <span>
            {words.map((word, index) => (
                             <span
                 key={index}
                 className={`inline-block mr-3 transition-all duration-300 ease-out ${
                   index === currentWordIndex - 1
                     ? 'text-blue-600 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] scale-105 font-semibold'
                     : index < currentWordIndex
                     ? 'text-blue-900'
                     : 'text-blue-400 opacity-60'
                 }`}
                style={{
                  textShadow: index === currentWordIndex - 1 ? '0 0 12px rgba(59,130,246,0.6)' : 'none',
                  filter: index === currentWordIndex - 1 ? 'brightness(1.2)' : 'none'
                }}
              >
                {word}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

export default PodcastPlayer;
export { CaptionsDisplay };
