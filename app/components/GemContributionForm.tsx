"use client";

import { FormEvent, useState } from "react";
import { Camera, Gem, LoaderCircle, MapPinned, Sparkles } from "lucide-react";
import { regionCodes, type Locale, type RegionCode } from "../domain";
import { msg } from "../i18n/catalogs.mjs";

type AcceptedContribution = { id: string; name: string; reward: number };

type Props = {
  locale: Locale;
  onAccepted: (contribution: AcceptedContribution) => void;
};

const categories = [
  "nature",
  "culture",
  "viewpoint",
  "activity",
  "local_place",
] as const;

export default function GemContributionForm({ locale, onAccepted }: Props) {
  const t = (key: string, params?: Record<string, string | number>) =>
    msg(locale, key, params);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setStatus(null);
    const form = new FormData(formElement);
    const photo = form.get("photo");
    if (!(photo instanceof File) || !photo.type.startsWith("image/") || photo.size > 8 * 1024 * 1024) {
      setStatus(locale === "it" ? "Aggiungi una foto JPG, PNG o WebP fino a 8 MB." : "Add a JPG, PNG or WebP photo up to 8 MB.");
      setSubmitting(false);
      return;
    }
    const payload = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      region: String(form.get("region") ?? ""),
      category: String(form.get("category") ?? ""),
      mapUrl: String(form.get("mapUrl") ?? ""),
      photoName: photo.name,
      photoType: photo.type,
      photoSize: photo.size,
    };
    try {
      const response = await fetch("/api/gems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        reward?: number;
        suggestion?: { id?: string };
      };
      if (!response.ok || !result.suggestion?.id) {
        setStatus(
          t(
            result.error === "duplicate_contribution"
              ? "contribute.duplicate"
              : result.error === "contribution_unavailable"
                ? "contribute.unavailable"
                : "contribute.invalid",
          ),
        );
        return;
      }
      onAccepted({
        id: result.suggestion.id,
        name: payload.name.trim(),
        reward: result.reward ?? 70,
      });
      formElement.reset();
      setStatus(t("contribute.success"));
    } catch {
      setStatus(t("contribute.unavailable"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contribution-card" aria-labelledby="contribution-title">
      <div className="contribution-intro">
        <span className="contribution-icon"><Gem aria-hidden="true" size={25} /></span>
        <div>
          <p className="eyebrow">{t("contribute.eyebrow")}</p>
          <h2 id="contribution-title">{t("contribute.title")}</h2>
          <p>{t("contribute.intro")}</p>
        </div>
        <strong className="contribution-reward"><Sparkles aria-hidden="true" size={17} />+70 GemXP</strong>
      </div>
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
          <span><Camera aria-hidden="true" size={16} />{locale === "it" ? "Foto del luogo" : "Photo of the place"}</span>
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          <small>{locale === "it" ? "Non includere volti o dati personali. Massimo 8 MB." : "Do not include faces or personal data. Maximum 8 MB."}</small>
        </label>
        <p className="contribution-disclosure">{t("contribute.disclosure")}</p>
        <button className="primary-button" disabled={submitting}>
          {submitting ? <LoaderCircle className="spin" aria-hidden="true" size={18} /> : <Gem aria-hidden="true" size={18} />}
          {t(submitting ? "contribute.submitting" : "contribute.submit")}
        </button>
        {status && <p className="contribution-status" role="status">{status}</p>}
      </form>
    </section>
  );
}
