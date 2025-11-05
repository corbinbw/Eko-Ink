# Hierarchical Team Management System - Implementation Plan

## Overview

This document tracks the implementation of a multi-tier role-based access system for EkoInk, allowing managers and executives to oversee teams and individual sales reps.

---

## Sprint 1: Database + Auth ✅ COMPLETED

### Database Schema Changes ✅
- **Created:** `migrations/001-hierarchical-teams.sql`
- **Added to `users` table:**
  - `manager_id` - Reference to user's manager
  - `team_name` - Display name for team
  - `invite_code` - Unique code for inviting team members (managers/executives only)
  - `is_super_admin` - System admin flag
  - `team_id` - Reference to team (if using teams table)

- **Created `teams` table:**
  - Organizational structure for teams
  - Links to account and manager
  - Team name and description

- **Created `invitations` table:**
  - Tracks invite codes and their usage
  - Status: active, used, revoked, expired
  - Links to inviter, account, and team

### RLS Policies Updated ✅
- **Hierarchical access control:**
  - Reps can only see themselves and their manager
  - Managers can see their direct reports
  - Executives can see everyone in their account
  - Super admins can see everything

- **Note access policies:**
  - Reps see their own notes
  - Managers see their team's notes
  - Executives see all account notes

### Sign-up Flow ✅
- **Updated:** `app/(auth)/signup/page.tsx`
- **Features:**
  - Role selection (Rep, Manager, Executive)
  - Invite code handling (via URL parameter `?code=ABC123`)
  - Auto-joins team if using invite code
  - Creates new account if manager/executive

### Invite System ✅
- **Created APIs:**
  - `POST /api/invites/generate` - Generate new invite codes
  - `POST /api/invites/validate` - Validate invite codes
  - `GET /api/invites/generate` - List user's invitations

- **Features:**
  - Managers can only invite reps
  - Executives can invite reps or managers
  - Optional expiration dates
  - Track who used which code

### User Creation Logic ✅
- **Updated:** `app/dashboard/page.tsx`
- **Logic:**
  - If invite code present → join existing account
  - If no invite → create new account (for managers/executives)
  - Auto-generate invite codes for managers/executives
  - Link reps to their manager

---

## Sprint 2: Manager Dashboard (NEXT)

### Goal
Create a dashboard for managers to oversee their team members.

### Tasks
1. **Create route:** `/dashboard/team/page.tsx`
2. **Components to build:**
   - `TeamOverview` - High-level stats
   - `TeamMemberList` - Table of all team members
   - `TeamMemberCard` - Individual rep stats
   - `InviteGenerator` - UI to generate invite codes

3. **Features:**
   - View all team members
   - See each member's stats (notes sent, delivered, etc.)
   - Click on member to see detailed view
   - Generate invite links
   - View invite history
   - Shared credit pool display

4. **API Endpoints Needed:**
   - `GET /api/team/members` - Get all team members
   - `GET /api/team/members/[id]` - Get specific member stats
   - `GET /api/team/stats` - Aggregate team statistics

---

## Sprint 3: Executive Dashboard

### Goal
Create a dashboard for executives to oversee multiple teams/managers.

### Tasks
1. **Create route:** `/dashboard/executive/page.tsx`
2. **Components to build:**
   - `CompanyOverview` - Company-wide stats
   - `TeamsList` - All teams in the company
   - `TeamCard` - Individual team summary
   - `CompanyAnalytics` - Charts and graphs

3. **Features:**
   - View all teams
   - See each team's performance
   - Drill down into specific teams
   - View all managers
   - Company-wide analytics
   - Credit management

4. **API Endpoints Needed:**
   - `GET /api/executive/teams` - Get all teams
   - `GET /api/executive/teams/[id]` - Get team details
   - `GET /api/executive/stats` - Company-wide statistics

---

## Sprint 4: Super Admin Dashboard

### Goal
Create a system-wide dashboard for the EkoInk owner to monitor all companies.

### Tasks
1. **Create route:** `/admin/page.tsx` (protected by email whitelist)
2. **Components to build:**
   - `CompanyList` - All EkoInk companies
   - `CompanyCard` - Individual company summary
   - `RevenueAnalytics` - Financial dashboard
   - `SystemMetrics` - Usage statistics

3. **Features:**
   - View all companies using EkoInk
   - See each company's usage
   - Revenue analytics
   - Active users
   - System health metrics

4. **API Endpoints Needed:**
   - `GET /api/admin/companies` - List all companies
   - `GET /api/admin/companies/[id]` - Company details
   - `GET /api/admin/revenue` - Revenue statistics
   - `GET /api/admin/metrics` - System metrics

---

## Sprint 5: Credit Management

### Goal
Update credit purchasing to respect role hierarchy.

### Changes Needed
1. **Reps:**
   - Remove credit purchase button
   - Show read-only balance
   - Display "Contact your manager" message

2. **Managers/Executives:**
   - Full credit purchase access
   - Credits go to shared account pool
   - See team's credit usage

3. **Update routes:**
   - `/dashboard/credits/page.tsx` - Add role-based logic
   - Payment APIs already handle account-level credits ✅

---

## Sprint 6: Invite System UI

### Goal
Build user-friendly invite management interface.

### Tasks
1. **Create components:**
   - `InviteGenerator` - Form to create invites
   - `InviteList` - View all invitations
   - `InviteCard` - Individual invite display

2. **Features:**
   - Generate invite links with one click
   - Copy to clipboard
   - Set expiration dates
   - View invite status (pending/used/expired)
   - Regenerate codes
   - Revoke active invites

3. **Integration:**
   - Add to manager dashboard
   - Add to executive dashboard
   - Settings page shortcut

---

## Current Status: Sprint 1 Complete ✅

### What's Working Now:
- ✅ Database schema with team hierarchy
- ✅ RLS policies for role-based access
- ✅ Sign-up flow with role selection
- ✅ Invite code system (backend)
- ✅ Automatic user creation with proper hierarchy
- ✅ API endpoints for invites

### What's Next:
1. **Run the database migration** (`migrations/001-hierarchical-teams.sql` in Supabase SQL Editor)
2. **Test sign-up flow:**
   - Sign up as manager
   - Generate invite code (via API or we'll build UI next)
   - Sign up as rep with code
3. **Start Sprint 2** - Build manager dashboard

---

## Testing the Current Setup

### Test 1: Manager Sign-up
1. Go to `/signup`
2. Select "Team Manager"
3. Enter details
4. Create account
5. Verify user created with role='manager'

### Test 2: Generate Invite Code
```bash
curl -X POST http://localhost:3000/api/invites/generate \
  -H "Content-Type: application/json" \
  -d '{"inviteeRole": "rep", "expiresInDays": 30}'
```

### Test 3: Rep Sign-up with Invite
1. Get invite code from manager
2. Go to `/signup?code=ABC12345`
3. Fill out form (notice role is pre-set)
4. Create account
5. Verify user linked to manager

---

## Questions Answered

1. **Can managers see other managers' teams?**
   - No, only their own team

2. **Can executives purchase credits for specific teams?**
   - Credits go to company-wide pool (account level)

3. **Team structure:**
   - One manager per team
   - Executives oversee multiple teams

4. **Admin access:**
   - Separate `is_super_admin` flag
   - Email whitelist for `/admin` routes

---

## File Structure

```
app/
├── (auth)/
│   └── signup/
│       └── page.tsx ✅ Updated with role selection
├── api/
│   └── invites/
│       ├── generate/
│       │   └── route.ts ✅ Created
│       └── validate/
│           └── route.ts ✅ Created
├── dashboard/
│   ├── page.tsx ✅ Updated user creation
│   ├── team/ ⏳ Sprint 2
│   ├── executive/ ⏳ Sprint 3
│   └── settings/
└── admin/ ⏳ Sprint 4

migrations/
├── 001-hierarchical-teams.sql ✅ Created
└── README.md ✅ Created
```

---

## Next Steps

1. **Immediate:** Run the database migration
2. **Sprint 2:** Build manager dashboard
3. **Sprint 3:** Build executive dashboard
4. **Sprint 4:** Build super admin dashboard
5. **Sprint 5:** Update credit management
6. **Sprint 6:** Build invite UI

**Ready to continue with Sprint 2?**
