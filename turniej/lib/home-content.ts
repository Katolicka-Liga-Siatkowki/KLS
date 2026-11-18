export const DEFAULT_HOME_DESCRIPTION='Zapraszamy na 3. Warszawsko-Praski Turniej Charytatywny pod szyldem Warszawsko-Praskiej Ligi Siatkówki. W zawodach mogą wziąć udział członkowie wspólnot działających przy parafiach diecezji warszawsko-praskiej i archidiecezji warszawskiej oraz ich duszpasterze. To nie tylko sportowa rywalizacja, ale także świetna okazja do integracji, wspólnej zabawy i pomagania!';

export function defaultHomeContent(introduction=DEFAULT_HOME_DESCRIPTION){
 const lead=introduction.replaceAll('Warszawsko-Praskiej Ligi Siatkówki','[Warszawsko-Praskiej Ligi Siatkówki](https://diecezja.waw.pl/warszawsko-praska-liga-siatkowki-wpls/)');
 return `# Gramy razem w dobrej sprawie.

**${lead}**

## Kiedy i gdzie zagramy?

Wydarzenie odbędzie się w sobotę **12 grudnia 2026 r.** na hali widowiskowo-sportowej w Falenicy (ul. Poezji 5, 04-994 Warszawa).

## Jak się zapisać?

Zgłoszenia są przyjmowane aż do skompletowania wymaganej liczby drużyn (maksymalnie **16 zespołów**). Aby turniej się odbył, musi zgłosić się minimalnie **12 zespołów**.

**Termin zgłoszeń: do 9 grudnia lub do wyczerpania limitu miejsc.**

Pierwszym krokiem jest wypełnienie [zgłoszenia](/zgloszenia). Następnie czekaj na wiadomość mailową potwierdzającą udział oraz dalsze instrukcje.

## Wpisowe

Opłata wpisowa to wpłata na cele organizacyjne turnieju w kwocie **320 zł od drużyny**, przelana na konto Katolickiego Stowarzyszenia Młodzieży Diecezji Warszawsko-Praskiej **58 1870 1045 2078 1072 1222 0003**, zgodnie z instrukcją otrzymaną w mailu zwrotnym potwierdzającym udział w ramach limitu miejsc. Wpłatę należy wnieść **w ciągu 3 dni od otrzymania potwierdzenia**. Nieopłacenie zgłoszenia daje szansę na zapis dla innych drużyn.

Druga część wpisowego jest związana z charytatywną misją turnieju. Wsparciem otoczymy **Hospicjum Stacjonarne Caritas Archidiecezji Warszawskiej przy Krakowskim Przedmieściu 62**. Każdą drużynę prosimy o skompletowanie paczki, która będzie zawierać produkty z poniższej listy. Wielkość paczki i kwota, jaką przeznaczycie na jej przygotowanie, to Wasza drużynowa decyzja. Zróbcie to w zgodzie z Waszymi możliwościami i otwartością serc. Ważne, aby wszystkie przedmioty w paczce były **nowe i nieużywane**.

## Lista rzeczy do skompletowania paczki

- Balsamy nawilżające hypoalergiczne (mogą być oliwkowe dla dzieci)
- Pianki do mycia hypoalergiczne SENI
- Chusteczki nawilżające najlepsze firmy SENI 80
- Kremy do rąk i stóp — mogą być różne
- Żel pod prysznic delikatny zapachowy
- Krem do ciała np. ISANA, np. masło kakaowe
- Dezodorant hypoalergiczny
- Skarpetki bawełniane bezuciskowe XL
- T-shirt L i XL (jasne kolory), bawełniane
- Cienkie bawełniane czapki, najlepiej bezszwowe
- Radio ELTRA Mewa Jasne Drewno, analogowe, tuner FM/LW, obrotowa, teleskopowa, wysuwana antena, zasilanie sieciowe

### Coś ekstra

- Projektor nieba
- Dyfuzor zapachowy wraz z naturalnymi olejkami eterycznymi (preferowane zapachy olejków: sosna, pomarańcza, drzewo herbaciane, eukaliptus)

Wszystkie zebrane podczas turnieju dary przekażemy Hospicjum Stacjonarnemu Caritas Archidiecezji Warszawskiej przy Krakowskim Przedmieściu 62, by sprzyjały rozwojowi placówki i podopiecznych.

[Przejdź do checklisty pomocy i zaznacz, co przyniesie Twoja drużyna.](/checklista)

## Kibice i nagrody

Na turniej zapraszamy oczywiście także kibiców z Waszych parafii — trybuny pomieszczą wszystkich zainteresowanych. Kibiców również zachęcamy do włączenia się w zbiórkę. Dla najlepszych drużyn przewidziane są puchary i medale.

## Kontakt

Kontakt w razie pytań dodatkowych: [zarzad.wpls@gmail.com](mailto:zarzad.wpls@gmail.com)

## Obserwuj ligę

[Facebook](https://www.facebook.com/diecezjalnasiatkowka)

[Instagram](https://www.instagram.com/diecezjalnasiatkowka/)

## Zobacz jak było na poprzednich edycjach

[1. WARSZAWSKO-PRASKI TURNIEJ CHARYTATYWNY W SIATKÓWKĘ](https://diecezja.waw.pl/1-warszawsko-praski-turniej-charytatywny-w-siatkowke/)

[2. WARSZAWSKO-PRASKI TURNIEJ CHARYTATYWNY W SIATKÓWKĘ](https://diecezja.waw.pl/2-warszawsko-praski-turniej-charytatywny/)`;
}

export function safeArticleLink(href:string){
 if(/^\/(?!\/)/.test(href)&&!/[\\\s\u0000-\u001f]/.test(href))return href;
 try{const url=new URL(href);return ['https:','http:','mailto:'].includes(url.protocol)?url.href:null}catch{return null}
}
