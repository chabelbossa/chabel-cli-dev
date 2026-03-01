# Chabel CLI Dev

Chabel CLI Dev is a terminal-first AI assistant with device-flow authentication and a small Next.js web client for sign-in approval.

## Project Structure

- `server/`: Node.js CLI app and auth API
- `client/`: Next.js authentication UI

## CLI Branding

The CLI command is `chabel` and terminal output is branded as **Chabel CLI**.

## Quick Start

1. Start the API server:

```bash
cd server
npm install
npm run dev
```

2. Start the client app:

```bash
cd client
npm install
npm run dev
```

3. Run the CLI locally:

```bash
cd server
npm run cli -- login
npm run cli -- wakeup
```
