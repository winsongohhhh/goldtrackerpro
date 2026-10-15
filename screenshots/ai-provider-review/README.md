# AI Provider UI review captures — 2026-10-14

All screenshots are 1280 × 900 local UI renders:

- `01-empty-not-configured.png` — empty key form, disabled Test/Save actions, and explicit no-default-fallback messaging.
- `02-saved-fixture-only.png` — configured-card layout with fixture-only display text `Key saved · ••••DUMMY` beside Change/Remove.
- `03-advisor-active-provider-model.png` — Advisor header showing mocked `Anthropic · claude-sonnet-5-5` metadata.

Capture isolation: provider-status responses were supplied by a local mock; no real credentials were entered. The dummy marker was injected into the rendered DOM for this screenshot only; it is not an actual key and was not added to application state, browser storage, or any backend. Browser storage writes were intercepted before persistence; local and session storage remained empty. No hosted service was changed, no migration was applied, and nothing was deployed.
