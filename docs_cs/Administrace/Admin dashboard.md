# Administration Domain - Admin dashboard metrics, review listing, and client-side filtering

*`public/admin.html`*

*`public/scripts/admin.js`*

## Overview

The admin dashboard presents a compact operational view of collected reviews. After a token check, it shows summary metrics for total reviews, average star rating, negative reviews, and five-star reviews, then loads the full review list into a table.

The page is designed for fast triage: the operator can switch between all reviews, positive reviews (`overall_stars >= 4`), and negative reviews (`overall_stars < 4`) without another server round-trip. The dashboard keeps the fetched reviews in memory in `allReviews`, and `currentFilter` controls how `renderReviews()` rebuilds the table.

## Architecture Overview

```mermaid
flowchart TB
    ﻿# Administrace — metriky dashboardu, výpis recenzí a klientské filtrování

    *`public/admin.html`*

    *`public/scripts/admin.js`*

    ## Přehled

    Administrátorský dashboard poskytuje kompaktní provozní přehled nasbíraných recenzí. Po ověření tokenu zobrazí souhrnné metriky: celkový počet recenzí, průměr hvězdiček, počet negativních recenzí a počet pětihvězdičkových hodnocení a následně načte celý seznam recenzí do tabulky.

    Stránka je navržena pro rychlou orientaci: operátor může přepínat mezi všemi recenzemi, pozitivními ( `overall_stars >= 4` ) a negativními (`overall_stars < 4`) bez dalšího volání na server. Dashboard uchovává stažené recenze v paměti v `allReviews` a `currentFilter` řídí, jak `renderReviews()` sestaví tabulku.

    ## Architektura (přehled)

    ```mermaid
    flowchart TB
        subgraph PresentationLayer [Prezentační vrstva]
            AdminHTML[admin.html]
            AdminJS[admin.js]
            AdminHTML --> AdminJS
        end

        subgraph BackendAPI [Backend API]
            StatsAPI[GET /api/stats]
            ReviewsAPI[GET /api/reviews]
        end

        AdminJS -->|x-admin-token| StatsAPI
        AdminJS -->|x-admin-token| ReviewsAPI
        StatsAPI --> AdminJS
        ReviewsAPI --> AdminJS
    ```

    ## Struktura komponent

    ### Prezentační vrstva

    #### `admin.html`

    *`public/admin.html`*

    `admin.html` definuje celý shell dashboardu, který `admin.js` naplňuje a řídí. Značení obsahuje přihlašovací obrazovku, hlavní kontejner aplikace, karty s metrikami, nástrojovou lištu s filtry/obnovou, stavy načítání a prázdného výpisu, tabulku recenzí a potvrzovací overlay pro mazání.

    **UI oblasti a ovládací prvky**

    | Prvek / ID | Účel |
    | --- | --- |
    | `loginScreen` | Přihlašovací brána zobrazena před přijetím platného admin tokenu |
    | `tokenInput` | Pole pro zadání admin tokenu |
    | `loginBtn` | Spouští kontrolu přihlášení |
    | `loginErr` | Zobrazuje chybové zprávy při přihlášení |
    | `app` | Hlavní kontejner dashboardu zobrazený po úspěšném přihlášení |
    | `statsGrid` | Kontejner pro karty s metrikami |
    | `sTotal` | Hodnota karty celkových recenzí |
    | `sAvg` | Hodnota karty průměru hvězdiček |
    | `sNeg` | Hodnota karty počtu negativních recenzí |
    | `sFive` | Hodnota karty počtu 5 hvězdiček |
    | `.filter-btn[data-filter="all"]` | Zobrazí všechny recenze |
    | `.filter-btn[data-filter="positive"]` | Zobrazí recenze s `overall_stars >= 4` |
    | `.filter-btn[data-filter="negative"]` | Zobrazí recenze s `overall_stars < 4` |
    | `refreshBtn` | Znovu načte metriky a recenze |
    | `loadingState` | Spinner a hláška během načítání recenzí |
    | `emptyState` | Zobrazení, když aktuální seznam neobsahuje žádné řádky |
    | `reviewsTable` | Kontejner tabulky recenzí |
    | `reviewsTbody` | Tělo tabulky naplněné funkcí `renderReviews()` |
    | `confirmOverlay` | Potvrzovací dialog pro smazání řádku |
    | `confirmCancel` | Zrušení potvrzovacího overlaye |
    | `confirmDel` | Potvrzení smazání pro čekající řádek |


    Sloupce tabulky jsou `#`, `Datum`, `Celkové`, `Email`, `Recenze` a `Status`, plus akční sloupec s tlačítkem pro smazání řádku.

    #### `admin.js`

    *`public/scripts/admin.js`*

    `admin.js` spravuje stav dashboardu, načítání dat, filtrování, vykreslování řádků a přechody přihlášení/odhlášení. Přímo čte a zapisuje do DOM prvků deklarovaných v `admin.html`.

    **Modulový stav**

    | Vlastnost | Typ | Popis |
    | --- | --- | --- |
    | `TOKEN` | `string` | Hodnota zasílaná v `x-admin-token` při chráněných požadavcích |
    | `allReviews` | `Array` | Cache recenzí v paměti vrácených `GET /api/reviews` |
    | `currentFilter` | `string` | Aktivní filtr: `all`, `positive` nebo `negative` |
    | `pendingDeleteId` | `number \| null` | ID vybrané recenze pro potvrzovací overlay |


    **Funkce skriptu**

    | Metoda | Popis |
    | --- | --- |
    | `stars` | Vykreslí zobrazení hvězdiček pro číselné hodnocení |
    | `formatDate` | Převádí ISO timestamp na české datum/čas |
    | `loadStats` | Načte souhrnné metriky z `GET /api/stats` a vyplní karty |
    | `loadReviews` | Načte seznam recenzí z `GET /api/reviews` a spustí vykreslení tabulky |
    | `renderReviews` | Aplikuje `currentFilter`, řeší stavy prázdno/načítání a přestaví tělo tabulky |
    | `escHtml` | Escapuje `&`, `<` a `>` před vložením textu recenze do HTML |
    | `askDelete` | Uloží ID řádku a otevře potvrzovací overlay |
    | `tryLogin` | Ověří admin token přes `GET /api/stats` a otevře dashboard |
    | `logoutBtn` handler | Vymaže `TOKEN` a vrátí se na přihlašovací obrazovku |


    ### Karty souhrnu recenzí

    Dashboard obsahuje čtyři souhrnné karty, které jsou naplněné z `GET /api/stats`:

    | Popisek karty | DOM cíl | Zdroj hodnoty |
    | --- | --- | --- |
    | Celkem recenzí | `sTotal` | `d.total` |
    | Průměr hvězdiček | `sAvg` | `d.avg_stars` |
    | Negativních | `sNeg` | `d.negative` |
    | 5 hvězdiček | `sFive` | `d.five_star` |


    `loadStats()` a bootstrap cesta po přihlášení používají stejnou mapu, takže karty jsou aktualizovány ze stejné odpovědi.

    ### Výpis recenzí a vykreslení řádků

    `renderReviews()` znovu sestavuje `<tbody>` z `allReviews` při každé změně filtru, obnově nebo po úspěšném smazání.

    **Pravidla formátování řádku**

    | Pole | Chování při vykreslení |
    | --- | --- |
    | `id` | Zobrazeno s utlumeným prefixem `#` |
    | `created_at` | Naformátováno funkcí `formatDate()` do českého data a času |
    | `overall_stars` | Vykresleno přes `stars()` |
    | `email` | Vykresleno jako `mailto:` odkaz pouze pokud existuje hodnota |
    | `message` | Escapováno pomocí `escHtml()` před vložením do HTML |
    | `flagged` | Řídí třídu a štítek status badgu |
    | Akce řádku | Tlačítko „Smazat“ volá `askDelete(id)` |


    ## Integrace API

    ### `GET /api/stats`

    #### Získat statistiky dashboardu

    ```api
    {
        "title": "Get Admin Dashboard Stats",
        "description": "Fetches aggregate review metrics for the admin summary cards and validates the admin token during login",
        "method": "GET",
        "baseUrl": "<ServerBaseUrl>",
        "endpoint": "/api/stats",
        "headers": [
            {
                "key": "x-admin-token",
                "value": "<admin token>",
                "required": true
            }
        ],
        "queryParams": [],
        "pathParams": [],
        "bodyType": "none",
        "requestBody": "",
        "formData": [],
        "rawBody": "",
        "responses": {
            "200": {
                "description": "Success",
                "body": "{\n    \"ok\": true,\n    \"total\": 18,\n    \"avg_stars\": 4.6,\n    \"negative\": 3,\n    \"five_star\": 11\n}"
            }
        }
    }
    ```

    ### `GET /api/reviews`

    #### Získat recenze pro administraci

    ```api
    {
        "title": "Get Admin Reviews",
        "description": "Fetches the review list used by the admin dashboard table and client-side filters",
        "method": "GET",
        "baseUrl": "<ServerBaseUrl>",
        "endpoint": "/api/reviews",
        "headers": [
            {
                "key": "x-admin-token",
                "value": "<admin token>",
                "required": true
            }
        ],
        "queryParams": [],
        "pathParams": [],
        "bodyType": "none",
        "requestBody": "",
        "formData": [],
        "rawBody": "",
        "responses": {
            "200": {
                "description": "Success",
                "body": "{\n    \"ok\": true,\n    \"reviews\": [\n        {\n            \"id\": 42,\n            \"created_at\": \"2026-04-29T10:15:00.000Z\",\n            \"overall_stars\": 5,\n            \"email\": \"jane@example.com\",\n            \"message\": \"Great service\",\n            \"flagged\": false\n        }\n    ]\n}"
            }
        }
    }
    ```

    ## Hlavní toky funkcionality

    ### Přihlášení, načtení statistik a bootstrap seznamu recenzí

    ```mermaid
    sequenceDiagram
        participant U as Uživatel
        participant V as admin.html
        participant S as admin.js
        participant A as GET /api/stats
        participant R as GET /api/reviews

        U->>V: Zadání tokenu a klik na Přihlásit se
        V->>S: tryLogin
        S->>A: fetch s x-admin-token
        A-->>S: ok true se souhrnnými metrikami
        S->>V: Skrýt loginScreen, zobrazit app
        S->>V: Naplnit sTotal, sAvg, sNeg, sFive
        S->>R: loadReviews fetch s x-admin-token
        R-->>S: ok true s polem recenzí
        S->>S: allReviews = d.reviews
        S->>S: renderReviews
        S->>V: Sestavit řádky tabulky nebo prázdný stav
    ```

    Klientské filtrování využívá prahové hodnoty `overall_stars` (>= 4 pro pozitivní, < 4 pro negativní), zatímco status badge vychází z `r.flagged`. Tyto hodnoty se vykreslují nezávisle v `renderReviews()`, takže se viditelný badge a aktivní kategorie filtru mohou lišit, pokud backend nastaví `flagged` odlišně než podle hvězd.

    **Detaily průchodu**

    1. Uživatel zadá token do `tokenInput` a klikne `loginBtn` nebo stiskne Enter.
    2. `tryLogin()` ořeže hodnotu a zablokuje prázdné zadání s inline hláškou v `loginErr`.
    3. Skript pošle `GET /api/stats` s hlavičkou `x-admin-token`.
    4. Při úspěchu se dashboard zobrazí a čtyři karty statistik se naplní.
    5. `loadReviews()` následně načte `GET /api/reviews` se stejnou hlavičkou.
    6. Odpověď se uloží do `allReviews` a `renderReviews()` vykreslí tabulku.

    ### Klientské filtrování a obnova

    ```mermaid
    sequenceDiagram
        participant U as Uživatel
        participant S as admin.js
        participant V as admin.html
        participant A as GET /api/stats
        participant R as GET /api/reviews

        U->>S: Klik na tlačítko filtru
        S->>S: Změna currentFilter
        S->>S: renderReviews
        S->>V: Přestavit tbody z allReviews

        U->>S: Klik na Obnovit
        S->>A: loadStats fetch s x-admin-token
        A-->>S: aktualizované metriky
        S->>V: Aktualizovat karty
        S->>R: loadReviews fetch s x-admin-token
        R-->>S: čerstvý seznam recenzí
        S->>S: allReviews nahrazen
        S->>S: renderReviews
        S->>V: Aktualizovat tabulku a stavy
    ```

    **Pravidla filtrování**

    | Hodnota filtru | Predikát použitý v `renderReviews()` |
    | --- | --- |
    | `all` | Žádné filtrování — zobrazeny všechny řádky z `allReviews` |
    | `positive` | `r.overall_stars >= 4` |
    | `negative` | `r.overall_stars < 4` |


    Tlačítka filtru aktualizují aktivní třídu `.filter-btn` a okamžitě volají `renderReviews()`, takže přepnutí názoru nikdy nevyžaduje volání na server.

    ## UI stavy

    ### Stav načítání

    `loadReviews()` zobrazí `loadingState`, skryje `reviewsTable` a `emptyState` před začátkem fetch operace. Pokud požadavek uspěje, `renderReviews()` skryje panel s načítáním.

    ### Naplněný stav

    Pokud po filtrování existují řádky, `renderReviews()` zobrazí `reviewsTable` a vyplní `reviewsTbody` jedním řádkem na recenzi.

    ### Prázdný stav

    Pokud aktivní filtr vrátí nula řádků, `renderReviews()` zobrazí `emptyState` a nechá `reviewsTable` skrytý.

    ### Stav chyby

    Pokud `loadReviews()` selže, panel načítání je nahrazen inline chybovou zprávou v `loadingState`. Neplatné pokusy o přihlášení zapíší do `loginErr` text `Nesprávné heslo.` a dashboard zůstane skrytý.

    ## Správa stavů

    ### Hodnoty stavu dashboardu

    | Název stavu | Tvar / hodnoty | Použití |
    | --- | --- | --- |
    | `TOKEN` | Řetězec tokenu nebo prázdný řetězec | Posílá se v chráněných GET požadavcích |
    | `allReviews` | Pole objektů recenzí | Výchozí data pro filtrování a vykreslení tabulky |
    | `currentFilter` | `all`, `positive`, `negative` | Řídí klientské filtrování řádků |
    | `pendingDeleteId` | Číslo nebo null | Drží vybrané ID pro potvrzovací overlay |


    ### Přechody stavů

    - `tryLogin()` nastaví `TOKEN` pouze pokud pole tokenu není prázdné.
    - Neúspěšné přihlášení resetuje `TOKEN` zpět na prázdný řetězec.
    - `loadReviews()` nahradí `allReviews` nejnovější odpovědí serveru.
    - Kliky na filtry pouze mění `currentFilter`; cache zůstává nezměněná.
    - Obnova znovu načte metriky i recenze ze serveru.
    - Zavření potvrzovacího overlaye vymaže `pendingDeleteId`.


    ## Pravidla formátování dat

    ### Vykreslení hvězd

    `stars(n, max = 5)` vrací:

    - utlumenou pomlčku, pokud je `n` falešné
    - řetězec vyplněných hvězd následovaný utlumenými prázdnými hvězdami jinak

    ### Formátování data

    `formatDate(s)` převádí raw timestamp na české formátované zobrazení pomocí:

    - `toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" })`
    - `toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })`

    ### Escapování HTML

    `escHtml(s)` escapuje pouze:

    - `&`
    - `<`
    - `>`

    Používá se před vložením textu recenze do šablony řádku.

    ## Zpracování chyb

    ### Ověření přihlášení

    `tryLogin()` kontroluje prázdné pole tokenu před jakýmkoliv požadavkem a zapíše chybu přímo do `loginErr`.

    ### Načtení statistik

    `loadStats()` obalí fetch do `try/catch` a potlačuje vyjímky. Karty statistik se aktualizují pouze pokud odpověď obsahuje `ok: true`.

    ### Načtení recenzí

    `loadReviews()` vyhodí chybu pokud `d.ok` je false a při selhání vykreslí červenou chybovou zprávu v `loadingState`.

    ### Potvrzení mazání

    Potvrzovací handler zachytává chyby z fetch a zobrazí `alert("Chyba: " + e.message)`.

    ## Závislosti

    - Browser `fetch()` pro všechna API volání
    - Přímý přístup do DOMu pomocí pevně daných ID z `admin.html`
    - Backend endpointy: `GET /api/stats`, `GET /api/reviews`
    - Závislost na hlavičce požadavku: `x-admin-token`
    - CSS třídy a styly definované v projektu
    - Externí fonty načítané z Google Fonts v `admin.html`

    ## Testovací poznámky

    - Ověřit, že `tryLogin()` zablokuje prázdný token a ponechá přihlašovací obrazovku.
    - Potvrdit, že úspěšný token naplní všechny čtyři karty dříve než se načte seznam recenzí.
    - Ověřit, že `renderReviews()` respektuje každé pravidlo filtru: `positive` ukáže `overall_stars` 4 a 5; `negative` ukáže `overall_stars` 1 až 3.
    - Zkontrolovat, že `emptyState` se objeví, pokud filtr odstraní všechny řádky.
    - Zkontrolovat, že `loadingState` je viditelný během načítání recenzí a po úspěchu se nahradí obsahem.
    - Ověřit, že `formatDate()` zobrazí datum a čas ve formátu pro ČR.
    - Potvrdit, že `escHtml()` zabrání vložení syrového `<`, `>` a `&` do buněk s textem recenze.

    ## Referenční třídy

    | Třída | Odpovědnost |
    | --- | --- |
    | `admin.html` | Definuje shell administrace, karty, filtry, stavy tabulky a potvrzovací overlay |
    | `admin.js` | Řídí validaci tokenu, načítání statistik, načtení recenzí, filtrování, formátování a vykreslování do DOM |
