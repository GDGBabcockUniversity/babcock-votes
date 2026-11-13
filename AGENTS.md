# Project Guidelines & Architecture Rules

Adhere strictly to the `Educify` architecture patterns and style invariants across this codebase.

---

## 1. Directory & Routing (Educify Model)
* **Ultra-thin page shells (5–10 lines max):** `app/**/page.tsx` only imports and renders the top-level view orchestrator from `components/`.
* **Component folders mirror routes:** `app/(auth)/login/` -> `components/auth/login/`, `app/(main)/` -> `components/home/`, `app/not-found.tsx` -> `components/not-found/`.
* **Shared UI in `components/common/`:** `Button.tsx`, `Footer.tsx`, `ThemeToggle.tsx`, `ThemeInitializer.tsx`, `sidebar/`.
* **Styles in `styles/`:** Mirror component hierarchy (`styles/auth/login.css`, `styles/home/home.css`, etc.). Dense CSS: 0 blank lines between properties.

---

## 2. Component Anatomy & Spacing
* **Single blank line between distinct tiers only:** Hooks/Refs -> State/Vars -> Handlers/Memos -> Effects -> JSX.
* **ZERO robotic comments:** Never write `// 1. Hooks & Refs`, `// Handlers`, `// Return JSX`, etc.
* **ZERO blank lines inside JSX:** Sibling tags, elements, and sections flow immediately beneath each other.
* **`printWidth: 1000`:** Enforced via `.prettierrc` to prevent wrapping single JSX elements across multiple lines.
* **Inline effects:** In `useEffect`, format conditional void actions as `{ condition && fn(); }` on one line.
* **Style invariants:** Deterministic types (no unnecessary `?.`), no emojis in UI (use `@icons/*`), SVG icons use `currentColor`.

---

## 3. Tailwind vs CSS Boundaries
* **Tailwind in JSX owns ALL atomic utilities:**
  * Layout & Display: `flex`, `grid`, `block`, `inline-block`, `hidden`, `relative`, `overflow-hidden`.
  * Spacing & Gap: `gap-*` (ALWAYS use Tailwind's native spacing numbers that multiply by `--spacing` internally: `gap-0.5`, `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5`, `gap-3`, `gap-4`, `gap-5`, `gap-6`, `gap-8`, `gap-9`, `gap-12`). NEVER write arbitrary bracketed rems like `gap-[...rem]` in JSX.
  * Transforms & Sizing: `transform`, `rotate-*` (e.g. `rotate-[14deg]`), `scale-*`, `origin-*`, `w-full`, `h-full`, `w-auto`, `shrink-0`.
  * Typography & Appearance: `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `no-underline`, `hover:underline`, `object-contain`, `object-cover`, `opacity-*`, `whitespace-nowrap`, `pointer-events-none`, `select-none`, `text-center`, `mx-auto`, `mt-auto`, `m-auto`.
  * State macros: `hover:opacity-*`, `active:scale-*`, `disabled:opacity-*`, `disabled:cursor-not-allowed`.
* **CSS owns design tokens & non-atomic rules:** CSS variables (`var(--...)`), component-specific `padding`, `margin`, `height`, `border-radius`, `box-shadow`, `@keyframes`, and `:hover:not(:disabled)` / `:active:not(:disabled)` for color/token shifts.
* **NEVER write atomic utilities in CSS:** No `gap`, `display: grid`, `display: flex`, `margin: 0 auto`, `margin: auto`, `margin-top: auto`, `font-weight`, `text-decoration`, `position: relative`, `overflow: hidden`, `display: inline-block`, `transform`, `rotate`, `scale`, `opacity`, `object-fit`, `whitespace-nowrap`, or `width: 100%` in `.css`.

---

## 4. Ripple & Button System
* **SyntheticEvent vs nativeEvent Trap:** In React, `e.nativeEvent.currentTarget` is `null`/`document`. If you pass `e.nativeEvent`, `rippleHandler` sees `e.target !== e.currentTarget && isInteractive(e.target)` as `true` on `<button>` / `<a>` and returns immediately before inserting the ripple. ALWAYS pass the React SyntheticEvent `e` (or `{ target: e.currentTarget }`): `rippleHandler(e, { target: e.currentTarget })` from `@t007/utils/hooks/vanilla`.
* **Containment:** Apply `relative` and `overflow-hidden` in JSX via Tailwind to clip ripples within borders.
* **Standard Components:** Use `<Button />` and `<ButtonLink />` from `components/common/Button.tsx` (supports variants, sizes, and `--t007-ripple-color`).
* **Zero Redundant Transitions:** `:where(button, .button)` already defines `transition: all 150ms ease;` globally in `app/overrides.css`. NEVER declare `transition:` on buttons, button variants, or button-like classes in `.css` files.

---

## 5. State, Forms & Theme
* **Reactive State:** `sia-reactor` with `PersistModule({ key: "BABCOCK_VOTES", throttle: 1000 })` in `context/app-store.ts`.
* **Theme:** `<ThemeInitializer />` in `<head>` prevents flicker; sweep animated switching via `radialSweep` (Light spreads outward to cover the page on light transition, and contracts back to a point on dark transition).
* **Forms & Inputs:** Use `Input` and `useFormManager` directly from `@t007/input/react`. Configure styles via `:where(:root, .t007-input-field)`. Prune redundant variables that cascade internally (e.g. `--t007-input-filled-label-color`).

---

## 6. Verification
* **TypeScript:** Verify strictly with `npm run ts-lint` (`tsc --noEmit --incremental`).
* **DO NOT run `next build`** for sanity checks during active development.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
