import { useEffect } from "react";
import { buildCanonicalUrl, SITE_NAME } from "@/lib/catalog";

interface SeoProps {
  title: string;
  description: string;
  canonicalPath?: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const upsertMetaTag = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => {
      element?.setAttribute(key, value);
    });
    document.head.appendChild(element);
  }

  if (attributes.content) {
    element.setAttribute("content", attributes.content);
  }
};

const upsertCanonicalLink = (href: string) => {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
};

export const Seo = ({
  title,
  description,
  canonicalPath = "/",
  keywords,
  image,
  type = "website",
  noIndex = false,
  structuredData,
}: SeoProps) => {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const robotsValue = noIndex ? "noindex, nofollow" : "index, follow";

    document.title = fullTitle;

    upsertMetaTag('meta[name="description"]', { name: "description", content: description });
    upsertMetaTag('meta[name="robots"]', { name: "robots", content: robotsValue });
    upsertMetaTag('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMetaTag('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMetaTag('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMetaTag('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMetaTag('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    upsertMetaTag('meta[name="twitter:card"]', { name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    upsertMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMetaTag('meta[name="twitter:url"]', { name: "twitter:url", content: canonicalUrl });

    if (keywords?.length) {
      upsertMetaTag('meta[name="keywords"]', { name: "keywords", content: keywords.join(", ") });
    }

    if (image) {
      upsertMetaTag('meta[property="og:image"]', { property: "og:image", content: image });
      upsertMetaTag('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    }

    upsertCanonicalLink(canonicalUrl);
  }, [title, description, canonicalPath, keywords, image, type, noIndex]);

  useEffect(() => {
    const scriptId = "page-structured-data";
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    if (!structuredData) {
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [structuredData]);

  return null;
};
