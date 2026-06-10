# Project Guidelines

## Code Style
- Use TypeScript with strict typing and explicit interfaces for UI/domain models.
- Follow existing App Router patterns in `app/` and component composition in `components/`.
- Reuse shadcn/ui primitives from `components/ui/` before creating custom UI controls.
- Use `cn` from `lib/utils.ts` for class merging.
- Keep components focused and split large views into small presentational blocks.

## Architecture
- This is a frontend-first prototype for a gaming webapp (QCoop) focused on game matching and recommendations.
- Current entry point is `app/page.tsx`, which switches between three landing designs using `components/design-selector.tsx`.
- Theme tokens are defined in `app/globals.css` and switched with `data-theme` on `<html>`.
- Treat current Steam/Epic interactions in landing components as UI mocks unless a route/API explicitly exists.

## Build and Test
- Install dependencies: `pnpm install`
- Run development server: `pnpm dev`
- Build production bundle: `pnpm build`
- Start production server: `pnpm start`
- Lint script exists as `pnpm lint`, but verify ESLint configuration before relying on it.
- No test runner is configured yet; if adding logic-heavy features, add tests with the feature.

## Conventions
- Product direction: browser-first UX, quick hop-in, no mandatory install.
- Support two onboarding paths in UI flows:
  - Link Steam/Epic account.
  - Import game list without registration.
- Keep feature work aligned with core MVP outcomes:
  - Cross-friend game matching.
  - Price/specs/platform/player count visibility.
  - Ratings/reviews surface.
  - Profile-based recommendations.
- Prefer incremental, reviewable changes over large rewrites.

## Safety and Secrets
- Never hardcode secrets in source files.
- Keep API keys only in local env files and avoid printing secret values in logs or responses.
- Prefer server-side handling for third-party API secrets when implementing integrations.
