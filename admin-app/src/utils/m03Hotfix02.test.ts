import { clearAdminSession } from './adminSession.js';
import { sortPropertyReviewItems } from './propertyReviewSort.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const items = [
  { id: 'new', createdAt: '2026-08-22T10:00:00.000Z' },
  { id: 'old', createdAt: '2026-08-20T10:00:00.000Z' },
];

assert(
  sortPropertyReviewItems(items, 'OLDEST_FIRST').map((item) => item.id).join(',') === 'old,new',
  'oldest-first must preserve FIFO review order',
);
assert(
  sortPropertyReviewItems(items, 'NEWEST_FIRST').map((item) => item.id).join(',') === 'new,old',
  'newest-first must reverse review order',
);

const removed: string[] = [];
clearAdminSession({ removeItem: (key) => removed.push(key) });
assert(
  removed.join(',') === 'sola_admin_access_token,sola_admin_user',
  'expired admin session must clear both persisted auth records',
);

console.log('M03 HOTFIX-02 admin regression checks passed.');
