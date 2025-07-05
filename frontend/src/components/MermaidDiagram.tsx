// components/MermaidDiagram.tsx
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  diagramCode?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ diagramCode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false });

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
            // Remove any transform/zoom attributes
            svgEl.removeAttribute('transform');
          }

          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
          console.error('Mermaid render error:', error);
        }
      }
    };

    renderDiagram();
  }, [diagramCode]);

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
