# Řízení přístupu, hranice důvěry a rizika zpracování dat

Krátké shrnutí principů řízení přístupu aplikace, kde leží hranice důvěry mezi klientem a serverem a jaké jsou hlavní rizikové body zpracování osobních údajů v kontextu recenzního systému.

## Řízení přístupu

- Admin endpointy jsou chráněné sdíleným tokenem `ADMIN_TOKEN`, který klient posílá v hlavičce `x-admin-token`.
- Server ověřuje token před jakýmkoli přístupem k datům; selhání autorizace vrací `401`.

## Hranice důvěry

- Mezi veřejným (clienťským) frontendem a serverem leží hranice: server validuje `overall_stars` a vyhodnocuje `flagged` nezávisle na klientovi.
- Server je jediným místem, kde jsou recenze ukládány a zobrazovány adminu; klient je nedůvěryhodný vstup.

## Rizika zpracování dat

- Emailová pole mohou obsahovat osobní údaje; přístup k nim by měl být omezen administrátorským rozhraním.
- V paměťovém režimu nejsou data perzistentní a mohou být ztracena při restartu; to má provozní dopad, ale snižuje dlouhodobé riziko expozice uložených záznamů.

## Doporučené provozní opatření

- Omezit distribuci `ADMIN_TOKEN` a uchovávat ho v bezpečném secret store v produkci.
- Používat zabezpečené SMTP konfigurace a povolit TLS (nastavit `SMTP_SECURE` nebo používat port 465).
- Pravidelně kontrolovat logy pro neočekávané selhání DB init a chybové zprávy z emailového kroku.
