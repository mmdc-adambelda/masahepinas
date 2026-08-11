import Link from 'next/link';
import { requireSuperadmin } from '@/lib/auth';
import { AdminBackLink } from '../../back-link';
import { BulkUploadForm } from './bulk-upload-form';

export const metadata = { title: 'Bulk upload spa listings (admin)' };

const CSV_COLUMNS = [
  { name: 'business_name', required: true },
  {
    name: 'description',
    note: 'auto-generated from the business name/city/province if left blank or under 20 characters',
  },
  {
    name: 'contact_number',
    required: true,
    note: 'PH mobile — spaces/dashes/parens are stripped automatically, e.g. "0917 123 4567" works',
  },
  {
    name: 'gender_availability',
    note: 'male_only / female_only / both / no_preference — defaults to no_preference',
  },
  { name: 'price_range', note: 'budget / mid_range / premium / luxury' },
  { name: 'website_url' },
  { name: 'booking_contact_number' },
  { name: 'social_media_url' },
  { name: 'address_line', note: 'if blank, filled from city/province' },
  { name: 'barangay' },
  {
    name: 'city_municipality',
    note: 'if blank, filled from province — fine for a home-service business with no fixed storefront',
  },
  { name: 'province', required: true },
  { name: 'region', note: 'auto-filled from province if left blank' },
  { name: 'postal_code' },
  {
    name: 'latitude',
    note: 'used as-is if present, otherwise left blank — never geocoded. Without it the listing won’t show a map or appear in "near me" search until someone adds coordinates',
  },
  { name: 'longitude', note: 'see latitude' },
  {
    name: 'status',
    note: 'pending_review / verified / unverified — defaults to unverified',
  },
  {
    name: 'owner_name',
    note: 'internal only — never shown publicly, only to staff on /admin/listings, for outreach about claiming the listing',
  },
  { name: 'owner_phone', note: 'internal only, same as owner_name' },
  { name: 'owner_email', note: 'internal only, same as owner_name' },
];

export default async function AdminBulkUploadSpasPage() {
  await requireSuperadmin();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Bulk upload spa listings
        </h1>
        <p className="text-sm text-foreground-secondary">
          Superadmin-only. Creates unclaimed listings (no owner account) from a CSV file —
          same shape as{' '}
          <Link href="/admin/spas/new" className="text-brand-accent hover:underline">
            adding a single listing
          </Link>
          . Each row is validated and inserted independently, so one bad row doesn&apos;t
          sink the whole batch — the result below names exactly which field failed on any
          row that didn&apos;t import. Up to 500 rows / 2 MB per upload.
        </p>
        <p className="text-sm text-foreground-secondary">
          <strong className="text-foreground">
            Only business_name, contact_number, and province are actually required
          </strong>{' '}
          — everything else has a fallback: missing description/region are auto-generated,
          and missing address/city fall back to the province itself. Coordinates are taken
          as-is if present and are never geocoded — a row with no lat/lng still imports
          fine, it just won&apos;t appear on the map or in &quot;near me&quot; search
          until someone adds coordinates from the listing later. Business hours and
          services aren&apos;t set by the import — add those afterward from the listing,
          or leave them for the eventual owner to fill in when they claim it.
        </p>
        <p className="text-sm text-foreground-secondary">
          <code>owner_name</code>, <code>owner_phone</code>, and <code>owner_email</code>{' '}
          are optional internal-only fields — never shown to the public, only to staff on{' '}
          <Link href="/admin/listings" className="text-brand-accent hover:underline">
            the listing verification page
          </Link>
          , so you can reach out to the real owner about claiming the listing.
        </p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium text-foreground">CSV columns</h2>
        <p className="text-xs text-foreground-secondary">
          First row must be the header row with exactly these column names. Optional
          columns can be left empty.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-foreground-secondary">
                <th className="py-1.5 pr-4">Column</th>
                <th className="py-1.5 pr-4">Required</th>
                <th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {CSV_COLUMNS.map((col) => (
                <tr key={col.name} className="border-t border-white/5">
                  <td className="py-1.5 pr-4 font-mono text-foreground">{col.name}</td>
                  <td className="py-1.5 pr-4 text-foreground-secondary">
                    {col.required ? 'Yes' : ''}
                  </td>
                  <td className="py-1.5 text-foreground-secondary">{col.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkUploadForm />
    </main>
  );
}
