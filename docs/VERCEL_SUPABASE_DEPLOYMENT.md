# GemGo MVP: avvio su Vercel e Supabase

Aggiornato al 7 agosto 2026.

## Stato reale del repository

Il frontend è Next.js/React/TypeScript, ma la build di hosting attuale usa Vinext, il plugin Cloudflare e un database D1 (`drizzle-orm/d1`). Per questo motivo non è corretto importare oggi il repository in Vercel e considerarlo pronto: prima va separato l'adapter database e va aggiunta una build Next.js nativa verificata.

Il percorso a rischio minimo per il contest è:

1. pubblicare e validare l'MVP corrente sul Site esistente;
2. creare il progetto Supabase senza spostare subito il catalogo statico di 66 location;
3. portare per prima soltanto la scrittura di `/api/gems` da D1 a Supabase;
4. aggiungere e verificare una build Vercel nativa;
5. collegare Vercel esclusivamente al branch `agent/pan-alpine-product-redesign`;
6. promuovere il deployment di contest solo dopo smoke test e controllo RLS.

## 1. Preparare Supabase

1. Crea un progetto nell'area UE più vicina al pubblico del contest.
2. Conserva questi valori nel password manager del team:
   - Project URL;
   - publishable key;
   - password/connection string del database.
3. Non mettere mai una secret key o una connection string in una variabile `NEXT_PUBLIC_*`.
4. Usa la Data API per le chiamate dell'app. Usa la connessione diretta per migrazioni e strumenti amministrativi; per traffico serverless con un client Postgres usa il pooler in transaction mode, porta `6543`, con prepared statements disattivati.

Documentazione ufficiale: [connessione al database](https://supabase.com/docs/guides/database/connecting-to-postgres), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 2. Versionare lo schema

Prima di eseguire comandi, controlla la versione e l'help della CLI. Poi inizializza e collega il progetto:

```bash
npx supabase --version
npx supabase --help
npx supabase init
npx supabase link --project-ref <project-ref>
npx supabase migration new create_gem_suggestions
```

La prima migrazione deve creare `public.gem_suggestions` in Postgres, con gli stessi campi oggi presenti in `db/schema.ts`, più vincoli database su lunghezze, categoria, regione e stato. Requisiti minimi:

- `id uuid primary key default gen_random_uuid()`;
- `normalized_key text unique not null`;
- `status text not null default 'pending'` con `check (status = 'pending')` per l'inserimento pubblico;
- timestamp `timestamptz`;
- RLS abilitata esplicitamente;
- permesso anonimo solo `INSERT`, nessun `SELECT`, `UPDATE` o `DELETE`;
- policy `WITH CHECK` che consenta soltanto righe valide e `pending`.

Applica prima in un progetto di sviluppo/branch Supabase, poi nel progetto del contest:

```bash
npx supabase db push
```

Supabase richiede RLS per le tabelle esposte nello schema `public`. Dopo la migrazione, verifica le policy con il tester RLS del dashboard e con richieste anonime positive e negative.

## 3. Portare l'API, non tutto il prodotto

La prima modifica backend deve essere piccola e reversibile:

1. lascia `app/data/destinations.json` e `app/data/alpify-locations.json` statici: sono veloci, versionati e non richiedono una query a ogni apertura;
2. sostituisci l'accesso D1 usato da `app/api/gems/route.ts` con un adapter Supabase;
3. mantieni la validazione TypeScript già presente nella Route Handler;
4. aggiungi limiti di frequenza e dimensione payload;
5. usa la publishable key con RLS per l'inserimento anonimo, oppure una funzione server dedicata con privilegi minimi; non usare una secret key nel browser;
6. genera e committa i tipi database, senza dipendere dal recupero dinamico dello schema OpenAPI.

Il changelog Supabase 2026 segnala che lo schema OpenAPI non viene più restituito alle richieste con anon key: [Supabase changelog](https://supabase.com/changelog).

## 4. Rendere la build compatibile con Vercel

In un commit separato:

1. aggiungi uno script `build:vercel` basato su `next build`;
2. rimuovi dal percorso Vercel ogni import runtime di `cloudflare:workers` e `drizzle-orm/d1`;
3. mantieni la build Sites/Cloudflare finché il passaggio non è validato;
4. esegui `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` e infine la build Vercel;
5. prova almeno `/`, `/app`, `/about`, `/privacy`, `/profile`, `/notifications`, `/api/gems` e tutti i redirect legacy.

Non impostare `npm run build` come build Vercel finché quel comando produce intenzionalmente l'artifact Cloudflare/Vinext.

## 5. Collegare Vercel al branch corretto

1. In Vercel, importa `mattiacentonze/gemgo` da GitHub.
2. Seleziona il branch `agent/pan-alpine-product-redesign`; non cambiare `main`.
3. Imposta il comando di build su `npm run build:vercel` soltanto quando esiste e passa localmente/CI.
4. Aggiungi per Preview e Production:
   - `NEXT_PUBLIC_SUPABASE_URL`;
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Aggiungi `DATABASE_URL` solo se una funzione server usa davvero un client Postgres; non esporla al client.
6. Mantieni Preview e Production separati e promuovi lo stesso artifact già testato.

Riferimenti ufficiali: [Next.js su Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [repository Git su Vercel](https://vercel.com/docs/git), [integrazione GitHub](https://vercel.com/docs/git/vercel-for-github), [variabili d'ambiente](https://vercel.com/docs/environment-variables).

## 6. Checklist prima della demo

- branch di produzione verificato e `main` intatto;
- nessun segreto nel bundle o nei log;
- RLS abilitata e testata;
- nessuna lettura anonima delle proposte;
- `/api/gems` restituisce `201`, `400`, `409` e `500` nei casi previsti;
- tutte le route principali restituiscono `200`, i legacy path il redirect corretto;
- `/app` non precarica Leaflet o il feed GTFS;
- test manuale a 320, 375, 768, 1024 e 1440 px;
- prova offline e service worker da una nuova sessione;
- rollback documentato verso il Site attuale.
