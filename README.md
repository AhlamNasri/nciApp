# nciApp

**nciApp** is a full-stack team project management and collaboration web application built with **Next.js 15** (frontend) and **Express.js + Socket.io** (backend), backed by a **MySQL** database.

It enables organizations to manage projects, coordinate team members, share files, and communicate in real time — all from a single platform.

---

## ✨ Features

- 🔐 **Authentication** — JWT-based login using a company ID, with role-based access control (admin vs. team member)
- 📁 **Project Management** — Create, view, and manage projects with images, descriptions, dates, and status tracking
- 👥 **Team Members** — Invite collaborators via unique invite codes/links and manage project membership
- 💬 **Real-Time Chat** — Per-project chat rooms powered by Socket.io, with typing indicators and read receipts
- 📂 **File Sharing** — Upload and manage project files within each project workspace
- 👤 **User Profiles** — View and edit personal profile information and avatars
- 📬 **Direct Messaging** — User-to-user messaging system

---

## 🛠️ Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend   | Express.js 5, Socket.io, JWT, Multer          |
| Database  | MySQL 8                                       |
| Real-time | Socket.io (WebSockets)                        |

---

## 🚀 Getting Started

### Option 1 — Docker (Recommended)

No need to install Node.js, MySQL, or anything else. Docker handles everything in one command.

**Prerequisites:** Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or [Docker Engine](https://docs.docker.com/engine/install/) (Linux).

**1. Create a `.env` file** in the project root:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_USER=nciuser
MYSQL_PASSWORD=ncipassword
MYSQL_DATABASE=nciapp
JWT_SECRET=your_secret_key_change_this
```

**2. Run the app:**

```bash
docker compose up --build
```

Docker will automatically:
1. Start a MySQL 8 database and create all tables from `init.sql`
2. Install backend dependencies and start the Express + Socket.io server
3. Install frontend dependencies and start the Next.js server

**3. Access the app:**

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |
| Database | localhost:3306        |

**Demo login:**

| Field      | Value     |
|------------|-----------|
| Company ID | `DEMO001` |
| Password   | `demo123` |


### Option 2 — Manual Setup (Without Docker)
> **Tip (Windows):** Use `START.bat` at the root to launch both servers at once.

**Prerequisites:** Node.js 20+, MySQL 8

**1. Clone the repository**

```bash
git clone https://github.com/AhlamNasri/nciApp.git
cd nciApp
```

**2. Set up the database**

Create a MySQL database and run `init.sql` to create all tables:

```bash
mysql -u root -p < init.sql
```

**3. Backend setup**

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASS=your_mysql_password
DB_NAME=nciapp
JWT_SECRET=your_secret_key
PORT=5000
```

Start the backend:

```bash
node index.js
```

**4. Frontend setup**

```bash
cd frontend
npm install
npm run dev
```

**5. Local URLs**

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |


---

## 📁 Project Structure

```
nciApp/
├── backend/
│   ├── routes/
│   │   ├── auth.js             # JWT login & token verification
│   │   ├── projects.js         # Project CRUD & image uploads
│   │   ├── projectMembers.js   # Member management
│   │   ├── projectFiles.js     # File sharing per project
│   │   ├── chatRooms.js        # Chat room management
│   │   ├── messages.js         # Direct messaging
│   │   ├── users.js            # User profiles
│   │   └── invite_routes.js    # Invite link handling
│   ├── db.js                   # MySQL connection pool
│   └── index.js                # Express + Socket.io server
├── frontend/
│   └── src/app/
│       ├── homepage/           # Main dashboard & profile
│       ├── project/[id]/       # Project detail, files & chat
│       ├── messages/           # Direct messaging UI
│       └── login/              # Login page
├── init.sql                    # Database schema (auto-run by Docker)
├── docker-compose.yml          # Orchestrates all 3 services
├── Dockerfile.backend
├── Dockerfile.frontend
├── START.bat                   # Windows quick-start (manual mode)
└── README.md
```
