#!/bin/bash

# Gemini Deep Research Agent - Startup Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║   🔬 Gemini Deep Research Agent                                ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo "   Download: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ No .env file found. Creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}  Please edit .env and add your GEMINI_API_KEY${NC}"
        echo ""
        echo -e "${CYAN}  Get your API key at: https://aistudio.google.com/apikey${NC}"
        echo ""
    else
        echo "GEMINI_API_KEY=" > .env
        echo -e "${YELLOW}  Created .env file. Please add your GEMINI_API_KEY${NC}"
    fi
fi

# Check if API key is set
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-api-key-here" ]; then
        echo -e "${YELLOW}⚠ GEMINI_API_KEY is not set in .env file${NC}"
        echo -e "${CYAN}  Get your API key at: https://aistudio.google.com/apikey${NC}"
        echo ""
    else
        echo -e "${GREEN}✓ GEMINI_API_KEY is configured${NC}"
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Always build to ensure latest changes are served
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

# Function to stop running server
stop_server() {
    echo -e "${BLUE}🛑 Stopping server...${NC}"
    pkill -f "node dist/web/server.js" 2>/dev/null || true
    pkill -f "node.*gemini-research-agent.*server" 2>/dev/null || true
    # Also check and kill anything on port 8080
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Server stopped${NC}"
}

# Parse command line arguments
MODE="web"
DEBUG_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        stop)
            stop_server
            exit 0
            ;;
        restart)
            stop_server
            MODE="web"
            shift
            ;;
        --debug|-d)
            DEBUG_MODE=true
            echo -e "${YELLOW}🐛 DEBUG MODE ENABLED${NC}"
            shift
            ;;
        --cli|-c)
            MODE="cli"
            shift
            ;;
        --web|-w)
            MODE="web"
            shift
            ;;
        --build|-b)
            echo -e "${BLUE}🔨 Rebuilding project...${NC}"
            npm run build
            shift
            ;;
        --help|-h)
            echo ""
            echo "Usage: ./start.sh [command] [options] [cli arguments]"
            echo ""
            echo "Commands:"
            echo "  stop          Stop the running server"
            echo "  restart       Restart the server"
            echo ""
            echo "Options:"
            echo "  --web, -w     Start web server (default)"
            echo "  --cli, -c     Run CLI mode (pass additional arguments)"
            echo "  --debug, -d   Enable debug mode with verbose logging"
            echo "  --build, -b   Force rebuild before running"
            echo "  --help, -h    Show this help"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                              # Start web server"
            echo "  ./start.sh --debug                      # Start with debug logging"
            echo "  ./start.sh stop                         # Stop the server"
            echo "  ./start.sh restart                      # Restart the server"
            echo "  ./start.sh --cli research \"Your query\" # Run CLI research"
            echo "  ./start.sh -c quick \"Fast query\"        # Quick CLI research"
            echo "  ./start.sh --build --web                # Rebuild and start web"
            echo ""
            exit 0
            ;;
        *)
            # Pass remaining args to CLI
            if [ "$MODE" = "cli" ]; then
                CLI_ARGS+=("$1")
            fi
            shift
            ;;
    esac
done

# Set up debug environment
if [ "$DEBUG_MODE" = true ]; then
    export DEBUG="*"
    export NODE_ENV="development"
    export LOG_LEVEL="debug"
    echo -e "${CYAN}Debug environment variables set:${NC}"
    echo -e "  DEBUG=*"
    echo -e "  NODE_ENV=development"
    echo -e "  LOG_LEVEL=debug"
    echo ""
fi

# Set up logging
LOG_DIR="logs"
mkdir -p "$LOG_DIR"

# Create log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/server_${TIMESTAMP}.log"

echo -e "${BLUE}📝 Server logs will be saved to: $LOG_FILE${NC}"
echo ""

# Run based on mode
if [ "$MODE" = "web" ]; then
    # Check if port 8080 is already in use and stop it
    if lsof -ti:8080 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Port 8080 is in use. Stopping existing server...${NC}"
        lsof -ti:8080 | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Existing server stopped${NC}"
    fi
    
    echo -e "${GREEN}🚀 Starting web server...${NC}"
    echo ""
    # Start server with output redirected to log file
    npm start 2>&1 | tee "$LOG_FILE"
elif [ "$MODE" = "cli" ]; then
    if [ ${#CLI_ARGS[@]} -eq 0 ]; then
        echo -e "${BLUE}📋 CLI Help:${NC}"
        npm run cli -- --help 2>&1 | tee "$LOG_FILE"
    else
        echo -e "${GREEN}🔍 Running CLI command...${NC}"
        echo ""
        # Run CLI with output redirected to log file
        npm run cli -- "${CLI_ARGS[@]}" 2>&1 | tee "$LOG_FILE"
    fi
fi
