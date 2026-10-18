# Failover — MVP Development Brief

## Instructions to Codex

Build the application described below from scratch in an empty project directory.
There is no starting repository or codebase to rely on. Create
all required source code, configuration, infrastructure, documentation, and tests.
This is an implementation request: proceed beyond planning to runnable software.

Use React and TypeScript with Vite for the frontend, and Django/Python for the
backend. The local application must work without
cloud accounts or credentials. Do not provision paid services or deploy publicly.

Make reasonable implementation decisions and document assumptions. Ask for input
only when a missing decision blocks progress. If the destination unexpectedly
contains files, preserve unrelated work rather than overwriting it. Do not print
secrets. Implement in working increments and verify each milestone.

## 1. Product concept

Failover is a visual system design practice platform inspired by the
component palette of draw.io and the problem-solving workflow of LeetCode.

Users choose a challenge, read its requirements, drag technologies and infrastructure
components onto a canvas, connect and configure them, and submit their architecture.
The platform evaluates the design against explicit constraints and explains which
requirements pass or fail, why they fail, and how the learner can improve.

Core learning loop:
Read -> assemble -> configure -> submit -> understand feedback -> revise -> pass.

Target users: students and junior developers learning system design fundamentals.
Multiple designs may pass. Evaluate requirements and meaningful connections, not
whether a diagram matches a single reference solution.

## 2. Scope

Required MVP features:
- Three seeded challenges with clear prompts, constraints, and model assumptions.
- A component palette and interactive architecture canvas.
- Directed, labeled connections and a component configuration inspector.
- Save and restore drafts, including positions, viewport, and configuration.
- Asynchronous evaluation with visible submission status.
- Rule-by-rule results, useful hints, and a transparent score.
- Submission history and reopening a submission as a new editable draft.
- A complete local Docker setup, meaningful tests, and setup documentation.

Out of scope:
- User accounts, payments, leaderboards, public profiles, and social features.
- Videos, a course marketplace, AI grading, and AI chat assistants.
- Multiplayer editing, arbitrary custom components, and user-authored challenges.
- Running learner code or deploying the learner's architecture.
- Real load testing, precise latency forecasts, and real cloud cost estimates.
- A general-purpose distributed systems simulator.

Use a visibly labeled single-user local demo mode. Bind published services to
localhost by default. Authentication and authorization are future requirements
before hosting this application publicly.

## 3. Stack and responsibilities

- React + TypeScript + Vite: frontend application.
- React Router: navigation between catalog and challenge workspaces.
- Tailwind CSS and reusable UI components: consistent styling and accessibility.
- React Flow (@xyflow/react): node-based architecture editor.
- Django + Django REST Framework: authoritative API, validation, and persistence.
- Python: deterministic evaluation logic and background jobs.
- PostgreSQL: challenges, immutable challenge versions, submissions, and results.
- MongoDB: mutable editor drafts with graph layout and viewport state.
- RabbitMQ: asynchronous evaluation job broker.
- Celery: Python evaluation workers.
- Redis: bounded caching of the component catalog and challenge list.
- Docker Compose: local services and persistent data volumes.
- AWS: a documented future deployment plan; no cloud deployment in this MVP.

Use a Django modular monolith plus a worker, not separate business microservices.
The evaluator should be a pure Python module testable without external services.
PostgreSQL is the authoritative source for submission status/results; a separate
Celery result backend is unnecessary. Redis failure must not break correctness.

Keep data ownership simple: MongoDB holds editable drafts; PostgreSQL holds
immutable submitted snapshots. Submission should accept the graph directly and
must not depend on a successful draft save or a distributed transaction.

Suggested structure:

frontend/           React, TypeScript, Vite, UI, browser tests
backend/            Django API, evaluation rules, Celery tasks, tests, migrations
docs/               Architecture, challenge authoring, future AWS deployment
compose.yaml        Local service definitions
.env.example        Documented local configuration without real secrets
.gitignore          Ignore secrets, generated files, caches, and local data
README.md           Actual setup, usage, architecture, test, and troubleshooting instructions

Check current compatible dependency APIs during implementation, select explicit
versions, and commit appropriate lockfiles. Use a Vite API proxy in development
and a same-origin reverse proxy for the containerized frontend. Configure frontend
hosting so refreshing a client-side route serves index.html correctly.

## 4. User experience

Challenge catalog:
- Show title, difficulty, short description, and completion status.
- Open a challenge or resume its saved draft.
- Provide loading, empty, and API error states.

Challenge workspace:
- Left panel: problem statement, constraints, assumptions, component palette.
- Center: large canvas with a subtle grid, clear nodes, and directed edges.
- Right panel: selected component configuration and explanation of its purpose.
- Bottom/collapsible panel: results and submission history.
- Toolbar: Save draft, Submit, Reset, zoom, and fit-to-view controls.
- Show unsaved changes and save/submission status.
- Confirm Reset when it would discard work.
- Support click-to-add in addition to dragging, and node/edge deletion.
- Give each connection a visible operation label.
- Keep controls keyboard accessible with useful focus styles and contrast.
- Make panels collapsible on narrow screens; explain that canvas editing is best
  on a larger display while keeping prompts and results readable.

Explicit saving is sufficient; autosave and undo/redo are optional later work.
Keep feedback helpful and specific. Example: "After one application instance
fails, your remaining capacity is 1,000 requests/second; this challenge requires
1,500. Increase the application instance count."

Submission flow:
1. Validate the graph locally for quick feedback.
2. Send it to Django for authoritative schema/configuration validation.
3. Persist an immutable graph and challenge version in PostgreSQL.
4. Dispatch evaluation after the database transaction commits.
5. Display pending/running/passed/failed/error states while polling the API.
6. Display results associated with that specific submission, even if the learner
   continues editing the current draft.

## 5. Components and graph contract

Provide eight component types:
1. Client
2. Load balancer
3. Application service
4. Cache — Redis
5. Relational databases
6. Non-relational databases
7. Message queues
8. Background worker

And any other components that are commonly asked in a system design interview. The 
components should be legit in the sense that they use real database logos and actually 
look like the component (e.g. a database looks like the 3 disks database)

Separate semantic type from technology label. If a challenge only requires
persistent storage, either database should be accepted when configured correctly.
Technology-specific requirements must be explicitly stated in the prompt.

Server-owned, versioned catalog entries define allowed configuration, defaults,
bounds, compatible connections, and descriptions. Never trust client-provided
capacities, scoring rules, or arbitrary configuration fields.

Graph schema:
- schemaVersion
- nodes: id, type, technology, label, position, configuration
- edges: id, source, target, operation
- Drafts also contain viewport and catalog version.

Operation labels: request, read, write, publish, consume.
The consume edge is queue -> worker and represents message delivery.

Supported connections:
- Client -> application, or client -> load balancer -> application: request.
- Application -> cache: read.
- Application -> database: read and/or write.
- Application -> queue: publish.
- Queue -> worker: consume.
- Worker -> database: write.

Allow separate read/write edges between the same endpoints. Reject exact duplicate
edges, self-loops, missing endpoints, unsupported connections, and cycles. This
teaching graph models one-way flow and omits response arrows. Limit graphs to
50 nodes and 100 edges; also bound text lengths and request payload sizes.

Configuration:
- Application instances: integer 1–10.
- Worker instances: integer 1–10.
- Cache memory: challenge-supported sizes.
- Queue durable: boolean.
- Worker acknowledges after successful processing: boolean.
- Database persistent storage: boolean, default true.

Show effective defaults in the inspector. Persistence and durability settings are
educational simplifications, not promises about every real-world deployment.
Only expose settings that affect a lesson or a grading rule.

## 6. Evaluation and scoring

Implement independent rule functions with stable IDs. Each result includes:
- ruleId, title, required, passed/failed
- Expected condition and observed evidence
- Explanation and practical hint
- Related node and edge IDs

Evaluate operation-specific connected paths. Isolated components must never
satisfy a requirement simply because they appear on the canvas.

Invalid graphs produce validation errors before queueing. A structurally valid
design that misses requirements receives normal failed results. Infrastructure
or evaluator errors receive error status, not a learner failure.

Score = round(100 * passed required checks / total required checks).
Pass only when all required checks pass. Optional teaching observations do not
change the score. Compute overall pass from rule outcomes, not a rounded score.

All performance values below are synthetic lesson constants. Display assumptions
and calculations clearly. Do not invent latency measurements or dollar estimates.
A passing submission means it satisfies this lesson's model, not that the design
is certified for production.

## 7. Seeded challenges

### A. URL shortener — Easy

Prompt: Design a service that creates short links and redirects users. Preserve
links through application restarts and handle 1,500 requests/second after one
application instance fails.

Model:
- One application instance handles 1,000 requests/second.
- One application node represents one homogeneous service tier.
- Only application-instance failure is modeled. Database capacity and failure,
  load balancer failure, and network failure are outside this challenge's scope.

Required checks:
- Exactly one client and one application tier.
- A valid client -> load balancer -> application request path.
- Application has read and write paths to the same persistent database.
- Surviving capacity: (application instances - 1) * 1,000 >= 1,500.

Passing test fixture: client -> load balancer -> application with 3 instances;
application has read and write edges to a persistent database.

### B. Asynchronous notification service — Medium

Prompt: Accept notification jobs for background processing. Absorb a burst of
500 jobs/second for 60 seconds, retain queued jobs through a queue restart, and
clear the backlog within 120 seconds after the burst ends.

Model:
- Each worker instance processes 100 jobs/second, including during the burst.
- No new jobs arrive after the burst ends.
- Queue storage is sufficient; API/database capacity is outside this model.
- worker_capacity = instances * 100.
- backlog = max(0, (500 - worker_capacity) * 60).
- drain_seconds = backlog / worker_capacity.
- Zero workers is invalid.

Required checks:
- Exactly one client, application tier, queue, and worker tier.
- A valid client request path reaches the application.
- Application -> queue -> worker is connected with publish/consume edges.
- Queue is durable.
- Worker acknowledges after successful processing and writes results to a
  persistent database.
- Computed drain time is <= 120 seconds.

Passing test fixture: client -> application -> durable queue -> worker with
2 instances and acknowledgment-after-processing enabled -> persistent database.

Explain that these checks teach asynchronous processing and acknowledgment;
they do not prove exactly-once delivery or complete real-world durability.

### C. Read-heavy product catalog — Medium

Prompt: Serve 10,000 product reads/second and 100 writes/second. Use caching to
keep database demand within capacity while retaining persistent product data.

Model:
- One application instance supports 2,000 requests/second.
- The database supports 2,000 total read/write operations/second.
- For this fixed dataset only, cache sizes 128/256/512 MB imply assumed hit
  ratios of 50%/80%/90%. These are synthetic, challenge-specific constants.
- A connected cache models cache-aside behavior; application -> database read
  edges represent cache misses. Writes go to the database.
- Cache capacity is sufficient. Cache failure and invalidation correctness are
  follow-up teaching topics outside the graded model.

Required checks:
- Exactly one client, application tier, cache, and database.
- A valid client request path reaches the application.
- Application has a cache read edge and database read/write edges.
- Database uses persistent storage.
- Application capacity: instances * 2,000 >= 10,100.
- Database load: 10,000 * (1 - assumed hit ratio) + 100 <= 2,000.

Passing test fixture: client -> application with 6 instances; application reads
Redis with 512 MB and has read/write edges to a persistent database.

For every challenge, disclose exact topology restrictions and assumptions in the
prompt. Unrelated nodes cannot contribute capacity or satisfy required paths.
Keep passing fixtures in tests, not prepopulated in the learner's canvas.

## 8. Data and API

PostgreSQL:
- Challenge: slug, title, difficulty, current version.
- ChallengeVersion: immutable prompt, constraints, catalog/model version,
  rule definitions, and evaluation parameters.
- Submission: UUID, challenge version, immutable graph JSON, status, timestamps,
  evaluator version, structured results, and safe error category.

MongoDB:
- One current draft per challenge in local demo mode.
- Store challenge slug, schema/catalog versions, nodes, edges, viewport,
  updatedAt, and revision number.
- Return a conflict for stale revision saves instead of overwriting a newer draft.

API prefix: /api/v1
- GET /components
- GET /challenges
- GET /challenges/{slug}
- GET /challenges/{slug}/draft
- PUT /challenges/{slug}/draft
- POST /challenges/{slug}/submissions
- GET /challenges/{slug}/submissions — paginated
- GET /submissions/{id}
- POST /submissions/{id}/retry — infrastructure failures only
- GET /health/live
- GET /health/ready

Use consistent JSON errors. Creating a submission returns HTTP 202 and its ID.
Include enough lesson parameters in challenge details to reproduce the displayed
calculations. Do not return private test fixtures.

Dispatch jobs after commit, make processing idempotent, and prevent duplicate
deliveries from producing conflicting status/results. Explicitly handle broker
publish failures. Implement bounded recovery for jobs stranded after process
crashes; retry must reuse the same immutable submission snapshot.

Set worker time limits and bounded UI polling. A timeout should display a
recoverable status message. Never substitute a fake success for an unavailable
service. Cache keys must include versions and have TTLs; invalidate relevant
Redis entries after reseeding. Read authoritative data when Redis is unavailable.

## 9. Implementation milestones

1. Core vertical slice
   Scaffold frontend/backend, routing, styling, configuration, and API proxying.
   Implement graph/catalog contracts and Challenge A's pure Python evaluator.
   Connect the canvas and results UI to the real API and PostgreSQL submissions.

2. Complete learning workflow
   Add MongoDB draft persistence, revision handling, and submission history.
   Add Challenges B/C and reopening submissions as new editable drafts.

3. Complete local infrastructure
   Add Celery/RabbitMQ jobs, recovery, and status polling.
   Add Redis caching with fallback.
   Containerize frontend, API, worker, PostgreSQL, MongoDB, Redis, and RabbitMQ.
   Add health checks, named volumes, migrations, and idempotent seeds.

4. Verification and handoff
   Verify grading, persistence, asynchronous behavior, and failure recovery.
   Polish accessibility, loading/error states, and responsive panels.
   Write verified startup/test instructions and future AWS deployment notes.

Maintain a concise progress checklist. Every milestone should leave a working
increment. All required infrastructure must work before claiming the full MVP is
complete; do not stop after a UI prototype or mocked evaluation demo.

## 10. Tests and acceptance criteria

Evaluator tests:
- Passing and failing cases for every required rule.
- Valid alternative database implementations where permitted.
- Disconnected nodes, invalid directions, unknown IDs, cycles, duplicate edges.
- Invalid counts/configuration and client-supplied capacity manipulation.
- Exact capacity/drain-time boundaries.
- Deterministic results for identical graph, challenge, and evaluator versions.

Integration tests:
- Draft round-trip preserves layout/configuration; stale saves return conflicts.
- Draft edits cannot mutate previous submission snapshots/results.
- Queued evaluations produce persisted results retrievable through the API.
- Duplicate job delivery does not produce conflicting evaluations.
- Broker/worker failures produce visible, recoverable states.
- Catalog reads work from authoritative sources when Redis is unavailable.

Browser smoke test:
Open a challenge, add/connect/configure components, submit a failing architecture,
revise it to pass, save, reload, and verify the draft plus submission history.
Exercise the real backend rather than mocked evaluation responses.

Definition of done:
- A new developer can run the documented setup without cloud credentials.
- All three challenges are solvable through the actual UI.
- Results clearly explain evidence and how to improve failed requirements.
- Drafts/history survive service restarts when data volumes are retained.
- Each required technology has its documented working role.
- Frontend build/type checks, backend tests, and browser smoke test pass.
- Any environment blockers and unverified behavior are explicitly reported.
- No essential user journey depends on placeholders or fabricated results.

## 11. Deliverables and operations

Deliver complete source, dependency lockfiles, migrations, seed data, Dockerfiles,
Compose configuration, .env.example, tests, and README.md with copy-pasteable
commands verified against the implementation.

Document prerequisites, startup, migrations/seeding, shutdown, tests, recovery,
data ownership, adding a new challenge, model assumptions, and known limitations.
Publish only required frontend/API ports bound to localhost. Keep database,
Redis, and RabbitMQ ports internal by default. Keep credentials backend-only
and out of Git/browser bundles. Document CORS/CSRF or same-origin proxy behavior.

Include a short future AWS hosting plan. Verify current service capabilities
when writing that plan; distinguish exact MongoDB hosting from compatible
alternatives. Cover authentication, TLS, secrets, backups, and operating needs
as future public-deployment work. Do not create cloud resources.

At completion, report what works, how to run it, which checks actually ran, and
remaining limitations. Keep the product centered on assembling an architecture,
understanding feedback, and improving the design.

## UI & Aesthetic Constraints (Strictly Enforced)

### Colors & Visual Style
- **No default purple/indigo-to-pink gradients** unless explicitly requested by brand guidelines.
- **No decorative sparkles, glowing borders, or arbitrary neon shadows** on standard cards or buttons.
- **Surface palette restraint:** Rely on clean neutral backgrounds, high-contrast text, and a maximum of 1 primary accent color + 1 secondary accent color.
- **Dark mode discipline:** If dark mode is supported, use true dark tones (slate/zinc) rather than unstyled pure-black `#000000` mixed with neon pinks.

### Typography & Hierarchy
- **Strict type scale:** Pick a maximum of 3 font sizes for body/headings and never mix oversized hero text with paper-thin weights unless intentional.
- **Line height:** Maintain consistent `line-height` (e.g., `1.5` for body, `1.2` for headings) and uniform paragraph spacing.
- **No em-dash over-usage** or overly theatrical, hollow marketing copy ("*Supercharge your workflow to the next level*"). Keep UI copy grounded.

### Layout & Components
- **No generic Bento-grid overuse:** Do not default to arbitrary rounded-rectangle cards with icon + 2 lines of text for every layout.
- **Border radius discipline:** Define 1 or 2 canonical `border-radius` values (e.g., `rounded-md` or `rounded-lg`) across the entire app. Do not mix random radii.
- **Icon-to-text sizing:** Ensure icons match the optical weight and height of adjacent text (proportional sizing, max 1.1x text height).
- **No dead/fake UI:** Remove non-functional social icons, placeholder avatars with zero purpose, or decorative-only toggle switches that don’t connect to state.

### Animations & Interactions
- **Subtle physics:** Use intentional easing curves (e.g., `cubic-bezier(0.22, 1, 0.36, 1)`) instead of bouncy, jarring spring defaults.
- **Micro-interactions:** Hover lifts must be subtle (max `2px–4px` translation or opacity shift). No obnoxious multi-color pulse animations.
- **Loading & Empty States:** Always implement real skeleton screens, disabled button states, or spinners for async actions—never leave UI completely static or broken during fetches.