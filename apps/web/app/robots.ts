import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Account-scoped/private-data routes: no value being indexed, and
        // some require auth anyway so a crawler would just hit a redirect.
        disallow: [
          '/admin',
          '/admin/*',
          '/owner',
          '/owner/*',
          '/settings',
          '/settings/*',
          '/notifications',
          '/saved',
          '/appeals',
          '/appeals/*',
          '/account',
          '/account/*',
          '/auth',
          '/auth/*',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
