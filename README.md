# JIIT FindIt — Campus Lost & Found Portal

**Agile Software Development (ASD) Lab Mini-Project | MERN Stack (30 User Stories)**

## 1. Project Overview
**JIIT FindIt** is a lightweight, full-stack Campus Lost & Found web application built for **Jaypee Institute of Information Technology (JIIT)**. It connects **Students**, **Faculty / Staff**, and the **Campus Security Desk (Admin)** in a single unified portal to report lost belongings, log found items, view automatic category match suggestions, post and manage campus-wide notices, verify ownership claims, record physical handovers, and export audit summaries.

The codebase is intentionally structured for clarity, ease of viva explanation, and live modification during practical lab evaluations:
- **Zero over-engineering:** Standard JavaScript (`.js` / `.jsx`), React `useState` and `useEffect` hooks, native `fetch()`, plain CSS, and a single-file Express/Mongoose backend (`server/server.js`).
- **3 Core Mongoose Models:** `User`, `Item` (covering `lost`, `found`, and `notice` types), and `Claim`.
- **30 User Stories across 3 Epics:** Complete coverage of Student Portal (US01–US10, US26–US27), Faculty & Staff Portal (US11–US18, US28), and Admin / Security Desk Portal (US19–US25, US29–US30).

---

## 2. Technology Stack

### Frontend
- **React.js (v18)** with functional components, `useState`, and `useEffect`
- **Vite** (fast development server and bundler)
- **React Router DOM (v6)** for client-side routing
- **Standard CSS (`App.css`)** with a clean white and light-blue campus theme
- **Native `fetch()` API** for HTTP requests

### Backend
- **Node.js & Express.js** (REST API in `server/server.js`)
- **Mongoose** (MongoDB object modelling with 3 schemas)
- **JSON Web Tokens (`jsonwebtoken`)** for stateless authentication
- **`bcryptjs`** for password hashing
- **`cors` & `dotenv`** for cross-origin support and environment configuration

### Database
- **Local MongoDB:** `mongodb://127.0.0.1:27017/campus_lost_found`

---

## 3. Folder Structure

```text
JIIT-FindIt/
│
├── client/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── App.css
│
├── server/
│   ├── package.json
│   ├── server.js
│   └── .env.example
│
├── README.md
└── .gitignore
```

---

## 4. Prerequisites
Make sure the following tools are installed on your machine:
1. **Node.js** (v18 or newer recommended) and **npm** — verify with `node -v` and `npm -v`
2. **MongoDB Community Server** (running locally on port `27017`)

---

## 5. MongoDB Installation and Startup Instructions
1. Install **MongoDB Community Edition** from the official MongoDB website (or via `brew` / `apt` / Windows MSI installer).
2. Start the local MongoDB service:
   - **Windows (Command Prompt as Administrator):**
     ```bash
     net start MongoDB
     ```
   - **macOS (Homebrew):**
     ```bash
     brew services start mongodb-community
     ```
   - **Linux (systemd):**
     ```bash
     sudo systemctl start mongod
     ```
   - **Manual startup (any OS):**
     ```bash
     mongod --dbpath /path/to/your/data/db
     ```
3. Verify MongoDB is listening on `mongodb://127.0.0.1:27017`. The database `campus_lost_found` will be created automatically when the backend server starts.

---

## 6. Environment Variable Configuration & Admin Account Creation
1. Navigate to the `server` folder and copy `.env.example` to `.env`:
   - **Linux / macOS:**
     ```bash
     cd server
     cp .env.example .env
     ```
   - **Windows (Command Prompt):**
     ```cmd
     cd server
     copy .env.example .env
     ```
2. Review the variables inside `server/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/campus_lost_found
   JWT_SECRET=jiit_findit_jwt_secret_key_2026

   # Initial Admin Account Setup (US19)
   ADMIN_NAME=JIIT Security Desk Officer
   ADMIN_ROLL_NO=ADMIN001
   ADMIN_EMAIL=admin@jiit.ac.in
   ADMIN_PASSWORD=admin123

   # Initial Faculty Account Setup (US11)
   FACULTY_NAME=Dr. Rajesh Kumar
   FACULTY_ROLL_NO=FAC101
   FACULTY_EMAIL=faculty@jiit.ac.in
   FACULTY_PASSWORD=faculty123
   ```

---

## 7. Installation & How to Run the Application

Open **two terminal windows** (one for the Backend, one for the Frontend).

### Step 1 — Backend Installation & Startup
```bash
cd server
npm install
node server.js
```

### Step 2 — Frontend Installation & Startup
In a second terminal window:
```bash
cd client
npm install
npm run dev
```

---

## 8. How to Access the Local Application
- **Frontend Web Portal:** Open `http://localhost:5173` in your browser.
- **Backend API Base URL:** `http://localhost:5000/api`
- **Health Check Endpoint:** `http://localhost:5000/api/health`

### Default Login Credentials for Viva / Testing
| Role | Email / Roll No | Password |
| :--- | :--- | :--- |
| **Admin / Security Desk** | `admin@jiit.ac.in` (or `ADMIN001`) | `admin123` |
| **Faculty / Staff** | `faculty@jiit.ac.in` (or `FAC101`) | `faculty123` |
| **Student** | Register any new student via `/register` | *(your chosen password)* |

---

## 9. Agile Scope — 30 User Stories Implemented
- **Epic 1 (Student Portal — US01 to US10, US26, US27):** Student registration/login, report lost item, report found item, browse approved feed, filter by status/category, keyword search across campus locations, submit ownership claim, view my reported items, view my claim requests, mark own lost item as Recovered/Closed, **edit own item report details & withdraw pending claims (US26)**, and **automatic potential Lost & Found match suggestions by category (US27)**.
- **Epic 2 (Faculty & Staff Portal — US11 to US18, US28):** Faculty login, report high-priority classroom/lab found items, view active lost reports, flag/unflag urgent items, post campus announcements using the `Item` model (`type: 'notice'`), filter by academic block, submit departmental claims, view resolved handover history, and **edit or remove published campus announcements (US28)**.
- **Epic 3 (Admin / Security Desk Portal — US19 to US25, US29, US30):** Secure environment-seeded admin login, view incoming claims with ownership proof, approve/reject claims, verify/publish/reject pending item reports, record physical handover, 4 dashboard counters, safe deletion of old/resolved records, **campus user directory & student/faculty role management (US29)**, and **category-wise audit summary & downloadable CSV export (US30)**.

---

## 10. Basic Troubleshooting
- **`MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`**
  - Ensure your local MongoDB service (`mongod`) is running before starting `node server.js`.
- **Port `5000` already in use (`EADDRINUSE`)**
  - Change `PORT=5001` in `server/.env` and update `API_BASE` at the top of `client/src/App.jsx`.
- **Newly reported item does not appear in the public feed immediately**
  - Per **US22**, student and faculty item reports start with `approvalStatus: 'pending'`. Log in as Admin (`admin@jiit.ac.in` / `admin123`) and click **Approve** on the Admin Dashboard to publish the report to the campus feed.
