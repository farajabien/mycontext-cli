# Skika: Reference Project for Code Scaffold System

**Status**: 📋 Planned | **Type**: Reference Implementation | **Purpose**: Learning & Pattern Extraction

## Overview

**Skika** is a platform connecting underground musicians with UGC (User-Generated Content) creators for viral music marketing campaigns. Musicians set campaign budgets, creators submit TikTok-style content, AI verifies quality thresholds, and successful creators receive payouts.

**Why Skika as Reference?**

Skika is the PERFECT reference project for the scaffold system because it needs **every single non-negotiable feature**:

✅ **Authentication** - Musicians, creators, and admins with different permissions
✅ **Role-Based Access** - Different dashboards and features per role
✅ **Admin Dashboard** - Manage users, campaigns, submissions, payouts
✅ **Payment Integration** - PayPal for campaign budgets and creator payouts
✅ **Auth Guards** - Protect creator features, premium features
✅ **Paywalls** - Soft/hard paywalls for premium campaign features
✅ **PWA** - Mobile-first experience for creators on-the-go
✅ **Loading/Error States** - Complex async flows need proper states
✅ **Empty States** - New users, no campaigns, no submissions
✅ **Responsive Design** - Mobile creators, desktop musicians

By building Skika from scratch, we'll encounter and solve every pattern needed for the scaffold system.

## Product Vision

### The Problem

- **Musicians**: Struggle to market underground music, expensive traditional marketing
- **UGC Creators**: Want to monetize content creation, need music discovery
- **Current Solutions**: Generic influencer platforms don't understand music marketing

### The Solution

Skika bridges musicians and creators:

1. **Musicians** create campaigns with:
   - Music track
   - Campaign budget
   - Target metrics (views, engagement)
   - Duration

2. **Creators** browse campaigns and submit:
   - TikTok-style videos using the track
   - Meet minimum quality thresholds (AI-verified)

3. **Platform** handles:
   - Quality verification (ElevenLabs AI)
   - Metrics tracking (TikTok API)
   - Payout distribution (PayPal)
   - Dispute resolution

4. **Everyone wins**:
   - Musicians get authentic viral content
   - Creators get paid for quality content
   - Platform takes small commission

## User Roles

### 1. Musician (Campaign Creator)

**Can**:
- Create music campaigns
- Set budgets and targets
- Review creator submissions
- Track campaign performance
- Manage payouts

**Cannot**:
- Submit to campaigns
- Access admin features
- View other musicians' campaigns (private)

### 2. Creator (Content Producer)

**Can**:
- Browse available campaigns
- Submit video content
- Track submission status
- Receive payouts
- View earnings history

**Cannot**:
- Create campaigns
- Access admin features
- View other creators' earnings

### 3. Admin

**Can**:
- View all campaigns and submissions
- Manage users (ban, verify)
- Handle disputes
- View platform analytics
- Configure platform settings
- Manually approve/reject submissions

**Cannot**:
- Access user payment methods (security)

### 4. Guest (Unauthenticated)

**Can**:
- View landing page
- See featured campaigns (public)
- Sign up as musician or creator
- View pricing

**Cannot**:
- Access any authenticated features

## Core Features

### F1: Authentication & Onboarding

**User Stories**:
- As a **musician**, I want to sign up with email/Google so I can create campaigns
- As a **creator**, I want to sign up with TikTok so I can submit content
- As a **user**, I want to choose my role during onboarding so the platform knows my intent

**Implementation Needs**:
- Email/password auth
- OAuth (Google, TikTok)
- Role selection during signup
- Email verification
- Profile completion wizard
- 2FA for high-value accounts

**Scaffold Features Used**:
- ✅ Authentication system
- ✅ Role-based access
- ✅ Loading states (auth checks)
- ✅ Error states (auth failures)

### F2: Musician Dashboard

**User Stories**:
- As a **musician**, I want to create campaigns with budget and targets
- As a **musician**, I want to see all my active campaigns at a glance
- As a **musician**, I want to track campaign performance in real-time
- As a **musician**, I want to review and approve creator submissions

**Pages**:
- `/musician/dashboard` - Overview with stats
- `/musician/campaigns` - List of campaigns
- `/musician/campaigns/new` - Create campaign
- `/musician/campaigns/[id]` - Campaign detail
- `/musician/campaigns/[id]/submissions` - Review submissions
- `/musician/analytics` - Performance metrics
- `/musician/settings` - Account settings

**Implementation Needs**:
- Campaign CRUD
- File upload (music tracks)
- Budget management
- Submission review UI
- Analytics dashboard
- Real-time updates

**Scaffold Features Used**:
- ✅ Auth guards (musician-only routes)
- ✅ Loading states (data fetching)
- ✅ Empty states (no campaigns yet)
- ✅ Error states (upload failures)
- ✅ Payment integration (budget management)

### F3: Creator Dashboard

**User Stories**:
- As a **creator**, I want to browse available campaigns
- As a **creator**, I want to submit videos for campaigns
- As a **creator**, I want to track my submissions and earnings
- As a **creator**, I want to connect my TikTok account

**Pages**:
- `/creator/dashboard` - Overview with earnings
- `/creator/campaigns` - Browse campaigns
- `/creator/campaigns/[id]` - Campaign details
- `/creator/submit` - Submit content
- `/creator/submissions` - My submissions
- `/creator/earnings` - Earnings history
- `/creator/settings` - Account & TikTok linking

**Implementation Needs**:
- Campaign browsing with filters
- Video upload and preview
- Submission status tracking
- Earnings dashboard
- TikTok API integration
- Payout requests

**Scaffold Features Used**:
- ✅ Auth guards (creator-only routes)
- ✅ Loading states (uploads, API calls)
- ✅ Empty states (no submissions)
- ✅ Error states (upload/API failures)
- ✅ Payment integration (earnings, payouts)

### F4: Admin Dashboard

**User Stories**:
- As an **admin**, I want to see all users, campaigns, and submissions
- As an **admin**, I want to manually review flagged content
- As an **admin**, I want to manage disputes between musicians and creators
- As an **admin**, I want to view platform analytics

**Pages**:
- `/admin/dashboard` - Platform overview
- `/admin/users` - User management
- `/admin/campaigns` - All campaigns
- `/admin/submissions` - All submissions (filterable)
- `/admin/disputes` - Dispute resolution
- `/admin/analytics` - Platform metrics
- `/admin/settings` - Platform configuration

**Implementation Needs**:
- User CRUD (ban, verify, delete)
- Campaign moderation
- Submission review
- Dispute workflow
- Platform analytics
- Configuration management

**Scaffold Features Used**:
- ✅ Auth guards (admin-only routes)
- ✅ Admin dashboard (full CRUD for all tables)
- ✅ Loading states (data fetching)
- ✅ Empty states (no disputes)
- ✅ Responsive design (admin on mobile)

### F5: Campaign System

**User Stories**:
- As a **musician**, I want to create campaigns with specific requirements
- As a **creator**, I want to see clear campaign requirements before submitting
- As a **platform**, I want to track campaign progress and success metrics

**Data Model**:
```typescript
interface Campaign {
  id: string;
  musicianId: string;
  title: string;
  description: string;
  musicTrackUrl: string;
  musicTrackDuration: number;

  // Budget
  totalBudget: number;
  payoutPerCreator: number;
  maxCreators: number;

  // Requirements
  minViews: number;
  minEngagementRate: number;
  minVideoQuality: 'HD' | 'FHD';
  targetAudience: string[];

  // Status
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;

  // Metrics
  totalSubmissions: number;
  approvedSubmissions: number;
  totalViews: number;
  totalEngagement: number;
  totalSpent: number;

  createdAt: string;
  updatedAt: string;
}
```

**Implementation Needs**:
- Campaign lifecycle management
- Budget tracking and depletion
- Submission tracking
- Metrics aggregation
- Campaign notifications

**Scaffold Features Used**:
- ✅ Admin dashboard (campaign CRUD)
- ✅ Loading states (campaign loading)
- ✅ Empty states (no campaigns)
- ✅ Payment integration (budget management)

### F6: Submission & Verification System

**User Stories**:
- As a **creator**, I want to submit my video and see verification status
- As a **musician**, I want only quality submissions that meet my requirements
- As a **platform**, I want to automate quality verification with AI

**Data Model**:
```typescript
interface Submission {
  id: string;
  campaignId: string;
  creatorId: string;

  // Content
  videoUrl: string;
  videoThumbnail: string;
  videoDuration: number;
  videoQuality: string;

  // TikTok Data (from API)
  tiktokVideoId?: string;
  tiktokViews?: number;
  tiktokLikes?: number;
  tiktokComments?: number;
  tiktokShares?: number;
  engagementRate?: number;

  // Verification
  status: 'pending' | 'verifying' | 'approved' | 'rejected' | 'disputed';
  verificationScore: number; // 0-100 from AI
  verificationNotes: string;
  verifiedAt?: string;

  // Payout
  payoutStatus: 'pending' | 'approved' | 'paid' | 'failed';
  payoutAmount: number;
  payoutDate?: string;
  payoutTransactionId?: string;

  // Musician Review
  musicianApproved?: boolean;
  musicianNotes?: string;

  createdAt: string;
  updatedAt: string;
}
```

**AI Verification Criteria**:
- Video uses campaign music track (audio matching)
- Video meets quality threshold (ElevenLabs AI)
- Video meets minimum length
- No inappropriate content
- Creative and engaging (engagement prediction)

**Implementation Needs**:
- Video upload with chunking
- AI verification pipeline
- TikTok API integration
- Status tracking
- Notification system
- Dispute workflow

**Scaffold Features Used**:
- ✅ Loading states (upload, verification)
- ✅ Error states (upload failed, verification failed)
- ✅ Empty states (no submissions)
- ✅ Payment integration (payout tracking)

### F7: Payment & Payout System

**User Stories**:
- As a **musician**, I want to fund campaigns with PayPal
- As a **creator**, I want to receive payouts via PayPal
- As a **platform**, I want to handle payments securely and take commission

**Flow**:

1. **Campaign Funding (Musician)**:
   ```
   Musician creates campaign
   → Sets budget ($500)
   → Platform calculates (budget + fee) = $525
   → PayPal checkout
   → Funds held in escrow
   → Campaign goes live
   ```

2. **Creator Payout**:
   ```
   Creator submits content
   → AI verifies
   → Musician approves
   → Payout triggered ($50/creator)
   → PayPal payout
   → Creator receives funds
   ```

3. **Platform Commission**:
   - 5% on campaign budgets
   - Transparent pricing

**Data Model**:
```typescript
interface Transaction {
  id: string;
  type: 'campaign-funding' | 'creator-payout' | 'platform-fee' | 'refund';

  // Parties
  fromUserId: string;
  toUserId?: string;
  campaignId?: string;
  submissionId?: string;

  // Amounts
  amount: number;
  currency: 'USD';
  platformFee: number;
  netAmount: number;

  // PayPal
  paypalOrderId?: string;
  paypalPayoutId?: string;
  paypalStatus: string;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  failureReason?: string;

  createdAt: string;
  completedAt?: string;
}
```

**Implementation Needs**:
- PayPal SDK integration
- Campaign funding flow
- Bulk creator payouts
- Transaction history
- Failed payment handling
- Refund workflow

**Scaffold Features Used**:
- ✅ Payment integration (PayPal)
- ✅ Loading states (payment processing)
- ✅ Error states (payment failed)
- ✅ Admin dashboard (transaction management)

### F8: Premium Features & Paywalls

**Free Features**:
- Create 1 campaign/month
- Max budget $100/campaign
- Basic analytics
- Standard support

**Pro Features** ($29/month):
- Unlimited campaigns
- Unlimited budget
- Advanced analytics
- Priority verification
- Priority support
- Campaign templates
- A/B testing

**Enterprise Features** ($299/month):
- Everything in Pro
- Dedicated account manager
- Custom contracts
- White-label option
- API access

**Implementation**:
- Soft paywalls: Show teaser, prompt upgrade
- Hard paywalls: Block feature entirely
- Free trial: 14 days Pro for new users

**Scaffold Features Used**:
- ✅ Payment integration (subscriptions)
- ✅ Auth guards (feature-based access)
- ✅ Paywalls (soft/hard)
- ✅ Admin dashboard (manage subscriptions)

### F9: Mobile Experience (PWA)

**Why PWA**:
- Creators are mobile-first (TikTok generation)
- Need offline capability for drafts
- Push notifications for submissions
- App-like experience

**Features**:
- Install prompt
- Offline mode
- Push notifications
- Camera access for video recording
- Fast loading

**Scaffold Features Used**:
- ✅ PWA configuration
- ✅ Responsive design
- ✅ Loading states (offline-aware)

## Technical Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS
- **State**: React Context + InstantDB reactivity
- **Forms**: React Hook Form + Zod
- **File Upload**: Uploadthing or Cloudinary

### Backend
- **Database**: InstantDB (real-time, permissions)
- **Auth**: InstantDB Auth
- **Payments**: PayPal SDK
- **File Storage**: Cloudinary or S3
- **AI Verification**: ElevenLabs API
- **TikTok Integration**: TikTok API

### DevOps
- **Hosting**: Vercel
- **Domain**: skika.io
- **Analytics**: Vercel Analytics + Posthog
- **Monitoring**: Sentry
- **CI/CD**: GitHub Actions

## InstantDB Schema

```typescript
// instant-db-schema.ts
import { InstantDB } from '@instantdb/core';

const schema = InstantDB.Schema({
  // Users
  users: {
    fields: {
      email: 'string',
      name: 'string',
      role: 'musician' | 'creator' | 'admin',
      avatar: 'string?',
      bio: 'string?',

      // Creator specific
      tiktokHandle: 'string?',
      tiktokFollowers: 'number?',
      totalEarnings: 'number',

      // Musician specific
      musicGenre: 'string?',
      spotifyUrl: 'string?',
      totalSpent: 'number',

      // Subscription
      subscriptionPlan: 'free' | 'pro' | 'enterprise',
      subscriptionStatus: 'active' | 'cancelled' | 'expired',
      subscriptionEndsAt: 'date?',

      // Status
      status: 'active' | 'suspended' | 'banned',
      verifiedEmail: 'boolean',
      verifiedIdentity: 'boolean',

      createdAt: 'date',
      updatedAt: 'date',
    },
    relations: {
      campaigns: { type: 'hasMany', entity: 'campaigns' },
      submissions: { type: 'hasMany', entity: 'submissions' },
      transactions: { type: 'hasMany', entity: 'transactions' },
    },
  },

  // Campaigns
  campaigns: {
    fields: {
      title: 'string',
      description: 'string',
      musicTrackUrl: 'string',
      musicTrackDuration: 'number',

      totalBudget: 'number',
      payoutPerCreator: 'number',
      maxCreators: 'number',

      minViews: 'number',
      minEngagementRate: 'number',
      minVideoQuality: 'string',
      targetAudience: 'json',

      status: 'string',
      startDate: 'date',
      endDate: 'date',

      totalSubmissions: 'number',
      approvedSubmissions: 'number',
      totalViews: 'number',
      totalEngagement: 'number',
      totalSpent: 'number',

      createdAt: 'date',
      updatedAt: 'date',
    },
    relations: {
      musician: { type: 'belongsTo', entity: 'users' },
      submissions: { type: 'hasMany', entity: 'submissions' },
    },
  },

  // Submissions
  submissions: {
    fields: {
      videoUrl: 'string',
      videoThumbnail: 'string',
      videoDuration: 'number',
      videoQuality: 'string',

      tiktokVideoId: 'string?',
      tiktokViews: 'number?',
      tiktokLikes: 'number?',
      tiktokComments: 'number?',
      tiktokShares: 'number?',
      engagementRate: 'number?',

      status: 'string',
      verificationScore: 'number',
      verificationNotes: 'string',
      verifiedAt: 'date?',

      payoutStatus: 'string',
      payoutAmount: 'number',
      payoutDate: 'date?',
      payoutTransactionId: 'string?',

      musicianApproved: 'boolean?',
      musicianNotes: 'string?',

      createdAt: 'date',
      updatedAt: 'date',
    },
    relations: {
      campaign: { type: 'belongsTo', entity: 'campaigns' },
      creator: { type: 'belongsTo', entity: 'users' },
      transaction: { type: 'belongsTo', entity: 'transactions' },
    },
  },

  // Transactions
  transactions: {
    fields: {
      type: 'string',
      amount: 'number',
      currency: 'string',
      platformFee: 'number',
      netAmount: 'number',

      paypalOrderId: 'string?',
      paypalPayoutId: 'string?',
      paypalStatus: 'string',

      status: 'string',
      failureReason: 'string?',

      createdAt: 'date',
      completedAt: 'date?',
    },
    relations: {
      fromUser: { type: 'belongsTo', entity: 'users' },
      toUser: { type: 'belongsTo', entity: 'users' },
      campaign: { type: 'belongsTo', entity: 'campaigns' },
      submission: { type: 'belongsTo', entity: 'submissions' },
    },
  },

  // Disputes
  disputes: {
    fields: {
      type: 'content-quality' | 'payment' | 'copyright' | 'other',
      description: 'string',
      evidence: 'json',

      status: 'open' | 'investigating' | 'resolved' | 'closed',
      resolution: 'string?',
      resolvedAt: 'date?',

      createdAt: 'date',
      updatedAt: 'date',
    },
    relations: {
      reporter: { type: 'belongsTo', entity: 'users' },
      campaign: { type: 'belongsTo', entity: 'campaigns' },
      submission: { type: 'belongsTo', entity: 'submissions' },
      admin: { type: 'belongsTo', entity: 'users' },
    },
  },
});

// Permissions
const permissions = {
  users: {
    create: 'auth.uid != null', // Anyone can create profile
    read: 'auth.uid != null', // Authenticated users can read
    update: 'data.id == auth.uid || auth.user.role == "admin"', // Own profile or admin
    delete: 'auth.user.role == "admin"', // Admin only
  },

  campaigns: {
    create: 'auth.user.role == "musician"',
    read: 'auth.uid != null',
    update: 'data.musician.id == auth.uid || auth.user.role == "admin"',
    delete: 'data.musician.id == auth.uid || auth.user.role == "admin"',
  },

  submissions: {
    create: 'auth.user.role == "creator"',
    read: 'data.creator.id == auth.uid || data.campaign.musician.id == auth.uid || auth.user.role == "admin"',
    update: 'data.creator.id == auth.uid || auth.user.role == "admin"',
    delete: 'data.creator.id == auth.uid || auth.user.role == "admin"',
  },

  transactions: {
    create: 'false', // System only
    read: 'data.fromUser.id == auth.uid || data.toUser.id == auth.uid || auth.user.role == "admin"',
    update: 'false', // Immutable
    delete: 'false', // Immutable
  },

  disputes: {
    create: 'auth.uid != null',
    read: 'data.reporter.id == auth.uid || data.campaign.musician.id == auth.uid || auth.user.role == "admin"',
    update: 'auth.user.role == "admin"',
    delete: 'auth.user.role == "admin"',
  },
};

export { schema, permissions };
```

## Branding & Design

### Color Palette

**Primary**: Purple (music/creativity vibes)
- Primary: #8B5CF6 (purple-500)
- Primary Dark: #6D28D9 (purple-700)
- Primary Light: #C4B5FD (purple-300)

**Secondary**: Orange (energy/viral)
- Secondary: #F97316 (orange-500)
- Secondary Dark: #C2410C (orange-700)
- Secondary Light: #FED7AA (orange-200)

**Semantic**:
- Success: #10B981 (green-500)
- Warning: #F59E0B (amber-500)
- Error: #EF4444 (red-500)
- Info: #3B82F6 (blue-500)

### Typography

- **Headers**: Inter Bold
- **Body**: Inter Regular
- **Mono**: JetBrains Mono (for code/IDs)

### Logo

Text-based logo: "Skika" with music note + video play icon

### Voice & Tone

- **Voice**: Energetic, creative, supportive
- **Tone**: Casual but professional
- **Examples**:
  - ✅ "Your campaign is live! Let's get some viral content 🚀"
  - ❌ "Campaign status has been updated to active."

## Project Structure

```
skika/
├── app/
│   ├── (auth)/                    [Auth pages]
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── (marketing)/               [Public pages]
│   │   ├── page.tsx              [Landing]
│   │   ├── pricing/
│   │   ├── how-it-works/
│   │   └── layout.tsx
│   ├── musician/                  [Musician dashboard]
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── analytics/
│   │   └── layout.tsx
│   ├── creator/                   [Creator dashboard]
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── submit/
│   │   ├── submissions/
│   │   ├── earnings/
│   │   └── layout.tsx
│   ├── admin/                     [Admin dashboard]
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── campaigns/
│   │   ├── submissions/
│   │   ├── disputes/
│   │   └── layout.tsx
│   ├── api/                       [API routes]
│   │   ├── auth/
│   │   ├── campaigns/
│   │   ├── submissions/
│   │   ├── payments/
│   │   └── webhooks/
│   ├── layout.tsx
│   └── providers.tsx
├── components/
│   ├── ui/                        [shadcn components]
│   ├── auth/                      [Auth components]
│   ├── campaigns/                 [Campaign components]
│   ├── submissions/               [Submission components]
│   ├── payments/                  [Payment components]
│   ├── guards/                    [Auth guards, paywalls]
│   ├── states/                    [Loading, error, empty]
│   └── layout/                    [Navbar, sidebar, etc.]
├── lib/
│   ├── instantdb.ts              [InstantDB client]
│   ├── auth.ts                   [Auth utilities]
│   ├── payments/
│   │   ├── paypal.ts
│   │   └── subscription.ts
│   ├── ai/
│   │   └── elevenlabs.ts
│   ├── api/
│   │   └── tiktok.ts
│   └── hooks/
│       ├── use-auth.ts
│       ├── use-campaign.ts
│       ├── use-submission.ts
│       └── use-subscription.ts
├── .mycontext/
│   ├── 01-prd.md
│   ├── 02-user-flows.md
│   ├── 03-branding.md
│   ├── 04-component-list.json
│   ├── instant-db-schema.ts
│   └── scaffold-config.json
├── public/
│   ├── manifest.json
│   └── sw.js
├── middleware.ts                  [Auth & role checking]
└── next.config.js
```

## Implementation Phases

### Phase 1: Setup & Auth (Week 1)

**Goal**: Project setup with working auth

**Tasks**:
1. Initialize Next.js project with shadcn
2. Set up MyContext CLI
3. Generate full context
4. Create InstantDB schema
5. Implement auth system
6. Build role selection
7. Create basic layouts

**Pattern Documentation**:
- Auth flow patterns
- Role-based routing
- InstantDB permissions
- Layout patterns

### Phase 2: Musician Features (Week 2)

**Goal**: Musicians can create and manage campaigns

**Tasks**:
1. Campaign creation flow
2. Campaign dashboard
3. Music upload
4. Budget management
5. Submission review UI

**Pattern Documentation**:
- Form patterns
- File upload patterns
- Dashboard patterns
- CRUD patterns

### Phase 3: Creator Features (Week 3)

**Goal**: Creators can submit content

**Tasks**:
1. Campaign browsing
2. Video upload
3. Submission tracking
4. Earnings dashboard
5. TikTok linking

**Pattern Documentation**:
- Browse/filter patterns
- Upload patterns
- Tracking UI patterns

### Phase 4: Payments (Week 4)

**Goal**: Full payment flow working

**Tasks**:
1. PayPal integration
2. Campaign funding
3. Creator payouts
4. Transaction history
5. Subscription system

**Pattern Documentation**:
- Payment flow patterns
- Webhook patterns
- Subscription patterns
- Transaction UI patterns

### Phase 5: Admin & Polish (Week 5)

**Goal**: Admin dashboard + polish

**Tasks**:
1. Admin dashboard
2. User management
3. Dispute system
4. Platform analytics
5. PWA configuration
6. Loading/error/empty states

**Pattern Documentation**:
- Admin CRUD patterns
- Table patterns
- PWA setup patterns
- State patterns

### Phase 6: Testing & Refinement (Week 6)

**Goal**: Production-ready, patterns extracted

**Tasks**:
1. E2E testing
2. Responsive testing
3. Payment testing
4. Security audit
5. Performance optimization
6. **Extract all patterns**
7. **Document for scaffold**

**Pattern Documentation**:
- Complete pattern library
- Scaffold template structure
- Variable mapping
- Generation strategy

## Pattern Extraction Checklist

After building each feature, document:

### For Each Feature

- [ ] **File Structure**: What files were created?
- [ ] **Dependencies**: What packages were needed?
- [ ] **Context Usage**: What data from .mycontext was used?
- [ ] **Variables**: What should be parameterized?
- [ ] **Reusability**: What can be template-ized?
- [ ] **Edge Cases**: What special cases to handle?
- [ ] **Testing**: What tests are needed?
- [ ] **Documentation**: What should be documented?

### Example: Auth Pattern Extraction

After building auth, document:

```markdown
## Auth Pattern

**Files Created**:
- app/(auth)/login/page.tsx
- app/(auth)/signup/page.tsx
- components/auth/login-form.tsx
- components/auth/signup-form.tsx
- lib/auth.ts
- lib/hooks/use-auth.ts
- middleware.ts

**Dependencies**:
- @instantdb/react
- react-hook-form
- zod

**Context Usage**:
- Roles: From InstantDB schema (users.role)
- Branding: Colors from branding.md

**Variables**:
- {{roles}} - List of user roles
- {{branding.colors.primary}} - Primary color
- {{branding.logo}} - Logo URL

**Template Structure**:
templates/auth-system/
├── files/
│   ├── pages/login.tsx.template
│   ├── components/login-form.tsx.template
│   └── lib/auth.ts.template
└── generator.ts
```

## Success Criteria

### For Skika (The App)

- [ ] All user flows working end-to-end
- [ ] Payments processing successfully
- [ ] AI verification working
- [ ] Admin dashboard functional
- [ ] PWA installable
- [ ] Responsive on all devices
- [ ] Production-ready code quality

### For Scaffold (The Learning)

- [ ] All patterns documented
- [ ] Template structure defined
- [ ] Variables identified
- [ ] Generation strategy clear
- [ ] Ready to create scaffold system
- [ ] 80%+ of code is template-able

## Next Steps

1. **Start Building**: Begin with Phase 1 (Setup & Auth)
2. **Document Patterns**: After each feature, document the pattern
3. **Extract Templates**: Convert documented patterns to templates
4. **Test Extraction**: Try to regenerate a feature from the template
5. **Iterate**: Refine templates based on what works/doesn't work
6. **Build Scaffold**: Once patterns are solid, build the scaffold engine

## Related Documentation

- [Code Scaffold System](../roadmap/07-code-scaffold-system.md) - The scaffold roadmap
- [MyContext CLI Usage](../../README.md) - How to use MyContext CLI
- [InstantDB Docs](https://www.instantdb.com/docs) - InstantDB documentation
- [shadcn/ui](https://ui.shadcn.com/) - shadcn component library

---

**Status**: 📋 Planned (Ready to Start)
**Timeline**: 6 weeks
**Purpose**: Reference project for scaffold system
**Next Action**: Initialize project with MyContext CLI
**Last Updated**: February 7, 2026
