# MVP progress

- [x] 1. Core vertical slice: contracts, evaluator, API, editor
- [x] 2. Learning workflow: all lessons, drafts, history, reopening
- [x] 3. Local infrastructure: containers, async jobs, recovery, cache and restart persistence
- [x] 4. Verification and handoff: tests, browser journeys, documentation

## Actual verification

- Frontend TypeScript check and Vite production build: passed on host and in Docker.
- Backend isolated evaluator/API suite: 74 passed; 3 live-only tests intentionally skipped in this mode.
- Same backend suite against an isolated PostgreSQL test database: 74 passed, including immutability triggers.
- Live HTTP → PostgreSQL → RabbitMQ → Celery tests plus Mongo draft/conflict tests: 3 passed (all lessons).
- Real infrastructure checks: Redis outage fallback; broker outage + immutable retry; stopped worker + bounded lease recovery; duplicate deliveries; draft/history persistence across PostgreSQL/Mongo restarts. All 5 passed.
- Chromium browser acceptance: 3 tests passed; all 3 lessons solved via UI; fail/revise/pass, save/reload including viewport, history/reopen, two-tab conflict, connection dragging, hover/focus metrics, Escape dismissal and mobile layout passed.
- Desktop workspace, component-hover and mobile screenshots visually inspected.
- Django system check and migration drift check passed; Docker Compose configuration validates.

## User-requested visual refinement

Replaced canvas cards with original local SVG component illustrations, including server stacks, database cylinders, Redis layers, a message queue, client monitor and branching load balancer. Hover/keyboard tooltips show real configuration and synthetic lesson capacities from server-provided parameters. No unmodeled performance values are invented. Palette previews use the same artwork.

## Resolved issues and remaining limits

- Docker Desktop CLI startup hung on this Windows host; launching Desktop directly resolved it.
- Browser checks found missing explicit select names and hidden mobile save feedback; both fixed.
- Soft worker timeouts now return retryable infrastructure errors, separately from evaluator exceptions.
- Local-only, single-user application; no authentication, public deployment, production simulator or cloud resource provisioning.
- Test history is retained as verification evidence. Browser/live tests leave learner canvases empty.
- Infrastructure verification advances SQL lease timestamps to test bounded recovery quickly; actual worker stops, RabbitMQ deliveries and database restarts are real.

## Technology picker and connection update

- [x] Eight grouped palette entries with generic defaults and product icons; inspector technology switching preserves settings, labels and edges.
- [x] Additive catalog v2 and immutable lesson v2; older drafts/snapshots remain editable through the compatible catalog.
- [x] Larger labeled output handles, artwork drop targets, separate read/write arrows and invalid/duplicate feedback.
- [x] 83 isolated and 83 PostgreSQL tests passed, including all technology variants and version preservation. All five real-browser workflows passed after final dropdown placement polish, including visible Oracle/RDS options near the panel edge. Docker frontend type check/production build passed; screenshot visually inspected.

## CDN addition

- [x] Generic, Cloudflare and AWS CloudFront choices with matching artwork, dropdowns and hover details.
- [x] Versioned request-path support; CDN does not replace the lesson cache or required load balancer.
- [x] 93 isolated backend tests, 93 PostgreSQL tests, Docker production build/type check and all 6 real-browser workflows passed. CDN screenshot visually inspected.

## Approved project branding

- [x] Replaced the shared text and f/ header branding with the approved wordmark; preserved the source PNG in the project.
- [x] Added a matching compact bridge favicon and responsive desktop/mobile sizing.
- [x] Host and Docker production builds passed. Browser checks verified catalog/workspace/not-found branding, home navigation, mobile sizing and favicon delivery; desktop/mobile screenshots inspected.

## Canvas dot grid

- [x] Increased dot visibility while keeping a restrained background; grid follows canvas pan/zoom.
- [x] Added accessible Grid On/Off control with a browser-local preference, default on and safe fallback when storage is unavailable.
- [x] Docker production build/type check and browser verification passed: toggle, reload, cross-lesson preference, keyboard, mobile and no false unsaved changes. Screenshot inspected.

## Landing page redesign

- [x] Removed both header labels; added compact functional navigation on the catalog page.
- [x] Centered headline and CTA above original bridge/server artwork, with interactive offline/restore and packet motion.
- [x] Pause control and reduced-motion support; responsive mobile layout.
- [x] Production builds and browser checks passed: offline/restore, pause, reduced motion, challenge navigation, no horizontal mobile overflow or browser errors. Desktop/mobile screenshots inspected; server-label spacing corrected.
