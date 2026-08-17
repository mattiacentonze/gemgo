"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { commonsImageParams, commonsSearchText } from "../lib/commons-media";
import type { Locale } from "../domain";
import { reviewedDestinationMedia } from "../product/destination-media-audit";

type Media = {
  url: string;
  source: string;
  author: string;
  license: string;
  title: string;
};

type Props = {
  destinationId?: string;
  name: string;
  region: string;
  className?: string;
  compact?: boolean;
  layout?: "carousel" | "puzzle";
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  interactive?: boolean;
};

const localDestinationMedia: Record<string, Media[]> = {
  "Neuschwanstein Castle": [
    {
      url: "/assets/neuschwanstein-aerial.webp",
      source: "https://commons.wikimedia.org/wiki/File:Aerial_image_of_Neuschwanstein_Castle_(view_from_the_northwest).jpg",
      author: "Carsten Steger",
      license: "CC BY-SA 4.0 · resized and converted to WebP",
      title: "Aerial view of Neuschwanstein Castle from the northwest",
    },
    {
      url: "/assets/neuschwanstein-marienbruecke.webp",
      source: "https://commons.wikimedia.org/wiki/File:Castle_Neuschwanstein_on_a_sunny_summer_day_as_seen_from_Marienbruecke_(south).jpg",
      author: "Jürgen Matern",
      license: "CC BY-SA 3.0 · resized and converted to WebP",
      title: "Neuschwanstein Castle from Marienbrücke in summer",
    },
    {
      url: "/assets/neuschwanstein-winter.webp",
      source: "https://commons.wikimedia.org/wiki/File:Neuschwanstein_Castle_Snow_(93462571).jpeg",
      author: "Alessio Mercuri",
      license: "CC BY 3.0 · resized and converted to WebP",
      title: "Neuschwanstein Castle in winter",
    },
  ],
  "Falkenstein Ruin Pfronten": [
    {
      url: "/assets/falkenstein-pfronten-ridge.webp",
      source: "https://commons.wikimedia.org/wiki/File:Falkenstein-Pfronten-JR-E-5485-2021-07-02.jpg",
      author: "Johannes Robalotoff",
      license: "CC BY-SA 3.0 DE · resized and converted to WebP",
      title: "Falkenstein ruin on its limestone ridge",
    },
    {
      url: "/assets/falkenstein-pfronten-ruin.webp",
      source: "https://commons.wikimedia.org/wiki/File:Burg_Falkenstein_(Pfronten)_11.jpg",
      author: "Thomas Hummel",
      license: "CC BY-SA 4.0 · resized and converted to WebP",
      title: "Close view of Falkenstein Ruin Pfronten",
    },
  ],
};

const allowedLicense = /^(CC0|CC BY|CC BY-SA|Public domain)/i;
const rejectedTitle = /\b(map|karte|plan|locator|flag|coat of arms|logo|icon|poster|diagram|sign|signage|stamp|emblem|book|manuscript|brochure|cover|painting|drawing|illustration|chart|document|menu|ticket|portrait|selfie|advertisement|scan|chicken|chickens|hen|hens|rooster|poultry|gallina|galline|pollo|huhn|hühner|henne|poule|coq|cow|cattle|sheep|goat|horse|duck)\b/i;

const photoText = {
  en: { unavailable: "Relevant licensed image unavailable", loading: "Loading licensed destination gallery", noPhoto: "No licensed photo available for", loadingFor: "Loading licensed photos of", gallery: "photo gallery", photo: "photo", photos: "photos", previous: "Previous photo of", next: "Next photo of", show: "Show photo", by: "by", source: "Source" },
  it: { unavailable: "Immagine pertinente con licenza non disponibile", loading: "Caricamento della galleria della destinazione", noPhoto: "Nessuna foto con licenza disponibile per", loadingFor: "Caricamento delle foto con licenza di", gallery: "galleria fotografica", photo: "foto", photos: "foto", previous: "Foto precedente di", next: "Foto successiva di", show: "Mostra foto", by: "di", source: "Fonte" },
  de: { unavailable: "Kein passendes lizenziertes Bild verfügbar", loading: "Lizenzierte Zielgalerie wird geladen", noPhoto: "Kein lizenziertes Foto verfügbar für", loadingFor: "Lizenzierte Fotos werden geladen für", gallery: "Fotogalerie", photo: "Foto", photos: "Fotos", previous: "Vorheriges Foto von", next: "Nächstes Foto von", show: "Foto anzeigen", by: "von", source: "Quelle" },
  fr: { unavailable: "Aucune image pertinente sous licence disponible", loading: "Chargement de la galerie de la destination", noPhoto: "Aucune photo sous licence disponible pour", loadingFor: "Chargement des photos sous licence de", gallery: "galerie photo", photo: "photo", photos: "photos", previous: "Photo précédente de", next: "Photo suivante de", show: "Afficher la photo", by: "par", source: "Source" },
  sl: { unavailable: "Ustrezna licencirana slika ni na voljo", loading: "Nalaganje galerije destinacije", noPhoto: "Licencirana fotografija ni na voljo za", loadingFor: "Nalaganje licenciranih fotografij za", gallery: "fotogalerija", photo: "fotografija", photos: "fotografij", previous: "Prejšnja fotografija kraja", next: "Naslednja fotografija kraja", show: "Prikaži fotografijo", by: "avtor", source: "Vir" },
} as const;

function MediaCredit({ media, by, source }: { media: Media; by: string; source: string }) {
  return (
    <span className="destination-photo-credit">
      {media.title} · {by} {media.author} · {media.license} ·{" "}
      <a href={media.source} target="_blank" rel="noreferrer noopener">{source}</a>
    </span>
  );
}

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
  destinationId,
  name,
  region,
  className = "",
  compact = false,
  layout = "carousel",
  autoPlay = false,
  autoPlayIntervalMs = 5200,
  interactive = true,
}: Props) {
  const catalogueId = destinationId?.replace(/^catalogue-/, "");
  const mediaAudit = catalogueId
    ? reviewedDestinationMedia[catalogueId]
    : undefined;
  const localGallery = localDestinationMedia[name];
  const [gallery, setGallery] = useState<Media[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const visibilityRef = useRef<HTMLElement | null>(null);
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
    const element = visibilityRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    if (localGallery?.length) {
      queueMicrotask(() => {
        setGallery(localGallery);
        setActiveIndex(0);
        setFailed(false);
        setImageFailed(false);
      });
      return;
    }
    let active = true;
    const controller = new AbortController();
    const cacheKey = `gemgo-commons-landscape-v6-${name}-${region}-${compact ? "compact" : "full"}`;

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

    const params = commonsImageParams(
      name,
      region,
      compact ? 720 : 1280,
      mediaAudit ? 1 : 24,
    );
    if (mediaAudit?.fileTitle) {
      params.delete("generator");
      params.delete("gsrnamespace");
      params.delete("gsrlimit");
      params.delete("gsrsearch");
      params.set("titles", mediaAudit.fileTitle);
    }

    fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Commons unavailable");
        return response.json();
      })
      .then((payload) => {
        const commonsPayload = payload as {
          query?: { pages?: Record<string, unknown> };
        };
        const pages = Object.values(commonsPayload.query?.pages ?? {}) as Array<{
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
  }, [compact, localGallery, mediaAudit, name, region, shouldLoad]);

  useEffect(() => {
    if (gallery.length < 2) return;
    const next = gallery[(activeIndex + 1) % gallery.length];
    const image = new Image();
    image.src = next.url;
  }, [activeIndex, gallery]);

  useEffect(() => {
    if (!autoPlay || gallery.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const timer = window.setInterval(() => {
      setImageFailed(false);
      setActiveIndex((current) => (current + 1) % gallery.length);
    }, autoPlayIntervalMs);

    return () => window.clearInterval(timer);
  }, [autoPlay, autoPlayIntervalMs, gallery.length]);

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

  const removeMedia = (url: string) => {
    setGallery((current) => current.filter((media) => media.url !== url));
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
        ref={(element) => { visibilityRef.current = element; }}
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

  if (layout === "puzzle") {
    return (
      <figure
        ref={(element) => { visibilityRef.current = element; }}
        className={`destination-photo destination-photo-puzzle ${className}`}
        aria-label={`${name} ${t.gallery}, ${gallery.length} ${t.photo}`}
      >
        <div className={`destination-photo-puzzle-grid count-${Math.min(gallery.length, 5)}`}>
          {gallery.slice(0, 5).map((media, index) => (
            <div className="destination-photo-puzzle-cell" key={media.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={`${name}, ${region} — ${t.photo} ${index + 1} / ${gallery.length}`}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                onError={() => removeMedia(media.url)}
              />
              <span className="destination-photo-label">{name}</span>
            </div>
          ))}
        </div>
        <figcaption>{gallery.slice(0, 5).map((media) => <MediaCredit key={media.url} media={media} by={t.by} source={t.source} />)}</figcaption>
      </figure>
    );
  }

  return (
    <figure
      ref={(element) => { visibilityRef.current = element; }}
      className={`destination-photo destination-gallery ${compact ? "is-compact" : ""} ${autoPlay ? "is-autoplay" : ""} ${className}`}
      tabIndex={interactive && gallery.length > 1 ? 0 : undefined}
      aria-label={`${name} ${t.gallery}, ${t.photo} ${activeIndex + 1} / ${gallery.length}`}
      onKeyDown={interactive ? (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      } : undefined}
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
    >
      <div className="destination-gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeMedia.url}
          className="destination-gallery-image"
          src={activeMedia.url}
          alt={`${name}, ${region} — ${t.photo} ${activeIndex + 1} / ${gallery.length}`}
          loading={autoPlay ? "eager" : "lazy"}
          decoding="async"
          onError={handleImageError}
        />
        <span className="destination-photo-label">{name}</span>
        {interactive && gallery.length > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-arrow-previous" aria-label={`${t.previous} ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(-1); }}>
              <ChevronLeft size={compact ? 18 : 21} />
            </button>
            <button type="button" className="gallery-arrow gallery-arrow-next" aria-label={`${t.next} ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(1); }}>
              <ChevronRight size={compact ? 18 : 21} />
            </button>
            <div className="gallery-dots" aria-label={`${gallery.length} ${t.photos}`}>
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
      <figcaption><MediaCredit media={activeMedia} by={t.by} source={t.source} /></figcaption>
    </figure>
  );
}
