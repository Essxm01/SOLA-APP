// Customer first-entry state contract (Phase 5 / C1).
//
// This is DEVICE-SIDE first-entry UX state only. It is completely independent
// from canonical auth/session state: logging out or losing a session must
// never resurface the first-entry Splash/Welcome, and completing it must
// never imply an authenticated Customer.
//
// Storage conventions follow the newer `konfrm_` device flags (e.g. the
// Owner app's `konfrm_owner_splash_seen_v1`) rather than the
// `sola_customer_*` auth keys, so the existing logout cleanup list can never
// touch it. All reads fail safe: any storage error or corrupt value reads as
// "not seen" (entry shows once more) instead of throwing.

export interface EntryStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CUSTOMER_ENTRY_STORAGE_KEY = 'konfrm_customer_entry_seen_v1';

function resolveStorage(storage?: EntryStorageLike): EntryStorageLike | null {
  if (storage) return storage;
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Storage access can throw in restricted contexts; fall through to null.
  }
  return null;
}

export function hasSeenCustomerEntry(storage?: EntryStorageLike): boolean {
  const s = resolveStorage(storage);
  if (!s) return false;
  try {
    return s.getItem(CUSTOMER_ENTRY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markCustomerEntrySeen(storage?: EntryStorageLike): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(CUSTOMER_ENTRY_STORAGE_KEY, 'true');
  } catch {
    // A failed mark only means the Welcome may reappear next launch; never
    // crash the exit action that triggered it.
  }
}
