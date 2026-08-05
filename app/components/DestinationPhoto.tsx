"use client";

import { useEffect, useState } from "react";
import { commonsImageParams } from "../lib/commons-media";

type Media = {
  url: string;
  source: string;
  author: string;
  license: string;
};

type Props = {
  name: string;
  region: string;
  className?: string;
  compact?: boolean;
};

const allowedLicense = /^(CC0|CC BY|CC BY-SA|Public domain)/i;

const plainText = (value?: { value?: string }) =>
  (value?.value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

export default function DestinationPhoto({
  name,
  region,
  className = "",
  compact = false,
}: Props) {
  const [media, setMedia] = useState<Media | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const cacheKey = `gemgo-commons-v3-${name}-${region}`;
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Media;
        queueMicrotask(() => {
          if (active) setMedia(parsed);
        });
        return () => {
          active = false;
        };
      }
    } catch {
      // The image cache is optional.
    }

    const params = commonsImageParams(name, region, compact ? 520 : 900);

    fetch(`https://commons.wikimedia.org/w/api.php?${params}`)
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
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }>;
        const match = pages
          .map((page) => ({ page, info: page.imageinfo?.[0] }))
          .find(({ info }) => {
            const license = plainText(info?.extmetadata?.LicenseShortName);
            return Boolean(info?.thumburl && allowedLicense.test(license));
          });
        if (!active || !match?.info?.thumburl) throw new Error("No free image");
        const result: Media = {
          url: match.info.thumburl,
          source: match.info.descriptionurl ?? "https://commons.wikimedia.org/",
          author:
            plainText(match.info.extmetadata?.Artist) ||
            plainText(match.info.extmetadata?.Credit) ||
            "Wikimedia Commons contributor",
          license:
            plainText(match.info.extmetadata?.LicenseShortName) || "Free licence",
        };
        setMedia(result);
        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // The image cache is optional.
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [compact, name, region]);

  if (!media) {
    return (
      <div className={`destination-photo destination-photo-fallback ${className}`}>
        <span>{failed ? name : "GemGo"}</span>
      </div>
    );
  }

  return (
    <figure className={`destination-photo ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt={`${name}, ${region}`} loading="lazy" />
      <figcaption>
        <a href={media.source} target="_blank" rel="noreferrer">
          {media.author} · {media.license}
        </a>
      </figcaption>
    </figure>
  );
}
