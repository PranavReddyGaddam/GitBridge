// components/MermaidDiagram.tsx
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  zoomingEnabled?: boolean;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ zoomingEnabled = false }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });

    const renderDiagram = async () => {
      if (ref.current) {
        try {
          const result = await mermaid.render(`diagram-${Date.now()}`, diagramDefinition);
          const svg = typeof result === 'string' ? result : result.svg;
          ref.current.innerHTML = '';
          ref.current.insertAdjacentHTML('beforeend', svg);

          const svgEl = ref.current.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            svgEl.style.width = '100%';
            svgEl.style.height = '100%';

            if (zoomingEnabled) {
              const svgPanZoom = (await import('svg-pan-zoom')).default;
              svgPanZoom(svgEl, {
                zoomEnabled: true,
                controlIconsEnabled: true,
                fit: true,
                center: true,
                minZoom: 0.2,
                maxZoom: 10,
                zoomScaleSensitivity: 0.3,
              });
            }
          }

          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
          console.error('Mermaid render error:', error);
        }
      }
    };

    renderDiagram();
  }, [zoomingEnabled]);

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

        classDef ext fill:#E0F7FA,stroke:#00ACC1;
        classDef external fill:#F1F8E9,stroke:#7CB342;
        classDef backend fill:#FFF3E0,stroke:#FB8C00;
        classDef storage fill:#EDE7F6,stroke:#5E35B1;
        classDef docs fill:#FCE4EC,stroke:#D81B60;
  `;

  return (
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
        overflow: 'auto',
        borderRadius: 16,
      }}
    />
  );
};

export default MermaidDiagram;
