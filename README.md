# CollabBoard — Real-Time Collaborative Whiteboard

A multi-user SaaS whiteboard with live cursors, workspaces, billing, AI tools, video meetings, and gallery.

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

### Core whiteboard
- **Drawing tools**: pen, rectangle, circle, line, eraser, text, sticky notes
- **Undo / redo** via command pattern
- **Real-time sync** across multiple users via Socket.IO rooms
- **Live cursors** with user avatars
- **Export** board as PNG
- **Auto-save** canvas to PostgreSQL

### Workspaces & collaboration
- **Workspaces** with roles (owner, admin, editor, viewer)
- **Member invitations** via email link
- **Board folders**, templates, pin/archive
- **Board sidebar**: Share, Chat, Comments, Tasks, Activity, Version history

### Comments & notifications
- **Threaded comments** on boards and canvas elements
- **@mentions** with in-app notifications
- **Real-time comment** updates via Socket.IO

### Tasks
- **Task cards** with assignee, due date, priority
- **My Tasks** page across all boards
- **Canvas-linked tasks** — select an element, create a task; completed tasks strike through on canvas
- **Google Calendar** links for due dates

### Sharing & access
- **Visibility**: private, workspace, public (view-only)
- **Password-protected** boards
- **Guest view** and export toggles

### Integrations
- **Slack** webhook notifications (board saves, new comments)
- **Google Calendar** URL generation for tasks

### Activity & history
- **Activity feed** per workspace and board
- **Version snapshots** with one-click restore

### Auth
- Register, login, JWT sessions

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

## Environment variables

Two files: `server/.env` and `client/.env`. Copy from the `.env.example` files in each folder.

### Server (`server/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PORT` | No (default `3001`) | HTTP + Socket.IO port |
| `NODE_ENV` | Yes in prod | `development` or `production` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | Auth token signing — use a long random string in production |
| `CLIENT_URL` | **Yes in prod** | Frontend URL for CORS, invites, Stripe redirects |
| `REDIS_URL` | Prod recommended | Redis for multi-instance scaling |
| `STRIPE_SECRET_KEY` | Optional | Billing checkout |
| `OPENAI_API_KEY` | Optional | AI mind maps & image generation |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `SMTP_*` | Optional | Real invitation emails (else logs to console) |
| `UPLOAD_DIR` | Optional | Asset storage path (default `server/uploads`) |
| `UPLOAD_PUBLIC_URL` | Optional | Public URL prefix for uploaded files |

**Stripe price IDs** are stored in the database, not `.env`. After creating Stripe products:

```sql
UPDATE subscription_plans
SET stripe_price_monthly_id = 'price_xxx', stripe_price_annual_id = 'price_yyy'
WHERE slug = 'pro';
```

**Admin access** (not env-based):

```sql
INSERT INTO super_admins (user_id) SELECT id FROM users WHERE email = 'you@example.com';
```

### Client (`client/.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_API_URL` | **Yes** | Backend REST API URL |
| `VITE_SOCKET_URL` | **Yes** | Socket.IO URL (usually same as API) |

## Deployment

### Backend (Railway)

1. Create a new Railway project
2. Add **PostgreSQL** and **Redis** services
3. Deploy the `server/` directory (or connect this repo with root directory `server`)
4. Set environment variables (see table above). Minimum for production:
   - `DATABASE_URL` — from Railway PostgreSQL
   - `REDIS_URL` — from Railway Redis
   - `JWT_SECRET` — long random string (`openssl rand -hex 32`)
   - `CLIENT_URL` — your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `NODE_ENV=production`
5. Optional: `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SMTP_*`, `UPLOAD_PUBLIC_URL`
6. Run migration: `npm run db:migrate` (via Railway shell or one-off command)
7. Note the public URL (e.g. `https://your-api.railway.app`)

### Frontend (Vercel)

1. Import this repo to Vercel
2. Set **Root Directory** to `client`
3. Set environment variables:
   - `VITE_API_URL` — Railway backend URL
   - `VITE_SOCKET_URL` — same Railway backend URL
4. Deploy

### Post-deploy checklist

- [ ] `CLIENT_URL` on server matches Vercel URL exactly (no trailing slash)
- [ ] `VITE_API_URL` and `VITE_SOCKET_URL` point to the backend URL
- [ ] CORS allows the Vercel origin
- [ ] Database migration has run (`npm run db:migrate`)
- [ ] Socket.IO connects over WSS (Railway handles TLS)
- [ ] `JWT_SECRET` changed from the example default
- [ ] Stripe price IDs updated in DB (if using billing)
- [ ] `OPENAI_API_KEY` set (if using AI panel)
- [ ] SMTP configured (if sending real invite emails)
- [ ] Super admin row added (if using `/admin`)

## Project Structure

```
├── client/          React + TypeScript frontend
│   └── src/
│       ├── components/   Canvas, Toolbar, BoardSidebar, Cursors
│       ├── hooks/        useSocket, useCanvas, useBoardCollaboration
│       ├── pages/        Home, Workspace, Board, MyTasks, Login, Invite
│       └── context/      AuthContext
├── server/          Express + Socket.IO backend
│   ├── routes/      auth, boards, workspaces, comments, tasks, chat, integrations
│   ├── services/    notifications, integrations
│   ├── socket/      real-time handlers
│   └── models/      User, Board, Workspace, Comment, Task, Chat, Integration
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
| Server → Client | `comment-added` | New comment on board |
| Server → Client | `chat-message` | New chat message |
| Server → Client | `canvas-saved` | Auto-save confirmation |

## License

MIT
