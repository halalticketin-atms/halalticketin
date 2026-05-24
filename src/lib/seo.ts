import type { Metadata } from 'next';

export const SITE_NAME = "HalalTicketin'";
export const DEFAULT_TITLE = `${SITE_NAME} - Your Home of Meaningful Events`;
export const DEFAULT_DESCRIPTION =
  'Discover, create, and manage meaningful halal-friendly events for your community.';
export const DEFAULT_KEYWORDS = [
  'halal events',
  'muslim events',
  'islamic events',
  'event ticketing',
  'event platform',
  'community events',
];

const PRODUCTION_SITE_URL = 'https://www.halalticketin.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL;

  try {
    const url = new URL(configuredUrl);
    if (url.hostname === 'halalticketin.com') {
      url.hostname = 'www.halalticketin.com';
    }
    url.pathname = url.pathname.replace(/\/$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return PRODUCTION_SITE_URL;
  }
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function cleanSeoText(value?: string | null) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateSeoText(value: string, maxLength = 155) {
  const cleaned = cleanSeoText(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${(lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trim()}...`;
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
  image,
  imageAlt,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(path);
  const resolvedImage = absoluteUrl(image || DEFAULT_OG_IMAGE);

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    keywords: [...DEFAULT_KEYWORDS, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: resolvedImage,
          width: 1200,
          height: 630,
          alt: imageAlt || title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: resolvedImage,
          alt: imageAlt || title,
        },
      ],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};
