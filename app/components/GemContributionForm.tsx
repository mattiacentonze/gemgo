"use client";

import {
  Camera,
  CircleAlert,
  Gem,
  LoaderCircle,
  LogIn,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { regionCodes, type Locale, type RegionCode } from "../domain";
import { msg } from "../i18n/catalogs";

type Props = {
  locale: Locale;
};

type ContributionStatus = "pending" | "approved" | "rejected" | "withdrawn";

type ContributionSummary = {
  id: string;
  name: string;
  status: ContributionStatus;
  created_at: string;
  reviewed_at?: string | null;
};

type AuthState = "checking" | "authenticated" | "anonymous" | "unverified" | "unavailable";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const categories = [
  "nature",
  "culture",
  "viewpoint",
  "activity",
  "local_place",
] as const;

const contributionCopy = {
  en: {
    reward: "70 GemPoints after approval",
    checking: "Checking your account…",
    loginTitle: "Sign in to suggest a gem",
    loginBody: "A verified account protects the moderation queue and lets GemGo award approved contributions exactly once.",
    loginAction: "Sign in or create an account",
    unverifiedTitle: "Confirm your email first",
    unverifiedBody: "Open the confirmation email, then return here to submit the place.",
    unavailable: "We could not verify your account. Check your connection and try again.",
    retry: "Try again",
    photo: "Landscape photo of the place",
    photoHelp: "JPG, PNG or WebP, maximum 4 MB. Do not include faces, personal data or GPS metadata.",
    consent: "I own this photo or have permission to submit it, and I accept that GemGo may store it privately for moderation.",
    invalidPhoto: "Add a JPG, PNG or WebP photo up to 4 MB.",
    invalidImage: "The file is not a valid supported image.",
    landscape: "Use a landscape photo that is at least 1.22 times wider than it is tall.",
    smallImage: "Use a photo at least 320 × 200 pixels.",
    terms: "Confirm that you have the right to submit the photo.",
    rateLimit: "You have reached the contribution limit. Please try again later.",
    success: "Suggestion received and pending review. No GemPoints have been awarded yet.",
    recent: "Your recent suggestions",
    pending: "Pending review",
    approved: "Approved",
    rejected: "Not approved",
    withdrawn: "Withdrawn",
  },
  it: {
    reward: "70 GemPoints dopo l’approvazione",
    checking: "Verifica dell’account…",
    loginTitle: "Accedi per suggerire una gem",
    loginBody: "Un account verificato protegge la coda di moderazione e permette a GemGo di premiare una sola volta i contributi approvati.",
    loginAction: "Accedi o crea un account",
    unverifiedTitle: "Prima conferma l’email",
    unverifiedBody: "Apri l’email di conferma, poi torna qui per inviare il luogo.",
    unavailable: "Non è stato possibile verificare l’account. Controlla la connessione e riprova.",
    retry: "Riprova",
    photo: "Foto orizzontale del luogo",
    photoHelp: "JPG, PNG o WebP, massimo 4 MB. Non includere volti, dati personali o metadati GPS.",
    consent: "La foto è mia o ho il permesso di inviarla e accetto che GemGo la conservi privatamente per la moderazione.",
    invalidPhoto: "Aggiungi una foto JPG, PNG o WebP fino a 4 MB.",
    invalidImage: "Il file non è un’immagine valida supportata.",
    landscape: "Usa una foto orizzontale larga almeno 1,22 volte la sua altezza.",
    smallImage: "Usa una foto di almeno 320 × 200 pixel.",
    terms: "Conferma di avere il diritto di inviare la foto.",
    rateLimit: "Hai raggiunto il limite di contributi. Riprova più tardi.",
    success: "Suggerimento ricevuto e in attesa di revisione. Non è stato ancora assegnato alcun GemPoint.",
    recent: "I tuoi suggerimenti recenti",
    pending: "In attesa di revisione",
    approved: "Approvato",
    rejected: "Non approvato",
    withdrawn: "Ritirato",
  },
  de: {
    reward: "70 GemPoints nach der Freigabe",
    checking: "Konto wird geprüft…",
    loginTitle: "Anmelden, um ein Juwel vorzuschlagen",
    loginBody: "Ein bestätigtes Konto schützt die Moderation und stellt sicher, dass freigegebene Beiträge genau einmal belohnt werden.",
    loginAction: "Anmelden oder Konto erstellen",
    unverifiedTitle: "Bestätige zuerst deine E-Mail-Adresse",
    unverifiedBody: "Öffne die Bestätigungs-E-Mail und kehre dann hierher zurück.",
    unavailable: "Das Konto konnte nicht geprüft werden. Prüfe die Verbindung und versuche es erneut.",
    retry: "Erneut versuchen",
    photo: "Querformatfoto des Ortes",
    photoHelp: "JPG, PNG oder WebP, maximal 4 MB. Keine Gesichter, personenbezogenen Daten oder GPS-Metadaten.",
    consent: "Ich besitze dieses Foto oder darf es einreichen und stimme der privaten Speicherung zur Moderation zu.",
    invalidPhoto: "Füge ein JPG-, PNG- oder WebP-Foto bis 4 MB hinzu.",
    invalidImage: "Die Datei ist kein gültiges unterstütztes Bild.",
    landscape: "Verwende ein Querformatfoto, das mindestens 1,22-mal breiter als hoch ist.",
    smallImage: "Verwende ein Foto mit mindestens 320 × 200 Pixeln.",
    terms: "Bestätige, dass du das Foto einreichen darfst.",
    rateLimit: "Du hast das Beitragslimit erreicht. Versuche es später erneut.",
    success: "Vorschlag erhalten und zur Prüfung vorgemerkt. Es wurden noch keine GemPoints vergeben.",
    recent: "Deine letzten Vorschläge",
    pending: "Prüfung ausstehend",
    approved: "Freigegeben",
    rejected: "Nicht freigegeben",
    withdrawn: "Zurückgezogen",
  },
  fr: {
    reward: "70 GemPoints après approbation",
    checking: "Vérification de votre compte…",
    loginTitle: "Connectez-vous pour proposer une pépite",
    loginBody: "Un compte vérifié protège la modération et garantit qu’une contribution approuvée n’est récompensée qu’une seule fois.",
    loginAction: "Se connecter ou créer un compte",
    unverifiedTitle: "Confirmez d’abord votre adresse e-mail",
    unverifiedBody: "Ouvrez l’e-mail de confirmation, puis revenez ici pour envoyer le lieu.",
    unavailable: "Impossible de vérifier votre compte. Vérifiez la connexion et réessayez.",
    retry: "Réessayer",
    photo: "Photo horizontale du lieu",
    photoHelp: "JPG, PNG ou WebP, 4 Mo maximum. N’incluez ni visages, ni données personnelles, ni métadonnées GPS.",
    consent: "Je possède cette photo ou peux l’envoyer et j’accepte son stockage privé à des fins de modération.",
    invalidPhoto: "Ajoutez une photo JPG, PNG ou WebP de 4 Mo maximum.",
    invalidImage: "Le fichier n’est pas une image valide prise en charge.",
    landscape: "Utilisez une photo horizontale au moins 1,22 fois plus large que haute.",
    smallImage: "Utilisez une photo d’au moins 320 × 200 pixels.",
    terms: "Confirmez que vous avez le droit d’envoyer la photo.",
    rateLimit: "Vous avez atteint la limite de contributions. Réessayez plus tard.",
    success: "Proposition reçue et en attente de validation. Aucun GemPoint n’a encore été attribué.",
    recent: "Vos propositions récentes",
    pending: "En attente de validation",
    approved: "Approuvée",
    rejected: "Non approuvée",
    withdrawn: "Retirée",
  },
  sl: {
    reward: "70 GemPoints po odobritvi",
    checking: "Preverjanje računa…",
    loginTitle: "Prijavi se za predlog bisera",
    loginBody: "Potrjen račun varuje postopek moderiranja in zagotavlja, da je odobren prispevek nagrajen samo enkrat.",
    loginAction: "Prijava ali ustvarjanje računa",
    unverifiedTitle: "Najprej potrdi e-poštni naslov",
    unverifiedBody: "Odpri potrditveno sporočilo in se nato vrni sem ter pošlji predlog.",
    unavailable: "Računa ni bilo mogoče preveriti. Preveri povezavo in poskusi znova.",
    retry: "Poskusi znova",
    photo: "Vodoravna fotografija kraja",
    photoHelp: "JPG, PNG ali WebP, največ 4 MB. Brez obrazov, osebnih podatkov ali metapodatkov GPS.",
    consent: "Fotografija je moja ali jo smem poslati in soglašam z zasebno hrambo za moderiranje.",
    invalidPhoto: "Dodaj fotografijo JPG, PNG ali WebP do 4 MB.",
    invalidImage: "Datoteka ni veljavna podprta slika.",
    landscape: "Uporabi vodoravno fotografijo, ki je vsaj 1,22-krat širša kot visoka.",
    smallImage: "Uporabi fotografijo velikosti najmanj 320 × 200 slikovnih pik.",
    terms: "Potrdi, da smeš poslati fotografijo.",
    rateLimit: "Dosegel si omejitev prispevkov. Poskusi znova pozneje.",
    success: "Predlog je prejet in čaka na pregled. GemPoints še niso bili dodeljeni.",
    recent: "Tvoji nedavni predlogi",
    pending: "Čaka na pregled",
    approved: "Odobreno",
    rejected: "Ni odobreno",
    withdrawn: "Umaknjeno",
  },
} as const;

export default function GemContributionForm({ locale }: Props) {
  const t = (key: string, params?: Record<string, string | number>) =>
    msg(locale, key, params);
  const text = contributionCopy[locale];
  const requestIdRef = useRef<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [suggestions, setSuggestions] = useState<ContributionSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const loadContributions = useCallback(async () => {
    try {
      const response = await fetch("/api/gems", {
        method: "GET",
        cache: "no-store",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        suggestions?: ContributionSummary[];
      };
      if (response.status === 401) {
        setAuthState("anonymous");
        setSuggestions([]);
        return;
      }
      if (response.status === 403 || result.error === "verified_account_required") {
        setAuthState("unverified");
        setSuggestions([]);
        return;
      }
      if (!response.ok || !Array.isArray(result.suggestions)) {
        setAuthState("unavailable");
        return;
      }
      setSuggestions(result.suggestions);
      setAuthState("authenticated");
    } catch {
      setAuthState("unavailable");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadContributions(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadContributions]);

  const errorMessage = (code?: string) => {
    if (code === "authentication_required") return text.loginBody;
    if (code === "verified_account_required") return text.unverifiedBody;
    if (code === "duplicate_contribution") return t("contribute.duplicate");
    if (code === "rate_limit_exceeded") return text.rateLimit;
    if (code === "image_too_large" || code === "invalid_file_type") return text.invalidPhoto;
    if (code === "invalid_image") return text.invalidImage;
    if (code === "image_too_small") return text.smallImage;
    if (code === "image_must_be_landscape") return text.landscape;
    if (code === "terms_required") return text.terms;
    if (code === "invalid_contribution" || code === "invalid_map_url") {
      return t("contribute.invalid");
    }
    return t("contribute.unavailable");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const photo = form.get("photo");

    if (
      !(photo instanceof File) ||
      photo.size <= 0 ||
      photo.size > MAX_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
    ) {
      setFeedback({ message: text.invalidPhoto, tone: "error" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    requestIdRef.current ??= crypto.randomUUID();
    form.set("clientRequestId", requestIdRef.current);

    try {
      const response = await fetch("/api/gems", {
        method: "POST",
        body: form,
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        suggestion?: {
          id?: string;
          name?: string;
          status?: ContributionStatus;
        };
      };

      if (!response.ok || !result.suggestion?.id || result.suggestion.status !== "pending") {
        if (response.status === 401) setAuthState("anonymous");
        if (response.status === 403) setAuthState("unverified");
        setFeedback({ message: errorMessage(result.error), tone: "error" });
        return;
      }

      const submitted: ContributionSummary = {
        id: result.suggestion.id,
        name: result.suggestion.name || String(form.get("name") ?? "").trim(),
        status: "pending",
        created_at: new Date().toISOString(),
      };
      setSuggestions((current) => [
        submitted,
        ...current.filter((item) => item.id !== submitted.id),
      ]);
      requestIdRef.current = null;
      formElement.reset();
      setFeedback({ message: text.success, tone: "success" });
    } catch {
      // Keep the request id so a retry is idempotent if the server completed
      // the first request but the response was lost.
      setFeedback({ message: t("contribute.unavailable"), tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (status: ContributionStatus) => text[status];

  return (
    <section className="contribution-card" aria-labelledby="contribution-title">
      <div className="contribution-intro">
        <span className="contribution-icon"><Gem aria-hidden="true" size={25} /></span>
        <div>
          <p className="eyebrow">{t("contribute.eyebrow")}</p>
          <h2 id="contribution-title">{t("contribute.title")}</h2>
          <p>{t("contribute.intro")}</p>
        </div>
        <strong className="contribution-reward">
          <Sparkles aria-hidden="true" size={17} />{text.reward}
        </strong>
      </div>

      {authState === "checking" && (
        <p className="contribution-status" role="status">
          <LoaderCircle className="spin" aria-hidden="true" size={18} />{text.checking}
        </p>
      )}

      {(authState === "anonymous" || authState === "unverified") && (
        <div className="contribution-status contribution-auth-required" role="status">
          <CircleAlert aria-hidden="true" size={20} />
          <div>
            <strong>{authState === "unverified" ? text.unverifiedTitle : text.loginTitle}</strong>
            <p>{authState === "unverified" ? text.unverifiedBody : text.loginBody}</p>
            <a className="primary-button" href="/app/profile">
              <LogIn aria-hidden="true" size={18} />{text.loginAction}
            </a>
          </div>
        </div>
      )}

      {authState === "unavailable" && (
        <div className="contribution-status" role="alert">
          <CircleAlert aria-hidden="true" size={20} />
          <span>{text.unavailable}</span>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setAuthState("checking");
              void loadContributions();
            }}
          >
            {text.retry}
          </button>
        </div>
      )}

      {authState === "authenticated" && (
        <>
          <form onSubmit={submit} className="contribution-form">
            <label>
              <span>{t("contribute.name")}</span>
              <input name="name" minLength={3} maxLength={90} required />
            </label>
            <label>
              <span>{t("contribute.region")}</span>
              <select name="region" defaultValue="aosta" required>
                {regionCodes.filter((value): value is Exclude<RegionCode, "all"> => value !== "all").map((value) => (
                  <option key={value} value={value}>{t(`data.region.${value}`)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("contribute.category")}</span>
              <select name="category" defaultValue="nature" required>
                {categories.map((value) => (
                  <option key={value} value={value}>{t(`contribute.category.${value}`)}</option>
                ))}
              </select>
            </label>
            <label className="contribution-description">
              <span>{t("contribute.why")}</span>
              <textarea name="description" minLength={20} maxLength={500} rows={4} required />
            </label>
            <label className="contribution-map-link">
              <span><MapPinned aria-hidden="true" size={16} />{t("contribute.mapUrl")}</span>
              <input name="mapUrl" type="url" inputMode="url" placeholder="https://maps.google.com/…" />
              <small>{t("contribute.mapHelp")}</small>
            </label>
            <label className="contribution-photo">
              <span><Camera aria-hidden="true" size={16} />{text.photo}</span>
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
              <small>{text.photoHelp}</small>
            </label>
            <label className="contribution-consent">
              <input name="termsAccepted" type="checkbox" value="true" required />
              <span>{text.consent}</span>
            </label>
            <p className="contribution-disclosure">{t("contribute.disclosure")}</p>
            <button className="primary-button" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" aria-hidden="true" size={18} /> : <Gem aria-hidden="true" size={18} />}
              {t(submitting ? "contribute.submitting" : "contribute.submit")}
            </button>
            {feedback && (
              <p className={`contribution-status is-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
                {feedback.message}
              </p>
            )}
          </form>

          {suggestions.length > 0 && (
            <section className="contribution-submissions" aria-labelledby="contribution-recent-title">
              <h3 id="contribution-recent-title">{text.recent}</h3>
              <div>
                {suggestions.map((suggestion) => (
                  <article key={suggestion.id}>
                    <div>
                      <strong>{suggestion.name}</strong>
                      <small>{new Date(suggestion.created_at).toLocaleString(locale)}</small>
                    </div>
                    <span className={`contribution-state is-${suggestion.status}`}>
                      {statusLabel(suggestion.status)}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}
