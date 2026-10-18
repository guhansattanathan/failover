# Failover

A local system design practice workbench. Read a challenge, assemble a connected architecture, configure components, submit, and revise using rule-by-rule evidence. The canvas starts empty; there is no reference-diagram matching or AI grading.

## Run locally

Prerequisites: Docker Desktop with the Linux engine running (WSL 2 on Windows), Docker Compose v2, internet for the first image/package download, and approximately 6 GB of available Docker memory. No cloud account is required.

From this directory:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

On macOS/Linux, use `cp .env.example .env` instead. Copy only if you have not already configured `.env`. Defaults work without it. The `init` container migrates PostgreSQL and seeds three immutable lesson versions; an exited (0) init container is expected.

Open [Failover](http://localhost:8080). Only the frontend port is published, bound to `127.0.0.1`. Databases, broker, cache, worker and API remain on the Compose network. Set `FRONTEND_PORT` in `.env` to change the frontend port. The interface visibly identifies single-user local demo mode.

```powershell
docker compose logs --tail=80 init api worker recovery
docker compose stop
docker compose start
docker compose down
```

`stop`, `start`, and `down` retain named volumes. **`docker compose down -v` destroys drafts, lessons, submission history and queued jobs.** Do not use it to fix ordinary startup problems.

## Use the workbench

1. Open a challenge. Its current saved draft loads automatically.
2. Read the exact topology, required checks, and synthetic model assumptions.
3. Open **Components** and click or drag components onto the canvas. The palette has nine component types, each with a technology dropdown and a generic default. Choose PostgreSQL, MySQL, Oracle, RDS, MongoDB, DynamoDB, Cassandra, Redis, Memcached, ElastiCache, RabbitMQ, Kafka, SQS, Celery, Sidekiq, Lambda and other client/application options. Technology can also be changed in the inspector without losing configuration or connections.
4. Components appear as actual diagram symbols: server stacks, database cylinders, Redis layers, a queue, a branching load balancer and a client monitor. Hover or keyboard-focus a symbol to see memory, instances, persistence and lesson-defined throughput. Values outside the lesson model are explicitly labeled unmodeled. Select a node to edit its configuration in the inspector. Application/worker instances scale one homogeneous tier, rather than adding extra tier nodes.
5. Drag a source handle to an input, or use **From / Operation / To → Connect**. Handle tooltips name their operation. Separate database read and write arrows are supported. Consume goes from queue to worker.
6. **Submit design** creates an immutable snapshot. Watch pending/running then passed/failed/error. Editing the current canvas never changes the displayed snapshot's results.
7. **Save draft** stores positions, configuration and viewport. Unsaved changes are shown. Stale saves return a conflict and offer an explicit reload; they never silently overwrite another tab.
8. Open **Submission history** to view earlier results or reopen a snapshot as a new unsaved draft. Select nodes/edges and press Delete, or use the inspector's delete button. Reset confirms before clearing a nonempty canvas.

Mobile panels can collapse; prompts and results remain readable. Architecture editing is best on a desktop display. Touch-only dragging, undo/redo and autosave are not part of this MVP.

## Stack and data ownership

| Layer | Working role |
| --- | --- |
| React / TypeScript / Vite | Catalog, React Router navigation, workspace and status polling |
| Tailwind CSS / reusable components | Neutral, teal-accent UI, focus styles and responsive panels |
| React Flow | Draggable components, operation handles, edges, deletion, zoom and viewport |
| Django / DRF | Authoritative graph validation, API and transactional state transitions |
| PostgreSQL | Challenges, immutable challenge versions, immutable submitted graphs, status/results |
| MongoDB | One mutable revision-controlled draft per challenge |
| RabbitMQ / Celery | Durable job transport and idempotent background evaluation |
| Recovery process | SQL lease recovery even when the broker or worker is unavailable |
| Redis | Optional 60-second catalog/list cache, 32 MB cap, authoritative fallback |
| NGINX | Same-origin `/api` proxy, SPA route fallback, static frontend |

Submission accepts the graph directly, independent of a draft save and MongoDB availability. No distributed transaction is needed. PostgreSQL is the Celery result authority; no separate result backend is configured. See [architecture](docs/architecture.md), [challenge authoring](docs/challenge-authoring.md), and the [future AWS plan](docs/aws-future.md).

## Tests

Run the isolated backend suite inside the built API image:

```powershell
docker compose exec api pytest -q
```

This suite uses a test-only SQLite database, mongomock, and injected broker/cache failures. It exercises real validation, API views, evaluator functions and task state transitions. Production settings always require PostgreSQL; no in-memory grading or persistence fallback exists in the app.

Run the same suite against an isolated PostgreSQL test database (includes database trigger verification):

```powershell
docker compose exec api pytest -q --ds=failover.settings -m "not live"
```

Run live HTTP tests against the real API, MongoDB, broker and worker:

```powershell
docker compose exec -e FAILOVER_LIVE_URL=http://api:8000 api pytest -q -m live
```

Live tests create real submission history and temporarily replace demo drafts. Use a dedicated local demo instance for tests.

After installing the host Python requirements, run the real outage/restart checks from the project root:

```powershell
.venv/Scripts/python.exe scripts/verify_runtime.py
```

This stops and restarts only this Compose project's Redis, RabbitMQ, worker, PostgreSQL and MongoDB, verifies retry/duplicate deliveries and persisted data, then restores the original draft. It advances stale lease timestamps to exercise bounded recovery without an eight-minute wait. Use a dedicated demo instance and keep other tests idle during this command.

For the frontend build and real-backend browser tests, install Node.js 22.12+ (tested with Node 22):

```powershell
cd frontend
npm ci
npm run build
npx playwright install chromium
npm test
cd ..
```

Playwright defaults to `http://127.0.0.1:8080`. Set `FAILOVER_URL` to override. It builds each lesson through real UI controls, checks failed and passing feedback, saves/reloads, checks history and stale revisions, and captures desktop/mobile images. It does not mock evaluation responses. It changes local demo drafts/history.

Optional host-only backend tests:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.lock
cd backend
../.venv/Scripts/python.exe -m pytest -q
cd ..
```

Linux/macOS use `.venv/bin/python`. Python 3.13 is used in Docker. Exact transitive Python versions are in `backend/requirements.lock`; exact npm dependencies and transitive resolutions are in `frontend/package-lock.json`. `requirements.in` records upgrade ranges; application installation uses the lockfile.

## Development

Keep infrastructure containerized and expose the API to Vite only on localhost:

```powershell
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed by the command. Its `/api` proxy defaults to `http://127.0.0.1:8000`; override with `API_PROXY_TARGET`. After backend edits, rebuild the backend services. When changing models, generate a migration and commit it; run `docker compose exec api python manage.py migrate` and `docker compose exec api python manage.py seed` as appropriate. The seed command is idempotent and invalidates relevant Redis entries.

## API

All endpoints are under `/api/v1`, without trailing slashes:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/components` | Versioned server-owned catalog and connection rules |
| GET | `/challenges` | Catalog with current-version completion status |
| GET | `/challenges/{slug}` | Prompt, rules, topology restrictions and lesson parameters |
| GET / PUT | `/challenges/{slug}/draft` | Load / save with revision compare-and-swap |
| GET / POST | `/challenges/{slug}/submissions` | Paginated history / submit graph (202) |
| GET | `/submissions/{uuid}` | Snapshot, status, result evidence |
| POST | `/submissions/{uuid}/retry` | Retry infrastructure errors using the same snapshot (202) |
| GET | `/health/live` | API process liveness |
| GET | `/health/ready` | PostgreSQL, seeds, MongoDB, RabbitMQ readiness |

Submit `{graph, challengeVersion, catalogVersion}`. Save `{graph, viewport, revision, catalogVersion}`. `graph` contains `schemaVersion`, `nodes`, `edges`; new drafts use revision 0. History takes `?page=1`, page size 10. Errors use `{ "error": { "code": "...", "message": "..." } }`; validation messages may be a structured list/object. Invalid graphs return 400 before queueing, stale saves return 409, and unavailable draft storage returns 503. Graphs are bounded to 50 nodes / 100 edges, requests to 128 KiB, labels to 80 characters and IDs to 64.

## Recovery and troubleshooting

- **Engine unavailable:** start Docker Desktop, enable its Linux/WSL 2 engine, then run `docker version`. On this Windows machine the Desktop CLI startup hung; launching Docker Desktop itself resolved it.
- **Startup waits:** first image downloads can take several minutes. Use `docker compose ps` and `docker compose logs init`. A failed migration/seed is visible; the app never substitutes sample responses.
- **Port in use:** choose another `FRONTEND_PORT` in `.env` and recreate the frontend/API with `docker compose up -d`.
- **Draft unavailable/conflict:** current edits stay on screen. Restore MongoDB, then reload the saved draft explicitly. Submit can still operate independently of draft storage.
- **Broker publish failed:** submission becomes `error / broker_unavailable`. Restore RabbitMQ and use Retry evaluation. It reuses the frozen graph, challenge version, and evaluator version.
- **Pending/running after a worker crash:** recovery scans SQL every 15 seconds. Leases expire after 120 seconds, with at most three automatic redispatches. Stale generation tokens cannot write results. Persistent outages become `error / worker_timeout`; restore services and retry. Workers have 20/30-second soft/hard time limits.
- **Polling stops:** the UI stops after two minutes or a network error. The snapshot remains stored; use Refresh status or reopen it in history. Recovery may take roughly eight minutes.
- **Evaluator error:** this is an internal error, not a learner failure. Inspect worker logs; infrastructure retry is intentionally unavailable for this category. Fix the evaluator, then submit a new snapshot.
- **Redis unavailable:** reads fall back to the authoritative catalog/PostgreSQL. Completion is always read fresh from PostgreSQL. Redis is not required for readiness.

Health checks exist for the API, frontend, databases, broker, cache and worker. Recovery is a separate long-running management process with database reconnection and logged failures. `GET /health/ready` checks API dependencies, while the worker's separate Compose health check checks Celery responsiveness.

## Security and limitations

This is a single-user local demo, with no authentication or authorization. Do not expose it publicly. Only localhost is published; no CORS access is enabled. NGINX and Vite provide same-origin API requests. JSON-only unsafe methods and an explicit allowed-origin check reject cross-origin browser writes. There are no authenticated cookies in this mode; real session authentication must add appropriate CSRF enforcement before hosting. `.env` is ignored, credentials remain backend-only, and nothing secret enters Vite bundles.

Lesson capacities/hit ratios are synthetic. No real load tests, latency forecasts, cloud pricing, exactly-once guarantees, or production certification are implied. The catalog is deliberately restricted to operations supported by these lessons; CDN, DNS, object storage and other interview components need authored rules and connection semantics before inclusion. Draft migration between future incompatible catalog versions is not implemented; the UI rejects incompatible drafts/snapshots instead of silently changing them.

The latest actual verification results are in [PROGRESS.md](PROGRESS.md).

Technology choices share the lesson model; they do not simulate product-specific APIs. RDS is a managed service rather than an engine; Kafka and Lambda use the lesson’s simplified queue/worker roles. To connect components, drag a labeled output on the right onto the target artwork or its left input. Separate read/write arrows are supported; invalid directions and duplicates show validation feedback.

CDN options: Generic CDN, Cloudflare, and AWS CloudFront. Connect client → CDN → application/load balancer with request arrows. CDN metrics are explicitly unmodeled; existing lesson capacity requirements remain unchanged.
