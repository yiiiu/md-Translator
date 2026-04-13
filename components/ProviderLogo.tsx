"use client";

import { useState } from "react";
import { SiOpenai } from "react-icons/si";

export function deriveFaviconUrl(baseUrl?: string) {
  if (!baseUrl) {
    return "";
  }

  try {
    const host = new URL(baseUrl).hostname;
    if (!host) {
      return "";
    }

    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return "";
  }
}

export default function ProviderLogo({
  engineId,
  label,
  baseUrl,
  className = "h-6 w-6",
  imageClassName = "h-4 w-4",
}: {
  engineId: string;
  label: string;
  baseUrl?: string;
  className?: string;
  imageClassName?: string;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const normalized = `${engineId} ${label}`.toLowerCase();
  const isOpenAI = engineId === "openai";
  const imageUrl = deriveFaviconUrl(baseUrl);
  const shouldShowImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  const mark = normalized.includes("custom")
    ? "C"
    : label.trim().charAt(0).toUpperCase() || "A";

  return (
    <span
      aria-label={`${label} provider`}
      className={`grid shrink-0 place-items-center rounded-full bg-[#111c2d] text-[10px] font-extrabold tracking-[-0.02em] text-white shadow-sm ring-1 ring-[#0052ff]/20 ${className}`}
    >
      {shouldShowImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={imageUrl}
          aria-hidden="true"
          className={`rounded-sm object-contain ${imageClassName}`}
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : isOpenAI ? (
        <SiOpenai className={imageClassName} title="" />
      ) : (
        mark
      )}
    </span>
  );
}
