# Component artwork

The canvas uses original, local SVG artwork in `frontend/src/ComponentIllustration.tsx`, guided by the user's component references. The same artwork appears in the palette. It renders at the canvas zoom level without raster blur, external image requests, baked checkerboard backgrounds or placeholder rectangles.

- Client: monitor and browser window.
- Application: three-layer isometric server stack.
- Load balancer: routing appliance branching to three downstream servers, with the NGINX mark.
- Redis cache: recognizable red layered cache symbol.
- PostgreSQL / MySQL: three-tier database cylinders with the corresponding product marks.
- MongoDB: a document-store cylinder with the leaf mark.
- RabbitMQ: queued message envelopes and the RabbitMQ mark.
- Celery worker: processing server stack with the Celery mark.

Product glyphs are bundled from the pinned `simple-icons` package; see [Simple Icons](https://github.com/simple-icons/simple-icons). Trademarks remain their owners' property. The neutral/teal application chrome is separate from the semantic colors of the illustrations.

`componentMetrics.ts` derives hover/focus details from the active server-provided lesson definition and current component configuration. There are no invented memory values, throughput benchmarks or runtime measurements. Tooltips identify synthetic model values and explain that evaluation only credits valid connected paths. Escape dismisses a tooltip. The inspector remains the editable source of configuration on pointer and touch devices.
