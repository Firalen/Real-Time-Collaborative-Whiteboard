# Real-Time Collaborative Whiteboard

A multi-user drawing app with live cursors, real-time sync, and board management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Fabric.js |
| Real-time | Socket.IO |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Cache | Redis |
| Auth | JWT + bcrypt |
| Deploy | Vercel (FE) + Railway (BE) |

## Features

- **Drawing tools**: pen, rectangle, circle, line, eraser, text, sticky notes
- **Undo / redo** via command pattern
- **Real-time sync** across multiple users via Socket.IO rooms
- **Live cursors** with user avatars
- **Auth**: register, login, JWT sessions
- **Boards**: create, rename, delete, share via link
- **Export** board as PNG
- **Auto-save** canvas to PostgreSQL

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# Start databases
docker compose up -d

# Install dependencies
npm run install:all

# Copy env files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Run migrations
npm run db:migrate

# Start dev servers (client :5173, server :3001)
npm run dev
```

Open http://localhost:5173

## Deployment

### Backend (Railway)

1. Create a new Railway project
2. Add **PostgreSQL** and **Redis** services
3. Deploy the `server/` directory (or connect this repo with root directory `server`)
4. Set environment variables:
   - `DATABASE_URL` — from Railway PostgreSQL
   - `REDIS_URL` — from Railway Redis
   - `JWT_SECRET` — long random string
   - `CLIENT_URL` — your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `NODE_ENV=production`
5. Run migration: `npm run db:migrate` (via Railway shell or one-off command)
6. Note the public URL (e.g. `https://your-api.railway.app`)

### Frontend (Vercel)

1. Import this repo to Vercel
2. Set **Root Directory** to `client`
3. Set environment variables:
   - `VITE_API_URL` — Railway backend URL
   - `VITE_SOCKET_URL` — same Railway backend URL
4. Deploy

### Post-deploy checklist

- [ ] `CLIENT_URL` on server matches Vercel URL exactly (no trailing slash)
- [ ] CORS allows the Vercel origin
- [ ] Database migration has run
- [ ] Socket.IO connects over WSS (Railway handles TLS)

## Project Structure

```
├── client/          React + TypeScript frontend
│   └── src/
│       ├── components/   Canvas, Toolbar, Cursors, Sidebar
│       ├── hooks/        useSocket, useCanvas
│       ├── pages/        Home, Board, Login
│       └── context/      AuthContext
├── server/          Express + Socket.IO backend
│   ├── routes/      auth, boards
│   ├── socket/      real-time handlers
│   └── models/      User, Board
└── docker-compose.yml
```

## Socket.IO Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `join-board` | Join a board room |
| Client → Server | `draw` | Send draw event |
| Client → Server | `cursor-move` | Send cursor position |
| Server → Client | `user-drew` | Relay draw to others |
| Server → Client | `cursor-update` | Relay cursor position |
| Server → Client | `user-joined` | User joined notification |
| Server → Client | `board-state` | Full canvas on join |

## License

MIT
