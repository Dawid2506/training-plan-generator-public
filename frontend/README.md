# Training Plan Generator - Frontend

SPA built with React 19 + TypeScript, bundled by Vite. Consumes the API from `../backend`.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | development server with HMR |
| `npm run build` | `tsc -b` plus a production build into `dist/` |
| `npm run preview` | preview the production build |
| `npm run lint` | ESLint |

## Configuration

`VITE_API_BASE_URL` - backend base URL (defaults to `http://localhost:3000`).
Used in [`src/lib/api.ts`](src/lib/api.ts), where all endpoints are declared.

## Structure

```
src/
  components/    views and components (auth, main, pages, ui - shadcn)
  contexts/      AuthContext
  hooks/         useAuth
  lib/           API configuration, Strava activity parser, utils
  types/         shared types
  mocks/         sample training plans
```

## Docker

```bash
docker compose up --build    # nginx serves the build on port 3000
```
