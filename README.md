# 🎓 PlaceMate — ANITS Placement & Code League Platform

A full-stack MERN application for ANITS students, alumni, and faculty.

---

## 🛠 Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.io |
| Database | MongoDB (Atlas) |
| Auth | JWT + Google OAuth |
| UI Extras | TanStack Query, react-hot-toast, lucide-react, chart.js |

---

## 📋 Prerequisites — Install These First

| Tool | Why | Download |
|---|---|---|
| **Node.js v18+** | Run backend & frontend | [nodejs.org](https://nodejs.org) |
| **Git** | Clone the repo | [git-scm.com](https://git-scm.com) |
| **MongoDB Atlas account** | Free cloud database | [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) |

> ✅ Verify installs: open a terminal and run `node -v` and `git --version`

---

## 🚀 Getting Started (Teammates — Follow These Steps)

### Step 1 — Clone the repo
```bash
git clone https://github.com/placemate-org/placemate.git
cd placemate
```

### Step 2 — Set up MongoDB Atlas (one-time)
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) → create a **free** account
2. Create a new **Cluster** (free M0 tier)
3. Under **Database Access** → Add a database user (username + password)
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all) for development
5. Click **Connect** → **Drivers** → copy the connection string:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/placemate
   ```

### Step 3 — Configure environment variables

**Backend:**
```bash
cd backend
copy .env.example .env
```
Open `backend/.env` and fill in:
- `MONGO_URI` → paste your Atlas connection string
- `JWT_SECRET` → any long random string (e.g. `mysecretkey123456`)
- `GOOGLE_CLIENT_ID` → your Google OAuth client ID (see Step 4, or skip for now)

**Frontend:**
```bash
cd ../frontend
copy .env.example .env
```
Open `frontend/.env` and set:
- `VITE_GOOGLE_CLIENT_ID` → same Google client ID as above (or leave empty to skip Google login)

### Step 4 — Google OAuth setup (optional but recommended)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins: `http://localhost:5173`
5. Copy the **Client ID** → paste into both `.env` files

### Step 5 — Install dependencies

```bash
# From project root
cd backend
npm install

cd ../frontend
npm install
```

### Step 6 — Seed sample data (optional but recommended)
```bash
# Terminal 1 — Start backend first
cd backend
npm run server
```

In a **new terminal**:
```bash
cd backend
node seed/seedUsers.js      # creates sample users for each role
node seed/seedDSA.js        # creates DSA sheet topics & problems
node seed/seedContests.js   # creates sample contests
```

### Step 7 — Run the app

Open **2 terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run server
# ✅ Should print: PlaceMate Server running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# ✅ Should print: Local: http://localhost:5173
```

Open your browser at **http://localhost:5173** 🎉

---

## 🔑 Default Test Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Ignite (Student) | `ignite@anits.edu.in` | `password123` |
| Spark | `spark@college.edu` | `password123` |
| Coordinator | `coordinator@anits.edu.in` | `password123` |
| Admin | `admin@anits.edu.in` | `password123` |
| Alumni | `alumni@example.com` | `password123` |
| Faculty | `faculty@anits.edu.in` | `password123` |

---

## 📁 Project Structure

```
placemate/
├── backend/
│   ├── config/         # DB connection
│   ├── middleware/     # JWT auth middleware
│   ├── models/         # Mongoose models (User, DSA, Contest, Registration, Score)
│   ├── routes/         # Express routes (auth, dsaSheet, contests)
│   ├── seed/           # Seed scripts
│   └── server.js       # Entry point
└── frontend/
    └── src/
        ├── components/ # Layout, ProtectedRoute
        ├── context/    # AuthContext
        ├── pages/      # Dashboard, Auth, DSASheet, Contests, etc.
        └── App.jsx     # Routes
```

---

## 🤝 Team Workflow

```bash
# Before starting work — always pull latest
git pull origin main

# Create a feature branch
git checkout -b feature/your-feature-name

# After coding — commit and push
git add .
git commit -m "feat: describe what you built"
git push origin feature/your-feature-name

# Then open a Pull Request on GitHub → request review → merge to main
```

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| `MongooseError: connect ECONNREFUSED` | Check your `MONGO_URI` in `backend/.env` |
| `Port 5000 already in use` | Change `PORT=5001` in `backend/.env` |
| `VITE_API_URL` not working | Make sure `frontend/.env` has `VITE_API_URL=http://localhost:5000` |
| Google login not working | Set `VITE_GOOGLE_CLIENT_ID` and add `http://localhost:5173` to Google Console origins |
| `node_modules` errors | Delete `node_modules` folder and run `npm install` again |
