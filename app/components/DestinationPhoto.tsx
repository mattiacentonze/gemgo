"use client";

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { commonsImageParams, commonsSearchText } from "../lib/commons-media";

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
const rejectedTitle = /\b(map|karte|plan|locator|flag|coat of arms|logo|icon|poster|diagram|sign|signage|stamp|emblem)\b/i;

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

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const cacheKey = `gemgo-commons-gallery-v2-${name}-${region}-${compact ? "compact" : "full"}`;

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
            if (!info?.thumburl || !allowedLicense.test(license) || rejectedTitle.test(title)) return null;
            const landscapeBonus = info.width && info.height && info.width >= info.height ? 2 : 0;
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

        const relevant = candidates.filter((item) => item.score >= 3);
        const selectedPool = relevant.length > 0 ? relevant : candidates;
        const unique = selectedPool.filter(
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

  if (!activeMedia || imageFailed) {
    return (
      <div
        className={`destination-photo destination-photo-fallback ${failed || imageFailed ? "is-failed" : "is-loading"} ${className}`}
        role="img"
        aria-label={failed || imageFailed ? `No licensed photo available for ${name}` : `Loading licensed photos of ${name}`}
      >
        <span className="destination-photo-brand" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/gemgo-logo.png" alt="" />
        </span>
        <span className="destination-photo-status">
          <ImageIcon size={18} />
          <strong>{name}</strong>
          <small>{failed || imageFailed ? "Relevant licensed image unavailable" : "Loading licensed destination gallery"}</small>
        </span>
      </div>
    );
  }

  return (
    <figure className={`destination-photo destination-gallery ${compact ? "is-compact" : ""} ${className}`}>
      <div className="destination-gallery-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeMedia.url}
          className="destination-gallery-image"
          src={activeMedia.url}
          alt={`${name}, ${region} — photo ${activeIndex + 1} of ${gallery.length}`}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
        {gallery.length > 1 && (
          <>
            <button type="button" className="gallery-arrow gallery-arrow-previous" aria-label={`Previous photo of ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(-1); }}>
              <ChevronLeft size={compact ? 18 : 21} />
            </button>
            <button type="button" className="gallery-arrow gallery-arrow-next" aria-label={`Next photo of ${name}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); move(1); }}>
              <ChevronRight size={compact ? 18 : 21} />
            </button>
            <div className="gallery-dots" aria-label={`${gallery.length} photos`}>
              {gallery.map((media, index) => (
                <button
                  type="button"
                  key={media.url}
                  className={index === activeIndex ? "is-active" : ""}
                  aria-label={`Show photo ${index + 1} of ${name}`}
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
