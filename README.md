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

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend    | Express.js 5, Socket.io, JWT, Multer          |
| Database   | MySQL 2                                       |
| Real-time  | Socket.io (WebSockets)                        |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/AhlamNasri/nciApp.git
cd nciApp
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:

```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASS=your_mysql_password
DB_NAME=your_database_name
JWT_SECRET=your_secret_key
PORT=5000
```

Start the backend server:

```bash
node index.js
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Local URLs

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |

> **Tip (Windows):** Use `START.bat` at the root to launch both servers at once.

---

## 📁 Project Structure

```
nciApp/
├── backend/
│   ├── routes/
│   │   ├── auth.js           # JWT login & token verification
│   │   ├── projects.js       # Project CRUD & image uploads
│   │   ├── projectMembers.js # Member management
│   │   ├── projectFiles.js   # File sharing per project
│   │   ├── chatRooms.js      # Chat room management
│   │   ├── messages.js       # Direct messaging
│   │   ├── users.js          # User profiles
│   │   └── invite_routes.js  # Invite link handling
│   ├── db.js                 # MySQL connection pool
│   └── index.js              # Express + Socket.io server
├── frontend/
│   └── src/app/
│       ├── homepage/         # Main dashboard & profile
│       ├── project/[id]/     # Project detail, files & chat
│       ├── messages/         # Direct messaging UI
│       └── login/            # Login page
├── START.bat                 # Windows quick-start script
└── README.md
```
