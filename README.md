# nciApp

A full-stack project management and team collaboration web application 
with real-time chat built with Next.js and Node.js.

## Tech Stack

- **Frontend:** Next.js (React)
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Real-time:** Socket.io
- **Auth:** JWT + bcrypt
- **File uploads:** Multer

## Features

- User authentication (register/login)
- Project creation and management
- Team members & invitations
- Real-time chat rooms with typing indicators
- Messaging system
- File sharing per project

## Getting Started

### 1. Clone the repository
git clone https://github.com/AhlamNasri/nciApp.git
cd nciApp

### 2. Backend setup
cd backend
npm install

Create a `.env` file in the backend folder:
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASS=your_mysql_password
DB_NAME=your_database_name
JWT_SECRET=your_secret_key
PORT=5000

node index.js

### 3. Frontend setup
cd frontend
npm install
npm run dev

## Usage
- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:3000
- Or use START.bat to launch both at once
