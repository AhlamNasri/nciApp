# 🚀 One-Command Setup with Docker

No need to install Node.js, MySQL, or anything else manually.  
Docker handles everything — database, backend, and frontend — in one go.

---

## Prerequisites

Install **Docker Desktop** (free):
- Windows / Mac → https://www.docker.com/products/docker-desktop/
- Linux → https://docs.docker.com/engine/install/

---

## Project Structure (after adding Docker files)

```
nciApp-master/
├── backend/
├── frontend/
├── init.sql              ← Auto-creates all database tables
├── docker-compose.yml    ← Orchestrates all 3 services
├── Dockerfile.backend
├── Dockerfile.frontend
└── DOCKER_README.md      ← You are here
```

---

## Run the App

```bash
# 1. Place all Docker files in the root of the project (same level as backend/ and frontend/)
# 2. Open a terminal in that folder and run:

docker compose up --build
```

That's it. Docker will:
1. Pull MySQL 8 and create the database + all tables automatically
2. Install backend dependencies and start the Express server
3. Install frontend dependencies and start the Next.js dev server

---

## Access the App

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:5000   |
| Database | localhost:3306          |

### Demo Login
| Field      | Value     |
|------------|-----------|
| Company ID | `DEMO001` |
| Password   | `demo123` |

---

## Stop the App

```bash
docker compose down
```

To also delete the database volume (full reset):
```bash
docker compose down -v
```

---

## Rebuild after code changes

```bash
docker compose up --build
```

---

## Troubleshooting

**Backend can't connect to DB on first run?**  
The DB takes ~10s to initialize. The backend will retry automatically. Wait a moment and refresh.

**Port 3000 or 5000 already in use?**  
Change the left side of the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"   # access frontend on :3001 instead
```

**Need to see logs?**
```bash
docker compose logs -f backend    # backend logs
docker compose logs -f frontend   # frontend logs
docker compose logs -f db         # database logs
```
