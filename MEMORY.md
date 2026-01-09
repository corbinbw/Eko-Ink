# EkoInk App - Quick Reference

## What This Is
Automated handwritten thank you notes for sales teams. Sales reps submit deals → AI generates personalized notes → Send as physical handwritten cards.

## Tech Stack
- **Framework:** Next.js 15.5.5 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password)
- **AI:** Anthropic Claude (claude-3-haiku-20240307) + AssemblyAI (transcription)
- **Payments:** Stripe (credit system)
- **Handwriting:** Handwrite.io API
- **Styling:** Tailwind CSS

## Working Features
1. Public deal submission form (`/submit`)
2. Dashboard with notes list
3. AI note generation (transcribes calls, generates 270-320 char notes)
4. Note approval and editing
5. Handwrite.io integration (send physical cards)
6. Stripe credit purchasing
7. Team management (managers can invite reps)
8. Payment history tracking

## Database Tables
- `users` - User accounts with roles (rep/manager/executive)
- `accounts` - Company accounts with shared credit pool
- `deals` - Customer deal information
- `calls` - Call recordings and transcripts
- `notes` - AI-generated thank you notes
- `transactions` - Credit purchase history

## Key Files
**API Routes:**
- `/app/api/notes/[noteId]/generate/route.ts` - AI note generation (533 lines - needs simplification)
- `/app/api/notes/[noteId]/approve/route.ts` - Approve notes
- `/app/api/notes/[noteId]/send/route.ts` - Send to Handwrite.io
- `/app/api/stripe/webhook/route.ts` - Handle Stripe payments

**Pages:**
- `/app/dashboard/page.tsx` - Main dashboard
- `/app/dashboard/notes/page.tsx` - Notes list
- `/app/dashboard/team/page.tsx` - Team management (managers only)

**Utilities:**
- `/lib/supabase/server.ts` - Supabase clients (`createClient()` and `createServiceClient()`)
- `/lib/handwriteio.ts` - Handwrite.io API wrapper
- `/middleware.ts` - Auth protection for dashboard routes

## Environment Setup
Copy `.env.local.example` to `.env.local` and add:
- Supabase URL and keys
- Anthropic API key
- AssemblyAI API key
- Handwrite.io API key
- Stripe keys (for payments)

## Known Issues
1. **AI generation is over-engineered** - Multi-shot with scoring (533 lines). Should be simplified to ~150 lines.
2. **Join Team feature needs testing** - `/app/api/team/join/route.ts` - verify it works end-to-end
3. **Next.js 15 warnings** - Need to await `params` and `cookies()` in some routes (not breaking)

## Important Notes
- Always use `createServiceClient()` for admin operations that bypass RLS
- Public form uses service client to create records for any user_id
- Clear `.next` cache if seeing stale data: `rm -rf .next`
- Anthropic and AssemblyAI APIs cost money - monitor usage

## Test User
- Email: corbinbrandonwilliams@gmail.com
- Password: password123
- Supabase Project: https://vszhsjpmlufjmmbswvov.supabase.co

## Quick Start
```bash
npm install
# Add .env.local with required keys
npm run dev
# Visit http://localhost:3000
```

## What Needs Work
See `CLEANUP-ANALYSIS.md` for detailed cleanup plan. Main items:
- Simplify AI generation route (533 → 150 lines)
- Consolidate migration files
- Test team management features
- Remove incomplete API billing system (or finish it)
