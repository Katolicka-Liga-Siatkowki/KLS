# Katolicka Liga Siatkówki

Strona KLS: jedna grupa rozgrywek, terminarz, tabela, drużyny i panel zarządu.

## Uruchomienie

Node.js 22.13 lub nowszy. W katalogu kls uruchom `npm ci`, następnie `npm run dev`.

## Cloudflare

Build: `npm run build`
Deploy: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
Root directory: `kls`

Konto i baza KLS są wskazane w wrangler.jsonc. Ustaw sekret ADMIN_PASSWORD przed korzystaniem z panelu zarządu. Wysyłanie formularza kontaktowego wymaga RESEND_API_KEY. KLS_SHEET_ID zostanie ustawiony po przygotowaniu arkusza; identyfikatory zakładek wymagają dopasowania do jego struktury.
