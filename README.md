# EkoInk App

Automated handwritten thank-you notes for sales teams.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned (2-3 minutes)
3. Go to **SQL Editor** and run the entire `supabase-migration.sql` file
4. Go to **Storage** > Create bucket named `call-audio` (private)
5. Copy your project URL and anon key from **Settings** > **API**

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (from Settings > API > service_role key)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ekoink-app/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase client utilities
│   └── utils.ts         # Helper functions
├── supabase-migration.sql # Database schema
└── package.json
```

## Current Status

### ✅ Completed Features
- [x] Authentication flow (Supabase Auth with email/password)
- [x] Deal submission form (with MP3 upload/URL)
- [x] AssemblyAI transcription integration
- [x] Anthropic Claude AI for note generation
- [x] Note approval interface
- [x] Stripe payment integration (credits system)
- [x] Handwrite.io integration (send physical cards)
- [x] Dashboard with analytics
- [x] Settings page with signature management
- [x] Payment history tracking
- [x] Dark mode support

### 🚧 In Progress
- [ ] Hierarchical team management (managers, reps, executives)
- [ ] Invite system for team members
- [ ] Role-based dashboards

### 📋 Planned Features
- [ ] Webhook API for CRM integrations
- [ ] Automatic processing pipeline
- [ ] Advanced analytics & reporting
- [ ] Email notifications
- [ ] Bulk operations

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (Postgres)
- **Styling:** Tailwind CSS
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## API Integrations (To Add)

- AssemblyAI (transcription)
- OpenAI GPT-4 (note generation)
- Handwrytten (physical note printing)
- Stripe (payments)
- Postmark/Resend (emails)

## Documentation

See the root `PROJECT.md` for full product strategy and `ARCHITECTURE.md` for technical details.
