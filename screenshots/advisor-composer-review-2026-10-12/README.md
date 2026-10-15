# Gold Advisor composer and scroll review — 2026-10-12

Local-only designer review evidence for the composer zoom regression and conversation scroll affordance.

## Changes under review

- Removed the `sm:text-sm` override from the Advisor input. The composer keeps `text-base` (16px) at mobile, tablet, and wider breakpoints, avoiding iOS Safari's automatic input zoom for sub-16px controls.
- Made the conversation scroll cue easier to see: the WebKit scrollbar is 14px wide with a larger, higher-contrast gold thumb; the overlaid position indicator is 16px wide with an 8px gold thumb and a more visible track.
- Preserved the previously approved visual-viewport anchoring, keyboard-safe bottom padding, page scroll lock, contained message-pane scrolling, and drag behavior limited to the handle.

## Screenshots

- `advisor-iphone-webkit-scroll.png` — phone-sized 390×844 CSS-pixel WebKit view (2× capture), showing the more visible scroll cue. The review-only sample messages were injected in-memory to create overflow.
- `advisor-iphone-webkit-keyboard.png` — 390×460 CSS-pixel keyboard-open simulation (2× capture), with the composer focused.
- `advisor-desktop-webkit-scroll.png` — 1440×960 desktop WebKit view showing the scroll cue and contained conversation pane.
- `browser-check-results.json` — measured browser results from the checks below.

## Verification

- Computed composer font size was **16px** at 375, 390, 640, and 768 CSS pixels in WebKit.
- On the phone-sized view, the sheet's top and bottom remained unchanged while text was entered after the opening spring settled.
- Simulated a focused keyboard viewport of 390×460 with a 16px visual-viewport top offset. The sheet followed the visible viewport, retained focus, used keyboard-only bottom padding, and did not move while typing. Restoring the viewport restored safe-area padding; a zoomed visual viewport was not mistaken for a keyboard resize.
- On phone, the conversation pane scrolled independently (`scrollTop` 300) while the background remained at `scrollY = 0`. On desktop, wheel input scrolled the conversation pane while the background remained fixed.
- Confirmed `overflow-y: auto`, `touch-action: pan-y pinch-zoom`, contained vertical overscroll, and a 14px WebKit scrollbar. Drag-to-dismiss remains restricted to the handle (`touch-action: none`). No WebKit page runtime errors.
- Complete Vitest suite: **16 tests passed**. Focused Advisor test: **6 tests passed**. Changed-file ESLint, TypeScript no-emit check, and production build passed.
- Repository-wide ESLint still reports three existing errors in unrelated `src/components/ui/command.tsx`, `src/components/ui/textarea.tsx`, and `tailwind.config.ts`; these were not changed.

## Scope and limitations

- Browser checks used headless WebKit 26.0 with phone-sized emulation and a controlled `visualViewport` resize. The keyboard screenshot is a simulation, not a physical iPhone keyboard or on-device Safari run.
- Review-only message samples were added only to the rendered page for screenshot/overflow checks; no conversation data was saved.
- A temporary local harness was used and removed. No hosted Vercel, GitHub, or Supabase version was accessed or changed.
