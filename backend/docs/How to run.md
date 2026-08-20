# How to run this project

## Requirements

- Docker & Docker Compose
- Node.js (for local development, optional)

## Quick start (Docker)

1. **Clone the repository:**

   ```bash
   git clone <repository_url>
   cd backend
   ```

2. **Set up environment variables:**
   - Configure the `.env` file.

3. **Build and start containers:**

   ```bash
   docker compose build --no-cache
   docker compose up
   ```

4. **Run database migrations inside the backend container:**

   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

   or
   docker compose exec backend npx prisma db push

   On render

   ```
   npx prisma db pull
   ```

   This will apply all migrations to the production database.

5. **The backend app will be available at:**
   - http://localhost:3000

6. **(Optional) Open Prisma Studio:**
   ```bash
   docker-compose exec backend npx prisma studio
   ```

   - Studio will be available at http://localhost:5555 (if the port is exposed in docker-compose).

---
