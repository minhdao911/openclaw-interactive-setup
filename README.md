# ClawPath (OpenClaw Interactive Setup)

ClawPath is an interactive setup assistant for OpenClaw, built with Next.js.
It provides a guided chat workflow, conversation history, and
context compaction to help users complete setup without losing important details.

## Features

- Multi-provider model support (Anthropic, OpenAI, Google, DeepSeek)
- Local conversation persistence with Dexie (IndexedDB)
- Conversation list with titles, switching, and deletion
- Automatic context compaction/summarization for long chats
- Token and estimated cost tracking per conversation
- Image attachment support in chat messages

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Vercel AI SDK (`ai` and provider packages)
- Dexie + dexie-react-hooks for local data
- Tailwind CSS

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Copy the example file and fill in the keys for providers you want to use.

```bash
cp .env.local.example .env.local
```

Environment variables:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`

### 3) Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - start dev server
- `npm run build` - build production bundle
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Project Structure

```text
src/
  app/
    api/chat/route.ts      # main streaming chat endpoint
    api/compact/route.ts   # conversation summarization endpoint
  components/
    chat/                  # chat UI
    sidebar/               # conversation + progress sidebars
  hooks/
    useClawChat.ts         # chat orchestration and persistence
  lib/
    ai/                    # model provider setup and pricing
    db/                    # Dexie schema and queries
```

## Security Notes

- Never commit `.env.local` or real API keys.
- Use placeholder values in docs/examples only.
- If a key is ever exposed, rotate it immediately.

## Contributing

Contributions are welcome. Please read:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

## License

This project is licensed under the MIT License. See `LICENSE`.
