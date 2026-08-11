import { formatRelativeDate } from '@masahepinas/utils';
import { requireRole } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { dismissReport, hideReportedReview, restoreReview } from './actions';
import { AdminBackLink } from '../back-link';
import { ModerationForm } from './moderation-form';

export const metadata = { title: 'Content reports (moderator)' };

const REASON_LABELS: Record<string, string> = {
  fake_review: 'Fake review',
  harassment: 'Harassment',
  hate_speech: 'Hate speech',
  personal_information: 'Contains personal information',
  spam: 'Spam',
  conflict_of_interest: 'Conflict of interest',
  explicit_content: 'Explicit content',
  blackmail_or_extortion: 'Blackmail or extortion',
  unrelated_to_business: 'Unrelated to this business',
  illegal_service_promotion: 'Promotes an illegal service',
};

export default async function AdminReportsPage() {
  await requireRole('moderator');
  const supabase = await createSupabaseServerClient();

  const { data: reports } = await supabase
    .from('content_reports')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: true });

  const reviewReportTargetIds = (reports ?? [])
    .filter((r) => r.target_type === 'review')
    .map((r) => r.target_id);

  const { data: reviews } =
    reviewReportTargetIds.length > 0
      ? await supabase
          .from('reviews')
          .select(
            'id, body, overall_rating, moderation_status, business_id, spa_businesses(business_name)',
          )
          .in('id', reviewReportTargetIds)
      : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewById = new Map((reviews ?? []).map((r: any) => [r.id, r]));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <AdminBackLink />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Content reports</h1>
        <p className="text-sm text-foreground-secondary">
          Open reports awaiting review. Every action here is logged to{' '}
          <code>moderation_actions</code> with the reason you provide.
        </p>
      </div>

      {!reports || reports.length === 0 ? (
        <p className="text-foreground-secondary">No open reports.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const review =
              report.target_type === 'review' ? reviewById.get(report.target_id) : null;
            return (
              <article key={report.id} className="card space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="rounded-full border border-warning/40 px-2 py-0.5 text-warning">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                  <span className="text-xs text-foreground-secondary">
                    {formatRelativeDate(report.created_at)}
                  </span>
                </div>

                <p className="text-xs uppercase tracking-wide text-foreground-secondary">
                  {report.target_type}
                </p>

                {review ? (
                  <div className="rounded-md border border-white/10 p-3 text-sm">
                    <p className="text-foreground-secondary">
                      On{' '}
                      <span className="text-foreground">
                        {review.spa_businesses?.business_name}
                      </span>{' '}
                      · ★ {review.overall_rating} · status: {review.moderation_status}
                    </p>
                    <p className="mt-1 text-foreground-secondary">{review.body}</p>
                  </div>
                ) : (
                  <p className="text-sm text-foreground-secondary">
                    Target id: {report.target_id}
                  </p>
                )}

                {report.details ? (
                  <p className="text-sm text-foreground-secondary">
                    Reporter notes: {report.details}
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  {review && review.moderation_status === 'visible' ? (
                    <ModerationForm
                      action={hideReportedReview.bind(null, report.id, report.target_id)}
                      label="Hide review"
                      variant="danger"
                    />
                  ) : review ? (
                    <ModerationForm
                      action={restoreReview.bind(null, report.target_id)}
                      label="Restore review"
                    />
                  ) : null}
                  <ModerationForm
                    action={dismissReport.bind(
                      null,
                      report.id,
                      report.target_type,
                      report.target_id,
                    )}
                    label="Dismiss report"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
