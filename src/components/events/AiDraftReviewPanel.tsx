'use client';

import { Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AiDraftReview } from '@/utils/pending-draft-storage';

type AiDraftReviewPanelProps = {
  review: AiDraftReview;
  onReviewDetails: () => void;
  onReviewTickets: () => void;
  onReviewPolicies: () => void;
};

const confidenceLabel = (confidence: AiDraftReview['confidence']) => {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
};

export function AiDraftReviewPanel({
  review,
  onReviewDetails,
  onReviewTickets,
  onReviewPolicies,
}: AiDraftReviewPanelProps) {
  const visibleWarnings = (review.needsReview ?? []).slice(0, 3);

  return (
    <div className="border-b border-cyan-200/70 bg-cyan-50/90">
      <div className="container flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 text-cyan-950">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">AI draft ready</span>
          <Badge variant="outline" className="border-cyan-300 bg-white/70 text-cyan-950">
            {confidenceLabel(review.confidence)}
          </Badge>
        </div>

        {visibleWarnings.length > 0 ? (
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {visibleWarnings.map((warning) => (
              <Badge
                key={warning}
                variant="secondary"
                data-ai-review-warning={warning}
                className="max-w-full whitespace-normal bg-white/80 text-cyan-950"
              >
                {warning}
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex-1 text-sm text-cyan-900">
            Review the generated details before publishing.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 sm:h-8"
            onClick={onReviewDetails}
          >
            Review details
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 sm:h-8"
            onClick={onReviewTickets}
          >
            Review tickets
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 sm:h-8"
            onClick={onReviewPolicies}
          >
            Review policies
          </Button>
        </div>
      </div>
    </div>
  );
}
