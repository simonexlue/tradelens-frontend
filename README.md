# 🧠 TradeLens — AI-Powered Trading Journal

TradeLens is a full-stack web app that helps traders automatically journal and analyze their trades using AI.  
Instead of writing long notes, users can upload a chart screenshot and a short description — the system uses vision + language models to produce detailed feedback about the trade setup, outcome, and improvement tips.

---

## 🚀 Project Overview

**Goal:**  
Build a private trading journal that automates insight generation.  
The app should help traders understand:
- *What happened* in their trade
- *Why* it worked or failed
- *How* they can improve next time

**Core Idea:**  
Upload a chart → AI analyzes the setup → AI returns structured notes → User views their trade history and patterns over time.

---

## 🧩 Tech Stack (MVP)

| Layer | Tech | Purpose |
|-------|------|----------|
| **Frontend** | Next.js 15 + Tailwind + shadcn/ui | Responsive web UI with dark/light mode |
| **Backend** | FastAPI (Python) | Handles AI analysis & S3 presigned URL generation |
| **Database & Auth** | Supabase (PostgreSQL) | Stores users, trades, images, analysis |
| **Storage** | AWS S3 | Private file storage for screenshots |
| **Hosting** | Vercel (frontend), Render (backend) | Deployment + CI/CD |
| **AI** | OpenAI / Vision API | Image and text analysis |

---

## 🧱 MVP Goals (Phase 1–4)

### ✅ Phase 1 — Frontend Setup & Branding
- Deploy Next.js (shadcn/ui starter) to Vercel  
- Apply brand palette: Navy `#1A237E`, Teal `#18B6B2`, Gray `#E5E7EB / #334155`, Red `#EF4444`, Green `#10B981`  
- Set up routes:
  - `/auth-login`
  - `/trades-list`
  - `/trade-new`
  - `/trade-detail`
- Placeholder UI for pages (no data yet)

### 🔐 Phase 2 — Authentication & Database
- Supabase Auth (email login + OAuth ready)
- Supabase tables: users, trades, images, analysis
- RLS enabled for all user-owned data
- Logged-in users can see only their own trades

### 🖼️ Phase 3 — Upload & AI Analysis
- Upload screenshot via S3 presigned URL
- Backend triggers AI pipeline
- AI generates `{ what_happened, why_result, tips[] }`
- Display results on trade detail page

### 📊 Phase 4 — Trade Insights & Analytics
- Filter trades by tag, outcome, or strategy
- Simple dashboard:
  - Win rate by strategy
  - Avg R multiple
  - Common mistakes
- CSV export for records

---

## 🧠 Expected Deliverables (MVP)

- End-to-end working flow:
  > Login → Upload Screenshot → AI Analysis → View Trade Detail
- UI follows consistent brand styling & responsive design
- All private data protected by RLS + private S3
- Deployed on Vercel + Render with live demo URL
- Clear “Not financial advice” disclaimer in footer

---

## 🧭 Folder Structure (Frontend)

tradelens-frontend/
├── app/
│ ├── layout.tsx
│ ├── page.tsx
│ ├── auth-login/
│ ├── trades-list/
│ ├── trade-new/
│ └── trade-detail/
│
├── components/
│ ├── ui/
│ ├── TradeCard.tsx
│ ├── UploadForm.tsx
│ ├── AnalysisSection.tsx
│ └── Navbar.tsx
│
├── lib/
│ ├── utils.ts
│ └── supabaseClient.ts
│
├── public/
│ ├── favicon.png
│ └── images/
│
├── styles/
│ └── globals.css
│
├── tailwind.config.ts
├── next.config.mjs
└── README.md

---

## 🧩 Software Engineer Considerations

- **Security:**  
  - Private S3 by default, time-limited presigned URLs  
  - Supabase RLS on all user data  
- **Scalability:**  
  - Async AI jobs (ready for future worker queue)  
  - Indexed DB queries for faster trade listing  
- **Performance:**  
  - Thumbnails, pagination, caching  
  - Lazy image loading in list view  
- **Reliability:**  
  - Error tracking via Sentry  
  - “Delete my account” flow  
- **Legal:**  
  - “Not financial advice” disclaimer  
  - Clear privacy policy page

---

## 🧱 Possible Future Extensions

- 🧩 Tag suggestion AI (e.g., “Liquidity Grab”, “FVG”, “Break of Structure”)  
- 🔍 Filter trades by strategy/session/outcome  
- 📈 Insights dashboard with charts  
- 👥 Team accounts (mentors reviewing student trades)  
- 📲 Mobile-friendly layout or PWA

---

## 🎨 Branding
Palette
Element	Hex	Tailwind reference	Typical usage
Primary (Navy)	#1A237E	text-[#1A237E], bg-[#1A237E]	Headings, nav, brand accents
Accent (Teal)	#18B6B2	text-teal-400, hover:bg-teal-500, border-teal-500	Primary buttons, links, focus/hover states
Neutral Light	#E5E7EB	text-slate-200 / text-slate-300	Light text on dark backgrounds, subtle labels
Neutral Dark (Text)	#334155	text-slate-700 / text-slate-800	Body text on light backgrounds
Dark Surfaces	#0F172A–#111827 range	bg-slate-900, border-slate-700	App background, input fields, cards
Success	#10B981	text-emerald-400	Positive states (e.g., “Account created!”)
Error	#EF4444	text-rose-400	Errors/validation (e.g., auth failures)

---

## 📚 Notes for Future Development
This README is intentionally **modular and updatable**.  
When new features or phases are added, append sections under:
- `## 🆕 Updates`
- `## ⚙️ Changelog`
- `## 📈 Next Steps`

---

**Maintainer:** Simone Lue  
**Last Updated:** October 2025  
**Status:** Phase 2 

## License

Licensed under the [MIT license](https://github.com/shadcn/ui/blob/main/LICENSE.md).
