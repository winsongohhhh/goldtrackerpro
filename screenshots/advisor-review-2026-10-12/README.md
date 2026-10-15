# Advisor UI review — 2026-10-12

Local-only review of the Gold Advisor sheet and conversation pane.

## Screenshots

- `advisor-mobile-webkit-iphone.png` — 390×844 CSS-pixel iPhone-sized WebKit viewport (2× capture).
- `advisor-mobile-webkit-keyboard-viewport.png` — 390×460 CSS-pixel keyboard-open viewport simulation (2× capture), with the composer focused.
- `advisor-mobile-webkit-scroll-indicator.png` — phone-sized WebKit view showing the scroll position cue.
- `advisor-desktop-webkit.png` — 1440×960 desktop WebKit view showing the scroll position cue.

The scroll-indicator screenshots include synthetic **review-only** sample messages injected into the rendered pane to demonstrate overflow; they are not saved conversation data.

## Verification

- Focused composer computed to **16px** at phone width; the viewport meta tag keeps page zoom enabled.
- Resized the focused 390×844 phone viewport to 390×460 and restored it to 390×844. The sheet stayed bottom-anchored to each visible viewport; keyboard-only bottom padding changed for the simulated keyboard and returned to normal safe-area spacing afterward.
- Simulated a zoomed visual viewport while the input remained focused; it did not trigger keyboard-only padding.
- Confirmed the phone conversation pane has vertical scrolling, `pan-y pinch-zoom`, and contained overscroll. Programmatic scrolling moved the pane while the page remained at `scrollY = 0`; the indicator appeared for overflowing content.
- On desktop WebKit, wheel scrolling moved the conversation pane without moving the background page. Drag-to-dismiss remains limited to the handle (`touch-action: none`).
- No WebKit page runtime errors.
- Automated checks: **15 tests passed**; changed-file ESLint and TypeScript checks passed; production build passed.

## Scope and limitation

The protected app route required an authenticated session, so the component was mounted in a temporary local-only harness instead of signing in. The headless phone profile does not expose a physical iOS keyboard or perform a real finger swipe; keyboard appearance was represented by resizing the visual viewport while focus remained on the input. No hosted deployment, GitHub, Vercel, Supabase settings, or account session was changed. The temporary harness was removed after capture.
