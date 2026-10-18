# Adding or changing lessons

1. Author a complete definition in `core/lessons.py`: slug, title, difficulty, summary, prompt, explicit topology restrictions, assumptions, model parameters and ordered stable rule IDs.
2. Add independent rule functions to `core/evaluator.py` and register them in `RULES`. Every outcome must explain expected condition, observed evidence/calculation, a practical hint and related IDs. Use operation-specific paths rooted in the client/application. Isolated resource counts are not evidence of useful capacity.
3. Keep catalog configuration in `core/catalog.py`. Never take capacities, hit-ratio assumptions or scoring weights from a request. Expose only configuration with a lesson role. New semantic types require documented supported connections and useful rules; visual-only filler components are not included.
4. Bump the catalog/model/evaluator versions when changing their meaning. Existing submissions retain their original version. Before supporting multiple live versions, retain evaluators/catalogs keyed by version; the current worker refuses an unsupported evaluator version rather than silently regrading under new code.
5. Update `seed.py` to create a new numbered ChallengeVersion and change the Challenge current-version pointer. Never edit a prior version. Seed currently installs version 2 (using the catalog version as its lesson-version number for this additive release) and explicitly errors if its frozen contents differ.
6. Add passing fixtures **only in tests**, including allowed alternative technology implementations. Add a failing case for every rule, disconnected paths, invalid configs and boundary calculations. Verify repeated results are deterministic and earlier snapshots remain unchanged after edits.
7. Run isolated/API/PostgreSQL/live/browser tests from README. Only then make the new version current. Consider migration handling for incompatible saved drafts.

## Existing lessons

| Lesson | Topology restriction | Core calculation |
| --- | --- | --- |
| URL shortener | Exactly one client/application; request path must include a load balancer; read and write the same persistent database | `(instances − 1) × 1000 ≥ 1500` |
| Notification service | Exactly one client/application/queue/worker; connected publish/consume chain; acknowledged processing to persistent storage | `capacity = instances × 100; backlog = max(0, (500 − capacity) × 60); backlog / capacity ≤ 120` |
| Product catalog | Exactly one client/application/cache/database; read cache and read/write database | `instances × 2000 ≥ 10100; 10000 × (1 − hit_ratio) + 100 ≤ 2000` |

Cache ratios are 0.5 / 0.8 / 0.9 for 128 / 256 / 512 MB in the product-catalog dataset only. URL shortener excludes database/load-balancer/network failure. Notification excludes API/database bottlenecks and assumes sufficient queue storage. Catalog excludes cache failure and invalidation correctness. Persistence/durability/acknowledgment are simplified teaching settings, not guarantees about deployed products.

Catalog v2 adds technology choices without changing v1 semantics or configuration. The editor can reopen v1 snapshots and drafts; saving uses catalog v2 with the existing draft revision. Existing submissions and results stay immutable. Future incompatible catalog changes need explicit migration.
