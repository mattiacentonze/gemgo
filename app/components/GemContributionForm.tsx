"use client";

import {
  Camera,
  CircleAlert,
  Gem,
  LoaderCircle,
  LogIn,
  LocateFixed,
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

type LocationEvidence = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

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
    photoHelp: "JPG, PNG or WebP, maximum 4 MB. Image metadata is removed; the separate location claim is retained for moderation.",
    gpsTitle: "Location claim at the gem",
    gpsHelp: "Capture your position while you are at the place. GemGo stores one coordinate and its accuracy, never a continuous track. Browser GPS can be spoofed, so an editor still reviews it.",
    gpsCapture: "Capture current location",
    gpsCapturing: "Capturing location…",
    gpsReady: "Location captured · ±{accuracy} m",
    gpsError: "A fresh location with accuracy within 500 m is required for a reward-eligible proposal.",
    gpsRequired: "Capture your current location before submitting.",
    outsideRegion: "The captured location is outside the selected pilot region.",
    duplicateMedia: "This photo is identical or very similar to one already under review.",
    farmingLimit: "The rolling contribution/reward limit has been reached. Try again later.",
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
    photoHelp: "JPG, PNG o WebP, massimo 4 MB. I metadati dell’immagine vengono rimossi; la posizione separata resta disponibile per la moderazione.",
    gpsTitle: "Posizione dichiarata presso la gem",
    gpsHelp: "Acquisisci la posizione mentre sei sul posto. GemGo conserva una sola coordinata con la precisione, mai il percorso continuo. Il GPS del browser può essere falsificato, quindi un editor lo verifica comunque.",
    gpsCapture: "Acquisisci posizione attuale",
    gpsCapturing: "Acquisizione posizione…",
    gpsReady: "Posizione acquisita · ±{accuracy} m",
    gpsError: "Per una proposta premiabile serve una posizione recente con precisione entro 500 m.",
    gpsRequired: "Acquisisci la posizione attuale prima di inviare.",
    outsideRegion: "La posizione acquisita è fuori dalla regione pilota selezionata.",
    duplicateMedia: "Questa foto è identica o molto simile a una già in revisione.",
    farmingLimit: "Hai raggiunto il limite progressivo di contributi e premi. Riprova più avanti.",
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
    photoHelp: "JPG, PNG oder WebP, maximal 4 MB. Bildmetadaten werden entfernt; der separate Standortnachweis bleibt für die Prüfung erhalten.",
    gpsTitle: "Standortangabe am Fundort",
    gpsHelp: "Erfasse deinen Standort direkt am Ort. GemGo speichert nur eine Koordinate samt Genauigkeit, niemals einen Bewegungsverlauf. Browser-GPS kann manipuliert werden und wird deshalb redaktionell geprüft.",
    gpsCapture: "Aktuellen Standort erfassen",
    gpsCapturing: "Standort wird erfasst…",
    gpsReady: "Standort erfasst · ±{accuracy} m",
    gpsError: "Für einen belohnungsfähigen Vorschlag ist ein aktueller Standort mit höchstens 500 m Genauigkeit erforderlich.",
    gpsRequired: "Erfasse vor dem Senden deinen aktuellen Standort.",
    outsideRegion: "Der erfasste Standort liegt außerhalb der ausgewählten Pilotregion.",
    duplicateMedia: "Dieses Foto ist mit einem bereits geprüften Bild identisch oder ihm sehr ähnlich.",
    farmingLimit: "Das laufende Beitrags- und Belohnungslimit ist erreicht. Versuche es später erneut.",
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
    photoHelp: "JPG, PNG ou WebP, 4 Mo maximum. Les métadonnées de l’image sont supprimées ; la position séparée reste disponible pour la modération.",
    gpsTitle: "Position déclarée sur le lieu",
    gpsHelp: "Enregistrez votre position lorsque vous êtes sur place. GemGo conserve un seul point et sa précision, jamais un trajet continu. Le GPS du navigateur pouvant être falsifié, un éditeur le contrôle toujours.",
    gpsCapture: "Enregistrer la position actuelle",
    gpsCapturing: "Enregistrement de la position…",
    gpsReady: "Position enregistrée · ±{accuracy} m",
    gpsError: "Une position récente et précise à 500 m près est nécessaire pour une proposition pouvant être récompensée.",
    gpsRequired: "Enregistrez votre position actuelle avant l’envoi.",
    outsideRegion: "La position enregistrée se trouve hors de la région pilote choisie.",
    duplicateMedia: "Cette photo est identique ou très proche d’une image déjà en cours d’examen.",
    farmingLimit: "La limite glissante de contributions et de récompenses est atteinte. Réessayez plus tard.",
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
    photoHelp: "JPG, PNG ali WebP, največ 4 MB. Metapodatki slike se odstranijo; ločena lokacija ostane za moderiranje.",
    gpsTitle: "Navedena lokacija pri biseru",
    gpsHelp: "Zajemi položaj, ko si na kraju. GemGo shrani le eno koordinato in natančnost, nikoli neprekinjene poti. GPS brskalnika je mogoče ponarediti, zato ga vedno pregleda urednik.",
    gpsCapture: "Zajemi trenutno lokacijo",
    gpsCapturing: "Zajemanje lokacije…",
    gpsReady: "Lokacija zajeta · ±{accuracy} m",
    gpsError: "Za predlog, upravičen do nagrade, je potrebna sveža lokacija z natančnostjo do 500 m.",
    gpsRequired: "Pred oddajo zajemi trenutno lokacijo.",
    outsideRegion: "Zajeta lokacija je zunaj izbrane pilotne regije.",
    duplicateMedia: "Ta fotografija je enaka ali zelo podobna že pregledovani fotografiji.",
    farmingLimit: "Dosežena je drseča omejitev prispevkov in nagrad. Poskusi pozneje.",
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
  const [locating, setLocating] = useState(false);
  const [locationEvidence, setLocationEvidence] =
    useState<LocationEvidence | null>(null);
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
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
    if (code === "reward_farming_limit") return text.farmingLimit;
    if (code === "location_required") return text.gpsRequired;
    if (code === "location_outside_region") return text.outsideRegion;
    if (code === "duplicate_media") return text.duplicateMedia;
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

  const captureLocation = () => {
    setFeedback(null);
    if (!("geolocation" in navigator)) {
      setFeedback({ message: text.gpsError, tone: "error" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        if (!Number.isFinite(position.coords.accuracy) || position.coords.accuracy > 500) {
          setLocationEvidence(null);
          setFeedback({ message: text.gpsError, tone: "error" });
          return;
        }
        setLocationEvidence({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        });
      },
      () => {
        setLocating(false);
        setLocationEvidence(null);
        setFeedback({ message: text.gpsError, tone: "error" });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const photo = form.get("photo");

    if (!locationEvidence) {
      setFeedback({ message: text.gpsRequired, tone: "error" });
      return;
    }

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
    form.set("formStartedAt", String(formStartedAt));
    form.set("locationLatitude", String(locationEvidence.latitude));
    form.set("locationLongitude", String(locationEvidence.longitude));
    form.set("locationAccuracy", String(locationEvidence.accuracy));
    form.set("locationCapturedAt", locationEvidence.capturedAt);

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
      setLocationEvidence(null);
      setFormStartedAt(Date.now());
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
            <label className="contribution-honeypot" aria-hidden="true">
              <span>Website</span>
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
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
            <div className="contribution-location-evidence">
              <span><LocateFixed aria-hidden="true" size={18} />{text.gpsTitle}</span>
              <p>{text.gpsHelp}</p>
              <button
                type="button"
                className="button button-secondary"
                disabled={locating}
                onClick={captureLocation}
              >
                {locating ? <LoaderCircle className="spin" aria-hidden="true" size={18} /> : <LocateFixed aria-hidden="true" size={18} />}
                {locating ? text.gpsCapturing : text.gpsCapture}
              </button>
              {locationEvidence && (
                <small role="status">
                  {text.gpsReady.replace("{accuracy}", String(Math.round(locationEvidence.accuracy)))}
                </small>
              )}
            </div>
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
