# 🧑‍💻 Developer Guide

This document contains technical details for developers integrating the Gemini Deep Research Agent library or working with the API directly.

## 🔧 Library Usage

Import the library in your Node.js/TypeScript projects:

```typescript
import { 
  createDeepResearchAgent, 
  loadDocumentsFromFolder,
  FileManager 
} from 'gemini-research-agent';

// Create agent
const agent = createDeepResearchAgent(process.env.GEMINI_API_KEY);

// Simple research
const result = await agent.quickResearch('What is quantum computing?');
console.log(result.content);

// Deep research with documents
const docs = await loadDocumentsFromFolder('./research-papers');
const deepResult = await agent.deepResearch(
  'Summarize the main findings from these papers',
  docs
);

// Research with progress tracking
const trackedResult = await agent.research(
  {
    query: 'Climate change mitigation strategies',
    options: {
      depth: 'maximum',
      outputFormat: 'markdown',
      includeCitations: true,
    },
  },
  (event) => {
    console.log(`Progress: ${event.data?.progress}%`);
  }
);

// Clean up
await agent.closeSession();
```

## 🌐 API Endpoints

When running the web server, these endpoints are available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/research` | Start new research query |
| `GET` | `/api/research/:id` | Get research result by ID |
| `GET` | `/api/research` | List recent research results |
| `POST` | `/api/upload` | Upload files for analysis |
| `GET` | `/api/sessions` | List active sessions |
| `GET` | `/api/config` | Get API configuration |
| `GET` | `/health` | Health check |

### Example API Request

```bash
curl -X POST http://localhost:3000/api/research \
  -H "Content-Type: application/json" \
  -d '{"query": "Latest AI research", "depth": "deep"}'
```

## 📁 Project Structure

```
gemini-research-agent/
├── src/
│   ├── lib/                    # Core library
│   │   ├── index.ts            # Main exports
│   │   ├── client.ts           # Gemini API client
│   │   ├── deep-research.ts    # Deep Research agent
│   │   ├── file-manager.ts     # File handling
│   │   └── types.ts            # TypeScript types
│   ├── cli/                    # CLI application
│   │   ├── index.ts            # CLI entry point
│   │   ├── commands/           # CLI commands
│   │   └── utils/              # CLI utilities
│   └── web/                    # Web application
│       ├── server.ts           # Express server
│       ├── routes/             # API routes
│       └── public/             # Frontend files
├── dist/                       # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```
