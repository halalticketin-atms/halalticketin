import type { Metadata } from 'next';
import { cache, type ReactNode } from 'react';
import {
  fetchPublicOrganizerProfile,
  type PublicOrganizerProfile,
} from '@/lib/organizers-api';
import {
  SITE_NAME,
  absoluteUrl,
  cleanSeoText,
  createPageMetadata,
  truncateSeoText,
} from '@/lib/seo';

type RouteParams = Promise<{ id: string }>;

const getOrganizerSeoData = cache(async (id: string) => {
  try {
    return await fetchPublicOrganizerProfile(id);
  } catch {
    return null;
  }
});

function organizerDescription(organizer: PublicOrganizerProfile) {
  const bio = cleanSeoText(organizer.bio);
  if (bio) {
    return truncateSeoText(bio);
  }

  const location = [organizer.city, organizer.country].filter(Boolean).join(', ');
  return truncateSeoText(
    `Discover upcoming meaningful events from ${organizer.name}${
      location ? ` in ${location}` : ''
    } on HalalTicketin'.`
  );
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined || entry === '') {
        return false;
      }
      if (Array.isArray(entry) && entry.length === 0) {
        return false;
      }
      return true;
    })
  );
}

function buildOrganizerStructuredData(organizer: PublicOrganizerProfile, canonicalUrl: string) {
  const sameAs = Object.values(organizer.socialLinks ?? {}).filter((url) =>
    /^https?:\/\//i.test(url)
  );

  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organizer.name,
    description: organizerDescription(organizer),
    image: organizer.avatarUrl ? absoluteUrl(organizer.avatarUrl) : undefined,
    url: canonicalUrl,
    sameAs,
    address:
      organizer.city || organizer.country
        ? compactObject({
            '@type': 'PostalAddress',
            addressLocality: organizer.city,
            addressCountry: organizer.country,
          })
        : undefined,
  });
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { id } = await params;
  const response = await getOrganizerSeoData(id);
  const organizer = response?.organizer ?? null;

  if (!organizer) {
    return createPageMetadata({
      title: `Organiser Unavailable | ${SITE_NAME}`,
      description: "This organiser profile is currently unavailable on HalalTicketin'.",
      path: `/organizers/${id}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: `${organizer.name} Events | ${SITE_NAME}`,
    description: organizerDescription(organizer),
    path: `/organizers/${organizer.id}`,
    image: organizer.avatarUrl,
    imageAlt: organizer.name,
    keywords: [organizer.name, organizer.city, organizer.country, 'event organiser'].filter(
      Boolean
    ) as string[],
  });
}

export default async function OrganizerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: RouteParams;
}) {
  const { id } = await params;
  const response = await getOrganizerSeoData(id);
  const organizer = response?.organizer ?? null;
  const canonicalUrl = absoluteUrl(`/organizers/${organizer?.id || id}`);
  const structuredData = organizer ? buildOrganizerStructuredData(organizer, canonicalUrl) : null;

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      {children}
    </>
  );
}
