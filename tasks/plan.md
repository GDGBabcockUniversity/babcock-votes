# Implementation Plan: Google OAuth and Email-Code Confirmation

## Overview

Keep school Google OAuth enabled. For email-code sign-in, look up a registered voter by matric number and send the code to the email already stored on that voter account. After a successful code, show the stored voter details and require the voter to choose “Is this you?” before allowing access to app functions. “Go back” signs out and returns the voter to login.

## Current State

- Google OAuth is already enabled in `convex/auth.ts`, presented on the Student login tab, and restricted to verified school-domain identities by the server callback.
- Student email-code auth already uses matric number to find a registered voter and deliver a one-time code to the stored email. Successful verification now marks the voter as awaiting profile confirmation.
- Registered voter profiles are populated from trusted imported data. Google first-time users continue through the separate matric/name eligibility claim flow.

## Architecture Decisions

- Reuse the current matric-keyed `voter-otp` provider; do not accept a new email address because eligible-voter records do not store one.
- Use a user-level `emailLoginConfirmed` gate: successful voter OTP verification sets it false; the profile confirmation mutation sets it true. Existing accounts and Google sign-ins remain usable; Google clears a pending OTP confirmation.
- During pending confirmation, recheck the voter’s matric against the eligible-voter table and require that row to be claimed by the same user before showing details or enabling access.
- Enforce the confirmation on server-side registered-voter functions as well as client route layouts, so a direct URL or API call cannot bypass it.
- The OTP path is for existing registered voters. It does not create a new voter identity because the matching contact email belongs to an existing account record.

## Dependency Graph

```text
Successful voter OTP verification
              │ sets confirmation pending
              ▼
Server profile query ──► “Is this you?” / “Go back” UI
              │                    │
              │                    ├── Confirm: allow app functions
              │                    └── Go back: sign out to login
              ▼
Registered-voter server access gate

Google OAuth remains enabled and clears pending OTP confirmation on sign-in.
```

## Task List

### Phase 1: Auth state and server gate

- [x] Task 1: Mark voter OTP sign-ins as awaiting confirmation and preserve Google OAuth behavior
- [x] Task 2: Add a server query and mutation for confirming the signed-in voter profile

### Checkpoint: Auth state

- [x] OTP verification sets the confirmation gate only for voter accounts.
- [x] Existing Google sign-in can clear the gate.
- [x] Registered-voter backend functions reject a pending confirmation.

### Phase 2: Confirmation UI and navigation

- [x] Task 3: Route OTP users to their stored voter details with “Is this you?” and “Go back”
- [x] Task 4: Enforce the pending state in the auth, main, and admin layouts

### Checkpoint: Core flow

- [x] Confirm enables app access after showing server-returned profile data.
- [x] Go back signs the voter out and returns to login.
- [x] Other registered profiles and Google sign-in remain supported.

### Phase 3: Verification

- [x] Task 5: Cover OTP, confirmation, and server access behavior with tests
- [x] Task 6: Run full tests, typecheck, lint, and production build

## Task Details

### Task 1: Mark voter OTP sign-ins as awaiting confirmation and preserve Google OAuth behavior

**Description:** Add a profile confirmation flag. Set it pending only after successful OTP verification for a voter. Clear it when a voter uses Google OAuth.

**Acceptance criteria:**
- [x] Code request alone does not set the flag.
- [x] Successful OTP verification sets the flag for voter accounts.
- [x] Existing Google-linked voter sign-in clears a pending flag.

**Verification:** Auth callback and OTP tests.

**Dependencies:** None

**Files:** `convex/schema.ts`, `convex/lib/authCallbacks.ts`, `convex/auth.test.ts`, `convex/voterOtp.test.ts`

### Task 2: Add a server query and mutation for confirming the signed-in voter profile

**Description:** Return the signed-in voter’s stored details while confirmation is pending; let the voter acknowledge those details to clear the pending flag.

**Acceptance criteria:**
- [x] Only registered voter accounts with pending confirmation can query or confirm.
- [x] The mutation changes only the signed-in user’s confirmation state.
- [x] The query returns name, matric number, department, and level.

**Verification:** Registration and authorization tests.

**Dependencies:** Task 1

**Files:** `convex/registration.ts`, `convex/rules.test.ts`

### Task 3: Route OTP users to their stored voter details with “Is this you?” and “Go back”

**Description:** Show server-returned profile details. Confirmation continues into the app; Go back signs out and returns to login.

**Acceptance criteria:**
- [x] The confirmation screen shows the voter’s stored details and both requested actions.
- [x] Confirm calls the server mutation and the live auth profile navigates to the app.
- [x] Go back signs out and navigates to login.

**Verification:** Production build and manual browser inspection.

**Dependencies:** Task 2

**Files:** `app/(auth)/register/page.tsx`

### Task 4: Enforce the pending state in layouts and server functions

**Description:** Route pending OTP users to confirmation and hide protected pages. Reject direct registered-voter function calls until confirmation.

**Acceptance criteria:**
- [x] Auth, main, and admin layouts route or hold pending users at confirmation.
- [x] `requireRegistered` rejects pending voter access.
- [x] Google sign-in clears the pending state.

**Verification:** Route review and `requireRegistered` test.

**Dependencies:** Tasks 1–3

**Files:** `context/auth-context.tsx`, `app/(auth)/layout.tsx`, `app/(main)/layout.tsx`, `app/admin/layout.tsx`, `convex/lib/access.ts`, `convex/users.ts`

### Tasks 5–6: Verify the complete flow

**Description:** Add regression coverage for OTP confirmation and run the repository checks.

**Acceptance criteria:**
- [x] Tests verify OTP sets pending, query returns the voter’s record, protected calls fail, and confirmation restores access.
- [x] Full test suite, typecheck, lint, and production build complete.

**Verification:** `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

**Dependencies:** Tasks 1–4

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The confirmation flag is user-level rather than session-level, so an OTP sign-in on one device temporarily gates that voter’s other sessions. | Medium | Acknowledge the profile and clear the flag; Google sign-in also clears it. |
| Existing voter profiles without a matching eligibility row cannot pass email confirmation. | Medium | Keep the user blocked and restore/sync the authoritative eligible-voter record before allowing email-code access. |

## Open Questions

- None. Email identity mapping is resolved as matric lookup to the email already associated with the registered voter.
