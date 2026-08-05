import { requireSuperadmin } from '@/lib/auth';
import { AdminCreateSpaForm } from './admin-create-spa-form';

export const metadata = { title: 'Add a spa listing (admin)' };

export default async function AdminNewSpaPage() {
  await requireSuperadmin();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Add a spa listing</h1>
        <p className="text-sm text-foreground-secondary">
          Superadmin-only. Creates an unclaimed listing (no owner account) — the real
          owner can claim it once the business claim workflow ships (Phase 5).
        </p>
      </div>
      <AdminCreateSpaForm />
    </main>
  );
}
