# Contributing

Contributions that improve reproducibility, documentation, accessibility, or the analysis are welcome.

## Local Checks

Run these before opening a pull request:

```bash
npm ci
npm run build:data
npm run geocode:data
npm run test:data
npm run build
npm run check:private-refs
```

The data and geocoding builds should be deterministic with the pinned sources and Census cache. If your change updates source inputs, document the source snapshot, reconciliation, map coverage, and why it changed. Do not force unmatched addresses onto nearby roads. See `packages/data/source/SOURCE-NOTES.md`.

## Data And Secrets

- Do not add private bucket URLs, local absolute paths, credentials, or personal API keys.
- Keep raw source data in `packages/data/source/` and served source downloads in `apps/web/public/data/source/`.
- Use a Protomaps key restricted by CORS for local testing or deployment.

## Pull Requests

Please include:

- what changed
- why it changed
- commands used to validate the change
- any data-source assumptions or methodology changes
