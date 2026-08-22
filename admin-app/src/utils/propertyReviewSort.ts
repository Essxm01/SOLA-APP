export type PropertyReviewSortOrder = 'OLDEST_FIRST' | 'NEWEST_FIRST';

export interface CreatedRecord {
  createdAt: string;
}

export function sortPropertyReviewItems<T extends CreatedRecord>(
  items: T[],
  order: PropertyReviewSortOrder,
): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return order === 'NEWEST_FIRST' ? dateB - dateA : dateA - dateB;
  });
}
