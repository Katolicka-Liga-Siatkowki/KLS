# Turniej siatkówki — Cloudflare Workers

Osobna aplikacja turniejowa, Worker **kls-turniej** i baza **kls-turniej-db**. Katalog `kls/` i istniejąca strona ligi nie są zmieniane. Nowa baza jest pusta: migracje zawierają tylko schemat; żadne drużyny, wyniki ani MVP testowe nie są importowane z prywatnego Sites.

## Pierwsze wdrożenie przez GitHub w Cloudflare

W **Workers & Pages → Create application → Import a repository** wybierz repozytorium `Katolicka-Liga-Siatkowki/KLS`, gałąź `main` i nowy projekt Workers o nazwie **kls-turniej**. Ustaw:

| Pole | Wartość |
| --- | --- |
| Root directory | `turniej` |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Node.js | `22` lub nowszy |

Cloudflare instaluje zależności z package-lock (`npm ci`). W nowym projekcie ustaw jako **sekrety** (nie dodawaj ich do GitHuba):

- `ADMIN_PASSWORD` — prywatne hasło organizatora, co najmniej 12 znaków.
- `REFEREE_PASSWORD` — inne hasło dla sędziów, co najmniej 12 znaków; opcjonalne do czasu zaproszenia sędziów.

Adres organizatora `INITIAL_ADMIN_EMAIL` domyślnie wynosi `katolickaligasiatkowki@gmail.com`. Zmień go w `wrangler.json`, jeżeli organizator ma używać innego adresu. Hasło organizatora nigdy nie powinno być udostępniane sędziom. Zmiana `ADMIN_PASSWORD` unieważnia wszystkie sesje. Sędziowie korzystają z osobnego wspólnego hasła i adresów wpisanych przez organizatora w panelu zawodów; usunięcie adresu natychmiast odbiera dostęp. Jeśli hasła sędziów nie ustawiono, ich logowanie pozostaje wyłączone.

Skrypt `npm run deploy` odnajduje lub tworzy **wyłącznie bazę kls-turniej-db**, wpisuje jej prawdziwy identyfikator do konfiguracji w katalogu roboczym buildu, stosuje migracje, buduje aplikację i publikuje Workera **kls-turniej**. Token używany przez Cloudflare Builds musi mieć uprawnienia edycji Workers i D1 na koncie wskazanym w konfiguracji. Baza `kls-db` używana przez ligę pozostaje bez zmian. Nie używaj tego deploy command w istniejącym projekcie `kls`.

Jeśli pierwsze wdrożenie utworzy projekt przed dodaniem sekretów, podgląd publiczny pozostanie dostępny, a logowanie będzie zablokowane. Dodaj sekrety w **Settings → Variables and Secrets**, następnie uruchom ponowne wdrożenie. Nie ma domyślnego hasła.

## Obsługa

Otwórz adres podany przez Cloudflare po wdrożeniu. Podgląd tabel, wyników i MVP jest publiczny. Wejdź w `/login`, zaloguj się jako organizator i kliknij **Utwórz turniej**. Tylko skonfigurowany organizator może zainicjalizować bazę; anonimowy użytkownik nie może przejąć turnieju. Dodaj prawdziwe drużyny i zawodników, przypisz ich do liter oraz ustaw i zatwierdź punktację. Sędziowie logują się własnym dozwolonym adresem e-mail oraz hasłem sędziowskim.

Sesje są podpisane HMAC-SHA256 i zapisane w ciasteczku HttpOnly/Secure/SameSite=Lax, ważnym 24 godziny. Aplikacja ignoruje nagłówki tożsamości ChatGPT — nie są mechanizmem logowania na własnym Workerze. Wprowadzono limit nieudanych prób logowania i sprawdzanie origin dla zapisów.

## Lokalnie

`npm ci`, następnie `npx wrangler d1 migrations apply DB --local`. W ignorowanym pliku `.dev.vars` ustaw lokalne hasła testowe i uruchom `npm run dev`. Ciasteczko jest Secure, więc do logowania przez przeglądarkę użyj podglądu HTTPS.

`npm run check` sprawdza TypeScript i testy. `npm run build` buduje aplikację. `npm run deploy` działa z poświadczeniami Cloudflare skonfigurowanymi przez CLI lub środowisko buildu.
