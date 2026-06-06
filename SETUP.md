# Backend & Frontend Connection Setup

## 📋 What was added:

### Backend (Scrappy)
- ✅ Express.js API server at `src/api/server.ts`
- ✅ `/api/status` endpoint that returns backend health
- ✅ CORS enabled for frontend communication
- ✅ Running on `http://localhost:5000`

### Frontend (Next.js)
- ✅ Backend status hook: `hooks/use-backend-status.ts`
- ✅ Status indicator component: `components/backend-status-indicator.tsx`
- ✅ Integrated in chat header to show real-time backend status
- ✅ Blue indicator when online, gray when offline
- ✅ Checks status every 5 seconds

### Configuration
- ✅ `.env.local` with `NEXT_PUBLIC_BACKEND_URL=http://localhost:5000`
- ✅ Root `package.json` with workspace setup and concurrently

## 🚀 How to Run

### Option 1: Start both together (Recommended)
```bash
npm install  # Install dependencies in root
cd scrap/frontend
npm install
cd ../..
npm run dev  # Starts backend AND frontend concurrently
```

### Option 2: Start separately
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### Option 3: Individual commands
```bash
# Backend only
cd scrappy
npm install
npm run api

# Frontend only
cd scrap/frontend
npm install
npm run dev
```

## 🔍 What to expect
- Backend starts on `http://localhost:5000`
- Frontend starts on `http://localhost:3000`
- Visit `http://localhost:3000/chat`
- Look for the status indicator in the top-right of the chat header
- Blue indicator = backend is online
- Gray indicator = backend is offline

## 🔗 API Endpoints
- `GET /api/status` - Returns backend health status
- `GET /api/ping` - Simple ping endpoint
- `GET /` - Root endpoint with server info

## 📝 Notes
- The status indicator automatically refreshes every 5 seconds
- Uses shadcn button component with blue/black styling
- Small, minimal design that fits in the header
- Responsive - text hides on mobile, shows label on desktop
