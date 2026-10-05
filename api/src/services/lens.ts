import { CoverageEntry, FeedbackEntry, Lens, buildLens } from '../domain/lens';
import { RelevanceBasis, isAttention } from '../domain/types';
import { supabase, unwrap } from '../lib/supabase';

const WINDOW_DAYS = 14;
const FEEDBACK_LIMIT = 20;

interface CoverageRow {
  development_id: string;
  world_significance: number | null;
  personal_relevance: number | null;
  shown_to_user: boolean | null;
  suppressed: boolean | null;
  suppressed_reason: string | null;
  relevance_basis: RelevanceBasis | null;
  attention: string | null;
  relevance_reasons: { suppressedMemoryId?: string | null } | null;
  developments: { headline: string; occurred_at: string; story_id: string; stories: { title: string } | null } | null;
}

interface FeedbackRow {
  id: string;
  created_at: string;
  feedback_type: string | null;
  reason: string | null;
  stories: { title: string } | null;
}

export async function getLens(userId: string): Promise<Lens> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const [coverageRows, feedbackRows] = await Promise.all([
    supabase
      .from('world_coverage')
      .select(
        'development_id, world_significance, personal_relevance, shown_to_user, suppressed, suppressed_reason, relevance_basis, attention, relevance_reasons, developments!inner(headline, occurred_at, story_id, stories(title))',
      )
      .eq('user_id', userId)
      .gte('developments.occurred_at', since)
      .returns<CoverageRow[]>(),
    supabase
      .from('feedback')
      .select('id, created_at, feedback_type, reason, stories(title)')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(FEEDBACK_LIMIT)
      .returns<FeedbackRow[]>(),
  ]);

  const coverage: CoverageEntry[] = unwrap('lens.coverage', coverageRows).flatMap((r): CoverageEntry[] =>
    r.developments
      ? [
          {
            developmentId: r.development_id,
            storyId: r.developments.story_id,
            storyTitle: r.developments.stories?.title ?? '',
            headline: r.developments.headline,
            occurredAt: r.developments.occurred_at,
            worldSignificance: r.world_significance,
            personalRelevance: r.personal_relevance ?? 0,
            shown: r.shown_to_user ?? false,
            suppressed: r.suppressed ?? false,
            suppressedReason: r.suppressed_reason,
            suppressedMemoryId: r.relevance_reasons?.suppressedMemoryId ?? null,
            basis: r.relevance_basis,
            attention: isAttention(r.attention) ? r.attention : null,
          },
        ]
      : [],
  );

  const feedback: FeedbackEntry[] = unwrap('lens.feedback', feedbackRows).flatMap((f): FeedbackEntry[] =>
    f.feedback_type
      ? [{ id: f.id, createdAt: f.created_at, feedbackType: f.feedback_type, storyTitle: f.stories?.title ?? null, reason: f.reason }]
      : [],
  );

  return buildLens(coverage, feedback);
}
