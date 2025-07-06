import React, { useRef, useState, useEffect } from 'react';
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

interface PodcastPlayerProps {
  src: string;
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

  // Use controlled props if provided
  const effectiveSpeed = controlledSpeed !== undefined ? controlledSpeed : speed;
  const effectiveCurrentTime = controlledCurrentTime !== undefined ? controlledCurrentTime : currentTime;
  const effectiveCaptionsOn = captionsOn !== undefined ? captionsOn : false;

  // Download handlers
  const handleDownloadAudio = () => {
    // TODO: Implement audio download logic
    alert('Download audio clicked');
  };
  const handleDownloadTranscript = () => {
    // TODO: Implement transcript download logic
    alert('Download transcript clicked');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        skip(15);
      } else if (e.code === 'ArrowLeft') {
        skip(-15);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = effectiveSpeed;
    }
  }, [volume, effectiveSpeed]);

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (onDurationChange) onDurationChange(audioRef.current.duration);
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (onTimeUpdate) onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const onProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const skip = (secs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        Math.max(audioRef.current.currentTime + secs, 0),
        duration
      );
    }
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
          <div className="text-lg font-bold text-gray-900 drop-shadow mb-1 truncate">{title}</div>
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
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${(effectiveCurrentTime / duration) * 100 || 0}%` }}
          />
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
              onClick={() => setPlaying((p) => !p)}
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
            {formatTime(duration)}
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
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
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

// CaptionsDisplay component for YouTube-style captions
interface CaptionsDisplayProps {
  caption: Caption | null;
  playbackRate: number;
}

const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({ caption, playbackRate }) => {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = caption ? caption.text.split(' ') : [];
  const prevCaptionRef = useRef<Caption | null>(null);

  useEffect(() => {
    if (!caption) return;
    // If the caption changed, reset
    if (prevCaptionRef.current !== caption) {
      setVisibleWords(0);
      prevCaptionRef.current = caption;
    }
    if (visibleWords < words.length) {
      // Calculate word delay based on caption duration and playbackRate
      const duration = (caption.end - caption.start) / playbackRate;
      const wordDelay = duration / words.length;
      const timeout = setTimeout(() => {
        setVisibleWords(v => v + 1);
      }, wordDelay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [caption, visibleWords, playbackRate, words.length]);

  if (!caption) return null;
  return (
    <div
      className="w-full text-center text-blue-900 text-2xl font-inter mt-8 select-none"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <span className="font-semibold mr-2">{caption.role}:</span>
      <span>{words.slice(0, visibleWords).join(' ')}</span>
    </div>
  );
};

export default PodcastPlayer;
export { CaptionsDisplay };
