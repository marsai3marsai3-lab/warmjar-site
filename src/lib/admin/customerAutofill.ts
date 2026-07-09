export type CustomerCandidate = {
  id: string;
  name: string;
  phone: string;
};

const FULL_PHONE_LENGTH = 10;

/**
 * Requirement 2: once the phone field reaches exactly 10 digits and it
 * exactly matches a known customer, auto-fill without requiring the clerk
 * to click the dropdown — they're mid-phone-call, every click costs time.
 */
export function findExactPhoneMatch(
  candidates: CustomerCandidate[],
  phone: string
): CustomerCandidate | null {
  if (phone.length !== FULL_PHONE_LENGTH) return null;
  return candidates.find((c) => c.phone === phone) ?? null;
}

/**
 * Requirement 4: once a customer is linked (via dropdown pick or the exact
 * 10-digit auto-fill), editing either field by hand should visibly drop back
 * to "new customer" mode — we don't want the clerk to think they're still
 * pointed at the original customer's record after changing the number.
 * There is no separate "isLinked" boolean to keep in sync: this recomputes
 * from the current field values against the last-linked snapshot every time,
 * so it can't drift out of sync with the inputs themselves.
 */
export function hasLinkDrifted(
  linked: CustomerCandidate | null,
  currentName: string,
  currentPhone: string
): boolean {
  if (!linked) return false;
  return linked.name !== currentName || linked.phone !== currentPhone;
}

export function isLinkedToCustomer(
  linked: CustomerCandidate | null,
  currentName: string,
  currentPhone: string
): boolean {
  return linked !== null && !hasLinkDrifted(linked, currentName, currentPhone);
}
