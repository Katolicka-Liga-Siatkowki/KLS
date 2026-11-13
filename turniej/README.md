# Turniej siatkówki — Cloudflare Workers

Osobna aplikacja turniejowa, Worker **kls-turniej** i baza **kls-turniej-db**. Katalog `kls/` i istniejąca strona ligi nie są zmieniane. Nowa baza jest pusta: migracje zawierają tylko schemat; żadne drużyny, wyniki ani MVP testowe nie są importowane z prywatnego Sites.

## Automatyczne wdrożenie przez GitHub Actions

Workflow `.github/workflows/deploy-turniej.yml` publikuje nowy Worker po zmianach w katalogu `turniej/` na gałęzi `main`. Można też wybrać **Actions → Deploy tournament to Cloudflare → Run workflow**.

W **Settings → Secrets and variables → Actions** skonfiguruj sekrety:

- `CLOUDFLARE_API_TOKEN` — token konta KLS z uprawnieniami Workers Scripts Edit i D1 Edit.
- `ADMIN_PASSWORD` — prywatne hasło organizatora, minimum 12 znaków.
- `REFEREE_PASSWORD` — osobne hasło sędziów, minimum 12 znaków; opcjonalne do czasu zaproszenia sędziów.

Token nie jest wypisywany ani zapisywany w repozytorium. Workflow sprawdza kod, tworzy osobną bazę, stosuje migracje i przed publikacją sprawdza, że w bazie nie ma drużyn oznaczonych jako testowe. Następnie publikuje aplikację, ustawia dostępne hasła jako sekrety Cloudflare i sprawdza publiczny odczyt oraz blokadę anonimowej edycji. Publiczny adres jest zapisywany w podsumowaniu uruchomienia i artefakcie `tournament-public-url`.

Jeśli na pierwszym wdrożeniu nie ma `ADMIN_PASSWORD`, strona jest dostępna do odczytu, a logowanie jest zablokowane. Dodaj sekret i uruchom workflow ponownie. Brak opcjonalnego sekretu w GitHubie nie kasuje już ustawionego sekretu Cloudflare.

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

## Zgłoszenia i checklista pomocy

Publiczne zakładki „Zgłoszenia do turnieju” i „Checklista pomocy” są dostępne dla gości. Formularz przyjmuje nazwę drużyny, e-mail i telefon kapitana oraz plik ze składem do 10 MB. Kontakt i plik są dostępne wyłącznie organizatorowi; przycisk „Zatwierdź drużynę” dodaje zespół do rozgrywek (lub łączy z wybranym istniejącym zespołem). Zawodników można wkleić przy zatwierdzaniu lub uzupełnić później przed rozpoczęciem meczu. Pliki są przechowywane w oddzielnej tabeli D1 i pobierane przez chroniony endpoint.

Po zgłoszeniu przeglądarka zapisuje prywatny kod pozwalający zarządzać deklaracjami tej drużyny; kod można skopiować i wprowadzić na innym urządzeniu. Nie daje on dostępu do kontaktów ani plików. Publiczne deklaracje zawierają jedynie nazwę zespołu, produkt, liczbę sztuk i status dostarczenia. Lista potrzeb pochodzi z przekazanego dokumentu „Lista produktów.docx”; cele i orientacyjne ceny są w `lib/support-items.ts`.

Nowy turniej atomowo archiwizuje poprzednie zgłoszenia i deklaracje oraz rozpoczyna nową listę. Organizator ma odczyt archiwalnych zgłoszeń i checklisty w historii turnieju. Tryb testowy przeglądarki nie zapisuje danych tych zakładek.

## Powiadomienia o zgłoszeniach do zarządu WPLS

Odbiorca jest ustalony w kodzie: `zarzad.wpls@gmail.com`. Po zapisie zgłoszenia system próbuje wysłać kontakt kapitana, nazwę drużyny i chroniony link do pliku. Duże pliki nie są załączane do maila. Przy braku usługi lub błędzie zgłoszenie pozostaje zapisane ze statusem oczekującego/błędnego powiadomienia; organizator może ponowić wysyłkę.

Wybierz jedną usługę:

- Google: utwórz osobny Apps Script z `google-apps-script/RegistrationMail.gs`, ustaw we właściwościach skryptu `TOURNEY_MAIL_SECRET` (losowe minimum 32 znaki), wdróż jako aplikację internetową działającą jako właściciel z dostępem „Każdy”. W sekretach GitHub dodaj `TOURNAMENT_GOOGLE_MAIL_URL` (adres `/exec`) i `TOURNAMENT_GOOGLE_MAIL_SECRET` (taka sama wartość jak w skrypcie), następnie uruchom wdrożenie. Ten skrypt wysyła wyłącznie do zarządu WPLS i nie zastępuje istniejącego skryptu strony KLS.
- Resend: ustaw sekrety GitHub `RESEND_API_KEY` i `REGISTRATION_MAIL_FROM` (adres nadawcy zweryfikowany w Resend), następnie uruchom wdrożenie. Jeśli obie usługi są skonfigurowane, używany jest dedykowany skrypt Google.

Sekretów nie wpisuj do plików repozytorium ani czatu. Powiadomienia nie są wysyłane w testach — testy korzystają z atrap usług.

Pliki do 10 MB są przechowywane w fragmentach po 512 KB, aby nie przekraczać limitu pojedynczego wiersza D1. Wcześniejsze pliki pozostają dostępne. Zatwierdzanie i dodawanie drużyny oraz jej późniejsze usunięcie wraz z oznaczeniem rezygnacji odbywa się atomowo i zachowuje zgłoszenie. Drużyn przypisanych do rozpoczętych rozgrywek nie można kasować.
