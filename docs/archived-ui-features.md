# Archived UI Features Reference

This document captures distinctive features from archived landing variants to selectively reuse in the active Cyber Neon experience.

## Minimal UI (archived-ui/landing-minimal.tsx)
- Strong information hierarchy with calm spacing and editorial layout.
- "How it works" 3-step onboarding section (clear product explanation).
- Platform selection chips with multi-select interaction.
- Matching table/card structure focused on practical comparison:
  - players
  - price
  - ownership match count
- Straightforward CTA section for conversion-focused messaging.

Potential reuse in Cyber Neon:
- 3-step onboarding block for early user comprehension.
- Compact match list layout for scan speed.
- Platform filter chips for pre-match constraints.

## Glass UI (archived-ui/landing-glass.tsx)
- Strong visual identity with gradient orbs and glassmorphism depth.
- Tabbed connect/import card for dual onboarding modes.
- Bento-style feature grid with mixed card density.
- "Trending now" micro-panel concept for dynamic discovery.
- Social proof section with review cards.

Potential reuse in Cyber Neon:
- Tabbed connect/import pattern (can replace current toggle buttons).
- Bento grid structure for high-density feature storytelling.
- Trending panel concept for recommendation highlights.
- Review/social-proof block near final CTA.

## Design Selector (archived-ui/design-selector.tsx)
- Runtime theme switcher between design directions.
- Visual option cards with icon + short description.

Potential reuse in future:
- Internal design preview mode for team reviews.
- A/B prototype testing environment without changing routes.

## Archive Policy
- Archived files are intentionally not imported from the active app entrypoint.
- Reuse should be done by extracting sections/components into shared modules, not by restoring full archived pages.
