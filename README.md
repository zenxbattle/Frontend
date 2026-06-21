# ZenXBattle Frontend

Single-page application for the ZenXBattle coding battle platform. Built with React + Vite + TypeScript + shadcn/ui.

## Tech Stack

- **React 19** + Vite
- **TypeScript**
- **shadcn/ui** (Tailwind components)
- **Tailwind CSS** v4
- **Bun** package manager
- **WebSocket** for real-time battle updates

## Features

| Page | Description |
|------|-------------|
| `/` | Landing page |
| `/login` `/register` | Auth forms |
| `/problems` | Problem browser with search/filter |
| `/problems/:id` | Code editor + test runner |
| `/battle/:id` | Real-time coding battle arena |
| `/leaderboard` | Global + per-problem rankings |
| `/profile` | User stats and history |
| `/admin` | Admin dashboard (user management, problems) |

## Quick Start

```bash
# Install
bun install

# Dev
bun run dev
# → http://localhost:5173

# Build
bun run build
# → dist/

# Preview
bun run preview
```

## API Proxy

Dev server proxies `/api` to the API gateway. Configure in `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    proxy: { '/api': 'http://localhost:8080' }
  }
})
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend API gateway URL |
| `VITE_WS_URL` | `ws://localhost:50052` | WebSocket for battles |

## Docker

```bash
docker build -t zenxbattle-frontend .
docker run -p 80:80 zenxbattle-frontend
```

## Nginx Config

Production build served via nginx with:
- Gzip compression
- SPA routing (all routes → index.html)
- API proxy pass to gateway
- Static asset caching with hash-based filenames

See `nginx.conf` for full config.

## Related Services

- [ApiGateway](https://github.com/zenxbattle/ApiGateway) — backend REST proxy
- [ChallengeService](https://github.com/zenxbattle/ChallengeService) — WebSocket battle engine
- [AuthUserAdminService](https://github.com/zenxbattle/AuthUserAdminService) — auth
- [ProblemService](https://github.com/zenxbattle/ProblemService) — problem CRUD
- [CodeExecutionEngine](https://github.com/zenxbattle/CodeExecutionEngine) — code execution
- [infrastructure](https://github.com/zenxbattle/infrastructure) — K3s deployment manifests
