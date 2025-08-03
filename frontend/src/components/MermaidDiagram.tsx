// components/MermaidDiagram.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Copy,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface MermaidDiagramProps {
  diagramCode?: string;
  repoUrl?: string;
}

interface ZoomState {
  level: number;
  originX: number;
  originY: number;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  diagramCode,
  repoUrl,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGElement | null>(null);
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoomState, setZoomState] = useState<ZoomState>({
    level: 1,
    originX: 0.5,
    originY: 0.5,
  });
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Zoom configuration
  const ZOOM_CONFIG = {
    MIN: 0.25,
    MAX: 5,
    STEP: 0.1,
    WHEEL_STEP: 0.05,
    TRANSITION_DURATION: 300,
  };

  // Apply zoom with smooth transition
  const applyZoom = useCallback(
    (newZoomState: ZoomState, animate: boolean = true) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;

      if (animate) {
        setIsTransitioning(true);
        svgEl.style.transition = `transform ${ZOOM_CONFIG.TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      } else {
        svgEl.style.transition = "none";
      }

      svgEl.style.transform = `scale(${newZoomState.level})`;
      svgEl.style.transformOrigin = `${newZoomState.originX * 100}% ${
        newZoomState.originY * 100
      }%`;

      if (animate) {
        setTimeout(() => {
          setIsTransitioning(false);
          svgEl.style.transition = "";
        }, ZOOM_CONFIG.TRANSITION_DURATION);
      }
    },
    []
  );

  // Calculate mouse position relative to SVG
  const getMousePosition = useCallback(
    (e: MouseEvent | WheelEvent): { x: number; y: number } => {
      const svgEl = svgRef.current;
      if (!svgEl) return { x: 0.5, y: 0.5 };

      const rect = svgEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    },
    []
  );

  // Enhanced wheel handler with touchpad support
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!isZoomEnabled || isTransitioning) return;

      e.preventDefault();

      const mousePos = getMousePosition(e);
      const currentZoom = zoomState.level;

      // Handle different input devices
      let zoomDelta = 0;
      if (e.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
        // Touchpad or smooth scrolling mouse
        zoomDelta = -e.deltaY * ZOOM_CONFIG.WHEEL_STEP * 0.01;
      } else if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        // Traditional mouse wheel
        zoomDelta = -e.deltaY * ZOOM_CONFIG.STEP;
      } else {
        // DOM_DELTA_PAGE
        zoomDelta = -e.deltaY * ZOOM_CONFIG.STEP * 0.5;
      }

      const newZoom = Math.min(
        Math.max(currentZoom + zoomDelta, ZOOM_CONFIG.MIN),
        ZOOM_CONFIG.MAX
      );

      if (newZoom !== currentZoom) {
        const newZoomState = {
          level: newZoom,
          originX: mousePos.x,
          originY: mousePos.y,
        };

        setZoomState(newZoomState);
        applyZoom(newZoomState, true);
      }
    },
    [
      isZoomEnabled,
      isTransitioning,
      zoomState.level,
      getMousePosition,
      applyZoom,
    ]
  );

  // Enhanced click handler with smooth zoom
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isZoomEnabled || isTransitioning) return;

      e.preventDefault();

      const mousePos = getMousePosition(e);
      const currentZoom = zoomState.level;

      let newZoom: number;
      if (e.ctrlKey || e.metaKey) {
        // Zoom out
        newZoom = Math.max(currentZoom * 0.8, ZOOM_CONFIG.MIN);
      } else {
        // Zoom in
        newZoom = Math.min(currentZoom * 1.2, ZOOM_CONFIG.MAX);
      }

      if (newZoom !== currentZoom) {
        const newZoomState = {
          level: newZoom,
          originX: mousePos.x,
          originY: mousePos.y,
        };

        setZoomState(newZoomState);
        applyZoom(newZoomState, true);
      }
    },
    [
      isZoomEnabled,
      isTransitioning,
      zoomState.level,
      getMousePosition,
      applyZoom,
    ]
  );

  // Double-click to reset zoom
  const handleDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!isZoomEnabled || isTransitioning) return;

      e.preventDefault();

      const resetZoomState = {
        level: 1,
        originX: 0.5,
        originY: 0.5,
      };

      setZoomState(resetZoomState);
      applyZoom(resetZoomState, true);
    },
    [isZoomEnabled, isTransitioning, applyZoom]
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isZoomEnabled || isTransitioning) return;

      const currentZoom = zoomState.level;
      let newZoom = currentZoom;

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          newZoom = Math.min(currentZoom + ZOOM_CONFIG.STEP, ZOOM_CONFIG.MAX);
          break;
        case "-":
          e.preventDefault();
          newZoom = Math.max(currentZoom - ZOOM_CONFIG.STEP, ZOOM_CONFIG.MIN);
          break;
        case "0":
          e.preventDefault();
          newZoom = 1;
          break;
        default:
          return;
      }

      if (newZoom !== currentZoom) {
        const newZoomState = {
          level: newZoom,
          originX: 0.5,
          originY: 0.5,
        };

        setZoomState(newZoomState);
        applyZoom(newZoomState, true);
      }
    },
    [isZoomEnabled, isTransitioning, zoomState.level, applyZoom]
  );

  // Reset zoom to original state
  const resetZoom = useCallback(() => {
    const resetZoomState = {
      level: 1,
      originX: 0.5,
      originY: 0.5,
    };

    setZoomState(resetZoomState);
    applyZoom(resetZoomState, true);
  }, [applyZoom]);

  // Fit to screen zoom
  const fitToScreen = useCallback(() => {
    const container = ref.current;
    const svgEl = svgRef.current as SVGSVGElement;
    if (!container || !svgEl) return;

    const containerRect = container.getBoundingClientRect();
    const svgRect = svgEl.getBBox();

    const scaleX = (containerRect.width - 40) / svgRect.width;
    const scaleY = (containerRect.height - 40) / svgRect.height;
    const scale = Math.min(scaleX, scaleY, ZOOM_CONFIG.MAX);

    const newZoomState = {
      level: Math.max(scale, ZOOM_CONFIG.MIN),
      originX: 0.5,
      originY: 0.5,
    };

    setZoomState(newZoomState);
    applyZoom(newZoomState, true);
  }, [applyZoom]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      themeVariables: {
        fontFamily: "Inter, sans-serif",
        fontSize: "16px",
      },
    });

    const renderDiagram = async () => {
      if (ref.current) {
        try {
          const diagramToRender = diagramCode || diagramDefinition;
          console.log("Mermaid diagramCode:", diagramToRender);
          const result = await mermaid.render(
            `diagram-${Date.now()}`,
            diagramToRender
          );
          const svg = typeof result === "string" ? result : result.svg;
          ref.current.innerHTML = "";
          ref.current.insertAdjacentHTML("beforeend", svg);

          const svgEl = ref.current.querySelector("svg") as SVGElement;
          if (svgEl) {
            svgRef.current = svgEl;
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
            svgEl.style.willChange = "transform";
            svgEl.style.transform = "scale(1)";
            svgEl.style.transformOrigin = "center";
          }

          ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (error) {
          console.error("Mermaid render error:", error);
        }
      }
    };

    renderDiagram();
  }, [diagramCode]);

  // Handle zoom event listeners
  useEffect(() => {
    const svgEl = svgRef.current;

    if (svgEl) {
      if (isZoomEnabled) {
        svgEl.style.cursor = "zoom-in";
        svgEl.addEventListener("wheel", handleWheel, { passive: false });
        svgEl.addEventListener("click", handleClick);
        svgEl.addEventListener("dblclick", handleDoubleClick);
        document.addEventListener("keydown", handleKeyDown);

        // Apply current zoom state
        applyZoom(zoomState, false);
      } else {
        svgEl.style.cursor = "default";
        svgEl.removeEventListener("wheel", handleWheel);
        svgEl.removeEventListener("click", handleClick);
        svgEl.removeEventListener("dblclick", handleDoubleClick);
        document.removeEventListener("keydown", handleKeyDown);

        // Reset to original state with animation
        const resetZoomState = { level: 1, originX: 0.5, originY: 0.5 };
        setZoomState(resetZoomState);
        applyZoom(resetZoomState, true);
      }
    }

    // Cleanup function
    return () => {
      if (svgEl) {
        svgEl.removeEventListener("wheel", handleWheel);
        svgEl.removeEventListener("click", handleClick);
        svgEl.removeEventListener("dblclick", handleDoubleClick);
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isZoomEnabled,
    handleWheel,
    handleClick,
    handleDoubleClick,
    handleKeyDown,
    zoomState,
    applyZoom,
  ]);

  const downloadAsPNG = async () => {
    const svgElement = svgRef.current as SVGSVGElement;
    if (!svgElement) {
      console.error("No SVG element found");
      return;
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

      // Reset any transforms for export
      clonedSvg.style.transform = "none";

      // Get SVG dimensions
      const bbox = clonedSvg.getBBox();
      const width = bbox.width || 800;
      const height = bbox.height || 600;

      // Set explicit dimensions and ensure proper SVG structure
      clonedSvg.setAttribute("width", width.toString());
      clonedSvg.setAttribute("height", height.toString());
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Embed all styles inline to avoid external dependencies
      const styleElements = clonedSvg.querySelectorAll("style");
      styleElements.forEach((style) => {
        if (style.sheet) {
          let cssText = "";
          try {
            for (let i = 0; i < style.sheet.cssRules.length; i++) {
              cssText += style.sheet.cssRules[i].cssText + "\n";
            }
            style.textContent = cssText;
          } catch {
            // If we can't access cssRules, keep the existing content
          }
        }
      });

      // Use data URL instead of blob to avoid CORS issues
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svgData
      )}`;

      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        console.error("Could not get canvas context");
        return;
      }

      // High resolution for better quality
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Create image from data URL (no CORS issues)
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Fill white background
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale context for high-res
            ctx.scale(scale, scale);

            // Draw the SVG
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to PNG and download
            canvas.toBlob((blob) => {
              if (blob) {
                // Extract repository name from URL for filename
                let filename = "mermaid-diagram";
                if (repoUrl) {
                  try {
                    // Handle GitHub URLs like https://github.com/owner/repo-name
                    const urlParts = repoUrl.replace(/\/$/, "").split("/");
                    const repoName = urlParts[urlParts.length - 1];
                    if (repoName && repoName !== "github.com") {
                      // Replace any non-alphanumeric characters with hyphens for safe filename
                      filename = repoName
                        .replace(/[^a-zA-Z0-9]/g, "-")
                        .toLowerCase();
                    }
                  } catch (error) {
                    console.log("Could not parse repo name from URL:", error);
                  }
                }

                const link = document.createElement("a");
                link.download = `${filename}-diagram-${Date.now()}.png`;
                link.href = URL.createObjectURL(blob);
                link.style.display = "none";

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up the blob URL
                setTimeout(() => {
                  URL.revokeObjectURL(link.href);
                }, 100);

                console.log("PNG download successful");
              } else {
                console.error("Failed to create PNG blob");
              }
            }, "image/png");

            resolve(true);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = (error) => {
          console.error("Image loading failed:", error);
          reject(error);
        };

        // Use data URL instead of blob URL to avoid CORS
        img.src = dataUrl;
      });
    } catch (error) {
      console.error("PNG export failed:", error);
    }
  };

  const copyMermaidCode = async () => {
    const codeToUse = diagramCode || diagramDefinition;
    try {
      await navigator.clipboard.writeText(codeToUse);
      console.log("Mermaid code copied to clipboard");

      // Show notification
      setShowCopyNotification(true);

      // Hide notification after 2 seconds
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const toggleZoom = () => {
    setIsZoomEnabled((prev) => !prev);
  };

  const diagramDefinition = `
    flowchart TD
        subgraph "Browser & Extension"
            direction TB
            PopupUI["Popup UI"]:::ext
            Background["Background Script"]:::ext
            Content["Content Script"]:::ext
            Manifest["manifest.json"]:::ext
            Icons["icons/"]:::ext
        end

        subgraph "Target Web Page"
            direction TB
            WebPage["Target Web Page"]:::external
        end

        subgraph "Flask Backend"
            direction TB
            Backend["Flask Backend (port 5000)"]:::backend
            Venv["venv/"]:::backend
        end

        Storage["Local Storage / Report"]:::storage
        README["README.md"]:::docs

        %% Interactions
        PopupUI -->|"User Input"| Background
        Background --> Content
        Content --> WebPage
        Content --> Storage
        Background --> Backend
        Backend --> Venv
        Backend --> Storage
        README --> Backend

        classDef ext fill:#E3F2FD,stroke:#1976D2;
        classDef external fill:#E8F5E8,stroke:#388E3C;
        classDef backend fill:#FFF8E1,stroke:#F57C00;
        classDef storage fill:#F3E5F5,stroke:#7B1FA2;
        classDef docs fill:#FCE4EC,stroke:#C2185B;
  `;

  return (
    <div className="relative w-full">
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          minHeight: "600px",
          margin: "40px auto",
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: isZoomEnabled ? "auto" : "hidden",
          borderRadius: 16,
        }}
      />

      {/* Control Panel - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleZoom}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 shadow-md border ${
              isZoomEnabled
                ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
            }`}
          >
            {isZoomEnabled ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            <span className="text-sm">
              {isZoomEnabled ? "Zoom: ON" : "Zoom: OFF"}
            </span>
          </button>

          {isZoomEnabled && (
            <>
              <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border shadow-sm">
                {(zoomState.level * 100).toFixed(0)}%
              </div>

              <button
                onClick={resetZoom}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white rounded border shadow-sm hover:bg-gray-50 transition-colors"
                title="Reset zoom (0)"
              >
                <RotateCcw size={12} />
                Reset
              </button>

              <button
                onClick={fitToScreen}
                className="text-xs text-gray-600 bg-white px-2 py-1 rounded border shadow-sm hover:bg-gray-50 transition-colors"
                title="Fit to screen"
              >
                Fit
              </button>
            </>
          )}
        </div>

        {/* Export Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium">
              <Download size={16} />
              Export
              <ChevronDown size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            <DropdownMenuItem
              onClick={downloadAsPNG}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Download size={16} />
              Download PNG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={copyMermaidCode}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Copy size={16} />
              Copy Mermaid Code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Copy Notification */}
      {showCopyNotification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-indigo-500 bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 z-50">
          Code copied to clipboard
        </div>
      )}
    </div>
  );
};

export default MermaidDiagram;
