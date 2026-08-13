"use client";

import { CheckCircle2, MapPinned, ShieldAlert, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import AdminContentOperations from "../../components/AdminContentOperations";
import { useAuth, type AppRole } from "../../components/AuthProvider";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";

type Suggestion = {
  id: string;
  author_id: string;
  name: string;
  description: string;
  region: string;
  category: string;
  map_url: string | null;
  status: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
  location_source: string | null;
  risk_flags: string[];
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

const roles: AppRole[] = ["member", "content_editor", "admin", "owner"];

export default function AdminPage() {
  const { locale } = usePersistentLocale();
  const t = copy[locale];
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
      .select("id,author_id,name,description,region,category,map_url,status,created_at,latitude,longitude,location_accuracy_m,location_captured_at,location_source,risk_flags,contribution_media(object_path)")
      .eq("status", "pending")
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
      <section className="profile-hero-v2"><div><span className="eyebrow"><ShieldCheck size={15} />{auth.role}</span><h1>{t.title}</h1><p>{t.intro}</p></div></section>
      {error && <p className="profile-error" role="alert">{error}</p>}
      <section className="profile-badges-v2"><div className="section-intro"><h2>{t.queue}</h2></div>{suggestions.length === 0 ? <p>{t.empty}</p> : <div className="admin-contribution-grid">{suggestions.map((item) => <article className="profile-auth-card" key={item.id}><span className="eyebrow">{t.pending} · {item.region} · {item.category}</span><h3>{item.name}</h3><p>{item.description}</p><small>{new Date(item.created_at).toLocaleString(locale)}</small><p>{item.map_url && <a href={item.map_url} target="_blank" rel="noreferrer noopener">{t.source}</a>}{photoUrls[item.id] && <> · <a href={photoUrls[item.id]} target="_blank" rel="noreferrer noopener">{t.photo}</a></>}{item.latitude !== null && item.longitude !== null && <> · <a href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer noopener"><MapPinned size={15} />{t.location}</a></>}</p>{item.location_captured_at && <p><small>{t.locationNote} · ±{Math.round(item.location_accuracy_m ?? 0)} m · {new Date(item.location_captured_at).toLocaleString(locale)}</small></p>}<p className={item.risk_flags?.length ? "profile-error" : "profile-success"}><ShieldAlert size={16} /><strong>{t.risk}:</strong> {item.risk_flags?.length ? item.risk_flags.join(", ") : t.noRisk}</p>{canDecide && auth.user?.id !== item.author_id && <><label><span>{t.reason}</span><textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /></label><div className="profile-data-actions"><button disabled={busy === item.id} onClick={() => void decide(item.id, "approved")}><CheckCircle2 />{t.approve}</button><button disabled={busy === item.id || !notes[item.id]?.trim()} onClick={() => void decide(item.id, "rejected")}><XCircle />{t.reject}</button></div></>}{auth.user?.id === item.author_id && <p>{t.self}</p>}</article>)}</div>}</section>
      <AdminContentOperations locale={locale} role={auth.role} />
      {auth.role === "owner" && <section className="profile-badges-v2"><div className="section-intro"><span className="eyebrow"><UsersRound size={15} />RBAC</span><h2>{t.roles}</h2><p>{t.rolesHelp}</p></div><div className="admin-role-list">{roleRows.map((row) => <article key={row.user_id}><div><strong>{row.display_name}</strong><small>{row.email}</small></div><select aria-label={`${t.roles}: ${row.display_name}`} value={row.role} onChange={(event) => setRoleRows((current) => current.map((item) => item.user_id === row.user_id ? { ...item, role: event.target.value as AppRole } : item))}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><button disabled={busy === row.user_id} onClick={() => void saveRole(row)}>{t.save}</button></article>)}</div></section>}
    </main>
  );
}
