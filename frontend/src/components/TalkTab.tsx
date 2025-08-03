import { useState, useEffect, useRef } from "react";
import { Mic, HelpCircle } from "lucide-react";

// API configuration
const API_BASE_URL = "http://localhost:8000";

interface TalkTabProps {
  repoUrl: string;
  repoAnalysis: {
    success: boolean;
    repo_name: string;
    repo_description: string;
    analysis_summary: string;
    introduction_text: string;
    introduction_audio_size: number;
  } | null;
}

interface VoiceBubbleProps {
  state: "idle" | "listening" | "speaking";
  onTap?: () => void;
  onStartConversation?: () => void;
  showInterruptPrompt?: boolean;
}

function VoiceBubble({
  state,
  onTap,
  onStartConversation,
  showInterruptPrompt = false,
}: VoiceBubbleProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const listeningGradient =
    "linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(59, 130, 246, 0.7) 50%, rgba(147, 197, 253, 0.6) 100%)";

  useEffect(() => {
    // No longer need gradient cycling for listening state
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state]);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  const PulsatingCircle = ({
    delay,
    size,
    opacity,
  }: {
    delay: number;
    size: number;
    opacity: number;
  }) => (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, rgba(30, 64, 175, 0.15) 0%, rgba(59, 130, 246, 0.1) 50%, rgba(147, 197, 253, 0.05) 100%)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
        backdropFilter: "blur(10px)",
        opacity: opacity,
        animation:
          state === "listening"
            ? `pulse 5s ease-out infinite ${delay}s`
            : "none",
        transform: "translate(-50%, -50%)",
        left: "50%",
        top: "50%",
      }}
    />
  );

  const SpeakingWaves = () => (
    <div
      style={{
        position: "absolute",
        display: "flex",
        gap: "8px",
        alignItems: "center",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        filter:
          "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))",
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: "6px",
            height: `${24 + (i % 2) * 16}px`,
            borderRadius: "3px",
            background: "rgba(255, 255, 255, 0.9)",
            animation: `speakingWave 1.2s ease-in-out infinite ${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  const getStateGradient = () => {
    switch (state) {
      case "idle":
        return "linear-gradient(135deg, rgba(71, 85, 105, 0.8) 0%, rgba(51, 65, 85, 0.7) 50%, rgba(30, 41, 59, 0.6) 100%)";
      case "listening":
        return listeningGradient;
      case "speaking":
        return "linear-gradient(135deg, rgba(16, 185, 129, 0.8) 0%, rgba(5, 150, 105, 0.7) 50%, rgba(4, 120, 87, 0.6) 100%)";
      default:
        return listeningGradient;
    }
  };

  const getBorderColor = () => {
    switch (state) {
      case "idle":
        return "rgba(148, 163, 184, 0.7)";
      case "listening":
        return "rgba(59, 130, 246, 0.8)";
      case "speaking":
        return "rgba(16, 185, 129, 0.8)";
      default:
        return "rgba(59, 130, 246, 0.7)";
    }
  };

  const getGlowColor = () => {
    switch (state) {
      case "idle":
        return "rgba(148, 163, 184, 0.5)";
      case "listening":
        return "rgba(59, 130, 246, 0.6)";
      case "speaking":
        return "rgba(16, 185, 129, 0.6)";
      default:
        return "rgba(59, 130, 246, 0.5)";
    }
  };

  const getHoverScale = () => {
    if (isPressed) return "scale(0.95)";
    if (isHovered) return "scale(1.05)";
    return "scale(1)";
  };

  const getStateAnimation = () => {
    switch (state) {
      case "idle":
        return "idleBreathe 8s ease-in-out infinite";
      case "listening":
        return "breathe 6s ease-in-out infinite";
      case "speaking":
        return "speakingPulse 2s ease-in-out infinite";
      default:
        return "none";
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.6;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.6);
              opacity: 0.3;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.4);
              opacity: 0;
            }
          }
          
          @keyframes idleBreathe {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.02);
            }
          }
          
          @keyframes breathe {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.08);
            }
          }
          
          @keyframes speakingPulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          

          
          @keyframes speakingWave {
            0%, 100% {
              transform: scaleY(1);
            }
            50% {
              transform: scaleY(1.8);
            }
          }
          
          @keyframes textPulse {
            0%, 100% {
              opacity: 0.8;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.02);
            }
          }
          
          @keyframes micPulsate {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.2);
            }
          }
          
          @keyframes stateTransition {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          .noise-texture {
            background-image: 
              radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
            background-size: 50px 50px, 30px 30px, 70px 70px;
          }
          
          .edge-lighting {
            position: relative;
          }
          
          .edge-lighting::before {
            content: '';
            position: absolute;
            top: -1px;
            left: -1px;
            right: -1px;
            bottom: -1px;
            border-radius: inherit;
            background: linear-gradient(45deg, ${getBorderColor()}, transparent, ${getBorderColor()});
            z-index: -1;
            opacity: 0.6;
          }
        `}
      </style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 500,
          position: "relative",
          marginBottom: 0,
        }}
      >
        {/* Circle Container */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            width: 600,
            height: 400,
            marginBottom: 0,
            transform: getHoverScale(),
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onClick={onTap}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Pulsating concentric circles - only visible during listening */}
          {state === "listening" && (
            <>
              <PulsatingCircle delay={0} size={150} opacity={0.6} />
              <PulsatingCircle delay={1} size={200} opacity={0.5} />
              <PulsatingCircle delay={2} size={250} opacity={0.4} />
            </>
          )}

          {/* Outer glassmorphism circle */}
          <div
            className="edge-lighting noise-texture"
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: 400,
              height: 400,
              background: getStateGradient(),
              border: `2px solid ${getBorderColor()}`,
              backdropFilter: "blur(20px)",
              animation: getStateAnimation(),
              transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `
                0 50px 140px rgba(0, 0, 0, 0.2),
                0 24px 70px rgba(0, 0, 0, 0.15),
                0 12px 30px rgba(0, 0, 0, 0.1),
                inset 0 4px 0 rgba(255, 255, 255, 0.1),
                inset 0 -4px 0 rgba(0, 0, 0, 0.1)
                ${isHovered ? `, 0 0 100px ${getGlowColor()}` : ""}
              `,
            }}
          />

          {/* Middle glassmorphism circle */}
          <div
            className="noise-texture"
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: 280,
              height: 280,
              background: getStateGradient(),
              border: `2px solid ${getBorderColor()}`,
              backdropFilter: "blur(15px)",
              animation:
                state === "listening"
                  ? "breathe 5s ease-in-out infinite 1s"
                  : state === "speaking"
                  ? "speakingPulse 1.5s ease-in-out infinite"
                  : "none",
              transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `
                0 30px 90px rgba(0, 0, 0, 0.15),
                0 16px 40px rgba(0, 0, 0, 0.1),
                inset 0 2px 0 rgba(255, 255, 255, 0.15),
                inset 0 -2px 0 rgba(0, 0, 0, 0.05)
              `,
            }}
          />

          {/* Inner glassmorphism circle */}
          <div
            style={{
              position: "absolute",
              borderRadius: "50%",
              width: 160,
              height: 160,
              background: getStateGradient(),
              border: `2px solid ${getBorderColor()}`,
              backdropFilter: "blur(10px)",
              animation:
                state === "listening"
                  ? "breathe 4s ease-in-out infinite 2s"
                  : "none",
              transition: "all 1s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `
                0 20px 50px rgba(0, 0, 0, 0.12),
                0 10px 24px rgba(0, 0, 0, 0.08),
                inset 0 2px 0 rgba(255, 255, 255, 0.2),
                inset 0 -2px 0 rgba(0, 0, 0, 0.05)
              `,
            }}
          />

          {/* State-specific content */}
          {state === "idle" && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onStartConversation?.();
              }}
              style={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "32px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.textShadow =
                  "0 0 16px rgba(59, 130, 246, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.textShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.3)";
              }}
            >
              Start
            </div>
          )}

          {state === "listening" && (
            <Mic
              size={56}
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                filter:
                  "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))",
                animation: "micPulsate 1.5s ease-in-out infinite",
                position: "absolute",
              }}
            />
          )}
          {state === "speaking" && <SpeakingWaves />}
        </div>

        {state === "speaking" && showInterruptPrompt && (
          <div
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.6)",
              animation: "textPulse 3s ease-in-out infinite",
              textAlign: "center",
              textShadow: "0 1px 4px rgba(0, 0, 0, 0.3)",
              transition: "all 0.3s ease-in-out",
            }}
          >
            Tap anywhere to interrupt
          </div>
        )}
      </div>
    </>
  );
}

interface InstructionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function InstructionsPanel({ isOpen, onClose }: InstructionsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "320px",
        maxHeight: "400px",
        background:
          "linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(147, 197, 253, 0.4) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(147, 197, 253, 0.3)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow:
          "0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2)",
        zIndex: 1000,
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "18px",
            fontWeight: "600",
            margin: 0,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          How to use GitBridge Talk
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px",
            borderRadius: "4px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "14px",
          lineHeight: "1.6",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <strong style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            🎯 Getting Started
          </strong>
        </div>
        <ul style={{ paddingLeft: "16px", margin: "0 0 16px 0" }}>
          <li style={{ marginBottom: "8px" }}>
            Click "Start" to begin talking with AI
          </li>
          <li style={{ marginBottom: "8px" }}>
            Ask questions about your repository structure
          </li>
          <li style={{ marginBottom: "8px" }}>
            Discuss code architecture and best practices
          </li>
        </ul>

        <div style={{ marginBottom: "12px" }}>
          <strong style={{ color: "rgba(255, 255, 255, 0.9)" }}>
            🎙️ Voice Interaction
          </strong>
        </div>
        <ul style={{ paddingLeft: "16px", margin: "0 0 16px 0" }}>
          <li style={{ marginBottom: "8px" }}>
            Speak clearly when the bubble is listening
          </li>
          <li style={{ marginBottom: "8px" }}>
            Tap anywhere to interrupt AI while speaking
          </li>
          <li style={{ marginBottom: "8px" }}>
            If audio isn't caught, you'll be prompted to repeat
          </li>
        </ul>

        <div style={{ marginBottom: "12px" }}>
          <strong style={{ color: "rgba(255, 255, 255, 0.9)" }}>💡 Tips</strong>
        </div>
        <ul style={{ paddingLeft: "16px", margin: "0" }}>
          <li style={{ marginBottom: "8px" }}>
            Use a quiet environment for best results
          </li>
          <li style={{ marginBottom: "8px" }}>
            Ask specific questions about code patterns
          </li>
          <li style={{ marginBottom: "8px" }}>
            AI can help explain complex architectures
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function TalkTab({ repoUrl, repoAnalysis }: TalkTabProps) {
  const [state, setState] = useState<"idle" | "listening" | "speaking">("idle");
  const [showInstructions, setShowInstructions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [introductionPlayed, setIntroductionPlayed] = useState(false);

  const voiceBubbleRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Auto-scroll to voice bubble when component mounts
  useEffect(() => {
    if (voiceBubbleRef.current) {
      voiceBubbleRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  // Auto-play introduction when component mounts and analysis is available
  useEffect(() => {
    const playIntroduction = async () => {
      if (repoAnalysis && !introductionPlayed && repoAnalysis.success) {
        try {
          setState("speaking");
          setIntroductionPlayed(true);

          console.log("Playing introduction for:", repoAnalysis.repo_name);

          // Get introduction audio from backend (session should now have context)
          const response = await fetch(
            `${API_BASE_URL}/api/voice/introduction-audio`
          );
          if (!response.ok) {
            throw new Error(
              `Failed to get introduction audio: ${response.status}`
            );
          }

          const audioArrayBuffer = await response.arrayBuffer();
          const audioBlob = new Blob([audioArrayBuffer], {
            type: "audio/mpeg",
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);
          setCurrentAudio(audio);

          audio.onended = () => {
            console.log("Introduction audio finished");
            setState("idle");
            URL.revokeObjectURL(audioUrl);
            setCurrentAudio(null);
          };

          audio.onerror = () => {
            console.error("Error playing introduction audio");
            setState("idle");
            URL.revokeObjectURL(audioUrl);
            setCurrentAudio(null);
          };

          console.log("Starting introduction audio playback...");
          await audio.play();
        } catch (error) {
          console.error("Introduction playback error:", error);
          setState("idle");
        }
      }
    };

    // Add a small delay to ensure the analyze-repo request has completed
    const timer = setTimeout(playIntroduction, 500);
    return () => clearTimeout(timer);
  }, [repoAnalysis, introductionPlayed]);

  // Initialize conversation with simple repository context
  useEffect(() => {
    if (repoUrl) {
      setConversationHistory([
        {
          role: "system",
          content: `You are an AI assistant helping users understand and work with their GitHub repository: ${repoUrl}

Please provide helpful, accurate information about software development, coding best practices, and general programming concepts. You can discuss:
- Code structure and architecture patterns
- Best practices and potential improvements
- Explanation of common technologies and frameworks
- How different parts of typical codebases work together
- Suggestions for development or refactoring

Keep your responses conversational and helpful, as if you're pair programming with the user.`,
        },
      ]);
    }
  }, [repoUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
    };
  }, [currentAudio]);

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      setState("listening");
      setIsRecording(true);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const recordedBlob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });
        await processVoiceInput(recordedBlob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error("Error starting recording:", error);
      setState("idle");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const processVoiceInput = async (recordedAudio: Blob) => {
    try {
      // Step 1: Speech-to-Text
      const formData = new FormData();
      formData.append("audio", recordedAudio, "voice.webm");

      const sttResponse = await fetch(`${API_BASE_URL}/api/voice/stt`, {
        method: "POST",
        body: formData,
      });

      if (!sttResponse.ok) {
        throw new Error(`STT failed: ${sttResponse.status}`);
      }

      const sttData = await sttResponse.json();
      console.log("STT Response:", sttData);

      if (!sttData.transcript || sttData.transcript.trim().length === 0) {
        setState("idle");
        setTimeout(() => setState("idle"), 2000);
        return;
      }

      // Add user message to conversation history
      const userMessage = { role: "user", content: sttData.transcript };
      const updatedHistory = [...conversationHistory, userMessage];

      // Step 2: LLM Processing with conversation history
      const llmResponse = await fetch(`${API_BASE_URL}/api/voice/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: sttData.transcript,
        }),
      });

      if (!llmResponse.ok) {
        throw new Error(`LLM failed: ${llmResponse.status}`);
      }

      const llmData = await llmResponse.json();
      console.log("LLM Response:", llmData);

      // Add assistant response to conversation history
      const assistantMessage = { role: "assistant", content: llmData.response };
      setConversationHistory([...updatedHistory, assistantMessage]);

      // Step 3: Text-to-Speech
      setState("speaking");

      const ttsResponse = await fetch(`${API_BASE_URL}/api/voice/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
                  body: JSON.stringify({
            text: llmData.response,
            voice_id: "Joanna", // You can make this configurable
          }),
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS failed: ${ttsResponse.status}`);
      }

      // Step 4: Play Audio Response
      const audioArrayBuffer = await ttsResponse.arrayBuffer();
      const responseAudioBlob = new Blob([audioArrayBuffer], {
        type: "audio/mpeg",
      });
      const audioUrl = URL.createObjectURL(responseAudioBlob);

      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onended = () => {
        setState("idle");
        setTimeout(() => setState("idle"), 1500);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        console.error("Error playing audio");
        setState("idle");
        setTimeout(() => setState("idle"), 2000);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      await audio.play();
    } catch (error) {
      console.error("Voice pipeline error:", error);
      setState("idle");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  const handleStartConversation = async () => {
    await startRecording();
  };

  const handleVoiceBubbleTap = () => {
    if (state === "listening" && isRecording) {
      // Stop recording and process
      stopRecording();
    } else if (state === "speaking" && currentAudio && introductionPlayed) {
      // Only allow interruption after introduction has played
      currentAudio.pause();
      setCurrentAudio(null);
      startRecording();
    } else if (state === "idle") {
      // Retry after error
      setState("idle");
    }
    // During introduction (speaking but !introductionPlayed), do nothing - let it finish
  };

  return (
    <div
      ref={voiceBubbleRef}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: "90vh",
        width: "100%",
        position: "relative",
        padding: "20px",
        paddingTop: "10vh",
      }}
    >
      <VoiceBubble
        state={state}
        showInterruptPrompt={state === "speaking" && introductionPlayed}
        onTap={handleVoiceBubbleTap}
        onStartConversation={handleStartConversation}
      />

      {/* Instructions Button */}
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)",
          border: "1px solid rgba(147, 197, 253, 0.3)",
          backdropFilter: "blur(20px)",
          color: "rgba(255, 255, 255, 0.9)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          boxShadow:
            "0 8px 20px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.2)",
          zIndex: 999,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow =
            "0 12px 30px rgba(0, 0, 0, 0.4), 0 6px 15px rgba(0, 0, 0, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow =
            "0 8px 20px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.2)";
        }}
      >
        <HelpCircle size={20} />
      </button>

      {/* Instructions Panel */}
      <InstructionsPanel
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
}
