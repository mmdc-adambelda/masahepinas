import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminBackLink } from '../back-link';
import { CreateServiceForm, ToggleActiveButton } from './service-controls';

export const metadata = { title: 'Service category management' };

export default async function AdminServicesPage() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from('service_categories')
    .select('*')
    .order('name');

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <AdminBackLink />
      <h1 className="text-2xl font-semibold text-foreground">
        Service category management
      </h1>

      <CreateServiceForm />

      <div className="space-y-2">
        {(categories ?? []).map((category) => (
          <div key={category.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {category.name}{' '}
                <span
                  className={`text-xs ${category.is_active ? 'text-brand-accent' : 'text-foreground-secondary'}`}
                >
                  {category.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
              <p className="text-xs text-foreground-secondary">{category.description}</p>
            </div>
            <ToggleActiveButton categoryId={category.id} isActive={category.is_active} />
          </div>
        ))}
      </div>
    </main>
  );
}
