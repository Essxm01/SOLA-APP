import type { CustomerPropertyItem } from '../components/PropertyCard';

export type CustomerFavoritesLoadState =
  | 'UNAUTHORIZED'
  | 'INITIAL_LOADING'
  | 'LOADED'
  | 'EMPTY'
  | 'REFRESHING'
  | 'STALE_ERROR'
  | 'ERROR'
  | 'SESSION_EXPIRED';

export type CustomerFavoritesAuthState = 'AUTHENTICATED' | 'GUEST' | 'SESSION_EXPIRED';

export interface FavoriteRemovalNotice {
  propertyId: string;
  message: string;
}

export const CUSTOMER_FAVORITES_COPY = {
  title: 'المفضلة',
  subtitle: 'الإقامات التي حفظتها للرجوع إليها بسهولة.',
  guestTitle: 'سجّل الدخول لعرض المفضلة',
  guestDescription: 'احفظ الإقامات التي تعجبك وارجع إليها بسهولة من هنا.',
  guestAction: 'تسجيل الدخول أو إنشاء حساب',
  emptyTitle: 'لم تحفظ أي إقامة بعد',
  emptyDescription: 'اضغط على القلب في أي إقامة تعجبك لتظهر هنا.',
  emptyAction: 'استكشف الإقامات',
  loading: 'جارٍ تحميل المفضلة',
  errorTitle: 'تعذر تحميل المفضلة',
  errorDescription: 'تحقق من الاتصال وحاول مرة أخرى.',
  errorAction: 'إعادة المحاولة',
  stale: 'تعذر تحديث المفضلة. آخر قائمة تم تحميلها ما زالت ظاهرة.',
  sessionTitle: 'انتهت جلسة تسجيل الدخول',
  sessionDescription: 'سجّل الدخول مرة أخرى لعرض المفضلة.',
  sessionAction: 'تسجيل الدخول مجددًا',
  removeError: 'تعذر إزالة الإقامة من المفضلة. حاول مرة أخرى.',
  removed: 'تمت الإزالة من المفضلة',
  undo: 'تراجع',
  undoError: 'تعذر استعادة الإقامة إلى المفضلة. حاول حفظها مرة أخرى من صفحة الإقامة.',
} as const;

export function removeFavoriteAfterServerConfirmation(
  favorites: CustomerPropertyItem[],
  propertyId: string,
): CustomerPropertyItem[] {
  return favorites.filter((property) => property.id !== propertyId);
}

export function favoriteListStateAfterLoad(items: CustomerPropertyItem[]): 'LOADED' | 'EMPTY' {
  return items.length > 0 ? 'LOADED' : 'EMPTY';
}

export function favoriteStateAfterServerRemoval(
  favorites: CustomerPropertyItem[],
  propertyId: string,
  _previousLoadState?: CustomerFavoritesLoadState,
): { items: CustomerPropertyItem[]; loadState: 'LOADED' | 'EMPTY' } {
  const items = removeFavoriteAfterServerConfirmation(favorites, propertyId);
  return { items, loadState: favoriteListStateAfterLoad(items) };
}

export function shouldApplyFavoriteRead(
  requestId: number,
  currentRequestId: number,
  mutationVersion: number,
  currentMutationVersion: number,
  sessionMatches: boolean,
): boolean {
  return requestId === currentRequestId
    && mutationVersion === currentMutationVersion
    && sessionMatches;
}

export function shouldKeepFavoritesAfterRefreshFailure(
  items: CustomerPropertyItem[],
  unauthorized: boolean,
): boolean {
  return items.length > 0 && !unauthorized;
}
