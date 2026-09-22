# Babcock Votes

Next.js app for department elections. Backend: [Convex](https://convex.dev) (database, auth, file storage, server functions).

## Architecture

- **Everything server-side lives in `convex/`.** Pages call queries and mutations directly (`useQuery` / `useMutation`), so data is live: an admin's change shows up on every open page without a refresh.
- **Authorization is in the functions**, not in the client. `convex/lib/access.ts` has `requireRegistered` / `requireAdmin` (department-scoped for `dept_admin`); `users.role` is the single source of truth.
- **Voting** (`convex/lib/ballot.ts`): one mutation checks the election is active, the voter is in its department, only positions open to their level are voted on, and each candidate belongs to its position. Convex mutations are serializable transactions, so two simultaneous ballots from one voter can't both succeed.
- **Tallies** (`convex/lib/tally.ts`) are counted from the `votes` table on every read, so results always match the recorded ballots — there is no cached total that can drift. A single tally reads at most 25,000 vote rows (Convex allows 32,000 documents per transaction) and fails loudly past that rather than showing a truncated result; use the analytics summary, which pages, for an election that large.
- **Sign-in** (`convex/auth.ts`, `convex/lib/authCallbacks.ts`): school Google accounts (`@student.babcock.edu.ng`) and admin-provisioned email/password accounts for part-time students. Nobody can self-register with a password. A first Google sign-in attaches to an existing user with the same verified email, which is how migrated students keep their profile and votes.
- **Images** upload from the browser to Convex file storage (admins only).

## Setup

1. `npm install`, then create a Convex project: `npx convex dev` (log in, create the project). It writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local` and keeps running to push your functions; use `npx convex dev --once` for a single push.
2. **Google OAuth.** In Google Cloud, create an OAuth client and add this authorized redirect URI (your deployment's `.convex.site` URL):
   `https://<deployment>.convex.site/api/auth/callback/google`
3. Set the deployment's environment variables (`--prod` for production):

   ```
   npx convex env set AUTH_GOOGLE_ID <client id>
   npx convex env set AUTH_GOOGLE_SECRET <client secret>
   npx convex env set SITE_URL http://localhost:3000     # your site's URL
   npx convex env set OPS_SECRET <long random string>    # enables the scripts below
   ```

   Auth also needs a signing key pair (`JWT_PRIVATE_KEY` and `JWKS`); `npx @convex-dev/auth` generates and sets both.
4. Put the same secret in `.env.local` so scripts can use it: `OPS_SECRET=<same string>`.
5. `npm run dev` (with `npx convex dev` running).

### Making someone an admin

They sign in with Google and complete registration first, then add their email to `scripts/seed-users.mjs` and run `node scripts/seed-users.mjs`. After that, super admins can change roles on the Users page.

## Scripts

Scripts talk to the deployment named by `NEXT_PUBLIC_CONVEX_URL` in `.env.local`, through secret-guarded functions in `convex/ops.ts`. Point them at production only on purpose. Unsetting `OPS_SECRET` on a deployment turns them all off.

| Script | Purpose |
| --- | --- |
| `node scripts/import-users.mjs <json>` | Create registered users (and their eligible-voter rows) from JSON; see `scripts/users.example.json` |
| `node scripts/seed-whitelist.mjs <csv>` | Load eligible voters (`fullName,matricNumber,departmentId,level`) |
| `node scripts/sync-eligible-voters.mjs --department <id>` | Make every registered user in a department an eligible voter (run after a class-list import) |
| `node scripts/seed-candidates.mjs <electionId> <csv>` | Load positions and candidates |
| `node scripts/create-pt-accounts.mjs <csv>` | Create part-time student accounts; writes `pt-credentials.csv` |
| `node scripts/audit-votes.mjs <electionId>` | Export every vote to `audit-<electionId>.csv` |
| `npm run generate-analytics -- '{"electionId":"…"}'` | Build the analytics summary shown to admins |
| `npm run stress-test <electionId>` | Cast simulated ballots, then clean them up (`--keep` to leave them). **Use a demo election** |
| `npx convex run users:removeByEmail '{"email":"…"}'` | Delete a user and their sign-in accounts |

Generated CSVs contain passwords, emails and votes; they're gitignored. Don't commit or share them.

## Tests

```
npm test
```

Unit tests (`convex/*.test.ts`, using `convex-test`) run the real Convex functions in memory: the vote rules, registration, department scoping, election deletion, the sign-in/account-linking gate, and the migration mutations (ID remapping and idempotency).

## Migrating from Firebase (one-off)

`scripts/migrate-firebase-to-convex.mjs` copies users (with a profile), eligible voters, elections, positions, candidates, images and votes from Firestore/Storage, then prints a parity report (row counts and per-candidate vote tallies against Firestore) and exits non-zero on any mismatch.

You need, in addition to the Convex variables above, the Firebase service-account key of the project that holds the data: `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`, or `--firebase-key=./key.json`.

```
npm run migrate:firebase -- --dry-run     # read-only: shows what would be copied
npm run migrate:firebase                  # copies everything, then verifies
```

- **Resumable.** Firestore's free tier only allows about 50,000 reads a day, which a full run can exceed. Progress is saved in `.migration-progress.json`; after a quota error, run the same command again after the quota resets (around midnight Pacific), or enable billing on the Firebase project. Use `--fresh` to start over, for example for the final run right before cutover.
- **Images need Firebase billing.** Firebase Storage refuses reads while billing is disabled. Use `--skip-files` to migrate everything else now; a later run without it copies the images.
- **Passwords.** Firebase password hashes can't be imported. Part-time students get new random passwords, written to `migrated-credentials-<timestamp>.csv` for redistribution. Google users need nothing: their first Google sign-in links to their migrated account.
- Rehearse against a dev deployment first. For the real cutover, run it against production with no election active, then run it once more (`--fresh`) to pick up stragglers.
- After cutover, remove `firebase-admin` and revoke the Firebase service-account key.
