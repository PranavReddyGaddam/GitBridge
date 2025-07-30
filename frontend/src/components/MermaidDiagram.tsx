// components/MermaidDiagram.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, Copy, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';

interface MermaidDiagramProps {
  diagramCode?: string;
  repoUrl?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ diagramCode, repoUrl }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  // Memoize event handlers to prevent recreation on every render
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isZoomEnabled) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom * delta, 0.5), 3);
      
      // Apply zoom immediately
      const svgEl = ref.current?.querySelector('svg') as SVGElement;
      if (svgEl) {
        svgEl.style.transform = `scale(${newZoom})`;
        svgEl.style.transformOrigin = 'center';
      }
      
      return newZoom;
    });
  }, [isZoomEnabled]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!isZoomEnabled) return;
    
    e.preventDefault();
    
    setZoomLevel(prevZoom => {
      let newZoom;
      if (e.ctrlKey || e.metaKey) {
        // Zoom out on Ctrl+Click
        newZoom = Math.max(prevZoom * 0.8, 0.5);
      } else {
        // Zoom in on regular click
        newZoom = Math.min(prevZoom * 1.2, 3);
      }
      
      // Apply zoom immediately
      const svgEl = ref.current?.querySelector('svg') as SVGElement;
      if (svgEl) {
        svgEl.style.transform = `scale(${newZoom})`;
        svgEl.style.transformOrigin = 'center';
      }
      
      return newZoom;
    });
  }, [isZoomEnabled]);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        fontFamily: 'Inter, sans-serif',
        fontSize: '16px' // Increase font size from default (~12px)
      }
    });

    const renderDiagram = async () => {
      if (ref.current) {
        try {
          const diagramToRender = diagramCode || diagramDefinition;
          console.log('Mermaid diagramCode:', diagramToRender);
          const result = await mermaid.render(`diagram-${Date.now()}`, diagramToRender);
          const svg = typeof result === 'string' ? result : result.svg;
          ref.current.innerHTML = '';
          ref.current.insertAdjacentHTML('beforeend', svg);

          const svgEl = ref.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = '100%';
            svgEl.style.height = '100%';
            svgEl.style.transform = `scale(${zoomLevel})`;
            svgEl.style.transformOrigin = 'center';
          }

          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
          console.error('Mermaid render error:', error);
        }
      }
    };

    renderDiagram();
  }, [diagramCode, zoomLevel]);

  // Handle zoom event listeners
  useEffect(() => {
    const svgEl = ref.current?.querySelector('svg');
    
    if (svgEl) {
      if (isZoomEnabled) {
        svgEl.style.cursor = 'zoom-in';
        svgEl.addEventListener('wheel', handleWheel, { passive: false });
        svgEl.addEventListener('click', handleClick);
      } else {
        svgEl.style.cursor = 'default';
        svgEl.removeEventListener('wheel', handleWheel);
        svgEl.removeEventListener('click', handleClick);
        svgEl.style.transform = 'scale(1)';
        setZoomLevel(1);
      }
    }

    // Cleanup function
    return () => {
      if (svgEl) {
        svgEl.removeEventListener('wheel', handleWheel);
        svgEl.removeEventListener('click', handleClick);
      }
    };
  }, [isZoomEnabled, handleWheel, handleClick]);

  const downloadAsPNG = async () => {
    const svgElement = ref.current?.querySelector('svg') as SVGSVGElement;
    if (!svgElement) {
      console.error('No SVG element found');
      return;
    }

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Reset any transforms for export
      clonedSvg.style.transform = 'none';
      
      // Get SVG dimensions
      const bbox = clonedSvg.getBBox();
      const width = bbox.width || 800;
      const height = bbox.height || 600;
      
      // Set explicit dimensions and ensure proper SVG structure
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Embed all styles inline to avoid external dependencies
      const styleElements = clonedSvg.querySelectorAll('style');
      styleElements.forEach(style => {
        if (style.sheet) {
          let cssText = '';
          try {
            for (let i = 0; i < style.sheet.cssRules.length; i++) {
              cssText += style.sheet.cssRules[i].cssText + '\n';
            }
            style.textContent = cssText;
                     } catch {
             // If we can't access cssRules, keep the existing content
           }
        }
      });
      
      // Use data URL instead of blob to avoid CORS issues
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        console.error('Could not get canvas context');
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
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Scale context for high-res
            ctx.scale(scale, scale);
            
            // Draw the SVG
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to PNG and download
            canvas.toBlob((blob) => {
              if (blob) {
                // Extract repository name from URL for filename
                let filename = 'mermaid-diagram';
                if (repoUrl) {
                  try {
                    // Handle GitHub URLs like https://github.com/owner/repo-name
                    const urlParts = repoUrl.replace(/\/$/, '').split('/');
                    const repoName = urlParts[urlParts.length - 1];
                    if (repoName && repoName !== 'github.com') {
                      // Replace any non-alphanumeric characters with hyphens for safe filename
                      filename = repoName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                    }
                  } catch (error) {
                    console.log('Could not parse repo name from URL:', error);
                  }
                }
                
                const link = document.createElement('a');
                link.download = `${filename}-diagram-${Date.now()}.png`;
                link.href = URL.createObjectURL(blob);
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the blob URL
                setTimeout(() => {
                  URL.revokeObjectURL(link.href);
                }, 100);
                
                console.log('PNG download successful');
              } else {
                console.error('Failed to create PNG blob');
              }
            }, 'image/png');
            
            resolve(true);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image loading failed:', error);
          reject(error);
        };
        
        // Use data URL instead of blob URL to avoid CORS
        img.src = dataUrl;
      });
      
    } catch (error) {
      console.error('PNG export failed:', error);
    }
  };

  const copyMermaidCode = async () => {
    const codeToUse = diagramCode || diagramDefinition;
    try {
      await navigator.clipboard.writeText(codeToUse);
      console.log('Mermaid code copied to clipboard');
      
      // Show notification
      setShowCopyNotification(true);
      
      // Hide notification after 2 seconds
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const toggleZoom = () => {
    setIsZoomEnabled(prev => !prev);
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
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          minHeight: '600px',
          margin: '40px auto',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: isZoomEnabled ? 'auto' : 'hidden',
          borderRadius: 16,
        }}
      />
      
      {/* Control Panel - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        {/* Zoom Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleZoom}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 shadow-md border ${
              isZoomEnabled 
                ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {isZoomEnabled ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            <span className="text-sm">
              {isZoomEnabled ? 'Zoom: ON' : 'Zoom: OFF'}
            </span>
          </button>
          
          {isZoomEnabled && (
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border shadow-sm">
              {(zoomLevel * 100).toFixed(0)}%
            </div>
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
            <DropdownMenuItem onClick={downloadAsPNG} className="flex items-center gap-2 cursor-pointer">
              <Download size={16} />
              Download PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyMermaidCode} className="flex items-center gap-2 cursor-pointer">
              <Copy size={16} />
              Copy Mermaid Code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Zoom Instructions */}
      {isZoomEnabled && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs px-3 py-2 rounded-lg">
          <div>🖱️ Click to zoom in</div>
          <div>⌘/Ctrl + Click to zoom out</div>
          <div>🎯 Scroll to zoom</div>
        </div>
      )}
      
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
