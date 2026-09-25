// @ts-ignore The lightweight script runs under Node through the repository's tsx harness.
import { readFileSync } from 'node:fs';
import { CustomerFavoritesUnauthorizedError, fetchCustomerFavorites, addCustomerFavorite, removeCustomerFavorite } from './customerFavorites';
import { CUSTOMER_FAVORITES_COPY, favoriteListStateAfterLoad, favoriteStateAfterServerRemoval, shouldApplyFavoriteRead, shouldKeepFavoritesAfterRefreshFailure } from './customerScreen15Favorites';
import type { CustomerPropertyItem } from '../components/PropertyCard';

declare const process: { exitCode?: number };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const property = (id: string): CustomerPropertyItem => ({
  id,
  title: `إقامة ${id}`,
  unitType: 'شاليه',
  address: 'الساحل الشمالي',
  bedrooms: 2,
  bathrooms: 1,
  maxGuests: 4,
  basePricePerNight: 2500,
  currency: 'EGP',
  images: [],
});

async function expectUnauthorized(action: () => Promise<unknown>, label: string): Promise<void> {
  let caught: unknown = null;
  try { await action(); } catch (error) { caught = error; }
  assert(caught instanceof CustomerFavoritesUnauthorizedError, `${label} must classify 401/403 as typed unauthorized`);
}

async function run(): Promise<void> {
  const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const componentSource = readFileSync(new URL('../components/CustomerFavoritesScreen.tsx', import.meta.url), 'utf8');
  const helperSource = readFileSync(new URL('./customerScreen15Favorites.ts', import.meta.url), 'utf8');
  const propertyCardSource = readFileSync(new URL('../components/PropertyCard.tsx', import.meta.url), 'utf8');
  const bottomNavSource = readFileSync(new URL('../components/CustomerBottomNav.tsx', import.meta.url), 'utf8');
  const authFlowSource = readFileSync(new URL('./customerAuthV2Flow.ts', import.meta.url), 'utf8');

  // Screen ownership and exact information architecture.
  assert(appSource.includes("import { CustomerFavoritesScreen }"), 'App must delegate Screen 15 presentation to CustomerFavoritesScreen');
  assert(appSource.includes('<CustomerFavoritesScreen'), 'App must render the dedicated Screen 15 component');
  assert(!appSource.includes('الوحدات المفضلة{favoritesLoadState'), 'App must not retain the legacy inline Favorites heading/count');
  assert(helperSource.includes(`title: '${CUSTOMER_FAVORITES_COPY.title}'`) && componentSource.includes('CUSTOMER_FAVORITES_COPY.title'), 'Screen 15 title must be exact');
  assert(helperSource.includes(`subtitle: '${CUSTOMER_FAVORITES_COPY.subtitle}'`) && componentSource.includes('CUSTOMER_FAVORITES_COPY.subtitle'), 'Screen 15 subtitle must be exact');
  assert(helperSource.includes(`guestTitle: '${CUSTOMER_FAVORITES_COPY.guestTitle}'`) && helperSource.includes(`guestAction: '${CUSTOMER_FAVORITES_COPY.guestAction}'`), 'Guest copy and CTA must be exact');
  assert(helperSource.includes(`emptyTitle: '${CUSTOMER_FAVORITES_COPY.emptyTitle}'`) && helperSource.includes(`emptyAction: '${CUSTOMER_FAVORITES_COPY.emptyAction}'`), 'Empty copy and Explore CTA must be exact');
  assert(componentSource.includes('FavoriteSkeleton />\n          <FavoriteSkeleton />'), 'Initial loading must contain two card-shaped skeletons');
  assert(componentSource.includes('loadState === \'ERROR\'') && componentSource.includes('loadState === \'EMPTY\''), 'ERROR and EMPTY must remain distinct');
  assert(componentSource.includes("authState === 'SESSION_EXPIRED'") && helperSource.includes(`sessionTitle: '${CUSTOMER_FAVORITES_COPY.sessionTitle}'`), 'Session expired state must be explicit');
  assert(componentSource.includes('role="status"') && componentSource.includes('onUndoRemoval'), 'Mutation feedback must be polite and undoable');
  assert(componentSource.includes('<PropertyCard'), 'Loaded state must reuse canonical PropertyCard');
  assert(componentSource.includes('<Heart className="w-7 h-7"') && !componentSource.includes('UserRound'), 'Guest state must use the outline Heart hero icon');
  assert(propertyCardSource.includes('aria-pressed={isFavorite}'), 'Favorite heart must expose aria-pressed');
  assert(bottomNavSource.includes("badge?: 'ACTIVE_BOOKING'"), 'Bookings attention indicator must remain supported');
  assert(!bottomNavSource.includes('favoritesCount'), 'Bottom navigation must not expose a Favorite numeric badge');
  assert(authFlowSource.includes("origin.type === 'PROTECTED_FAVORITE'"), 'PROTECTED_FAVORITE resume permission must remain');
  assert(appSource.includes("type: 'FAVORITES_TAB'"), 'FAVORITES_TAB auth origin must remain available');

  // Pure state/transition semantics.
  assert(favoriteListStateAfterLoad([]) === 'EMPTY', 'Successful [] must be EMPTY');
  assert(favoriteListStateAfterLoad([property('a')]) === 'LOADED', 'Successful records must be LOADED');
  assert(favoriteStateAfterServerRemoval([property('a'), property('b')], 'a').items.map((p) => p.id).join(',') === 'b', 'Only confirmed removal may remove a card');
  assert(favoriteStateAfterServerRemoval([property('a')], 'a').loadState === 'EMPTY', 'Last-item removal must produce EMPTY');
  assert(favoriteStateAfterServerRemoval([property('a'), property('b')], 'a').loadState === 'LOADED', 'Multi-item removal must produce LOADED');
  assert(favoriteStateAfterServerRemoval([property('a')], 'a', 'STALE_ERROR').loadState === 'EMPTY', 'STALE_ERROR last-item removal must derive EMPTY from the next list');
  assert(favoriteStateAfterServerRemoval([property('a')], 'a', 'REFRESHING').loadState === 'EMPTY', 'REFRESHING last-item removal must derive EMPTY from the next list');
  assert(!shouldApplyFavoriteRead(4, 4, 1, 2, true), 'An older read cannot overwrite a newer mutation state');
  assert(!shouldApplyFavoriteRead(3, 4, 2, 2, true), 'A superseded read request cannot overwrite newer state');
  assert(shouldApplyFavoriteRead(5, 5, 3, 3, true), 'Current canonical read may apply');
  assert(appSource.includes('favoriteMutationVersionRef') && appSource.includes('shouldApplyFavoriteRead'), 'Favorite reads must be guarded against newer mutations');
  assert(appSource.includes('await addCustomerFavorite(authToken, notice.propertyId)') && appSource.includes('await loadFavorites(authToken)'), 'Undo must POST then re-fetch canonical favorites');
  assert(shouldKeepFavoritesAfterRefreshFailure([property('a')], false), 'Non-auth refresh failure preserves same-session canonical list');
  assert(!shouldKeepFavoritesAfterRefreshFailure([property('a')], true), 'Unauthorized refresh never preserves private list');
  assert(!componentSource.includes('ratings') && !componentSource.includes('reviews'), 'Screen 15 must not invent ratings or review counts');
  assert(!componentSource.includes('Favorite count') && !componentSource.includes('favoritesCount'), 'Screen 15 must not display a Favorite count');

  // API-level unauthorized classification for GET and both mutations.
  await expectUnauthorized(() => fetchCustomerFavorites('token', async () => response(401, { success: false }), (path) => path), 'GET 401');
  await expectUnauthorized(() => fetchCustomerFavorites('token', async () => response(403, { success: false }), (path) => path), 'GET 403');
  await expectUnauthorized(() => addCustomerFavorite('token', 'property-id', async () => response(401, { success: false }), (path) => path), 'POST 401');
  await expectUnauthorized(() => removeCustomerFavorite('token', 'property-id', async () => response(403, { success: false }), (path) => path), 'DELETE 403');

  console.log('Customer Screen 15 Favorites contract tests passed.');
}

run().catch((error) => {
  console.error('Customer Screen 15 Favorites contract test failed:', error);
  process.exitCode = 1;
});
