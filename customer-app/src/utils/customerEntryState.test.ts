// Same dependency-free assertion style as customerTruthfulState.test.ts —
// the customer tsconfig has no Node type definitions.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message} (actual=${String(actual)} expected=${String(expected)})`);
}
import {
  hasSeenCustomerEntry,
  markCustomerEntrySeen,
  CUSTOMER_ENTRY_STORAGE_KEY,
  type EntryStorageLike,
} from './customerEntryState.js';

// Minimal localStorage-style storage double (same pattern as adminSession tests).
function makeStorage(initial: Record<string, string> = {}): EntryStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
  };
}

// 1. Unseen device: entry must be considered NOT seen (splash+welcome show).
{
  const s = makeStorage();
  assertEqual(hasSeenCustomerEntry(s), false, 'fresh device has not seen entry');
}

// 2. Explicit exit marks entry seen for future launches.
{
  const s = makeStorage();
  markCustomerEntrySeen(s);
  assertEqual(hasSeenCustomerEntry(s), true, 'marking seen persists for next launch');
  assertEqual(s.data.get(CUSTOMER_ENTRY_STORAGE_KEY), 'true', 'stored value is the explicit true literal');
}

// 3. Storage corruption / junk values fail SAFE: entry shows again, never throws.
{
  for (const junk of ['', 'false', 'null', 'undefined', '{oop', '0', 'SEEN', 'true ']) {
    const s = makeStorage({ [CUSTOMER_ENTRY_STORAGE_KEY]: junk });
    let result: boolean | 'THREW';
    try { result = hasSeenCustomerEntry(s); } catch { result = 'THREW'; }
    assert(result !== 'THREW', `junk value must not throw: ${JSON.stringify(junk)}`);
    if (junk !== 'true') {
      assertEqual(result, false, `non-true junk fails safe as unseen: ${JSON.stringify(junk)}`);
    }
  }
}

// 4. Entry state is INDEPENDENT from canonical auth/session keys:
//    a full customer logout (current removal list) must NOT reset the flag.
{
  const s = makeStorage({
    sola_customer_access_token: 't',
    sola_customer_refresh_token: 'r',
    sola_customer_phone: '+201000000000',
    sola_customer_profile: '{}',
    [CUSTOMER_ENTRY_STORAGE_KEY]: 'true',
  });
  // Simulate the current logout removal list exactly.
  for (const k of [
    'sola_customer_access_token',
    'sola_customer_refresh_token',
    'sola_customer_phone',
    'sola_customer_profile',
    'sola_customer_pending_favorite_property_id',
  ]) s.removeItem(k);
  assertEqual(hasSeenCustomerEntry(s), true, 'logout must not reset the first-entry flag');
}

// 5. Auth-restoration clearing (profile candidate removal) also must not reset entry.
{
  const s = makeStorage({
    sola_customer_profile: 'candidate',
    [CUSTOMER_ENTRY_STORAGE_KEY]: 'true',
  });
  s.removeItem('sola_customer_profile');
  assertEqual(hasSeenCustomerEntry(s), true, 'session candidate clearing must not reset entry');
}

// 6. Missing storage backend (private mode / disabled storage) fails safe, never throws.
{
  const throwing: EntryStorageLike = {
    getItem: () => { throw new Error('storage unavailable'); },
    setItem: () => { throw new Error('storage unavailable'); },
    removeItem: () => { throw new Error('storage unavailable'); },
  };
  assertEqual(hasSeenCustomerEntry(throwing), false, 'unavailable storage reads as unseen');
  let threw = false;
  try { markCustomerEntrySeen(throwing); } catch { threw = true; }
  assertEqual(threw, false, 'marking seen must not crash when storage is unavailable');
}

// 7. markCustomerEntrySeen overwrites any junk to a clean explicit value.
{
  const s = makeStorage({ [CUSTOMER_ENTRY_STORAGE_KEY]: '{corrupt' });
  markCustomerEntrySeen(s);
  assertEqual(hasSeenCustomerEntry(s), true, 'mark overwrites corrupt junk to clean true');
}

// 8. Welcome seen semantics (C1 rescue): EVERY explicit exit — Guest Browse,
//    Login, Create Account — persists the SAME marker at handoff time. Auth
//    cancellation is a pure no-op on storage and can never erase it; logout
//    removals equally never touch it. (The App wiring that calls
//    markCustomerEntrySeen for each of the three exits is proven in the
//    browser E2E; these tests pin the storage contract all three rely on.)
{
  const WELCOME_EXITS = ['GUEST_BROWSE', 'LOGIN_HANDOFF', 'CREATE_ACCOUNT_HANDOFF'] as const;
  for (const exit of WELCOME_EXITS) {
    const s = makeStorage();
    markCustomerEntrySeen(s); // what each exit handler persists at tap time
    // auth cancellation: no storage writes of any kind occur
    assertEqual(hasSeenCustomerEntry(s), true, `${exit}: cancel after handoff keeps seen`);
    // subsequent logout removal list
    for (const k of [
      'sola_customer_access_token',
      'sola_customer_refresh_token',
      'sola_customer_phone',
      'sola_customer_profile',
      'sola_customer_pending_favorite_property_id',
    ]) s.removeItem(k);
    assertEqual(hasSeenCustomerEntry(s), true, `${exit}: logout keeps seen`);
    // a future launch reads the same single canonical marker
    assertEqual(s.data.get(CUSTOMER_ENTRY_STORAGE_KEY), 'true', `${exit}: single canonical marker persisted`);
  }
}

console.log('Customer entry-state contract tests passed');
