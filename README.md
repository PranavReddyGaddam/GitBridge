# GitBridge - GitHub Assistant

A modern, minimalistic GitHub assistant UI built with React, Tailwind CSS, and ShadCN components. The application provides two main modes: Podcast and Diagram generation for GitHub repositories.

## Features

- **Podcast Mode**: Generate audio content from GitHub repositories
- **Diagram Mode**: Create MermaidJS diagrams from repository structure
- **Modern UI**: Clean, rounded design with soft green color scheme
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Smooth loading animations for better UX

## Tech Stack

- React 18
- Tailwind CSS
- ShadCN UI Components
- Lucide React Icons
- Radix UI (for accessible components)

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd GitBridge
```

2. Navigate to the frontend directory:
```bash
cd frontend
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Usage

1. **Enter Repository URL**: Paste a GitHub repository URL in the input field
2. **Choose Mode**: Switch between "Podcast" and "Diagram" modes using the tab switcher
3. **Generate Content**: 
   - In Podcast mode: Click "Start Podcast" to generate audio content
   - In Diagram mode: Click "Generate Diagram" to create a MermaidJS diagram
4. **Ask Questions**: Use the "Ask a Question" button in Podcast mode for voice interactions

## Project Structure

```
GitBridge/
├── frontend/           # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # ShadCN UI components
│   │   │   │   ├── button.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── tabs.jsx
│   │   │   │   └── card.jsx
│   │   │   └── GitHubAssistant.jsx  # Main component
│   │   ├── lib/
│   │   │   └── utils.js      # Utility functions
│   │   ├── App.js            # Main app component
│   │   ├── index.js          # Entry point
│   │   └── index.css         # Global styles
│   ├── public/
│   │   └── index.html        # HTML template
│   ├── package.json          # Dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── postcss.config.js     # PostCSS configuration
└── README.md                 # Documentation
```

## Customization

### Colors
The application uses a soft green color scheme. You can customize colors by modifying:
- Background color: `#e6fcef` (set in GitHubAssistant.jsx)
- Component colors: Tailwind classes in components
- CSS variables: `frontend/src/index.css`

### Styling
- All components use Tailwind CSS for styling
- ShadCN components provide consistent design patterns
- Custom styling can be added through Tailwind classes

## Available Scripts

From the `frontend` directory:

- `npm start`: Runs the app in development mode
- `npm build`: Builds the app for production
- `npm test`: Launches the test runner
- `npm eject`: Ejects from Create React App (not recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.