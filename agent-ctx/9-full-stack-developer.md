# Task 9: Auth Page Upgrade & User Onboarding Flow

## Summary
Successfully upgraded the Auth page and created a complete user onboarding flow for the InferBench platform.

## Changes Made

### 1. Zustand Store Auth State (`src/lib/store.ts`)
- Added `persist` middleware from `zustand/middleware`
- Added `AuthUser` interface with `name` and `email` fields
- Added `isAuthenticated: boolean` state with `setAuthenticated()` setter
- Added `user: AuthUser | null` state with `setUser()` setter
- Added `signOut()` action that clears auth state and navigates to landing page
- Persisted auth state to localStorage under key `inferbench-auth`
- Only `isAuthenticated` and `user` are persisted (other state is ephemeral)

### 2. i18n Translation Keys (`src/lib/i18n.ts`)
Added 30+ translation keys in both `en` and `zh` locales:
- `auth.workspace.*` — Workspace setup step (title, subtitle, orgName, defaultEngine, teamSize, useCase, next, back, settingUp, preparingDemo, complete, completeDesc)
- `auth.profile.*` — Profile dropdown (settings, apiKeys, signOut)
- `auth.banner.*` — Auth banner (signInForFull, signIn, dismiss)
- Engine options: defaultEngineVllm, defaultEngineSglang, defaultEngineBoth
- Team size options: teamSize1-4
- Use case options: useCaseResearch, useCaseProduction, useCaseBenchmarking, useCaseOther

### 3. Auth Page Upgrade (`src/components/auth/auth-page.tsx`)
Completely refactored from simple login/register form to multi-step onboarding flow:
- **Step 1 (Login/Register)**: Enhanced with form validation, controlled inputs, social login that sets auth state
- **Step 2 (Workspace Setup)**: New step with:
  - Organization name input
  - Default engine preference (vLLM/SGLang/Both) with emoji icon cards and RadioGroup
  - Team size selector (1-5, 6-20, 21-50, 50+) with styled radio options
  - Primary use case selector (Research, Production, Benchmarking, Other) with emoji icons
- **Step 3 (Seeding)**: Loading state with:
  - Animated spinner with Loader2 icon
  - Progress bar animation
  - Bouncing dots indicator
  - Calls `POST /api/seed` to seed demo data
  - 2-second simulated setup time
- **Step 4 (Complete)**: Success animation with:
  - CheckCircle2 icon with pulse animation
  - Auto-redirect to dashboard after 1.5 seconds
- **Progress Indicator**: Visual step tracker showing current progress (1→2→3)
- **Animated Transitions**: Framer Motion step transitions with directional slide
- All sub-components extracted as standalone functions to satisfy React hooks lint rule

### 4. Sidebar Profile Dropdown (`src/components/app-sidebar.tsx`)
Replaced the static "Sign In" button with dynamic profile section:
- **When not authenticated**: Shows "Sign In" button with LogIn icon (same as before)
- **When authenticated**: Shows:
  - User avatar with initials (emerald-600 background, white text)
  - User name display (truncated)
  - Dropdown menu with:
    - User name + email display (DropdownMenuLabel)
    - "Profile Settings" link → navigates to Settings page
    - "API Keys" link → navigates to Settings page
    - "Sign Out" button (red text, calls `signOut()`)
- Added imports: `User`, `KeyRound`, `LogOut`, `DropdownMenu*`, `Avatar`, `AvatarFallback`
- Removed unused imports: `Wifi`, `WifiOff`, `AlertTriangle`

### 5. Auth Banner Component (`src/components/auth/auth-banner.tsx`)
New component shown on protected pages when not authenticated:
- Amber-themed subtle banner with LogIn icon
- Message: "Sign in to access full features and save your data"
- "Sign In" button → navigates to auth page
- Dismiss (X) button → hides banner (local state)
- Animated entrance with Framer Motion
- Conditionally shown only on dashboard, reports, and analysis pages

### 6. Page Integration (`src/app/page.tsx`)
- Imported `AuthBanner` component
- Added AuthBanner display above PageContent for dashboard, reports, and analysis pages
- Banner appears inside the padded content area for proper alignment

### 7. Bug Fix (`src/components/dashboard/dashboard-page.tsx`)
- Fixed pre-existing JSX parsing error: missing closing `</div>` tag in the Activity Timeline CardHeader section (line 2552)

## Lint Status
- All files pass ESLint with zero errors ✅

## Technical Notes
- Auth is UI-only (no real backend auth) — uses Zustand + localStorage for state persistence
- Social login buttons directly set auth state and navigate to dashboard
- The seed API call during workspace setup is non-blocking — errors are silently ignored
- The `signOut()` action resets `isAuthenticated`, `user`, and navigates to `landing` page
- The auth banner is dismissible per session (local component state, not persisted)
