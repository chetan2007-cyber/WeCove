# WeCove.in — Official Full-Stack Website & Digital Product Studio

> **"We turn ideas into digital products."**  
> WeCove.in designs and builds websites, web applications, SaaS platforms, and custom software for businesses ready to build something meaningful.

---

## 🏛️ Company Identity & Official Information

- **Company Brand Name**: **WeCove.in** *(Note: The `.in` is part of the actual company name, not merely a domain suffix)*
- **Leadership & Engineering**:
  - **Chetan Sharma P** — Founder (Software Architecture & Strategy)
  - **Mallikarjun N** — Co-founder (Engineering Systems & Development)
  - **Aryan Koushink** — Co-founder (Product Strategy & Technology)
  - **Mohith M S** — Team Member (Full-Stack Development)
- **Official Inquiries Email**: [wecove.in@gmail.com](mailto:wecove.in@gmail.com)
- **Official Company Phone**: [+91 8660534989](tel:+918660534989)
- **Location**: Karnataka, India (Bangalore & Hubli)

---

## 🛠️ Technology Stack Architecture

### Frontend (`frontend/`)
- **Core**: React 18, TypeScript (Strict Mode)
- **Routing**: React Router v6 (`/`, `/services`, `/work`, `/process`, `/about`, `/contact`, `*`)
- **Styling**: Tailwind CSS with custom design tokens, Obsidian & Charcoal palette, and Acid Electric Lime accent (`#CCFF00`)
- **Animation & 3D**: Framer Motion (Page reveals, kinetic playground, smooth timeline) & Three.js (Geometric structural canvas)
- **Icons**: Lucide React
- **Build System**: **Webpack 5** with TypeScript loader, CSS minification, asset optimization, code splitting, and zero Vite usage.

### Backend (`backend/`)
- **Core**: Node.js, Express.js, TypeScript
- **Architecture**: REST API architecture (`/api/v1`)
- **Validation**: Strict schema validation via **Zod**
- **Security**: **Helmet** security headers, origin-restricted **CORS**, and **express-rate-limit** DDoS/spam suppression
- **Database Persistence**: **PostgreSQL** with **Prisma ORM** (Model: `Inquiry`) + resilient fallback storage
- **Transactional Email**: **Resend** transactional email API & Nodemailer SMTP fallback sending directly to `wecove.in@gmail.com` with visitor reply-to

---

## 📂 Project Directory Structure

```text
wecove/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── HeroCanvas.tsx           # Three.js structural wireframe
│   │   │   ├── ProductCanvas.tsx        # High-fidelity SaaS console hero visual
│   │   │   ├── ProductPlayground.tsx    # Interactive SaaS, Mobile, ERP, AI demos
│   │   │   ├── TechStackFlow.tsx        # Architecture tier visualizer
│   │   │   ├── ProcessTimeline.tsx      # 6-stage engineering lifecycle
│   │   │   ├── WorkComingSoonSection.tsx# Premium "Coming Soon" portfolio visual
│   │   │   ├── TeamSection.tsx          # Authentic typographic team cards
│   │   │   └── ScrollToTop.tsx
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx             # Complete 11-section cinematic homepage
│   │   │   ├── ServicesPage.tsx         # Comprehensive 12-capability catalog
│   │   │   ├── WorkPage.tsx             # Artistic Coming Soon portfolio experience
│   │   │   ├── ProcessPage.tsx          # Editorial 6-phase engineering lifecycle
│   │   │   ├── AboutPage.tsx            # Truthful founding story & team
│   │   │   ├── ContactPage.tsx          # Live backend-connected inquiry form
│   │   │   └── NotFoundPage.tsx         # 404 branded route handler
│   │   ├── services/
│   │   │   └── api.ts                   # Fetch client for inquiries and health
│   │   ├── styles/
│   │   │   └── index.css                # Tailwind directives & custom CSS
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── webpack.config.js                # Webpack 5 production-ready build
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma                # PostgreSQL Prisma schema (Inquiry model)
│   ├── src/
│   │   ├── config/                      # Environment configuration
│   │   ├── controllers/                 # Inquiry & health controllers
│   │   ├── middleware/                  # Centralized error handler & rate limits
│   │   ├── routes/                      # Express /api/v1 routes
│   │   ├── services/                    # Prisma DB service & Resend email service
│   │   ├── validators/                  # Zod validation schema
│   │   ├── app.ts                       # Express app configuration
│   │   └── server.ts                    # Server listener
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart & Development Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (Tested on Node v24)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: (Optional for local testing; automatic resilient storage activates if PostgreSQL is pending connection)

---

### 2. Backend Setup & Startup

```bash
# Navigate to the backend
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Copy environment template
cp .env.example .env

# Start backend in development mode (with hot-reload)
npm run dev
```

The backend starts at: **`http://localhost:5000`**
- **Health Check**: `http://localhost:5000/api/v1/health`
- **Inquiry Submission**: `POST http://localhost:5000/api/v1/inquiries`

---

### 3. Frontend Setup & Startup

```bash
# In a separate terminal, navigate to the frontend
cd frontend

# Install dependencies
npm install

# Start development server via Webpack 5
npm run start
```

The frontend launches at: **`http://localhost:3000`**
All API calls to `/api` are automatically proxied to the backend at port 5000.

---

### 4. Production Build Verification

```bash
# Build frontend production bundle (Webpack 5)
cd frontend
npm run build
# Outputs optimized assets to frontend/dist/

# Build backend TypeScript
cd ../backend
npm run build
# Compiles to backend/dist/
```

---

## 🔒 Environment Variables Reference (`backend/.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP Port | `5000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `FRONTEND_URL` | Allowed origin for CORS | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/wecove_db` |
| `EMAIL_PROVIDER_API_KEY` | Resend API Key for dispatching email alerts | *Optional in Dev* |
| `EMAIL_FROM` | Verified sender email | `WeCove Inquiries <inquiries@wecove.in>` |
| `CONTACT_EMAIL` | Official inbox receiving project leads | `wecove.in@gmail.com` |
| `EMAIL_PASS` | Gmail App Password for fallback SMTP | *Optional* |

---

## 📬 Contact Form & Inquiry Workflow

1. A visitor navigates to `/contact` and submits a project brief.
2. React runs instantaneous client-side validation against required fields.
3. The payload is sent via `POST /api/v1/inquiries`.
4. Express verifies the request through **Zod** and checks the anti-spam honeypot.
5. Rate-limiting ensures no client exceeds 10 submissions per 15 minutes.
6. The inquiry is committed with a unique UUID into **PostgreSQL** via Prisma.
7. An HTML and plain-text notification is delivered to **`wecove.in@gmail.com`** with the visitor set as `replyTo`.
8. The frontend displays confirmation, generates an inquiry reference ID, and fires celebratory particle confetti.

---

© 2026 WeCove.in. All rights reserved.
