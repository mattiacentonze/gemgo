"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { commonsImageParams, commonsSearchText } from "../lib/commons-media";
import type { Locale } from "../domain";

type Media = {
  url: string;
  source: string;
  author: string;
  license: string;
  title: string;
};

type Props = {
  name: string;
  region: string;
  className?: string;
  compact?: boolean;
};

const allowedLicense = /^(CC0|CC BY|CC BY-SA|Public domain)/i;
const rejectedTitle = /\b(map|karte|plan|locator|flag|coat of arms|logo|icon|poster|diagram|sign|signage|stamp|emblem|book|manuscript|brochure|cover|painting|drawing|illustration|chart|document|menu|ticket|portrait|selfie|advertisement|scan)\b/i;

const photoText = {
  en: { unavailable: "Relevant licensed image unavailable", loading: "Loading licensed destination gallery", noPhoto: "No licensed photo available for", loadingFor: "Loading licensed photos of", gallery: "photo gallery", photo: "photo", previous: "Previous photo of", next: "Next photo of", show: "Show photo" },
  it: { unavailable: "Immagine pertinente con licenza non disponibile", loading: "Caricamento della galleria della destinazione", noPhoto: "Nessuna foto con licenza disponibile per", loadingFor: "Caricamento delle foto con licenza di", gallery: "galleria fotografica", photo: "foto", previous: "Foto precedente di", next: "Foto successiva di", show: "Mostra foto" },
  de: { unavailable: "Kein passendes lizenziertes Bild verfügbar", loading: "Lizenzierte Zielgalerie wird geladen", noPhoto: "Kein lizenziertes Foto verfügbar für", loadingFor: "Lizenzierte Fotos werden geladen für", gallery: "Fotogalerie", photo: "Foto", previous: "Vorheriges Foto von", next: "Nächstes Foto von", show: "Foto anzeigen" },
  fr: { unavailable: "Aucune image pertinente sous licence disponible", loading: "Chargement de la galerie de la destination", noPhoto: "Aucune photo sous licence disponible pour", loadingFor: "Chargement des photos sous licence de", gallery: "galerie photo", photo: "photo", previous: "Photo précédente de", next: "Photo suivante de", show: "Afficher la photo" },
  sl: { unavailable: "Ustrezna licencirana slika ni na voljo", loading: "Nalaganje galerije destinacije", noPhoto: "Licencirana fotografija ni na voljo za", loadingFor: "Nalaganje licenciranih fotografij za", gallery: "fotogalerija", photo: "fotografija", previous: "Prejšnja fotografija kraja", next: "Naslednja fotografija kraja", show: "Prikaži fotografijo" },
} as const;

const plainText = (value?: { value?: string }) =>
  (value?.value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const meaningfulTokens = (value: string) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !["walk", "loop", "route", "river", "village", "villages", "circuit", "lakeside", "winter", "culture"].includes(token));

const relevanceScore = (title: string, name: string, region: string) => {
  const normalizedTitle = normalize(title);
  const nameTokens = meaningfulTokens(name);
  const searchTokens = meaningfulTokens(commonsSearchText(name, region));
  const regionTokens = meaningfulTokens(region);
  const directNameMatches = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const searchMatches = searchTokens.filter((token) => normalizedTitle.includes(token)).length;
  const regionMatches = regionTokens.filter((token) => normalizedTitle.includes(token)).length;
  return directNameMatches * 5 + searchMatches * 3 + regionMatches;
};

const isPlaceRelevant = (title: string, name: string, region: string) => {
  const normalizedTitle = normalize(title);
  const normalizedName = normalize(name);
  const nameTokens = meaningfulTokens(name);
  const directMatches = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  return normalizedTitle.includes(normalizedName) || directMatches >= Math.max(1, Math.ceil(nameTokens.length * 0.5)) || relevanceScore(title, name, region) >= 8;
};

export default function DestinationPhoto({
  name,
  region,
  className = "",
  compact = false,
}: Props) {
  const [gallery, setGallery] = useState<Media[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const [locale, setLocale] = useState<Locale>("en");
  const t = photoText[locale];

  useEffect(() => {
    const sync = () => setLocale((document.documentElement.lang || "en") as Locale);
    queueMicrotask(sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const cacheKey = `gemgo-commons-landscape-v4-${name}-${region}-${compact ? "compact" : "full"}`;

    queueMicrotask(() => {
      if (!active) return;
      setGallery([]);
      setActiveIndex(0);
      setFailed(false);
      setImageFailed(false);
    });

    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Media[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          queueMicrotask(() => {
            if (active) setGallery(parsed);
          });
          return () => {
            active = false;
            controller.abort();
          };
        }
      }
    } catch {
      // The image cache is optional.
    }

    const params = commonsImageParams(name, region, compact ? 720 : 1280, 24);

    fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Commons unavailable");
        return response.json();
      })
      .then((payload) => {
        const pages = Object.values(payload?.query?.pages ?? {}) as Array<{
          title?: string;
          imageinfo?: Array<{
            thumburl?: string;
            descriptionurl?: string;
            width?: number;
            height?: number;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }>;

        const candidates = pages
          .map((page) => {
            const info = page.imageinfo?.[0];
            const title = page.title?.replace(/^File:/i, "") ?? name;
            const license = plainText(info?.extmetadata?.LicenseShortName);
            const landscape = Boolean(info?.width && info?.height && info.width / info.height >= 1.22);
            if (!info?.thumburl || !allowedLicense.test(license) || rejectedTitle.test(title) || !landscape || !isPlaceRelevant(title, name, region)) return null;
            const landscapeBonus = info.width && info.height && info.width / info.height >= 1.5 ? 3 : 1;
            const resolutionBonus = info.width && info.height && info.width * info.height >= 1_000_000 ? 1 : 0;
            return {
              media: {
                url: info.thumburl,
                source: info.descriptionurl ?? "https://commons.wikimedia.org/",
                author:
                  plainText(info.extmetadata?.Artist) ||
                  plainText(info.extmetadata?.Credit) ||
                  "Wikimedia Commons contributor",
                license: license || "Free licence",
                title,
              } satisfies Media,
              score: relevanceScore(title, name, region) + landscapeBonus + resolutionBonus,
            };
          })
          .filter((item): item is { media: Media; score: number } => Boolean(item))
          .sort((first, second) => second.score - first.score);

        const relevant = candidates.filter((item) => item.score >= 6);
        const unique = relevant.filter(
          (item, index, items) => items.findIndex((candidate) => candidate.media.url === item.media.url) === index,
        );
        const selected = unique.slice(0, compact ? 3 : 5).map((item) => item.media);
        if (!active || selected.length === 0) throw new Error("No relevant free image");
        setGallery(selected);
        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(selected));
        } catch {
          // The image cache is optional.
        }
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setFailed(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [compact, name, region]);

  useEffect(() => {
    if (gallery.length < 2) return;
    const next = gallery[(activeIndex + 1) % gallery.length];
    const image = new Image();
    image.src = next.url;
  }, [activeIndex, gallery]);

  const activeMedia = gallery[activeIndex];
  const visibleMedia = useMemo(
    () => gallery.filter((_, index) => index !== activeIndex).slice(0, 2),
    [activeIndex, gallery],
  );

  const move = (direction: -1 | 1) => {
    if (gallery.length < 2) return;
    setImageFailed(false);
    setActiveIndex((current) => (current + direction + gallery.length) % gallery.length);
  };

  const handleImageError = () => {
    if (gallery.length <= 1) {
      setImageFailed(true);
      return;
    }
    setGallery((current) => current.filter((_, index) => index !== activeIndex));
    setActiveIndex(0);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (start === null) return;
    const end = event.changedTouches[0]?.clientX;
    if (typeof end !== "number" || Math.abs(start - end) < 44) return;
    move(start > end ? 1 : -1);
  };

  if (!activeMedia || imageFailed) {
    return (
      <div
        className={`destination-photo destination-photo-fallback ${failed || imageFailed ? "is-failed" : "is-loading"} ${className}`}
        role="img"
        aria-label={failed || imageFailed ? `${t.noPhoto} ${name}` : `${t.loadingFor} ${name}`}
      >
        <span className="destination-photo-brand" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/gemgo-logo.png" alt="" />
        </span>
        <span className="destination-photo-status">
          <ImageIcon size={18} />
          <strong>{name}</strong>
          <small>{failed || imageFailed ? t.unavailable : t.loading}</small>
        </span>
      </div>
    );
  }

  return (
    <figure
      className={`destination-photo destination-gallery ${compact ? "is-compact" : ""} ${className}`}
      tabIndex={gallery.length > 1 ? 0 : undefined}
      aria-label={`${name} ${t.gallery}, ${t.photo} ${activeIndex + 1} / ${gallery.length}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="destination-gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeMedia.url}
          className="destination-gallery-image"
          src={activeMedia.url}
          alt={`${name}, ${region} — ${t.photo} ${activeIndex + 1} / ${gallery.length}`}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
        {gallery.length > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-arrow-previous" aria-label={`${t.previous} ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(-1); }}>
              <ChevronLeft size={compact ? 18 : 21} />
            </button>
            <button type="button" className="gallery-arrow gallery-arrow-next" aria-label={`${t.next} ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(1); }}>
              <ChevronRight size={compact ? 18 : 21} />
            </button>
            <div className="gallery-dots" aria-label={`${gallery.length} photos`}>
              {gallery.map((media, index) => (
                <button
                  type="button"
                  key={media.url}
                  className={index === activeIndex ? "is-active" : ""}
                  aria-label={`${t.show} ${index + 1} · ${name}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setImageFailed(false);
                    setActiveIndex(index);
                  }}
                />
              ))}
            </div>
          </>
        )}
        {!compact && visibleMedia.length > 0 && (
          <div className="gallery-preview-strip" aria-hidden="true">
            {visibleMedia.map((media) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={media.url} src={media.url} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        )}
      </div>
      <figcaption>
        <a href={activeMedia.source} target="_blank" rel="noreferrer">
          {activeMedia.author} · {activeMedia.license}
        </a>
      </figcaption>
    </figure>
  );
}
