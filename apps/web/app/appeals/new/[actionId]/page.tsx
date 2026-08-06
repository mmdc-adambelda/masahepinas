import { requireAuth } from '@/lib/auth';
import { AppealForm } from './appeal-form';

export const metadata = { title: 'Appeal a moderation decision' };

export default async function NewAppealPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  await requireAuth();
  const { actionId } = await params;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Appeal this decision</h1>
        <p className="text-sm text-foreground-secondary">
          Explain why you believe this moderation decision should be reconsidered. A
          moderator will review your appeal — this does not guarantee the decision will be
          reversed.
        </p>
      </div>
      <AppealForm actionId={actionId} />
    </main>
  );
}
