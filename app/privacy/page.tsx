"use client";

import { AlertTriangle, Clock3, Database, Download, Globe2, MapPin, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../components/AuthProvider";
import MarketingHeader from "../components/MarketingHeader";
import { usePersistentLocale } from "../hooks/usePersistentLocale";
import { marketingCopy } from "../i18n/marketing";
import { setPersistenceScope } from "../product/storage";

const privacy = {
  en: {
    title: "Privacy notice", intro: "This notice describes the current GemGo beta. The legal controller identity and privacy contact still have to be confirmed before public production launch.", cards: [
      ["Guest and account data", "Guests keep plans, demo points and settings in the browser. With an account, Supabase Auth processes identity data and GemGo synchronises saved trips and collections to its EU database."],
      ["Location and photos", "Precise location is requested only after an explicit action for routing or a check-in; GemGo does not keep continuous movement history. A gem proposal uploads the chosen photo to a private moderation bucket."],
      ["Purposes and legal bases", "Account and sync data are processed to provide the requested service. Optional location and photo submission follow your action and consent. Security, moderation and anti-fraud records support GemGo’s legitimate interest in protecting the service."],
      ["Providers and transfers", "Supabase (EU West) provides Auth, database and private Storage; Vercel hosts the app. Google processes OAuth if you choose it. OpenStreetMap, Open-Meteo and Wikimedia Commons may receive network data when maps, forecasts or photos load."],
      ["Retention", "Browser data remains until you remove it. Account data currently remains until account deletion. Contribution and moderation retention, automated rejected-photo cleanup and the final legal schedule must be approved before public production."],
      ["Your rights", "You may export local and account records below. Access, correction, erasure, restriction, portability and objection requests require a published controller contact; that is an open launch blocker."],
    ], export: "Export my data", exporting: "Preparing export…", exportError: "The export could not be completed. Sign in again or retry.", remove: "Delete local data", removed: "Local GemGo data deleted. Cloud account data was not deleted.", removeError: "Browser storage is unavailable, so local data could not be deleted.", localOnly: "Delete only GemGo data stored in this browser, or export a portable copy of local and signed-in account data.", deleteAccount: "Delete account and cloud data", deleteHelp: "This immediately removes synced trips, collections, account links, verifications and verified-point records, withdraws pending proposals, blocks further writes and signs out every session. Reviewed contributions, private media and the Auth identity enter the secure deletion queue.", deleteConfirm: "Type DELETE to confirm this irreversible request.", deletePlaceholder: "DELETE", deleting: "Requesting deletion…", deleteQueued: "Deletion queued. Cloud writes are blocked and all sessions are being signed out.", deleteError: "The deletion request could not be completed. Export your data and retry.", ownerTransfer: "An owner must transfer or give up the owner role before deleting the account.", updated: "Beta notice · 13 August 2026",
  },
  it: {
    title: "Informativa sulla privacy", intro: "Questa informativa descrive l’attuale beta GemGo. L’identità del titolare e il contatto privacy devono ancora essere confermati prima del lancio pubblico in produzione.", cards: [
      ["Dati ospite e account", "Gli ospiti conservano nel browser piani, punti demo e impostazioni. Con un account, Supabase Auth tratta i dati identificativi e GemGo sincronizza viaggi e raccolte nel database UE."],
      ["Posizione e foto", "La posizione precisa viene richiesta solo dopo un’azione esplicita per percorso o check-in; GemGo non conserva uno storico continuo. Una proposta di gem carica la foto scelta in un bucket privato per la moderazione."],
      ["Finalità e basi giuridiche", "Account e sincronizzazione servono a fornire il servizio richiesto. Posizione opzionale e invio foto seguono la tua azione e il consenso. Sicurezza, moderazione e anti-frode rispondono al legittimo interesse di proteggere il servizio."],
      ["Fornitori e trasferimenti", "Supabase (UE Ovest) fornisce Auth, database e Storage privato; Vercel ospita l’app. Google tratta l’OAuth se lo scegli. OpenStreetMap, Open-Meteo e Wikimedia Commons possono ricevere dati di rete quando carichi mappe, meteo o immagini."],
      ["Conservazione", "I dati del browser restano finché li rimuovi. I dati account restano attualmente fino alla cancellazione. La durata dei contributi, la pulizia automatica delle foto rifiutate e il piano legale finale vanno approvati prima della produzione pubblica."],
      ["I tuoi diritti", "Puoi esportare qui i dati locali e dell’account. Accesso, rettifica, cancellazione, limitazione, portabilità e opposizione richiedono un contatto del titolare pubblicato: è un blocco aperto per il lancio."],
    ], export: "Esporta i miei dati", exporting: "Preparazione export…", exportError: "Impossibile completare l’export. Accedi di nuovo o riprova.", remove: "Elimina dati locali", removed: "Dati GemGo locali eliminati. I dati cloud dell’account non sono stati cancellati.", removeError: "Lo spazio del browser non è disponibile, quindi i dati locali non sono stati eliminati.", localOnly: "Elimina soltanto i dati GemGo salvati in questo browser oppure esporta una copia portabile dei dati locali e dell’account connesso.", deleteAccount: "Elimina account e dati cloud", deleteHelp: "Rimuove subito viaggi e raccolte sincronizzati, account collegati, verifiche e GemPoints verificati; ritira le proposte in attesa, blocca nuove scritture e disconnette tutte le sessioni. Contributi revisionati, media privati e identità Auth entrano nella coda di cancellazione sicura.", deleteConfirm: "Scrivi DELETE per confermare questa richiesta irreversibile.", deletePlaceholder: "DELETE", deleting: "Richiesta di cancellazione…", deleteQueued: "Cancellazione accodata. Le scritture cloud sono bloccate e tutte le sessioni vengono disconnesse.", deleteError: "Impossibile completare la richiesta. Esporta i dati e riprova.", ownerTransfer: "Un owner deve trasferire o rinunciare al ruolo owner prima di eliminare l’account.", updated: "Informativa beta · 13 agosto 2026",
  },
  de: {
    title: "Datenschutzhinweis", intro: "Dieser Hinweis beschreibt die aktuelle GemGo-Beta. Verantwortlicher und Datenschutzkontakt müssen vor dem öffentlichen Produktivstart noch bestätigt werden.", cards: [
      ["Gast- und Kontodaten", "Gäste speichern Pläne, Demo-Punkte und Einstellungen im Browser. Mit Konto verarbeitet Supabase Auth Identitätsdaten; GemGo synchronisiert Reisen und Sammlungen in die EU-Datenbank."],
      ["Standort und Fotos", "Der genaue Standort wird nur nach einer ausdrücklichen Aktion für Route oder Check-in angefragt; es gibt kein laufendes Bewegungsprofil. Für einen Gem-Vorschlag wird das gewählte Foto in einen privaten Moderationsspeicher hochgeladen."],
      ["Zwecke und Rechtsgrundlagen", "Konto und Synchronisierung dienen dem angeforderten Dienst. Optionale Standort- und Fotoverarbeitung folgen Ihrer Handlung und Einwilligung. Sicherheit, Moderation und Betrugsabwehr schützen den Dienst im berechtigten Interesse."],
      ["Anbieter und Übermittlungen", "Supabase (EU West) stellt Auth, Datenbank und privaten Speicher bereit; Vercel hostet die App. Google verarbeitet OAuth, wenn gewählt. OpenStreetMap, Open-Meteo und Wikimedia Commons können beim Laden Netzwerkdaten erhalten."],
      ["Aufbewahrung", "Browserdaten bleiben bis zur Löschung. Kontodaten bleiben derzeit bis zur Kontolöschung. Fristen für Beiträge, automatische Löschung abgelehnter Fotos und der endgültige Rechtsplan müssen vor dem öffentlichen Start freigegeben werden."],
      ["Ihre Rechte", "Lokale und Kontodaten können unten exportiert werden. Auskunft, Berichtigung, Löschung, Einschränkung, Portabilität und Widerspruch benötigen einen veröffentlichten Kontakt; dieser bleibt ein Startblocker."],
    ], export: "Meine Daten exportieren", exporting: "Export wird vorbereitet…", exportError: "Export fehlgeschlagen. Bitte erneut anmelden oder versuchen.", remove: "Lokale Daten löschen", removed: "Lokale GemGo-Daten gelöscht. Cloud-Kontodaten wurden nicht gelöscht.", removeError: "Der Browserspeicher ist nicht verfügbar; lokale Daten konnten nicht gelöscht werden.", localOnly: "Löschen Sie nur die GemGo-Daten dieses Browsers oder exportieren Sie eine portable Kopie der lokalen und angemeldeten Kontodaten.", deleteAccount: "Konto und Cloud-Daten löschen", deleteHelp: "Synchronisierte Reisen, Sammlungen, Kontoverknüpfungen, Nachweise und bestätigte Punkte werden sofort entfernt; ausstehende Vorschläge werden zurückgezogen, Schreibzugriffe gesperrt und alle Sitzungen abgemeldet. Geprüfte Beiträge, private Medien und die Auth-Identität gelangen in die sichere Löschwarteschlange.", deleteConfirm: "Zum Bestätigen dieser unwiderruflichen Anfrage DELETE eingeben.", deletePlaceholder: "DELETE", deleting: "Löschung wird angefordert…", deleteQueued: "Löschung vorgemerkt. Cloud-Schreibzugriffe sind gesperrt und alle Sitzungen werden abgemeldet.", deleteError: "Die Löschanfrage konnte nicht abgeschlossen werden. Daten exportieren und erneut versuchen.", ownerTransfer: "Ein Owner muss die Owner-Rolle übertragen oder abgeben, bevor das Konto gelöscht wird.", updated: "Beta-Hinweis · 13. August 2026",
  },
  fr: {
    title: "Notice de confidentialité", intro: "Cette notice décrit la version bêta actuelle de GemGo. L’identité du responsable et le contact vie privée doivent encore être confirmés avant le lancement public.", cards: [
      ["Données invité et compte", "Les invités conservent plans, points démo et réglages dans le navigateur. Avec un compte, Supabase Auth traite l’identité et GemGo synchronise voyages et collections dans sa base européenne."],
      ["Position et photos", "La position précise n’est demandée qu’après une action explicite pour un itinéraire ou un check-in ; aucun historique continu n’est conservé. Une proposition envoie la photo choisie dans un espace privé de modération."],
      ["Finalités et bases légales", "Le compte et la synchronisation fournissent le service demandé. La position et la photo facultatives suivent votre action et votre consentement. Sécurité, modération et lutte antifraude répondent à l’intérêt légitime de protéger le service."],
      ["Prestataires et transferts", "Supabase (UE Ouest) fournit Auth, base et stockage privé ; Vercel héberge l’app. Google traite l’OAuth si choisi. OpenStreetMap, Open-Meteo et Wikimedia Commons peuvent recevoir des données réseau lors du chargement."],
      ["Conservation", "Les données du navigateur restent jusqu’à leur suppression. Les données du compte restent actuellement jusqu’à sa suppression. Les durées des contributions, le nettoyage automatique des photos refusées et le calendrier légal restent à approuver."],
      ["Vos droits", "Vous pouvez exporter ici les données locales et du compte. Accès, rectification, effacement, limitation, portabilité et opposition exigent un contact publié ; il s’agit d’un blocage avant lancement."],
    ], export: "Exporter mes données", exporting: "Préparation de l’export…", exportError: "L’export a échoué. Reconnectez-vous ou réessayez.", remove: "Effacer les données locales", removed: "Données GemGo locales effacées. Les données cloud du compte ne l’ont pas été.", removeError: "Le stockage du navigateur est indisponible ; les données locales n’ont pas pu être effacées.", localOnly: "Effacez uniquement les données GemGo de ce navigateur ou exportez une copie portable des données locales et du compte connecté.", deleteAccount: "Supprimer le compte et les données cloud", deleteHelp: "Les voyages, collections, comptes liés, vérifications et points vérifiés sont supprimés immédiatement ; les propositions en attente sont retirées, les écritures bloquées et toutes les sessions déconnectées. Les contributions examinées, médias privés et l’identité Auth passent dans la file de suppression sécurisée.", deleteConfirm: "Saisissez DELETE pour confirmer cette demande irréversible.", deletePlaceholder: "DELETE", deleting: "Demande de suppression…", deleteQueued: "Suppression mise en file. Les écritures cloud sont bloquées et toutes les sessions sont déconnectées.", deleteError: "La demande de suppression a échoué. Exportez vos données et réessayez.", ownerTransfer: "Un owner doit transférer ou abandonner le rôle owner avant de supprimer son compte.", updated: "Notice bêta · 13 août 2026",
  },
  sl: {
    title: "Obvestilo o zasebnosti", intro: "To obvestilo opisuje trenutno beta različico GemGo. Identiteto upravljavca in kontakt za zasebnost je treba potrditi pred javnim produkcijskim zagonom.", cards: [
      ["Podatki gosta in računa", "Gostje hranijo načrte, predstavitvene točke in nastavitve v brskalniku. Z računom Supabase Auth obdeluje identiteto, GemGo pa poti in zbirke sinhronizira v podatkovno zbirko EU."],
      ["Lokacija in fotografije", "Natančna lokacija se zahteva le po izrecnem dejanju za pot ali prijavo; stalne zgodovine gibanja ni. Predlog bisera izbrano fotografijo naloži v zasebno shrambo za moderiranje."],
      ["Nameni in pravne podlage", "Račun in sinhronizacija zagotavljata zahtevano storitev. Neobvezna lokacija in fotografija sledita vašemu dejanju in privolitvi. Varnost, moderiranje in preprečevanje zlorab podpirajo zakoniti interes varovanja storitve."],
      ["Ponudniki in prenosi", "Supabase (EU West) zagotavlja Auth, podatkovno zbirko in zasebno shrambo; Vercel gosti aplikacijo. Google obdeluje OAuth, če ga izberete. OpenStreetMap, Open-Meteo in Wikimedia Commons lahko ob nalaganju prejmejo omrežne podatke."],
      ["Hramba", "Podatki brskalnika ostanejo do izbrisa. Podatki računa trenutno ostanejo do izbrisa računa. Roke prispevkov, samodejni izbris zavrnjenih fotografij in končni pravni načrt je treba potrditi pred javnim zagonom."],
      ["Vaše pravice", "Spodaj lahko izvozite lokalne podatke in podatke računa. Dostop, popravek, izbris, omejitev, prenosljivost in ugovor potrebujejo objavljen kontakt; to ostaja ovira za zagon."],
    ], export: "Izvozi moje podatke", exporting: "Priprava izvoza…", exportError: "Izvoza ni bilo mogoče dokončati. Znova se prijavite ali poskusite.", remove: "Izbriši lokalne podatke", removed: "Lokalni podatki GemGo so izbrisani. Podatki računa v oblaku niso bili izbrisani.", removeError: "Shramba brskalnika ni na voljo, zato lokalnih podatkov ni bilo mogoče izbrisati.", localOnly: "Izbrišite samo podatke GemGo v tem brskalniku ali izvozite prenosljivo kopijo lokalnih podatkov in podatkov prijavljenega računa.", deleteAccount: "Izbriši račun in podatke v oblaku", deleteHelp: "Sinhronizirane poti, zbirke, povezani računi, preverjanja in potrjene točke se takoj odstranijo; čakajoči predlogi se umaknejo, pisanje se blokira in vse seje odjavijo. Pregledani prispevki, zasebni mediji in identiteta Auth gredo v varno čakalno vrsto za izbris.", deleteConfirm: "Za potrditev te nepovratne zahteve vnesite DELETE.", deletePlaceholder: "DELETE", deleting: "Zahteva za izbris…", deleteQueued: "Izbris je v čakalni vrsti. Pisanje v oblak je blokirano in vse seje se odjavljajo.", deleteError: "Zahteve za izbris ni bilo mogoče dokončati. Izvozite podatke in poskusite znova.", ownerTransfer: "Owner mora pred izbrisom računa prenesti ali opustiti vlogo owner.", updated: "Beta obvestilo · 13. avgust 2026",
  },
} as const;

const icons = [Database, MapPin, ShieldCheck, Globe2, Clock3, UserRound];

const belongsToCurrentAccount = (key: string, userId?: string) => {
  if (key.includes(":user:")) {
    return Boolean(userId && key.endsWith(`:user:${userId}`));
  }
  if (key.startsWith("gemgo-cloud-import-v1:")) {
    return Boolean(userId && key === `gemgo-cloud-import-v1:${userId}`);
  }
  return true;
};

export default function PrivacyPage() {
  const auth = useAuth();
  const { locale, setLocale } = usePersistentLocale();
  const t = privacy[locale];
  const copy = marketingCopy[locale];
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [status, setStatus] = useState("");

  const exportData = async () => {
    setExporting(true);
    setStatus("");
    try {
      const local: Record<string, string | null> = {};
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (
          key?.startsWith("gemgo") &&
          belongsToCurrentAccount(key, auth.user?.id)
        ) {
          local[key] = localStorage.getItem(key);
        }
      }
      let account: Record<string, unknown> | null = null;
      if (auth.user) {
        const response = await fetch("/api/account/export", { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error("cloud export failed");
        account = await response.json() as Record<string, unknown>;
      }
      const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), local, account }, null, 2)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "gemgo-data-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setStatus(t.exportError);
    } finally {
      setExporting(false);
    }
  };

  const clearLocalNamespace = () => {
    Object.keys(localStorage).filter((key) => key.startsWith("gemgo")).forEach((key) => localStorage.removeItem(key));
    Object.keys(sessionStorage).filter((key) => key.startsWith("gemgo")).forEach((key) => sessionStorage.removeItem(key));
  };

  const removeLocal = () => {
    if (!window.confirm(`${t.remove}?`)) return;
    try {
      clearLocalNamespace();
    } catch {
      setStatus(t.removeError);
      return;
    }
    // Clearing the namespace marker while an authenticated session remains
    // active would route subsequent saves into the guest cache. Restore only
    // the active scope marker; all actual local records stay deleted.
    setPersistenceScope(auth.user?.id ?? null);
    setStatus(t.removed);
  };

  const deleteAccount = async () => {
    if (!auth.user || deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    setStatus("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setStatus(result.error === "owner_transfer_required" ? t.ownerTransfer : t.deleteError);
        return;
      }
      clearLocalNamespace();
      setDeleteConfirmation("");
      setStatus(t.deleteQueued);
      window.setTimeout(() => window.location.assign("/"), 1400);
    } catch {
      setStatus(t.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="marketing-page standalone-info-page">
      <MarketingHeader locale={locale} onLocaleChange={setLocale} copy={copy} />
      <section className="info-page-hero privacy-title"><span className="eyebrow"><ShieldCheck size={15} />GDPR</span><h1>{t.title}</h1><p>{t.intro}</p><small>{t.updated}</small></section>
      <section className="privacy-policy-grid">{t.cards.map(([title, body], index) => { const Icon = icons[index]; return <article key={title}><Icon /><h2>{title}</h2><p>{body}</p></article>; })}</section>
      <section className="privacy-control-card"><div><h2>{t.cards[5][0]}</h2><p>{t.localOnly}</p></div><div><button className="button button-secondary" disabled={exporting} onClick={() => void exportData()}><Download />{exporting ? t.exporting : t.export}</button><button className="button privacy-delete-button" onClick={removeLocal}><Trash2 />{t.remove}</button></div>{status && <p role="status">{status}</p>}</section>
      {auth.user && <section className="privacy-control-card privacy-account-delete"><div><span className="eyebrow"><AlertTriangle size={15} />{t.deleteAccount}</span><h2>{t.deleteAccount}</h2><p>{t.deleteHelp}</p><label><span>{t.deleteConfirm}</span><input autoComplete="off" spellCheck={false} value={deleteConfirmation} placeholder={t.deletePlaceholder} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label></div><div><button className="button privacy-delete-button" disabled={deleting || deleteConfirmation !== "DELETE"} onClick={() => void deleteAccount()}><Trash2 />{deleting ? t.deleting : t.deleteAccount}</button></div></section>}
    </main>
  );
}
