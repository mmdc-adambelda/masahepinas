import Link from 'next/link';
import { APP_NAME, APP_TAGLINE } from '@masahepinas/config';

/**
 * Site-wide footer. Doubles as secondary navigation and internal-linking
 * surface for SEO (Explore / Masahe Pinas / Locations groups) without
 * crowding the primary header nav — see docs/development-roadmap.md for
 * why the header stays minimal.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/5 bg-background-secondary">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 text-sm sm:grid-cols-4">
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <p className="font-semibold text-foreground">{APP_NAME}</p>
          <p className="text-foreground-secondary">{APP_TAGLINE}</p>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">Explore</p>
          <ul className="space-y-1.5 text-foreground-secondary">
            <li>
              <Link href="/search" className="hover:text-foreground">
                Search spas
              </Link>
            </li>
            <li>
              <Link href="/blogs" className="hover:text-foreground">
                Blogs
              </Link>
            </li>
            <li>
              <Link href="/blogs/cavite-spa" className="hover:text-foreground">
                Cavite spa guide
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">{APP_NAME}</p>
          <ul className="space-y-1.5 text-foreground-secondary">
            <li>
              <Link href="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
            <li>
              <Link href="/sign-up/spa-owner" className="hover:text-foreground">
                List your spa
              </Link>
            </li>
            <li>
              <Link href="/sign-in" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">Locations</p>
          <ul className="space-y-1.5 text-foreground-secondary">
            <li>
              <Link href="/blogs/cavite-spa" className="hover:text-foreground">
                Cavite
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-4 text-xs text-foreground-secondary">
        <p className="mx-auto max-w-6xl">
          © {year} {APP_NAME}. A Philippine spa, massage &amp; wellness discovery and
          review platform.
        </p>
      </div>
    </footer>
  );
}
