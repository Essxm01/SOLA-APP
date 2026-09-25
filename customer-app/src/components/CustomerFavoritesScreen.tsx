import React from 'react';
import { AlertCircle, Heart } from 'lucide-react';
import { PropertyCard, type CustomerPropertyItem } from './PropertyCard';
import {
  CUSTOMER_FAVORITES_COPY,
  type CustomerFavoritesAuthState,
  type CustomerFavoritesLoadState,
} from '../utils/customerScreen15Favorites';

export interface CustomerFavoritesScreenProps {
  authState: CustomerFavoritesAuthState;
  loadState: CustomerFavoritesLoadState;
  favorites: CustomerPropertyItem[];
  error?: string | null;
  actionError?: string | null;
  removingIds?: Set<string>;
  removalNotice?: { propertyId: string; message: string } | null;
  onLogin: () => void;
  onRetry: () => void;
  onExplore: () => void;
  onOpenProperty: (propertyId: string) => void;
  onToggleFavorite: (propertyId: string, event: React.MouseEvent) => void;
  onUndoRemoval: () => void;
}

function FavoriteSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse" aria-hidden="true">
      <div className="aspect-[1.4/1] bg-slate-200 relative">
        <div className="absolute top-2 left-2 w-12 h-12 rounded-full bg-slate-100/80" />
      </div>
      <div className="p-4 space-y-2.5">
        <div className="h-5 rounded bg-slate-200 w-4/5" />
        <div className="h-4 rounded bg-slate-200 w-3/5" />
        <div className="flex justify-between gap-3 pt-1">
          <div className="h-4 rounded bg-slate-200 w-2/5" />
          <div className="h-5 rounded bg-slate-200 w-1/4" />
        </div>
      </div>
    </div>
  );
}

export const CustomerFavoritesScreen: React.FC<CustomerFavoritesScreenProps> = ({
  authState,
  loadState,
  favorites,
  error,
  actionError,
  removingIds = new Set<string>(),
  removalNotice,
  onLogin,
  onRetry,
  onExplore,
  onOpenProperty,
  onToggleFavorite,
  onUndoRemoval,
}) => {
  const keyboardRemovalRef = React.useRef(false);
  const removalIndexRef = React.useRef(0);
  const emptyHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const initialLoading = authState === 'AUTHENTICATED' && loadState === 'INITIAL_LOADING';
  const refreshing = authState === 'AUTHENTICATED' && loadState === 'REFRESHING';
  const staleError = authState === 'AUTHENTICATED' && loadState === 'STALE_ERROR';
  const hasCards = authState === 'AUTHENTICATED' && favorites.length > 0;

  React.useEffect(() => {
    if (!removalNotice || !keyboardRemovalRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-favorite-card]'));
      const removedIndex = removalIndexRef.current;
      const nextCard = cards[removedIndex] || cards[removedIndex - 1] || cards[0];
      const nextControl = nextCard?.querySelector<HTMLButtonElement>('button');
      (nextControl || emptyHeadingRef.current)?.focus();
      keyboardRemovalRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [favorites, removalNotice]);

  const handleFavoriteToggle = (propertyId: string, event: React.MouseEvent) => {
    keyboardRemovalRef.current = event.detail === 0;
    removalIndexRef.current = favorites.findIndex((property) => property.id === propertyId);
    onToggleFavorite(propertyId, event);
  };

  return (
    <section dir="rtl" className="w-full max-w-[430px] mx-auto px-4 pt-4 pb-28 text-slate-900">
      <header className="mb-5">
        <h1 className="text-[22px] sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
          {CUSTOMER_FAVORITES_COPY.title}
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          {CUSTOMER_FAVORITES_COPY.subtitle}
        </p>
      </header>

      {authState === 'GUEST' && (
        <section aria-labelledby="favorites-guest-heading" className="bg-white rounded-3xl border border-slate-200 p-6 text-center shadow-xs my-6 space-y-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-[var(--konfrm-color-primary)] border border-blue-100">
            <Heart className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 id="favorites-guest-heading" className="text-base font-black text-slate-950">{CUSTOMER_FAVORITES_COPY.guestTitle}</h2>
            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">{CUSTOMER_FAVORITES_COPY.guestDescription}</p>
          </div>
          <button type="button" onClick={onLogin} className="min-h-[48px] w-full max-w-xs mx-auto px-6 rounded-2xl bg-[var(--konfrm-color-primary)] text-white text-sm font-black shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors cursor-pointer">
            {CUSTOMER_FAVORITES_COPY.guestAction}
          </button>
        </section>
      )}

      {authState === 'SESSION_EXPIRED' && (
        <section aria-labelledby="favorites-session-heading" className="bg-white rounded-3xl border border-amber-200 p-6 text-center shadow-xs my-6 space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700 border border-amber-200">
            <AlertCircle className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 id="favorites-session-heading" className="text-base font-black text-slate-950">{CUSTOMER_FAVORITES_COPY.sessionTitle}</h2>
            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">{CUSTOMER_FAVORITES_COPY.sessionDescription}</p>
          </div>
          <button type="button" onClick={onLogin} className="min-h-[48px] w-full max-w-xs mx-auto px-6 rounded-2xl bg-[var(--konfrm-color-primary)] text-white text-sm font-black shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors cursor-pointer">
            {CUSTOMER_FAVORITES_COPY.sessionAction}
          </button>
        </section>
      )}

      {authState === 'AUTHENTICATED' && initialLoading && (
        <div className="space-y-4" aria-busy="true" aria-label={CUSTOMER_FAVORITES_COPY.loading}>
          <span className="sr-only" role="status">{CUSTOMER_FAVORITES_COPY.loading}</span>
          <FavoriteSkeleton />
          <FavoriteSkeleton />
        </div>
      )}

      {authState === 'AUTHENTICATED' && !initialLoading && loadState === 'ERROR' && !hasCards && (
        <section aria-labelledby="favorites-error-heading" className="bg-white rounded-3xl border border-rose-200 p-6 text-center shadow-xs my-6 space-y-4">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600 border border-rose-100">
            <AlertCircle className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 id="favorites-error-heading" className="text-base font-black text-slate-950">{CUSTOMER_FAVORITES_COPY.errorTitle}</h2>
            <p className="text-sm font-semibold text-slate-600 max-w-xs mx-auto">{error || CUSTOMER_FAVORITES_COPY.errorDescription}</p>
          </div>
          <button type="button" onClick={onRetry} className="min-h-[44px] px-6 rounded-2xl bg-[var(--konfrm-color-primary)] text-white text-sm font-black shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors cursor-pointer">
            {CUSTOMER_FAVORITES_COPY.errorAction}
          </button>
        </section>
      )}

      {authState === 'AUTHENTICATED' && loadState === 'EMPTY' && !initialLoading && (
        <section aria-labelledby="favorites-empty-heading" className="bg-slate-50/70 rounded-3xl border border-slate-200 p-8 text-center my-6 space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-[var(--konfrm-color-primary)] border border-slate-200 shadow-xs">
            <Heart className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2 ref={emptyHeadingRef} tabIndex={-1} id="favorites-empty-heading" className="text-base font-black text-slate-950 focus:outline-none">{CUSTOMER_FAVORITES_COPY.emptyTitle}</h2>
            <p className="text-sm font-medium text-slate-600 max-w-xs mx-auto">{CUSTOMER_FAVORITES_COPY.emptyDescription}</p>
          </div>
          <button type="button" onClick={onExplore} className="min-h-[48px] px-6 rounded-2xl bg-[var(--konfrm-color-primary)] text-white text-sm font-black shadow-sm hover:bg-[var(--konfrm-color-primary-hover)] transition-colors cursor-pointer inline-flex items-center justify-center">
            {CUSTOMER_FAVORITES_COPY.emptyAction}
          </button>
        </section>
      )}

      {authState === 'AUTHENTICATED' && staleError && hasCards && (
        <aside role="status" aria-live="polite" className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-2 shadow-xs">
          <p className="text-sm font-bold leading-snug">{CUSTOMER_FAVORITES_COPY.stale}</p>
          <button type="button" onClick={onRetry} className="min-h-[40px] px-2 text-sm font-black text-[var(--konfrm-color-primary)] underline shrink-0 cursor-pointer">{CUSTOMER_FAVORITES_COPY.errorAction}</button>
        </aside>
      )}

      {authState === 'AUTHENTICATED' && refreshing && (
        <p role="status" aria-live="polite" className="mb-3 text-xs font-bold text-slate-500">{CUSTOMER_FAVORITES_COPY.loading}</p>
      )}

      {authState === 'AUTHENTICATED' && actionError && (
        <aside role="alert" aria-live="polite" className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold leading-snug">{actionError}</p>
        </aside>
      )}

      {hasCards && (
        <div className="space-y-4">
          {favorites.map((property) => (
            <div key={property.id} data-favorite-card={property.id}>
              <PropertyCard
                property={property}
                onSelect={onOpenProperty}
                isFavorite
                isFavoritePending={removingIds.has(property.id)}
                onToggleFavorite={handleFavoriteToggle}
              />
            </div>
          ))}
        </div>
      )}

      {removalNotice && (
        <div role="status" aria-live="polite" className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 max-w-[398px] mx-auto rounded-2xl bg-[var(--konfrm-text-primary)] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
          <span className="text-sm font-bold">{removalNotice.message}</span>
          <button type="button" onClick={onUndoRemoval} className="min-h-[44px] px-3 rounded-xl text-sm font-black text-[var(--konfrm-color-accent)] hover:bg-white/10 cursor-pointer">{CUSTOMER_FAVORITES_COPY.undo}</button>
        </div>
      )}
    </section>
  );
};
