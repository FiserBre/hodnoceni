## Shrnutí z nasazení

- Projekt: `hiddenstory-hodnoceni-app` (webová aplikace)
- Databáze: `hiddenstory-hodnoceni-db` (PostgreSQL)
- Doména připojená k aplikaci: `hiddenstory.fiserbretislav.com` (přes cloudflare tunnel)
- Aplikace naslouchá interně na portu: `3000` (v Domains: Port: 3000, protokol HTTP, SSL certifikát zprostředkuje cloudflare)

## Databázové detaily (interní)

- DB uživatel: `postgres` (viditelné v panelu interních credentials)
- Název databáze: `hs_db`
- Interní port kontejneru: `5432`

## Poznámky o doméně a Cloudflare

- Doména `hiddenstory.fiserbretislav.com` je připojena k aplikaci a provoz je veden přes Cloudflare (proxy). To umožňuje používat Cloudflare SSL a DDoS ochranu.
