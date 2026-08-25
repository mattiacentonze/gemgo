"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { createClient } from "../../../lib/supabase/client";
import { usePersistentLocale } from "../../hooks/usePersistentLocale";
import { authRecoveryCopy } from "../../i18n/auth-recovery";

export default function ForgotPasswordPage() {
  const { locale } = usePersistentLocale();
  const t = authRecoveryCopy[locale];
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      });
    } catch {
      // Provider errors intentionally produce the same browser response.
    } finally {
      // Never branch the UI on account existence or the provider outcome.
      // The same generic response prevents this form becoming an enumeration oracle.
      setState("sent");
    }
  };

  return (
    <main className="profile-page-v2 auth-recovery-page">
      <section className="profile-auth-card auth-recovery-card">
        <span className="eyebrow"><KeyRound size={15} />{t.requestEyebrow}</span>
        <h1>{t.requestTitle}</h1>
        <p>{t.requestBody}</p>
        <form onSubmit={requestReset}>
          <label>
            <span>{t.email}</span>
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {state === "sent" && <p className="profile-success" role="status">{t.requestSent}</p>}
          <button className="button button-primary" disabled={state === "sending"} type="submit">{state === "sending" ? t.sending : t.request}</button>
        </form>
        <Link className="auth-recovery-back" href="/app/profile"><ArrowLeft size={16} />{t.backToSignIn}</Link>
      </section>
    </main>
  );
}
