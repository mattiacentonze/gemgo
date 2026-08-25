"use client";

import { CheckCircle2, MapPinned, ShieldAlert, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import AdminContentOperations from "../../components/AdminContentOperations";
import { useAuth, type AppRole } from "../../components/AuthProvider";
import type { Locale } from "../../domain";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";

type ContributionRegion = "fussen_allgau" | "bavaria" | "aosta";
type ContributionCategory = "nature" | "culture" | "viewpoint" | "activity" | "local_place";
type ContributionRiskFlag = "low_location_accuracy" | "aged_location_claim";

type Suggestion = {
  id: string;
  author_id: string;
  name: string;
  description: string;
  region: ContributionRegion;
  category: ContributionCategory;
  map_url: string | null;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
  location_source: string | null;
  risk_flags: ContributionRiskFlag[];
  contribution_media?: Array<{ object_path: string }>;
};

type RoleRow = {
  user_id: string;
  email: string | null;
  display_name: string;
  role: AppRole;
  assigned_at: string;
};

const copy = {
  en: { title: "Content operations", intro: "Review the contribution queue. Only admins and owners can make a reward-bearing decision.", denied: "This area requires a content editor, admin or owner role.", queue: "Contribution queue", empty: "No pending contributions.", approve: "Approve and award 70", reject: "Reject", reason: "Rejection reason", source: "Open source map", photo: "Open private photo", location: "Open claimed location", locationNote: "Browser location claim — not independently verified", risk: "Review flags", noRisk: "No automatic flags", pending: "pending", error: "The operation could not be completed.", roles: "User roles", rolesHelp: "Only the owner can assign roles. The last owner cannot be demoted.", save: "Save role", back: "Back to profile", self: "Your own contribution cannot be reviewed." },
  it: { title: "Operazioni contenuti", intro: "Revisiona la coda dei contributi. Solo admin e owner possono prendere una decisione che assegna punti.", denied: "Quest’area richiede il ruolo editor contenuti, admin o owner.", queue: "Coda contributi", empty: "Nessun contributo in attesa.", approve: "Approva e assegna 70", reject: "Rifiuta", reason: "Motivo del rifiuto", source: "Apri mappa sorgente", photo: "Apri foto privata", location: "Apri posizione dichiarata", locationNote: "Posizione del browser dichiarata — non verificata in modo indipendente", risk: "Segnalazioni da verificare", noRisk: "Nessuna segnalazione automatica", pending: "in attesa", error: "Impossibile completare l’operazione.", roles: "Ruoli utenti", rolesHelp: "Solo l’owner può assegnare ruoli. L’ultimo owner non può essere retrocesso.", save: "Salva ruolo", back: "Torna al profilo", self: "Non puoi revisionare un tuo contributo." },
  de: { title: "Inhaltsverwaltung", intro: "Prüfe die Beitragswarteschlange. Nur Admins und Owner dürfen über die Punktevergabe entscheiden.", denied: "Dieser Bereich erfordert Inhaltsredaktion, Admin oder Owner.", queue: "Beitragswarteschlange", empty: "Keine ausstehenden Beiträge.", approve: "Genehmigen und 70 vergeben", reject: "Ablehnen", reason: "Ablehnungsgrund", source: "Quellkarte öffnen", photo: "Privates Foto öffnen", location: "Angegebenen Standort öffnen", locationNote: "Browser-Standortangabe — nicht unabhängig bestätigt", risk: "Prüfhinweise", noRisk: "Keine automatischen Hinweise", pending: "ausstehend", error: "Der Vorgang konnte nicht abgeschlossen werden.", roles: "Benutzerrollen", rolesHelp: "Nur der Owner kann Rollen zuweisen. Der letzte Owner kann nicht herabgestuft werden.", save: "Rolle speichern", back: "Zurück zum Profil", self: "Der eigene Beitrag kann nicht geprüft werden." },
  fr: { title: "Opérations de contenu", intro: "Examinez la file des contributions. Seuls les admins et owners peuvent décider d’attribuer des points.", denied: "Cette zone exige le rôle éditeur de contenu, admin ou owner.", queue: "File des contributions", empty: "Aucune contribution en attente.", approve: "Approuver et attribuer 70", reject: "Refuser", reason: "Motif du refus", source: "Ouvrir la carte source", photo: "Ouvrir la photo privée", location: "Ouvrir la position déclarée", locationNote: "Position déclarée par le navigateur — non vérifiée indépendamment", risk: "Alertes à contrôler", noRisk: "Aucune alerte automatique", pending: "en attente", error: "L’opération n’a pas pu aboutir.", roles: "Rôles utilisateurs", rolesHelp: "Seul l’owner attribue les rôles. Le dernier owner ne peut pas être rétrogradé.", save: "Enregistrer le rôle", back: "Retour au profil", self: "Vous ne pouvez pas examiner votre propre contribution." },
  sl: { title: "Upravljanje vsebin", intro: "Preglejte čakalno vrsto prispevkov. Le admin in owner lahko sprejmeta odločitev z nagrado.", denied: "Ta razdelek zahteva urednika vsebin, admina ali ownerja.", queue: "Čakalna vrsta prispevkov", empty: "Ni čakajočih prispevkov.", approve: "Odobri in dodeli 70", reject: "Zavrni", reason: "Razlog za zavrnitev", source: "Odpri izvorni zemljevid", photo: "Odpri zasebno fotografijo", location: "Odpri navedeno lokacijo", locationNote: "Navedena lokacija brskalnika — ni neodvisno potrjena", risk: "Opozorila za pregled", noRisk: "Ni samodejnih opozoril", pending: "čaka", error: "Dejanja ni bilo mogoče dokončati.", roles: "Vloge uporabnikov", rolesHelp: "Le owner lahko dodeljuje vloge. Zadnjega ownerja ni mogoče znižati.", save: "Shrani vlogo", back: "Nazaj na profil", self: "Svojega prispevka ne morete pregledati." },
} as const;

type AdminLabels = {
  regions: Record<ContributionRegion, string>;
  categories: Record<ContributionCategory, string>;
  riskFlags: Record<ContributionRiskFlag, string>;
  roles: Record<AppRole, string>;
};

const adminLabels = {
  en: {
    regions: { fussen_allgau: "Füssen / Allgäu", bavaria: "Bavaria", aosta: "Valle d’Aosta" },
    categories: { nature: "Nature", culture: "Culture", viewpoint: "Viewpoint", activity: "Activity", local_place: "Local place" },
    riskFlags: { low_location_accuracy: "Low location accuracy", aged_location_claim: "Location claim older than five minutes" },
    roles: { member: "Member", content_editor: "Content editor", admin: "Admin", owner: "Owner" },
  },
  it: {
    regions: { fussen_allgau: "Füssen / Allgäu", bavaria: "Baviera", aosta: "Valle d’Aosta" },
    categories: { nature: "Natura", culture: "Cultura", viewpoint: "Punto panoramico", activity: "Attività", local_place: "Luogo locale" },
    riskFlags: { low_location_accuracy: "Bassa precisione della posizione", aged_location_claim: "Posizione acquisita da oltre cinque minuti" },
    roles: { member: "Membro", content_editor: "Redattore contenuti", admin: "Amministratore", owner: "Proprietario" },
  },
  de: {
    regions: { fussen_allgau: "Füssen / Allgäu", bavaria: "Bayern", aosta: "Aostatal" },
    categories: { nature: "Natur", culture: "Kultur", viewpoint: "Aussichtspunkt", activity: "Aktivität", local_place: "Lokaler Ort" },
    riskFlags: { low_location_accuracy: "Geringe Standortgenauigkeit", aged_location_claim: "Standortangabe älter als fünf Minuten" },
    roles: { member: "Mitglied", content_editor: "Inhaltsredaktion", admin: "Administrator", owner: "Inhaber" },
  },
  fr: {
    regions: { fussen_allgau: "Füssen / Allgäu", bavaria: "Bavière", aosta: "Vallée d’Aoste" },
    categories: { nature: "Nature", culture: "Culture", viewpoint: "Point de vue", activity: "Activité", local_place: "Lieu local" },
    riskFlags: { low_location_accuracy: "Faible précision de localisation", aged_location_claim: "Position relevée il y a plus de cinq minutes" },
    roles: { member: "Membre", content_editor: "Éditeur de contenu", admin: "Administrateur", owner: "Propriétaire" },
  },
  sl: {
    regions: { fussen_allgau: "Füssen / Allgäu", bavaria: "Bavarska", aosta: "Dolina Aoste" },
    categories: { nature: "Narava", culture: "Kultura", viewpoint: "Razgledna točka", activity: "Dejavnost", local_place: "Lokalni kraj" },
    riskFlags: { low_location_accuracy: "Nizka natančnost lokacije", aged_location_claim: "Podatek o lokaciji je starejši od petih minut" },
    roles: { member: "Član", content_editor: "Urednik vsebin", admin: "Skrbnik", owner: "Lastnik" },
  },
} satisfies Record<Locale, AdminLabels>;

const roles: AppRole[] = ["member", "content_editor", "admin", "owner"];

export default function AdminPage() {
  const { locale } = usePersistentLocale();
  const t = copy[locale];
  const labels = adminLabels[locale];
  const auth = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [roleRows, setRoleRows] = useState<RoleRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const canView = auth.role === "content_editor" || auth.role === "admin" || auth.role === "owner";
  const canDecide = auth.role === "admin" || auth.role === "owner";

  const load = useCallback(async () => {
    if (!canView) return;
    setError("");
    const { data, error: queueError } = await supabase
      .from("gem_suggestions")
      .select("id,author_id,name,description,region,category,map_url,status,created_at,latitude,longitude,location_accuracy_m,location_captured_at,location_source,risk_flags,contribution_media!inner(object_path,validation_status)")
      .eq("status", "pending")
      .eq("contribution_media.validation_status", "validated")
      .order("created_at", { ascending: true });
    if (queueError) {
      setError(t.error);
      return;
    }
    const queue = (data ?? []) as Suggestion[];
    setSuggestions(queue);
    const signed = await Promise.all(queue.map(async (item) => {
      const path = item.contribution_media?.[0]?.object_path;
      if (!path) return [item.id, ""] as const;
      const result = await supabase.storage.from("gem-contributions").createSignedUrl(path, 120);
      return [item.id, result.data?.signedUrl ?? ""] as const;
    }));
    setPhotoUrls(Object.fromEntries(signed));
    if (auth.role === "owner") {
      const result = await supabase.rpc("list_user_roles");
      if (!result.error) setRoleRows((result.data ?? []) as RoleRow[]);
    }
  }, [auth.role, canView, supabase, t.error]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusy(id);
    setError("");
    const { error: reviewError } = await supabase.rpc("review_gem_suggestion", {
      p_id: id,
      p_decision: decision,
      p_note: notes[id]?.trim() || null,
    });
    setBusy("");
    if (reviewError) {
      setError(reviewError.message.includes("self_review") ? t.self : t.error);
      return;
    }
    await auth.refreshAccount();
    await load();
  };

  const saveRole = async (row: RoleRow) => {
    setBusy(row.user_id);
    setError("");
    const { error: roleError } = await supabase.rpc("set_user_role", { p_user_id: row.user_id, p_role: row.role });
    setBusy("");
    if (roleError) setError(t.error);
    else await load();
  };

  if (auth.loading) return <main className="profile-page-v2"><p aria-busy="true">…</p></main>;
  if (!auth.user || !canView) return <main className="profile-page-v2"><section className="profile-auth-card"><ShieldCheck /><h1>{t.title}</h1><p>{t.denied}</p><Link href="/app/profile">{t.back}</Link></section></main>;

  return (
    <main className="profile-page-v2 admin-page">
      <section className="profile-hero-v2"><div><span className="eyebrow"><ShieldCheck size={15} />{labels.roles[auth.role]}</span><h1>{t.title}</h1><p>{t.intro}</p></div></section>
      {error && <p className="profile-error" role="alert">{error}</p>}
      <section className="profile-badges-v2"><div className="section-intro"><h2>{t.queue}</h2></div>{suggestions.length === 0 ? <p>{t.empty}</p> : <div className="admin-contribution-grid">{suggestions.map((item) => <article className="profile-auth-card" key={item.id}><span className="eyebrow">{t.pending} · {labels.regions[item.region]} · {labels.categories[item.category]}</span><h3>{item.name}</h3><p>{item.description}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small><p>{item.map_url && <a href={item.map_url} target="_blank" rel="noreferrer noopener">{t.source}</a>}{photoUrls[item.id] && <> · <a href={photoUrls[item.id]} target="_blank" rel="noreferrer noopener">{t.photo}</a></>}{item.latitude !== null && item.longitude !== null && <> · <a href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer noopener"><MapPinned size={15} />{t.location}</a></>}</p>{item.location_captured_at && <p><small>{t.locationNote} · ±{Math.round(item.location_accuracy_m ?? 0)} m · {new Date(item.location_captured_at).toLocaleString(locale)}</small></p>}<p className={item.risk_flags?.length ? "profile-error" : "profile-success"}><ShieldAlert size={16} /><strong>{t.risk}:</strong> {item.risk_flags?.length ? item.risk_flags.map((flag) => labels.riskFlags[flag]).join(", ") : t.noRisk}</p>{canDecide && auth.user?.id !== item.author_id && <><label><span>{t.reason}</span><textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /></label><div className="profile-data-actions"><button disabled={busy === item.id} onClick={() => void decide(item.id, "approved")}><CheckCircle2 />{t.approve}</button><button disabled={busy === item.id || !notes[item.id]?.trim()} onClick={() => void decide(item.id, "rejected")}><XCircle />{t.reject}</button></div></>}{auth.user?.id === item.author_id && <p>{t.self}</p>}</article>)}</div>}</section>
      <AdminContentOperations locale={locale} role={auth.role} />
      {auth.role === "owner" && <section className="profile-badges-v2"><div className="section-intro"><span className="eyebrow"><UsersRound size={15} />RBAC</span><h2>{t.roles}</h2><p>{t.rolesHelp}</p></div><div className="admin-role-list">{roleRows.map((row) => <article key={row.user_id}><div><strong>{row.display_name}</strong><small>{row.email}</small></div><select aria-label={`${t.roles}: ${row.display_name}`} value={row.role} onChange={(event) => setRoleRows((current) => current.map((item) => item.user_id === row.user_id ? { ...item, role: event.target.value as AppRole } : item))}>{roles.map((role) => <option key={role} value={role}>{labels.roles[role]}</option>)}</select><button disabled={busy === row.user_id} onClick={() => void saveRole(row)}>{t.save}</button></article>)}</div></section>}
    </main>
  );
}
