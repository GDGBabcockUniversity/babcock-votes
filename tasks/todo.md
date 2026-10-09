# Task List: Google OAuth and Email-Code Confirmation

## Phase 1: Auth state and server gate

### Task 1: Mark voter OTP sign-ins as awaiting confirmation

- [x] Add a user confirmation flag.
- [x] Set it after successful voter OTP verification; do not set it at code request.
- [x] Clear it for a voter signing in with Google OAuth.
- [x] Verify callback and OTP behavior with tests.

**Dependencies:** None

### Task 2: Add server-side profile confirmation

- [x] Return stored voter details to the signed-in voter while confirmation is pending.
- [x] Confirm only the current voter and clear their pending flag.
- [x] Reject confirmation queries/mutations for other account states.

**Dependencies:** Task 1

## Checkpoint: Auth state

- [x] A pending voter cannot use `requireRegistered` application functions.
- [x] Existing Google sign-in behavior remains active.

## Phase 2: Confirmation UI and navigation

### Task 3: Show “Is this you?” and “Go back” after OTP sign-in

- [x] Display name, matric number, department, and level from the server query.
- [x] Confirm clears the pending gate and allows navigation into the app.
- [x] Go back signs out and returns to login.

**Dependencies:** Task 2

### Task 4: Guard protected layouts

- [x] Auth layout sends pending voter sessions to the confirmation view.
- [x] Main and admin layouts route and hide protected content while pending.
- [x] Server-side access checks remain effective if the UI is bypassed.

**Dependencies:** Tasks 1–3

## Checkpoint: Core flow

- [x] Full OTP → details → confirm → app flow works in Convex integration tests.
- [x] Incorrect, expired, reused, and mismatched codes continue to be rejected by the existing OTP flow.

## Phase 3: Verification

### Task 5: Run full verification

- [x] Focused auth, OTP, and authorization tests pass.
- [x] Full test suite passes.
- [x] Typecheck, lint, and production build pass.

**Dependencies:** Tasks 1–4

## Checkpoint: Complete

- [x] Implementation is ready for review.
