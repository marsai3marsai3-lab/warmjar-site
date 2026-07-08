"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SelectedVariant } from "./types";

type SummaryBarProps = {
  selectedVariants: SelectedVariant[];
  onBack?: () => void;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideSummary?: boolean;
};

export function SummaryBar({
  selectedVariants,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  nextLoading,
  hideSummary,
}: SummaryBarProps) {
  const totalDuration = selectedVariants.reduce((sum, v) => sum + v.durationMinutes, 0);
  const totalPrice = selectedVariants.reduce((sum, v) => sum + v.price, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-cream-border bg-cream/95 backdrop-blur-sm shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      {!hideSummary && selectedVariants.length > 0 && (
        <div className="px-4 pt-3 text-sm text-ink-muted border-b border-cream-border/70 pb-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">
              {selectedVariants.map((v) => v.name).join("、")}
            </span>
            <span className="shrink-0 font-medium text-ink">
              {totalDuration} 分鐘・約 NT$ {totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        {onBack ? (
          <Button variant="ghost" size="md" onClick={onBack} className="shrink-0">
            <ChevronLeft size={18} />
            上一步
          </Button>
        ) : (
          <span className="w-[92px] shrink-0" />
        )}
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          disabled={nextDisabled || nextLoading}
          onClick={onNext}
        >
          {nextLoading && <Loader2 size={18} className="animate-spin" />}
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
