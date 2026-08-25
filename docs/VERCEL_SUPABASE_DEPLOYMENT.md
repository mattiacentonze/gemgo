# GemGo: Vercel e Supabase

Aggiornato al 25 agosto 2026.

## Stato verificato

- `main` è il branch canonico e `https://gemgo.vercel.app` è l’unico target pubblico.
- Il progetto Supabase `gemgo` è attivo in `eu-west-1`.
- Il sorgente candidato include Auth/profile, recupero password, persistenza account, ruoli, contributi, CMS, Storage privato, moderazione, evidenze visita, cancellazione account asincrona e ledger GemPoints verificato. Le nuove migrazioni e il relativo deploy di produzione non vanno considerati applicati finché non sono verificati esplicitamente nell’ambiente live.
- `/api/gems` richiede una sessione confermata, decodifica e ricodifica la foto in WebP senza EXIF, calcola gli hash lato server e usa una credenziale solo server per caricare nel bucket privato `gem-contributions`. Soltanto il media marcato come validato dal server entra nella coda di moderazione.
- `/api/visits` registra l’accettazione GemDrop e valuta una foto privata con una posizione browser recente rispetto alle coordinate statiche della destinazione. Sono evidenze con controlli anti-riuso, non una prova crittografica della presenza o del mezzo di trasporto.
- Il limite foto è 4 MiB per restare sotto il limite request di 4,5 MiB delle Vercel Functions.

Le chiavi pubbliche possono essere configurate per Preview e Production:

```text
NEXT_PUBLIC_SUPABASE_URL=https://lhowrxqddjfvzmlwnuoj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Le route server di upload e verifica richiedono inoltre, sia in Preview sia in Production:

```text
SUPABASE_SERVICE_ROLE_KEY=...
```

Questa variabile non deve mai avere il prefisso `NEXT_PUBLIC_`, essere stampata nei log o essere inviata al browser. La sua presenza negli ambienti Vercel non è implicita e deve essere verificata prima del deploy.

Quando `gemgo.app` è verificato su Vercel, configurare inoltre in Production:

```text
NEXT_PUBLIC_SITE_URL=https://gemgo.app
```

La procedura completa e i controlli di rollback sono in
[`docs/GEMGO_APP_CUTOVER.md`](./GEMGO_APP_CUTOVER.md).

Non aggiungere mai `service_role`, `sb_secret_*`, password o connection string a una variabile `NEXT_PUBLIC_*`.

## Migrazioni del candidato

Applicare e verificare in ordine, senza dichiararle live in anticipo:

1. `20260813083323_contribution_antifraud_evidence.sql`;
2. `20260813083427_admin_content_privacy_workflows.sql`;
3. `20260825101459_account_deletion_worker.sql`;
4. `20260825101507_contribution_media_server_validation.sql`;
5. `20260825101548_visit_verification_evidence.sql`.

Le prime due sono dipendenze delle nuove route e dei nuovi worker. Applicare l’intera sequenza con le scritture dei contributi sospese: `083323` introduce temporaneamente la vecchia RPC evidence-bearing e `101507` la revoca insieme all’upload diretto dal browser. Le righe preesistenti o create prima di `101507` restano marcate `legacy_client` e non possono avvelenare il dedup o essere validate; reservation payload-bound, dedup e finalizzazione diventano service-role-only. Dopo l’applicazione, rieseguire gli advisor sicurezza/performance e verificare bucket, RLS, grant delle RPC e assenza di privilegi client sulle scritture server-only.

## Auth ancora da configurare nel dashboard

Il codice supporta Google OAuth PKCE e email/password, ma il provider Google risulta disabilitato finché non vengono inserite credenziali reali.

1. Google Cloud Auth Platform, client Web:
   - origin: `https://gemgo.vercel.app` (più `http://localhost:3000` per sviluppo);
   - redirect URI Google: `https://lhowrxqddjfvzmlwnuoj.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google:
   - inserire Client ID e Client Secret;
   - abilitare Google e non disattivare il nonce check per il web.
3. Supabase → Authentication → URL Configuration:
   - Site URL: `https://gemgo.vercel.app`;
   - autorizzare il callback profilo e il callback recovery `/auth/callback?next=/auth/update-password` per produzione, locale e sole preview approvate.
4. Verificare che il template di recupero password rispetti il redirect richiesto e che link scaduti o già usati arrivino allo stato di errore dell’app.
5. Configurare un SMTP personalizzato e provare richiesta, ricezione e cambio password con una casella reale. La risposta di richiesta resta uguale anche per un indirizzo sconosciuto per ridurre l’enumerazione degli account.
6. Dopo il primo accesso reale di Mattia, assegnare manualmente `owner` al suo UUID. Non esiste e non deve esistere un’auto-promozione del primo utente.

Il pulsante Google legge `/auth/v1/settings`: resta disabilitato e spiega che il provider non è configurato, invece di avviare un flusso destinato a fallire.

## Worker cancellazione account

La richiesta in-app richiede una sessione creata da meno di 15 minuti, revoca le sessioni dopo l’accodamento e impedisce all’ultimo `owner` di cancellarsi senza trasferire il ruolo. Le scritture account sono serializzate sullo stesso lock, il subject Auth resta disponibile anche dopo un’eliminazione esterna e il primo claim attende 15 minuti per drenare route server già avviate. Il lavoro privilegiato resta separato in `supabase/functions/account-deletion-worker`.

Per renderlo operativo servono ancora:

1. deploy della Edge Function;
2. digest SHA-256 in `ACCOUNT_DELETION_WORKER_SECRET_SHA256` tra i secret della funzione;
3. segreto in chiaro e URL della funzione conservati in Supabase Vault;
4. invocazione periodica tramite `pg_cron` e `pg_net`;
5. prova reale che elimini i prefissi utente da `gem-contributions` e `visit-evidence`, poi l’utente Auth, e che riprenda anche il cleanup Storage di un contributo ritirato dopo un errore transitorio;
6. monitoraggio delle richieste `failed`, delle lease scadute e dei media ritirati ancora in attesa di cleanup.

La procedura senza secret nel repository è in [`docs/ops-account-deletion-worker.md`](./ops-account-deletion-worker.md). Nessuno di questi gate va considerato configurato soltanto perché il codice è presente.

## Confini di sicurezza

- Ogni nuovo account riceve soltanto `member`.
- `content_editor` legge la coda e i media; `admin` e `owner` possono approvare/rifiutare; soltanto `owner` assegna ruoli.
- Un revisore non può approvare un proprio contributo e l’ultimo owner non può essere retrocesso.
- Le proposte iniziano `pending` con zero punti. L’approvazione atomica crea al massimo un evento server `+70`; rifiuto e ritiro assegnano zero.
- Il ledger non è scrivibile dal client. Il saldo è la somma degli eventi server verificati.
- I bucket sono privati e non accettano upload browser validi per moderazione o premio. Path, proprietario, stato, MIME, dimensione, dedup, reservation e marker di validazione sono controllati da route server e RPC service-role-only; un replay con payload diverso è rifiutato senza ritirare il contributo esistente.
- Le foto contributo e visita vengono decodificate, ruotate e ricodificate senza EXIF; i limiti per byte e pixel sono verificati dal server.
- Una visita account può generare un evento base idempotente e un bonus GemDrop separato soltanto per l’alternativa già accettata nello stesso viaggio. Il server verifica viaggio, destinazione, distanza dichiarata, accuratezza, freschezza, cooldown, rate limit e riuso della foto.
- La posizione proviene comunque dal browser e può essere falsificata. QR, codici partner e simulazioni locali restano demo e non alimentano il saldo account verificato.
- Il CMS espone pubblicamente via RLS soltanto contenuti destinazione `published`; coordinate e segnali di ranking restano nel catalogo statico revisionato.

## Verifica release

Prima della pubblicazione:

```bash
npm run install:ci
npm run preflight
npm run audit:dependencies
npm run test:authenticated
npm run test:visual
```

Controllare inoltre:

- migrazioni presenti nel catalogo live, bucket privati e policy/grant coerenti con le scritture service-only;
- `SUPABASE_SERVICE_ROLE_KEY` presente soltanto negli ambienti server Vercel previsti;
- nessun privilegio client di scrittura sul ledger o assegnazione autonoma dei ruoli;
- `401` su `/api/gems` e `/api/visits` senza sessione, rifiuto cross-site sulle route mutative e nessun oggetto orfano dopo un errore RPC;
- recupero password reale, incluso link valido, scaduto e riusato, senza differenze che rivelino se l’email esiste;
- contributo → media validato → review → singolo `+70`, più retry dopo risposta persa senza doppio premio;
- salvataggio viaggio → accettazione GemDrop → evidenza visita → singoli eventi ledger attesi, distinguendo chiaramente evidenza da prova assoluta;
- cancellazione reale fino allo stato `completed`, senza oggetti Storage né utente Auth residui;
- route `/`, `/app`, `/app/profile`, `/auth/forgot-password`, `/auth/update-password`, `/app/admin` e `/privacy` su mobile e desktop, in EN/IT/DE/FR/SL e senza overflow;
- Preview e Production costruite dallo stesso commit verificato;
- nessun errore runtime Vercel dopo la promozione.

## Attività dichiaratamente non completate

- applicazione/verifica delle migrazioni, variabile service-role e deploy del candidato finché non completati sull’ambiente live;
- Google OAuth, redirect Auth/recovery, SMTP pubblico e primo owner finché non configurati/verificati con accessi reali;
- deploy/secret/Vault/cron e prova reale del worker di cancellazione, oltre al piano privacy legale finale;
- media editoriali persistiti e revisionati per tutte le 66 località;
- prova sul campo e, se necessaria, attestazione più forte della posizione; QR/partner e premi commerciali restano fuori dal flusso account verificato.
