# 🔬 Gemini Deep Research Agent

A full-featured research agent powered by the **Gemini Interactions API** and **Deep Research** capabilities. Conduct comprehensive AI-powered research with support for document analysis, multiple source types, and customizable depth levels.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![License](https://img.shields.io/badge/license-MIT-purple)

## 🤖 Model

This agent uses the **Deep Research Pro Preview** model:

```
deep-research-pro-preview-12-2025
```

<img width="1509" height="765" alt="Screenshot 2025-12-14 at 12 26 49" src="https://github.com/user-attachments/assets/06e88b75-de8c-4ca0-876a-fee22cb59c13" />

See: [Deep Research Documentation](https://ai.google.dev/gemini-api/docs/deep-research)

## 🧠 Model Comparison: Deep Research vs Deep Think

It's important to understand the distinction between Google's recent AI capabilities:

### **Gemini Deep Research**
This agent utilizes the **Deep Research** capability, which is an agentic workflow designed for comprehensive information gathering and synthesis.
- **Focus**: External research, browsing, multi-step retrieval, and synthesizing logical reports from many sources.
- **Capabilities**: Can use tools, browse the web, read uploaded documents, and iterate on findings.
- **Best For**: Complex research questions, literature reviews, competitive analysis, and background briefings.
- **Docs**: [Gemini Deep Research Documentation](https://ai.google.dev/gemini-api/docs/deep-research)

### **Gemini Deep Think (Gemini 3)**
Refers to **Gemini 3** series models (e.g., **Gemini 3 Pro**), which employ advanced "Chain of Thought" reasoning internally before answering.
- **Focus**: Internal logic, reasoning, puzzles, mathematics, and code generation.
- **Capabilities**: Generates a hidden "thinking process" to verify logic before outputting the final answer. It does not necessarily browse the web better, but it *reasons* better.
- **Best For**: Complex logic problems, coding challenges, math, and ensuring reasoning accuracy.
- **Docs**: [Gemini Thinking Models Documentation](https://ai.google.dev/gemini-api/docs/thinking)

**This project uses the Deep Research capability** to act as an autonomous research assistant.

## ✨ Features

- 🔍 **Deep Research**: Comprehensive AI-powered research using Gemini's Deep Research agent (`deep-research-pro-preview-12-2025`)
- 📁 **Multi-Document Upload**: Upload multiple files or entire folders for context
- 🎚️ **Configurable Depth**: Quick, Standard, Deep, or Maximum research depth
- 📊 **Multiple Output Formats**: Summary, Detailed, Markdown, or JSON
- 🌐 **Web Interface**: Modern, responsive UI for browser-based research
- 💻 **CLI Tool**: Powerful command-line interface for scripting and automation
- 📚 **Library Module**: Import into your own Node.js projects
- ⚡ **Background Processing**: Long-running research with progress tracking
- 🔗 **GitHub Repo Clone**: Paste GitHub URLs in your query - repos are auto-cloned and analyzed

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- A Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone or navigate to the directory
cd gemini-research-agent

# Install dependencies
npm install

# Set up your API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Build the project
npm run build
```

### Usage

#### Web Interface

```bash
# Start the web server
npm start

# Open http://localhost:3000 in your browser
```

#### CLI Tool

```bash
# Basic research
npm run cli research "What are the latest advances in quantum computing?"

# Quick research (fast)
npm run cli quick "Explain machine learning"

# Deep research with maximum depth
npm run cli deep "Climate change impacts on biodiversity"

# Research with document upload
npm run cli research "Summarize the key points" --upload ./paper.pdf

# Research with folder of documents
npm run cli research "Compare these papers" --folder ./research-papers/

# Save output to file
npm run cli research "AI ethics" --output ./results.md
```

## 📖 CLI Commands

### `research` (alias: `r`)

Main research command with full options.

```bash
npm run cli research <query> [options]

Options:
  -d, --depth <level>       Research depth: quick, standard, deep, maximum (default: deep)
  -f, --format <format>     Output format: summary, detailed, markdown, json (default: markdown)
  -u, --upload <files...>   Upload files for context (can specify multiple)
  --folder <path>           Upload all files from a folder
  -t, --types <extensions>  File extensions to include (comma-separated, default: pdf,txt,md,docx)
  -o, --output <file>       Save output to a file
  -c, --citations           Include citations in output
  -s, --sources <type>      Source types: web, academic, news, all (default: all)
  --no-progress             Disable progress output
```

### `quick` (alias: `q`)

Quick research with minimal depth.

```bash
npm run cli quick "Your query"
```

### `deep`

Maximum depth research with citations.

```bash
npm run cli deep "Your query" --upload ./docs/ --output ./results.md
```

### `analyze` (alias: `a`)

Analyze specific documents.

```bash
npm run cli analyze "Extract key findings" ./paper1.pdf ./paper2.pdf
```

### `upload`

Preview files that will be uploaded.

```bash
npm run cli upload ./folder/ --types "pdf,txt"
```

### `status`

Check research session status.

```bash
npm run cli status --list
npm run cli status <session-id>
```

## 👩‍💻 Developer Guide

For technical details on library usage, API endpoints, and project structure, please see the [Developer Guide](developers_readme.md).

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Required
GEMINI_API_KEY=your-api-key-here

# Optional
PORT=3000
HOST=localhost
DEFAULT_RESEARCH_DEPTH=deep
DEFAULT_OUTPUT_FORMAT=markdown
```

### Research Depth Options

| Depth | Description | Use Case |
|-------|-------------|----------|
| `quick` | Fast overview, basic analysis | Simple questions, quick answers |
| `standard` | Balanced depth and speed | General research |
| `deep` | Thorough analysis | Detailed research |
| `maximum` | Exhaustive, multi-source analysis | Academic research, complex topics |

### Supported File Types

- **Documents**: PDF, DOCX, DOC
- **Text**: TXT, MD, HTML, XML
- **Data**: CSV, JSON
- **Code**: JS, TS, PY, etc.

## 🔗 Resources

- [Gemini Interactions API Documentation](https://ai.google.dev/gemini-api/docs/interactions)
- [Deep Research Documentation](https://ai.google.dev/gemini-api/docs/deep-research)
- [Get API Key](https://aistudio.google.com/apikey)
- [Gemini API Blog Post](https://blog.google/technology/developers/interactions-api/)

## 🛠️ Development

```bash
# Watch mode for development
npm run dev

# Build
npm run build

# Clean build artifacts
npm run clean
```

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using the [Gemini Interactions API](https://ai.google.dev/gemini-api/docs/interactions)
