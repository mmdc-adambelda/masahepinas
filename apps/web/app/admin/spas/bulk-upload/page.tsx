import Link from 'next/link';
import { requireSuperadmin } from '@/lib/auth';
import { BulkUploadForm } from './bulk-upload-form';

export const metadata = { title: 'Bulk upload spa listings (admin)' };

const CSV_COLUMNS = [
  { name: 'business_name', required: true },
  { name: 'description', required: true, note: 'at least 20 characters' },
  { name: 'contact_number', required: true, note: 'PH mobile, e.g. 09171234567' },
  {
    name: 'gender_availability',
    note: 'male_only / female_only / both / no_preference — defaults to no_preference',
  },
  { name: 'price_range', note: 'budget / mid_range / premium / luxury' },
  { name: 'website_url' },
  { name: 'booking_contact_number' },
  { name: 'social_media_url' },
  { name: 'address_line', required: true },
  { name: 'barangay' },
  { name: 'city_municipality', required: true },
  { name: 'province', required: true },
  { name: 'region', required: true },
  { name: 'postal_code' },
  { name: 'latitude', required: true },
  { name: 'longitude', required: true },
  {
    name: 'status',
    note: 'pending_review / verified / unverified — defaults to unverified',
  },
];

export default async function AdminBulkUploadSpasPage() {
  await requireSuperadmin();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
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
          sink the whole batch. Up to 500 rows / 2 MB per upload. Business hours and
          services aren&apos;t set by the import — add those afterward from the listing,
          or leave them for the eventual owner to fill in when they claim it.
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
