import { Helmet } from "react-helmet-async";

const SITE_URL = "https://events.dmvthrowers.club";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "event";
  noIndex?: boolean;
  /** Optional JSON-LD object(s) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-page SEO. Sets <title>, meta description, canonical, OG/Twitter tags,
 * and optional JSON-LD structured data. Title is automatically suffixed with
 * the site brand unless it already contains it.
 */
export const Seo = ({
  title,
  description,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
  jsonLd,
}: SeoProps) => {
  const fullTitle =
    title.includes("YoYo Events") || title.length > 60
      ? title
      : `${title} — YoYo Events`;
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`.replace(
    /\/$/,
    path === "" || path === "/" ? "/" : ""
  );
  const ogType = type === "event" ? "article" : type;
  const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="YoYo Events" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
