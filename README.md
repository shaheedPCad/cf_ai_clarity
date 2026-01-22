# Clarity - Decision Reasoning Assistant

A Cloudflare Workers AI application that helps users reason through decisions step by step. Unlike generic chatbots, Clarity has a specific purpose: guiding users through structured decision-making by identifying options, exploring trade-offs, and reaching reasoned conclusions.

## Features

- **Socratic Guidance**: Asks clarifying questions to help users explore their thinking
- **Persistent Conversations**: State stored in Durable Objects, survives page refreshes
- **Per-User Sessions**: Each user gets their own conversation thread via cookies
- **Decision-Focused**: Specialized for decision-making, not general chat

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │     │    Cloudflare   │     │  Durable Object │
│     Pages       │────▶│     Worker      │────▶│  (per user)     │
│   (Frontend)    │     │   (API + AI)    │     │  (State/Memory) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Workers AI     │
                        │  (Llama 3.3)    │
                        └─────────────────┘
```

### Cloudflare Primitives Used

| Primitive | Purpose |
|-----------|---------|
| **Workers** | API endpoint, request routing |
| **Durable Objects** | Per-user conversation state |
| **Workers AI** | LLM inference (Llama 3.3 70B) |
| **Assets** | Frontend static file hosting |

## Project Structure

```
cf_ai_clarity/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── conversation.ts       # Durable Object class
│   └── prompts.ts            # System prompts
├── frontend/
│   ├── index.html            # Chat interface
│   ├── style.css             # Styles
│   └── app.js                # Client-side logic
├── wrangler.toml             # Cloudflare config
├── package.json
├── tsconfig.json
├── README.md
└── PROMPTS.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers AI access
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
cd cf_ai_clarity
npm install
```

### Local Development

```bash
npm run dev
```

Open http://localhost:8787 in your browser.

### Deployment

```bash
npm run deploy
```

This deploys both the Worker and frontend assets to Cloudflare.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Send a message, receive AI response |
| `/api/history` | GET | Get conversation history |
| `/api/reset` | POST | Clear conversation |

### Example Request

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I am trying to decide between two job offers"}'
```

## Configuration

Configuration is managed in `wrangler.toml`:

- **AI Binding**: Workers AI is bound as `AI`
- **Durable Objects**: `ConversationDO` class handles per-user state
- **Assets**: Frontend served from `./frontend` directory

## How It Works

1. User sends a message from the frontend
2. Worker extracts or generates a user ID from cookies
3. Worker routes request to user's Durable Object instance
4. Durable Object:
   - Loads existing conversation from storage
   - Builds prompt with system instructions and history
   - Calls Workers AI (Llama 3.3 70B)
   - Stores response and returns it
5. Frontend displays the response

## Conversation Management

- Conversations are stored per-user in Durable Objects
- Last 20 messages are retained for context window management
- User ID is stored in an HTTP-only cookie (1 year expiry)
- Reset clears the conversation but keeps the user ID

## License

MIT
