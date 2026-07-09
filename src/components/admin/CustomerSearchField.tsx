"use client";

import { useEffect, useRef, useState } from "react";
import { findExactPhoneMatch, type CustomerCandidate } from "@/lib/admin/customerAutofill";

const DEBOUNCE_MS = 300;
const MIN_LENGTH: Record<"phone" | "name", number> = { phone: 4, name: 2 };

type CustomerSearchFieldProps = {
  field: "phone" | "name";
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerCandidate) => void;
  placeholder: string;
  inputMode?: "numeric" | "text";
  className?: string;
};

export function CustomerSearchField({
  field,
  value,
  onChange,
  onSelect,
  placeholder,
  inputMode,
  className,
}: CustomerSearchFieldProps) {
  const [results, setResults] = useState<CustomerCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // onSelect is a fresh function reference on every parent render; reading it
  // via ref (rather than listing it as an effect dependency) keeps the
  // debounce timer from being torn down and restarted whenever the parent
  // re-renders for unrelated reasons (e.g. typing in the other field).
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    let cancelled = false;

    async function search() {
      if (value.length < MIN_LENGTH[field]) {
        setResults([]);
        setOpen(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/admin/customers/search?field=${field}&q=${encodeURIComponent(value)}`
        );
        const data = await res.json();
        if (cancelled) return;
        const customers: CustomerCandidate[] = data.customers ?? [];

        if (field === "phone") {
          const exactMatch = findExactPhoneMatch(customers, value);
          if (exactMatch) {
            onSelectRef.current(exactMatch);
            setOpen(false);
            return;
          }
        }

        setResults(customers);
        setHighlightedIndex(0);
        setOpen(customers.length > 0);
      } catch {
        if (!cancelled) setOpen(false);
      }
    }

    const timer = setTimeout(search, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [field, value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectCandidate(customer: CustomerCandidate) {
    onSelect(customer);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectCandidate(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        className={className}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-cream-border bg-white shadow-lg">
          {results.map((customer, index) => (
            <li key={customer.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCandidate(customer)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  index === highlightedIndex ? "bg-cream-dark" : "bg-white"
                }`}
              >
                <span className="font-medium text-ink">{customer.name}</span>
                <span className="text-ink-light">{customer.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
