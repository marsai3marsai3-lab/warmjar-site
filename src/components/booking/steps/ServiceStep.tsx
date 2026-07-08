"use client";

import { Check } from "lucide-react";
import type { ServiceCategory, ServiceVariant } from "../types";

type ServiceStepProps = {
  categories: ServiceCategory[] | null;
  error: string | null;
  selectedVariantIds: string[];
  onToggle: (variant: ServiceVariant, serviceName: string) => void;
};

export function ServiceStep({ categories, error, selectedVariantIds, onToggle }: ServiceStepProps) {
  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink mb-1">選擇服務</h2>
        <p className="text-ink-muted text-sm">可複選多項服務，將依選擇順序依序安排。</p>
      </div>

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}
      {!categories && !error && <p className="text-sm text-ink-light">載入服務項目中…</p>}

      {categories?.map((category) => (
        <div key={category.id}>
          <h3 className="text-sm font-medium text-gold tracking-wide mb-2">{category.name}</h3>
          <div className="space-y-3">
            {category.services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-cream-border bg-white p-4">
                <p className="font-medium text-ink mb-1">{service.name}</p>
                {service.description && (
                  <p className="text-xs text-ink-light mb-3">{service.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {service.variants.map((variant) => {
                    const selected = selectedVariantIds.includes(variant.id);
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onToggle(variant, service.name)}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                          selected
                            ? "border-terracotta bg-terracotta text-cream"
                            : "border-cream-border text-ink-muted hover:border-terracotta"
                        }`}
                      >
                        {selected && <Check size={14} />}
                        {variant.name}・NT$ {variant.price.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
