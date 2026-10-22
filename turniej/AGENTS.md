# Tournament Cloudflare app

Deploy this directory as the separate Worker `kls-turniej`, with the separate D1 database `kls-turniej-db`. Preserve the existing `../kls/` application and its deployment configuration. Never import the private Sites database or test dataset into this public deployment. Tests may use fixture functions; production has no data-seeding endpoint.

Organizer and referee passwords are Cloudflare secrets. Do not commit credentials or local `.dev.vars`, `.wrangler`, or node_modules. Do not trust ChatGPT identity headers on this standalone Worker. Preserve role checks and signed session verification.
