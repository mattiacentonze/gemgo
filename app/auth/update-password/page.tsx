"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { createClient } from "../../../lib/supabase/client";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";
import { authRecoveryCopy } from "../../i18n/auth-recovery";

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordPage() {
  const { locale } = usePersistentLocale();
  const t = authRecoveryCopy[locale];
  const supabase = useMemo(() => createClient(), []);
  const [recoveryState, setRecoveryState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_or_expired") {
      setRecoveryState("invalid");
      return;
    }

    let active = true;
    const verifyRecoverySession = async () => {
      try {
        const response = await fetch("/api/auth/recovery-session", {
          method: "POST",
          credentials: "same-origin",
        });
        if (active) setRecoveryState(response.ok ? "ready" : "invalid");
      } catch {
        if (active) setRecoveryState("invalid");
      }
    };
    void verifyRecoverySession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) setRecoveryState("invalid");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirmation) {
      setError(password !== confirmation ? t.passwordsDiffer : t.passwordHelp);
      return;
    }
    setSaving(true);

    const recoveryResponse = await fetch("/api/auth/recovery-session", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => null);
    if (!recoveryResponse?.ok) {
      setSaving(false);
      setRecoveryState("invalid");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(t.updateError);
      return;
    }
    await fetch("/api/auth/recovery-session", {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => undefined);
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace("/app/profile?password_reset=success");
  };

  if (recoveryState === "checking") {
    return <main className="profile-page-v2 auth-recovery-page"><section className="profile-auth-card auth-recovery-card" aria-busy="true"><p role="status">{t.updateEyebrow}…</p></section></main>;
  }

  if (recoveryState === "invalid") {
    return (
      <main className="profile-page-v2 auth-recovery-page">
        <section className="profile-auth-card auth-recovery-card">
          <span className="eyebrow"><KeyRound size={15} />{t.updateEyebrow}</span>
          <h1>{t.invalidTitle}</h1>
          <p>{t.invalidBody}</p>
          <Link className="button button-primary" href="/auth/forgot-password">{t.requestAnother}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page-v2 auth-recovery-page">
      <section className="profile-auth-card auth-recovery-card">
        <span className="eyebrow"><KeyRound size={15} />{t.updateEyebrow}</span>
        <h1>{t.updateTitle}</h1>
        <p>{t.updateBody}</p>
        <form onSubmit={updatePassword}>
          <label>
            <span>{t.newPassword}</span>
            <input type="password" autoComplete="new-password" aria-describedby="password-help" minLength={MIN_PASSWORD_LENGTH} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>
            <span>{t.confirmPassword}</span>
            <input type="password" autoComplete="new-password" aria-describedby="password-help" minLength={MIN_PASSWORD_LENGTH} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <p className="auth-recovery-help" id="password-help">{t.passwordHelp}</p>
          {error && <p className="profile-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={saving} type="submit">{saving ? t.savingPassword : t.savePassword}</button>
        </form>
      </section>
    </main>
  );
}
