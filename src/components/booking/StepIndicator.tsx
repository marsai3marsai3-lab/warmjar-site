"use client";

const STEP_LABELS = ["選服務", "選師傅", "選時段", "手機驗證", "完成"];

export function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-4">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === step;
        const isDone = stepNumber < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-terracotta text-cream"
                  : isDone
                    ? "bg-olive text-cream"
                    : "bg-cream-dark text-ink-light"
              }`}
            >
              {stepNumber}
            </div>
            {stepNumber < STEP_LABELS.length && (
              <div className={`h-px w-4 sm:w-8 ${isDone ? "bg-olive" : "bg-cream-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
