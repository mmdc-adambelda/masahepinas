'use server';

import { revalidatePath } from 'next/cache';
import { slugify } from '@masahepinas/utils';
import { requireSuperadmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ServiceCategoryResult {
  error: string | null;
}

export async function createServiceCategory(
  _prevState: ServiceCategoryResult,
  formData: FormData,
): Promise<ServiceCategoryResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!name) return { error: 'Name is required.' };

  const { error } = await supabase.from('service_categories').insert({
    slug: slugify(name),
    name,
    description: description || null,
  });
  if (error) return { error: 'Could not create the service. It may already exist.' };

  revalidatePath('/admin/services');
  return { error: null };
}

export async function toggleServiceCategoryActive(
  categoryId: string,
  isActive: boolean,
): Promise<ServiceCategoryResult> {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('service_categories')
    .update({ is_active: isActive })
    .eq('id', categoryId);
  if (error) return { error: 'Could not update the service.' };

  revalidatePath('/admin/services');
  return { error: null };
}
