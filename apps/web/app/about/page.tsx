import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@masahepinas/config';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const LAST_UPDATED = '2026-08-11';

export const metadata: Metadata = {
  // `title` is absolute (not the layout's "%s · Masahe Pinas" template) —
  // the brand name is already in this title, so the template would
  // duplicate it.
  title: { absolute: 'About Masahe Pinas | Spa & Massage Reviews Philippines' },
  description:
    'Masahe Pinas is a Philippine platform for discovering massage and spa businesses, reading spa reviews, and finding trusted wellness information nationwide.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Masahe Pinas | Spa & Massage Reviews Philippines',
    description:
      'Masahe Pinas is a Philippine platform for discovering massage and spa businesses, reading spa reviews, and finding trusted wellness information nationwide.',
    url: `${siteUrl}/about`,
    type: 'website',
  },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${siteUrl}/about#aboutpage`,
        url: `${siteUrl}/about`,
        name: 'About Masahe Pinas',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organization` },
        dateModified: LAST_UPDATED,
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: APP_NAME,
        url: siteUrl,
        description:
          'Masahe Pinas is a Philippine digital discovery, directory, and community review platform for massage, spa, and wellness businesses.',
        areaServed: {
          '@type': 'Country',
          name: 'Philippines',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: APP_NAME,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'About',
            item: `${siteUrl}/about`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-foreground-secondary">
        <Link href="/" className="hover:underline">
          Home
        </Link>{' '}
        / <span>About</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          About Masahe Pinas — Discover Trusted Spa &amp; Massage Reviews in the
          Philippines
        </h1>
        <p className="text-sm text-foreground-secondary">Last updated: {LAST_UPDATED}</p>
      </header>

      <div className="prose-content space-y-8 text-foreground-secondary [&_a]:text-brand-accent [&_a:hover]:underline [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:text-xl [&_h2]:pt-2 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:text-base [&_p]:leading-relaxed [&_li]:leading-relaxed">
        <p>
          <strong className="text-foreground">Masahe Pinas</strong> is the
          Philippines&apos; home for{' '}
          <strong className="text-foreground">spa reviews in the Philippines</strong>,{' '}
          <strong className="text-foreground">massage reviews</strong>, and discovering
          wellness businesses nationwide. Whether you&apos;re searching for a relaxing
          massage after work, comparing spas before a trip to Tagaytay, or trying to find
          out if a wellness business near you is legitimate, Masahe Pinas brings that
          information together in one place — searchable by location, service, and real
          customer feedback.
        </p>

        <section className="space-y-3">
          <h2>What Is Masahe Pinas?</h2>
          <p>
            Masahe Pinas is an independent discovery, directory, community review, and
            recommendation platform. It is not a spa, a massage parlor, or a wellness
            clinic — Masahe Pinas does not provide massage or spa services itself.
            Instead, it helps Filipinos and visitors find <em>other</em> businesses:
            registered spas, massage studios, and wellness centers across the Philippines,
            along with the information people actually need before choosing one —
            location, services, pricing range, therapist availability, operating
            information, and community reviews.
          </p>
          <p>
            Business owners list their own establishments, customers share their
            experiences, and Masahe Pinas organizes all of it into a searchable{' '}
            <Link href="/search">spa and massage directory</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Our Mission</h2>
          <p>
            Our mission is to help Filipinos and visitors discover legitimate,
            transparent, quality massage, spa, and wellness businesses throughout the
            Philippines. We focus on making information easier to find and easier to
            compare — so choosing where to get a massage or book a spa treatment
            doesn&apos;t mean digging through outdated posts or guessing whether a listing
            is even real.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Why Masahe Pinas Exists</h2>
          <p>
            Anyone who has tried to find a decent spa in the Philippines knows the
            problem: information is scattered. A business might have an old Facebook page
            with no recent posts, a Google listing with the wrong hours, or no online
            presence at all beyond word of mouth. Common frustrations include:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Difficulty finding useful, up-to-date information about a business</li>
            <li>Spa and massage listings scattered across Facebook pages and groups</li>
            <li>Outdated contact numbers, hours, or addresses</li>
            <li>Limited or no genuine customer feedback before booking</li>
            <li>No easy way to compare nearby establishments side by side</li>
            <li>
              No centralized place to discover what&apos;s actually available nearby
            </li>
          </ul>
          <p>
            Masahe Pinas exists to close that gap — not by replacing the businesses
            themselves, but by giving them, and the people looking for them, a shared,
            centralized place to be found and evaluated fairly.
          </p>
        </section>

        <section className="space-y-3">
          <h2>How Masahe Pinas Helps You Find a Spa</h2>
          <p>
            The <Link href="/search">Masahe Pinas search directory</Link> lets you look
            for massage and spa businesses by location, service type, price range, and
            therapist availability, then sort results by rating or recency. Every listing
            brings together the business&apos;s core information — address, contact
            details, services, and operating hours where provided — alongside ratings,
            community reviews, and, where applicable, a Masahe Pinas recommendation badge.
            It&apos;s built to answer the question people actually have:{' '}
            <em>which of these is worth my time</em>, not just which ones exist.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Independent Spa &amp; Massage Reviews in the Philippines</h2>
          <p>
            A core part of Masahe Pinas is its community review system. Customers who have
            visited a listed business can leave a rating and a written review, which
            appears directly on that business&apos;s profile alongside its other details.
            This is what builds Masahe Pinas&apos;s library of{' '}
            <strong className="text-foreground">spa reviews in the Philippines</strong>{' '}
            and <strong className="text-foreground">massage reviews in PH</strong> — real
            feedback from real visits, attached to real listings, rather than scattered
            comments across social media.
          </p>
          <p>
            Reviews are moderated for abuse and policy violations, and business owners can
            respond publicly to feedback on their own listing. That said, Masahe Pinas
            does not independently verify that every reviewer transacted with a business —
            reviews reflect what customers report, moderated for quality and legitimacy
            rather than externally fact-checked line by line.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Discover Massage and Spa Businesses by Location</h2>
          <p>
            Because where you are matters as much as what you&apos;re looking for, Masahe
            Pinas is building out location-focused discovery pages for different
            Philippine provinces and cities — starting with the areas where our directory
            already has the strongest coverage. If you&apos;re looking for a{' '}
            <Link href="/blogs/cavite-spa">spa in Cavite</Link>, want{' '}
            <Link href="/blogs/cavite-spa">massage in Cavite</Link> options near a
            specific city, or want to read real{' '}
            <Link href="/blogs/cavite-spa">spa reviews in Cavite</Link>, our dedicated{' '}
            <Link href="/blogs/cavite-spa">Cavite Spa guide</Link> is the best place to
            start. More provincial and city guides are on the way through the{' '}
            <Link href="/blogs">Masahe Pinas blog</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2>For Spa and Wellness Business Owners</h2>
          <p>
            If you run a legitimate massage, spa, or wellness business in the Philippines,
            you can list it on Masahe Pinas to become discoverable by people actively
            searching for services like yours in your area. A listing gives you a public
            profile with your business details, services, and customer reviews — and the
            ability to respond to feedback directly.
          </p>
          <p>
            <Link href="/sign-up/spa-owner" className="btn-primary mt-1 inline-flex">
              List your spa on Masahe Pinas
            </Link>
          </p>
        </section>

        <section className="space-y-3">
          <h2>Our Commitment to Trust and Transparency</h2>
          <p>
            Trust is the foundation Masahe Pinas is built on. We aim to keep business
            information transparent and up to date, moderate community contributions
            responsibly, and represent customer experiences fairly rather than
            selectively. Businesses are not required to pay to appear in search results,
            and users are free to browse, compare, and read reviews without creating an
            account. Where a business chooses to promote its listing, that is presented
            clearly rather than blended into organic results.
          </p>
          <p>
            We&apos;re a growing platform, and our directory coverage — like any
            directory&apos;s — is strongest where the most businesses and reviewers have
            joined so far. We&apos;d rather be upfront about that than overstate our
            reach.
          </p>
        </section>

        <section className="space-y-3">
          <h2>Explore Masahe Pinas</h2>
          <p>Ready to find a spa, read reviews, or list your own business?</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Link href="/search">Search spas and massage businesses</Link> across the
              Philippines
            </li>
            <li>
              <Link href="/blogs">Explore massage and spa guides</Link> on the Masahe
              Pinas blog
            </li>
            <li>
              Read the <Link href="/blogs/cavite-spa">Cavite Spa guide</Link>
            </li>
            <li>
              <Link href="/sign-up/spa-owner">List your spa</Link> for free
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
