# Training Plan Generator

A web application that generates personalized training plans (running / cycling) from an athlete's
real activity data. Activities are pulled from the **Strava API** or uploaded manually as `.fit`
files, then analyzed and passed to an **OpenAI** model that builds an interval plan matched to the
athlete's current form.

## Features

- Authentication and registration (JWT in an httpOnly cookie), role-based access
- Strava OAuth integration - fetching activities and their details
- `.fit` file parsing (15-second resampling, per-kilometer splits, heart rate data)
- Saving selected activities as the basis for plan generation
- Interval plan generation via OpenAI plus a chat with a training assistant
- Activity statistics and charts
- Admin panel and OpenAI token usage tracking

## Stack

| Layer | Technologies |
|---|---|
| Backend | Node.js, Express, TypeScript, Prisma, PostgreSQL, OpenAI SDK, JWT, Zod |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, React Router |
| Infrastructure | Docker, Docker Compose, nginx |

## Repository layout

```
backend/    REST API (Express + Prisma + PostgreSQL)
frontend/   SPA (React + Vite)
```

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in your own values
npm install
docker compose up -d      # PostgreSQL on port 5434
npx prisma migrate deploy
npm run dev               # http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL points at the backend
npm install
npm run dev               # http://localhost:5173
```

## Configuration

Every required environment variable is documented in the `.env.example` files:

- [`backend/.env.example`](backend/.env.example) - database, JWT, OpenAI, Strava OAuth, SMTP, initial admin account
- [`frontend/.env.example`](frontend/.env.example) - backend base URL

The Strava integration requires your own application registered in
[Strava API Settings](https://www.strava.com/settings/api) (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`),
and plan generation requires a key from [OpenAI Platform](https://platform.openai.com/api-keys).

**No real secret may ever be committed** - `.env` files are covered by `.gitignore`.

## Running with Docker

```bash
cd backend && docker compose build --no-cache && docker compose up
```

Detailed instructions: [`backend/docs/How to run.md`](backend/docs/How%20to%20run.md).

## Documentation

- [`backend/docs/Activity training data format.md`](backend/docs/Activity%20training%20data%20format.md) - format of the training data sent to the plan generator
- [`backend/docs/fit_parser_guide.ipynb`](backend/docs/fit_parser_guide.ipynb) - how the `.fit` file parser works
- [`backend/docs/SAVED_ACTIVITIES.md`](backend/docs/SAVED_ACTIVITIES.md) - saved activities API
