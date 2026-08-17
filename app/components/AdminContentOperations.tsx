"use client";

import { BedDouble, FileClock, Images, Languages, Save, Send, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "../../lib/supabase/client";
import { accommodations } from "../content";
import type { Locale } from "../domain";
import { localizedExperienceCaption } from "../i18n/experience-content";
import { catalogueExperiences } from "../product/catalogue";
import type { AppRole } from "./AuthProvider";

type EditorialStatus = "draft" | "published" | "archived";
type Section = "destinations" | "accommodations" | "media" | "audit";

type DestinationRow = {
  id: string;
  destination_id: string;
  locale: Locale;
  name: string;
  summary: string;
  operational_note: string | null;
  opening_hours: string | null;
  price_information: string | null;
  seasonality: string | null;
  source_url: string;
  source_label: string;
  source_checked_at: string;
  status: EditorialStatus;
  version: number;
};

type AccommodationRow = {
  id: string;
  name: string;
  area: string;
  region: "fussen_allgau" | "bavaria" | "aosta";
  latitude: number;
  longitude: number;
  rating: number | null;
  review_count: number | null;
  price_band: string | null;
  booking_url: string | null;
  source_url: string;
  checked_at: string;
  status: EditorialStatus;
  version: number;
};

type MediaRow = {
  id: string;
  destination_id: string;
  object_path: string | null;
  source_url: string;
  author: string;
  license: string;
  attribution: string;
  width: number;
  height: number;
  sort_order: number;
  status: "draft" | "published" | "rejected";
  review_note: string | null;
  version: number;
};

type AuditRow = {
  id: number;
  entity_type: string;
  entity_id: string;
  locale: Locale | null;
  action: string;
  actor_id: string | null;
  created_at: string;
};

const copy = {
  en: { title: "Editorial catalogue", intro: "Create reviewed, source-backed destination, stay and media records. Editors prepare drafts; admins publish or archive them.", destinations: "Destinations", stays: "Stays", media: "Media", audit: "Audit trail", locale: "Content language", status: "Status", name: "Name", summary: "Curated description", note: "Operational note", hours: "Opening information", price: "Price information", season: "Seasonality", source: "Official source URL", sourceLabel: "Source name", checked: "Source checked on", save: "Save draft", publish: "Publish", archive: "Archive", error: "The editorial change could not be saved.", saved: "Editorial record saved.", area: "Area", region: "Region", lat: "Latitude", lng: "Longitude", rating: "Rating", reviews: "Review count", booking: "Booking URL", select: "Select record", newMedia: "New media record", author: "Author", license: "Licence", attribution: "Attribution", dimensions: "Image dimensions", order: "Order", reviewNote: "Review note", immutable: "Every create, edit and publication is appended to the immutable audit trail.", noAudit: "No editorial events yet.", locked: "Published records require an admin for further edits." },
  it: { title: "Catalogo editoriale", intro: "Crea schede di destinazioni, alloggi e media revisionate e basate su fonti. Gli editor preparano bozze; gli admin pubblicano o archiviano.", destinations: "Destinazioni", stays: "Alloggi", media: "Media", audit: "Registro audit", locale: "Lingua contenuto", status: "Stato", name: "Nome", summary: "Descrizione curata", note: "Nota operativa", hours: "Informazioni sugli orari", price: "Informazioni sui prezzi", season: "Stagionalità", source: "URL fonte ufficiale", sourceLabel: "Nome fonte", checked: "Fonte verificata il", save: "Salva bozza", publish: "Pubblica", archive: "Archivia", error: "Impossibile salvare la modifica editoriale.", saved: "Scheda editoriale salvata.", area: "Area", region: "Regione", lat: "Latitudine", lng: "Longitudine", rating: "Valutazione", reviews: "Numero recensioni", booking: "URL prenotazione", select: "Seleziona scheda", newMedia: "Nuovo media", author: "Autore", license: "Licenza", attribution: "Attribuzione", dimensions: "Dimensioni immagine", order: "Ordine", reviewNote: "Nota revisione", immutable: "Ogni creazione, modifica e pubblicazione viene aggiunta al registro audit immutabile.", noAudit: "Nessun evento editoriale.", locked: "Le schede pubblicate richiedono un admin per ulteriori modifiche." },
  de: { title: "Redaktioneller Katalog", intro: "Quellenbasierte Ziele, Unterkünfte und Medien verwalten. Redakteure erstellen Entwürfe; Admins veröffentlichen oder archivieren.", destinations: "Ziele", stays: "Unterkünfte", media: "Medien", audit: "Auditprotokoll", locale: "Inhaltssprache", status: "Status", name: "Name", summary: "Kuratierte Beschreibung", note: "Betriebshinweis", hours: "Öffnungsinformationen", price: "Preisinformation", season: "Saisonalität", source: "Offizielle Quell-URL", sourceLabel: "Quellenname", checked: "Quelle geprüft am", save: "Entwurf speichern", publish: "Veröffentlichen", archive: "Archivieren", error: "Die redaktionelle Änderung konnte nicht gespeichert werden.", saved: "Redaktioneller Datensatz gespeichert.", area: "Gebiet", region: "Region", lat: "Breitengrad", lng: "Längengrad", rating: "Bewertung", reviews: "Anzahl Bewertungen", booking: "Buchungs-URL", select: "Datensatz auswählen", newMedia: "Neuer Medieneintrag", author: "Urheber", license: "Lizenz", attribution: "Namensnennung", dimensions: "Bildabmessungen", order: "Reihenfolge", reviewNote: "Prüfnotiz", immutable: "Jede Erstellung, Änderung und Veröffentlichung wird unveränderlich protokolliert.", noAudit: "Noch keine redaktionellen Ereignisse.", locked: "Veröffentlichte Datensätze können nur von Admins geändert werden." },
  fr: { title: "Catalogue éditorial", intro: "Gérez des destinations, hébergements et médias vérifiés et sourcés. Les éditeurs préparent les brouillons ; les admins publient ou archivent.", destinations: "Destinations", stays: "Hébergements", media: "Médias", audit: "Journal d’audit", locale: "Langue du contenu", status: "Statut", name: "Nom", summary: "Description éditoriale", note: "Note opérationnelle", hours: "Informations d’ouverture", price: "Informations tarifaires", season: "Saisonnalité", source: "URL de la source officielle", sourceLabel: "Nom de la source", checked: "Source vérifiée le", save: "Enregistrer le brouillon", publish: "Publier", archive: "Archiver", error: "La modification éditoriale n’a pas pu être enregistrée.", saved: "Fiche éditoriale enregistrée.", area: "Zone", region: "Région", lat: "Latitude", lng: "Longitude", rating: "Note", reviews: "Nombre d’avis", booking: "URL de réservation", select: "Choisir une fiche", newMedia: "Nouveau média", author: "Auteur", license: "Licence", attribution: "Attribution", dimensions: "Dimensions de l’image", order: "Ordre", reviewNote: "Note de révision", immutable: "Chaque création, modification et publication est ajoutée au journal d’audit immuable.", noAudit: "Aucun événement éditorial.", locked: "Les fiches publiées nécessitent un admin pour être modifiées." },
  sl: { title: "Uredniški katalog", intro: "Upravljajte z viri podprte destinacije, nastanitve in medije. Uredniki pripravijo osnutke, admini jih objavijo ali arhivirajo.", destinations: "Destinacije", stays: "Nastanitve", media: "Mediji", audit: "Revizijska sled", locale: "Jezik vsebine", status: "Stanje", name: "Ime", summary: "Urejeni opis", note: "Operativna opomba", hours: "Informacije o odpiralnem času", price: "Informacije o ceni", season: "Sezonskost", source: "URL uradnega vira", sourceLabel: "Ime vira", checked: "Vir preverjen", save: "Shrani osnutek", publish: "Objavi", archive: "Arhiviraj", error: "Uredniške spremembe ni bilo mogoče shraniti.", saved: "Uredniški zapis je shranjen.", area: "Območje", region: "Regija", lat: "Zemljepisna širina", lng: "Zemljepisna dolžina", rating: "Ocena", reviews: "Število ocen", booking: "URL rezervacije", select: "Izberi zapis", newMedia: "Nov medij", author: "Avtor", license: "Licenca", attribution: "Navedba avtorstva", dimensions: "Mere slike", order: "Vrstni red", reviewNote: "Opomba pregleda", immutable: "Vsaka ustvaritev, sprememba in objava se doda v nespremenljivo revizijsko sled.", noAudit: "Uredniških dogodkov še ni.", locked: "Objavljene zapise lahko dodatno ureja le admin." },
} as const;

const locales: Locale[] = ["en", "it", "de", "fr", "sl"];
const today = () => new Date().toISOString().slice(0, 10);
const emptyToNull = (value: string) => value.trim() || null;
const destinationFormFor = (destinationId: string, locale: Locale, rows: DestinationRow[]) => {
  const existing = rows.find((row) => row.destination_id === destinationId && row.locale === locale);
  const experience = catalogueExperiences.find((item) => item.id === destinationId);
  return existing ? {
    name: existing.name, summary: existing.summary, note: existing.operational_note ?? "", hours: existing.opening_hours ?? "", price: existing.price_information ?? "", season: existing.seasonality ?? "", source: existing.source_url, sourceLabel: existing.source_label, checked: existing.source_checked_at, status: existing.status,
  } : {
    name: experience?.name ?? "", summary: experience ? localizedExperienceCaption(locale, experience) : "", note: experience?.operationalNote ?? "", hours: "", price: "", season: experience?.seasons?.join(", ") ?? "", source: experience?.editorialSourceUrl ?? "", sourceLabel: experience?.editorialSourceLabel ?? "", checked: today(), status: "draft" as EditorialStatus,
  };
};
const stayFormFor = (stayId: string, rows: AccommodationRow[]) => {
  const existing = rows.find((row) => row.id === stayId);
  const fallback = accommodations.find((item) => item.id === stayId);
  return existing ? {
    name: existing.name, area: existing.area, region: existing.region, latitude: String(existing.latitude), longitude: String(existing.longitude), rating: existing.rating == null ? "" : String(existing.rating), reviews: existing.review_count == null ? "" : String(existing.review_count), price: existing.price_band ?? "", booking: existing.booking_url ?? "", source: existing.source_url, checked: existing.checked_at, status: existing.status,
  } : {
    name: fallback?.name ?? "", area: fallback?.area ?? "", region: fallback?.region ?? "bavaria", latitude: fallback ? String(fallback.lat) : "", longitude: fallback ? String(fallback.lng) : "", rating: fallback ? String(fallback.rating) : "", reviews: fallback ? String(fallback.reviewCount) : "", price: fallback?.priceBand ?? "", booking: fallback?.bookingUrl ?? "", source: fallback?.bookingUrl ?? "", checked: fallback?.checkedAt ?? today(), status: "draft" as EditorialStatus,
  };
};
const mediaFormFor = (row: MediaRow) => ({ destinationId: row.destination_id, source: row.source_url, author: row.author, license: row.license, attribution: row.attribution, width: String(row.width), height: String(row.height), order: String(row.sort_order), note: row.review_note ?? "", status: row.status });

export default function AdminContentOperations({ locale, role }: { locale: Locale; role: AppRole }) {
  const t = copy[locale];
  const supabase = useMemo(() => createClient(), []);
  const canPublish = role === "admin" || role === "owner";
  const [section, setSection] = useState<Section>("destinations");
  const [destinationRows, setDestinationRows] = useState<DestinationRow[]>([]);
  const [stayRows, setStayRows] = useState<AccommodationRow[]>([]);
  const [mediaRows, setMediaRows] = useState<MediaRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [destinationId, setDestinationId] = useState(catalogueExperiences[0]?.id ?? "");
  const [contentLocale, setContentLocale] = useState<Locale>(locale);
  const [stayId, setStayId] = useState(accommodations[0]?.id ?? "");
  const [mediaId, setMediaId] = useState("");
  const [destinationForm, setDestinationForm] = useState(() => destinationFormFor(catalogueExperiences[0]?.id ?? "", locale, []));
  const [stayForm, setStayForm] = useState(() => stayFormFor(accommodations[0]?.id ?? "", []));
  const [mediaForm, setMediaForm] = useState({ destinationId: catalogueExperiences[0]?.id ?? "", source: "", author: "", license: "", attribution: "", width: "1600", height: "1000", order: "0", note: "", status: "draft" as MediaRow["status"] });

  const load = useCallback(async () => {
    const [destinations, stays, media, audit] = await Promise.all([
      supabase.from("destination_content").select("*").order("destination_id").order("locale"),
      supabase.from("accommodation_records").select("*").order("name"),
      supabase.from("destination_media").select("*").order("destination_id").order("sort_order"),
      supabase.from("content_audit_events").select("id,entity_type,entity_id,locale,action,actor_id,created_at").order("created_at", { ascending: false }).limit(80),
    ]);
    if (destinations.error || stays.error || media.error || audit.error) {
      setMessage(t.error);
      return;
    }
    const nextDestinationRows = (destinations.data ?? []) as DestinationRow[];
    const nextStayRows = (stays.data ?? []) as AccommodationRow[];
    const nextMediaRows = (media.data ?? []) as MediaRow[];
    setDestinationRows(nextDestinationRows);
    setStayRows(nextStayRows);
    setMediaRows(nextMediaRows);
    setAuditRows((audit.data ?? []) as AuditRow[]);
    setDestinationForm(destinationFormFor(destinationId, contentLocale, nextDestinationRows));
    setStayForm(stayFormFor(stayId, nextStayRows));
    if (mediaId) {
      const selectedMedia = nextMediaRows.find((item) => item.id === mediaId);
      if (selectedMedia) setMediaForm(mediaFormFor(selectedMedia));
    }
  }, [contentLocale, destinationId, mediaId, stayId, supabase, t.error]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const finish = async (error: unknown) => {
    setBusy(false);
    setMessage(error ? t.error : t.saved);
    if (!error) await load();
  };

  const saveDestination = async (status: EditorialStatus) => {
    setBusy(true); setMessage("");
    const existing = destinationRows.find((row) => row.destination_id === destinationId && row.locale === contentLocale);
    const result = await supabase.from("destination_content").upsert({
      ...(existing ? { id: existing.id } : {}), destination_id: destinationId, locale: contentLocale, name: destinationForm.name.trim(), summary: destinationForm.summary.trim(), operational_note: emptyToNull(destinationForm.note), opening_hours: emptyToNull(destinationForm.hours), price_information: emptyToNull(destinationForm.price), seasonality: emptyToNull(destinationForm.season), source_url: destinationForm.source.trim(), source_label: destinationForm.sourceLabel.trim(), source_checked_at: destinationForm.checked, status,
    }, { onConflict: "destination_id,locale" });
    await finish(result.error);
  };

  const saveStay = async (status: EditorialStatus) => {
    setBusy(true); setMessage("");
    const result = await supabase.from("accommodation_records").upsert({
      id: stayId, name: stayForm.name.trim(), area: stayForm.area.trim(), region: stayForm.region, latitude: Number(stayForm.latitude), longitude: Number(stayForm.longitude), rating: stayForm.rating ? Number(stayForm.rating) : null, review_count: stayForm.reviews ? Number(stayForm.reviews) : null, price_band: emptyToNull(stayForm.price), booking_url: emptyToNull(stayForm.booking), source_url: stayForm.source.trim(), checked_at: stayForm.checked, status,
    });
    await finish(result.error);
  };

  const saveMedia = async (status: MediaRow["status"]) => {
    setBusy(true); setMessage("");
    const id = mediaId || crypto.randomUUID();
    const existing = mediaRows.find((item) => item.id === id);
    const result = await supabase.from("destination_media").upsert({
      id, destination_id: mediaForm.destinationId, object_path: existing?.object_path ?? null, source_url: mediaForm.source.trim(), author: mediaForm.author.trim(), license: mediaForm.license.trim(), attribution: mediaForm.attribution.trim(), width: Number(mediaForm.width), height: Number(mediaForm.height), sort_order: Number(mediaForm.order), status, review_note: emptyToNull(mediaForm.note),
    });
    if (!result.error) setMediaId(id);
    await finish(result.error);
  };

  const publishedLocked = destinationForm.status !== "draft" && !canPublish;
  const stayLocked = stayForm.status !== "draft" && !canPublish;
  const mediaLocked = mediaForm.status !== "draft" && !canPublish;

  return <section className="profile-badges-v2 admin-editorial-ops">
    <div className="section-intro"><span className="eyebrow"><Languages size={15} />CMS</span><h2>{t.title}</h2><p>{t.intro}</p><small>{t.immutable}</small></div>
    <nav className="admin-editorial-tabs" aria-label={t.title}>{(["destinations", "accommodations", "media", "audit"] as Section[]).map((item) => <button key={item} type="button" className={section === item ? "is-active" : ""} onClick={() => setSection(item)}>{item === "destinations" ? t.destinations : item === "accommodations" ? t.stays : item === "media" ? t.media : t.audit}</button>)}</nav>
    {message && <p className={message === t.saved ? "profile-success" : "profile-error"} role="status">{message}</p>}

    {section === "destinations" && <div className="admin-editorial-form">
      <div className="admin-form-row"><label><span>{t.destinations}</span><select value={destinationId} onChange={(event) => { const next = event.target.value; setDestinationId(next); setDestinationForm(destinationFormFor(next, contentLocale, destinationRows)); }}>{catalogueExperiences.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.region}</option>)}</select></label><label><span>{t.locale}</span><select value={contentLocale} onChange={(event) => { const next = event.target.value as Locale; setContentLocale(next); setDestinationForm(destinationFormFor(destinationId, next, destinationRows)); }}>{locales.map((item) => <option key={item}>{item.toUpperCase()}</option>)}</select></label><span className={`admin-status is-${destinationForm.status}`}>{t.status}: {destinationForm.status}</span></div>
      <label><span>{t.name}</span><input value={destinationForm.name} onChange={(event) => setDestinationForm({ ...destinationForm, name: event.target.value })} /></label>
      <label><span>{t.summary}</span><textarea rows={5} value={destinationForm.summary} onChange={(event) => setDestinationForm({ ...destinationForm, summary: event.target.value })} /></label>
      <div className="admin-form-grid"><label><span>{t.note}</span><textarea rows={3} value={destinationForm.note} onChange={(event) => setDestinationForm({ ...destinationForm, note: event.target.value })} /></label><label><span>{t.hours}</span><textarea rows={3} value={destinationForm.hours} onChange={(event) => setDestinationForm({ ...destinationForm, hours: event.target.value })} /></label><label><span>{t.price}</span><input value={destinationForm.price} onChange={(event) => setDestinationForm({ ...destinationForm, price: event.target.value })} /></label><label><span>{t.season}</span><input value={destinationForm.season} onChange={(event) => setDestinationForm({ ...destinationForm, season: event.target.value })} /></label><label><span>{t.source}</span><input type="url" value={destinationForm.source} onChange={(event) => setDestinationForm({ ...destinationForm, source: event.target.value })} /></label><label><span>{t.sourceLabel}</span><input value={destinationForm.sourceLabel} onChange={(event) => setDestinationForm({ ...destinationForm, sourceLabel: event.target.value })} /></label><label><span>{t.checked}</span><input type="date" value={destinationForm.checked} onChange={(event) => setDestinationForm({ ...destinationForm, checked: event.target.value })} /></label></div>
      {publishedLocked && <p className="profile-error">{t.locked}</p>}
      <div className="profile-data-actions"><button disabled={busy || publishedLocked} onClick={() => void saveDestination(destinationForm.status === "draft" ? "draft" : destinationForm.status)}><Save />{t.save}</button>{canPublish && <><button disabled={busy} onClick={() => void saveDestination("published")}><Send />{t.publish}</button><button disabled={busy} onClick={() => void saveDestination("archived")}><XCircle />{t.archive}</button></>}</div>
    </div>}

    {section === "accommodations" && <div className="admin-editorial-form">
      <div className="admin-form-row"><label><span>{t.select}</span><select value={stayId} onChange={(event) => { const next = event.target.value; setStayId(next); setStayForm(stayFormFor(next, stayRows)); }}>{accommodations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className={`admin-status is-${stayForm.status}`}><BedDouble />{t.status}: {stayForm.status}</span></div>
      <div className="admin-form-grid"><label><span>{t.name}</span><input value={stayForm.name} onChange={(event) => setStayForm({ ...stayForm, name: event.target.value })} /></label><label><span>{t.area}</span><input value={stayForm.area} onChange={(event) => setStayForm({ ...stayForm, area: event.target.value })} /></label><label><span>{t.region}</span><select value={stayForm.region} onChange={(event) => setStayForm({ ...stayForm, region: event.target.value as AccommodationRow["region"] })}><option value="fussen_allgau">Füssen / Allgäu</option><option value="bavaria">Bavaria</option><option value="aosta">Valle d’Aosta</option></select></label><label><span>{t.lat}</span><input inputMode="decimal" value={stayForm.latitude} onChange={(event) => setStayForm({ ...stayForm, latitude: event.target.value })} /></label><label><span>{t.lng}</span><input inputMode="decimal" value={stayForm.longitude} onChange={(event) => setStayForm({ ...stayForm, longitude: event.target.value })} /></label><label><span>{t.rating}</span><input inputMode="decimal" value={stayForm.rating} onChange={(event) => setStayForm({ ...stayForm, rating: event.target.value })} /></label><label><span>{t.reviews}</span><input inputMode="numeric" value={stayForm.reviews} onChange={(event) => setStayForm({ ...stayForm, reviews: event.target.value })} /></label><label><span>{t.price}</span><input value={stayForm.price} onChange={(event) => setStayForm({ ...stayForm, price: event.target.value })} /></label><label><span>{t.booking}</span><input type="url" value={stayForm.booking} onChange={(event) => setStayForm({ ...stayForm, booking: event.target.value })} /></label><label><span>{t.source}</span><input type="url" value={stayForm.source} onChange={(event) => setStayForm({ ...stayForm, source: event.target.value })} /></label><label><span>{t.checked}</span><input type="date" value={stayForm.checked} onChange={(event) => setStayForm({ ...stayForm, checked: event.target.value })} /></label></div>
      {stayLocked && <p className="profile-error">{t.locked}</p>}<div className="profile-data-actions"><button disabled={busy || stayLocked} onClick={() => void saveStay(stayForm.status)}><Save />{t.save}</button>{canPublish && <><button disabled={busy} onClick={() => void saveStay("published")}><Send />{t.publish}</button><button disabled={busy} onClick={() => void saveStay("archived")}><XCircle />{t.archive}</button></>}</div>
    </div>}

    {section === "media" && <div className="admin-editorial-form">
      <div className="admin-form-row"><label><span>{t.select}</span><select value={mediaId} onChange={(event) => { const next = event.target.value; setMediaId(next); const row = mediaRows.find((item) => item.id === next); setMediaForm(row ? mediaFormFor(row) : { destinationId: catalogueExperiences[0]?.id ?? "", source: "", author: "", license: "", attribution: "", width: "1600", height: "1000", order: "0", note: "", status: "draft" }); }}><option value="">{t.newMedia}</option>{mediaRows.map((item) => <option key={item.id} value={item.id}>{item.destination_id} · {item.author} · #{item.sort_order}</option>)}</select></label><span className={`admin-status is-${mediaForm.status}`}><Images />{t.status}: {mediaForm.status}</span></div>
      <div className="admin-form-grid"><label><span>{t.destinations}</span><select value={mediaForm.destinationId} onChange={(event) => setMediaForm({ ...mediaForm, destinationId: event.target.value })}>{catalogueExperiences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>{t.source}</span><input type="url" value={mediaForm.source} onChange={(event) => setMediaForm({ ...mediaForm, source: event.target.value })} /></label><label><span>{t.author}</span><input value={mediaForm.author} onChange={(event) => setMediaForm({ ...mediaForm, author: event.target.value })} /></label><label><span>{t.license}</span><input value={mediaForm.license} onChange={(event) => setMediaForm({ ...mediaForm, license: event.target.value })} /></label><label><span>{t.attribution}</span><input value={mediaForm.attribution} onChange={(event) => setMediaForm({ ...mediaForm, attribution: event.target.value })} /></label><label><span>{t.dimensions}</span><span className="admin-inline-inputs"><input aria-label="Width" inputMode="numeric" value={mediaForm.width} onChange={(event) => setMediaForm({ ...mediaForm, width: event.target.value })} /><input aria-label="Height" inputMode="numeric" value={mediaForm.height} onChange={(event) => setMediaForm({ ...mediaForm, height: event.target.value })} /></span></label><label><span>{t.order}</span><input inputMode="numeric" value={mediaForm.order} onChange={(event) => setMediaForm({ ...mediaForm, order: event.target.value })} /></label><label><span>{t.reviewNote}</span><textarea rows={2} value={mediaForm.note} onChange={(event) => setMediaForm({ ...mediaForm, note: event.target.value })} /></label></div>
      {mediaLocked && <p className="profile-error">{t.locked}</p>}<div className="profile-data-actions"><button disabled={busy || mediaLocked} onClick={() => void saveMedia(mediaForm.status)}><Save />{t.save}</button>{canPublish && <><button disabled={busy} onClick={() => void saveMedia("published")}><Send />{t.publish}</button><button disabled={busy} onClick={() => void saveMedia("rejected")}><XCircle />{t.archive}</button></>}</div>
    </div>}

    {section === "audit" && <div className="admin-audit-list"><div className="section-intro"><span className="eyebrow"><FileClock size={15} />{t.audit}</span><p>{t.immutable}</p></div>{auditRows.length === 0 ? <p>{t.noAudit}</p> : auditRows.map((item) => <article key={item.id}><div><strong>{item.entity_type}</strong><span>{item.entity_id}{item.locale ? ` · ${item.locale.toUpperCase()}` : ""}</span></div><span className="admin-status">{item.action}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(locale)}</time></article>)}</div>}
  </section>;
}
