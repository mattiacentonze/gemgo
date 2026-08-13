# GemGo: Vercel e Supabase

Aggiornato al 12 agosto 2026.

## Stato verificato

- `main` è il branch canonico e `https://gemgo.vercel.app` è l’unico target pubblico.
- Il progetto Supabase `gemgo` è attivo in `eu-west-1`.
- Le migrazioni live coprono Auth/profile, persistenza account, tombstone multi-device, ruoli, contributi, Storage privato, moderazione e ledger GemPoints verificato.
- `/api/gems` non usa più D1: richiede una sessione confermata, valida e ricodifica la foto in WebP, crea una proposta `pending` e carica l’oggetto nel bucket privato `gem-contributions`.
- Il limite foto è 4 MiB per restare sotto il limite request di 4,5 MiB delle Vercel Functions.

Le chiavi pubbliche possono essere configurate per Preview e Production:

```text
NEXT_PUBLIC_SUPABASE_URL=https://lhowrxqddjfvzmlwnuoj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Quando `gemgo.app` è verificato su Vercel, configurare inoltre in Production:

```text
NEXT_PUBLIC_SITE_URL=https://gemgo.app
```

La procedura completa e i controlli di rollback sono in
[`docs/GEMGO_APP_CUTOVER.md`](./GEMGO_APP_CUTOVER.md).

Non aggiungere mai `service_role`, `sb_secret_*`, password o connection string a una variabile `NEXT_PUBLIC_*`. Il runtime dell’app non richiede un secret Supabase.

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
   - consentire `/auth/callback?next=/app/profile` per produzione, locale e preview autorizzate.
4. Configurare un SMTP personalizzato. Il fallback email richiede conferma e l’SMTP predefinito Supabase non è adatto a utenti pubblici.
5. Dopo il primo accesso reale di Mattia, assegnare manualmente `owner` al suo UUID. Non esiste e non deve esistere un’auto-promozione del primo utente.

Il pulsante Google legge `/auth/v1/settings`: resta disabilitato e spiega che il provider non è configurato, invece di avviare un flusso destinato a fallire.

## Confini di sicurezza

- Ogni nuovo account riceve soltanto `member`.
- `content_editor` legge la coda e i media; `admin` e `owner` possono approvare/rifiutare; soltanto `owner` assegna ruoli.
- Un revisore non può approvare un proprio contributo e l’ultimo owner non può essere retrocesso.
- Le proposte iniziano `pending` con zero punti. L’approvazione atomica crea al massimo un evento server `+70`; rifiuto e ritiro assegnano zero.
- Il ledger non è scrivibile dal client. Il saldo è la somma degli eventi server verificati.
- Il bucket è privato; path, proprietario, stato della proposta, MIME e dimensione sono vincolati da RLS e RPC.
- Le foto vengono decodificate, ruotate, ricodificate senza EXIF e limitate per byte, pixel e rapporto orizzontale.
- Le attività GPS/QR presenti nell’interfaccia restano esplicitamente demo e non alimentano il saldo verificato.

## Verifica release

Prima della pubblicazione:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build:vercel
npm run test:visual
```

Controllare inoltre:

- migrazioni presenti nel catalogo live e policy Storage qualificate con `storage.objects.name`;
- nessun privilegio client di scrittura sul ledger o assegnazione autonoma dei ruoli;
- `401` su `/api/gems` senza sessione;
- route `/`, `/app`, `/app/profile`, `/app/admin`, `/privacy` su mobile e desktop, inclusi EN/DE/SL e overflow;
- Preview e Production costruite dallo stesso commit verificato;
- nessun errore runtime Vercel dopo la promozione.

## Attività dichiaratamente non completate

- Google OAuth, SMTP pubblico e primo owner finché non configurati/verificati con un accesso reale;
- cancellazione cloud dell’account e piano privacy legale finale;
- media editoriali persistiti e revisionati per tutte le 66 località;
- verifica GPS/QR antifrode server-side e premi commerciali partner.
