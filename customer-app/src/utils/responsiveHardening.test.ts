function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[RESPONSIVE_HARDENING_TEST_FAILURE] ${message}`);
  }
}

async function run() {
  // @ts-ignore — node types are not part of the customer tsconfig
  const { readFileSync } = await import('node:fs');

  const welcomeFile = readFileSync(new URL('../components/CustomerWelcomeScreen.tsx', import.meta.url), 'utf-8');
  const bottomNavFile = readFileSync(new URL('../components/CustomerBottomNav.tsx', import.meta.url), 'utf-8');
  const appFile = readFileSync(new URL('../App.tsx', import.meta.url), 'utf-8');
  const searchRefineFile = readFileSync(new URL('../components/SearchRefineScreen.tsx', import.meta.url), 'utf-8');
  const searchResultsFile = readFileSync(new URL('../components/SearchResultsScreen.tsx', import.meta.url), 'utf-8');
  const headerFile = readFileSync(new URL('../components/CustomerHeader.tsx', import.meta.url), 'utf-8');
  const propertyCardFile = readFileSync(new URL('../components/PropertyCard.tsx', import.meta.url), 'utf-8');

  // 1. CustomerWelcomeScreen Invariants
  // Invariant 1.1: 38dvh dependency must NOT exist
  assert(!welcomeFile.includes('38dvh'), 'CustomerWelcomeScreen must not use 38dvh height-dependent sizing');

  // Invariant 1.2: Width-aware bounded hero sizing must be present
  assert(
    welcomeFile.includes('calc(min(100vw, 430px) / 1.22)'),
    'CustomerWelcomeScreen must use width-aware hero sizing derived from ~1.22 aspect ratio'
  );

  // Invariant 1.3: Canonical max-w-[430px] must be used (not max-w-md)
  assert(
    welcomeFile.includes('max-w-[430px]'),
    'CustomerWelcomeScreen inner shell must use canonical max-w-[430px]'
  );
  assert(
    !welcomeFile.includes('max-w-md'),
    'CustomerWelcomeScreen must not use max-w-md'
  );

  // Invariant 1.4: Single safe-area ownership for top edge (no double safe-area on Skip)
  assert(
    welcomeFile.includes('paddingTop'),
    'CustomerWelcomeScreen outer container must own top safe-area padding'
  );
  const skipButtonMatch = welcomeFile.match(/<button[\s\S]*?onClick=\{onGuestBrowse\}[\s\S]*?style=\{\{([\s\S]*?)\}\}/);
  assert(skipButtonMatch !== null, 'Skip button must be found');
  const skipStyle = skipButtonMatch[1];
  assert(
    !skipStyle.includes('safe-area-inset-top'),
    'Skip button must not duplicate top safe-area inset (single safe-area ownership rule)'
  );
  assert(
    skipStyle.includes("top: '12px'"),
    'Skip button must be positioned with clean 12px offset from hero top'
  );

  // Invariant 1.5: Unbounded justify-between removed from inner shell, deliberate spacers present
  assert(
    !welcomeFile.includes('flex flex-col justify-between min-h-0'),
    'CustomerWelcomeScreen inner shell must not use unbounded justify-between'
  );
  assert(
    welcomeFile.includes('max-h-[52px]'),
    'CustomerWelcomeScreen must have bounded upper spacer between Hero and Content'
  );

  // 2. CustomerBottomNav Invariants
  assert(
    bottomNavFile.includes('max-w-[430px]'),
    'CustomerBottomNav must use canonical max-w-[430px]'
  );
  assert(
    !bottomNavFile.includes('max-w-md'),
    'CustomerBottomNav must not use max-w-md'
  );
  assert(
    bottomNavFile.includes("paddingBottom: 'env(safe-area-inset-bottom, 0px)'"),
    'CustomerBottomNav must have safe-area inset bottom padding'
  );

  // 3. App.tsx Content Reservation Contract
  assert(
    appFile.includes("calc(5rem + env(safe-area-inset-bottom, 0px))"),
    'App.tsx main content must dynamically reserve 5rem + safe-area-inset-bottom to prevent content clipping under BottomNav'
  );

  // 4. Full-Screen Customer Surfaces Canonical Width (max-w-[430px])
  assert(
    searchRefineFile.includes('max-w-[430px]'),
    'SearchRefineScreen must use canonical max-w-[430px]'
  );
  assert(
    !searchRefineFile.includes('max-w-md'),
    'SearchRefineScreen must not use max-w-md'
  );

  assert(
    searchResultsFile.includes('max-w-[430px]'),
    'SearchResultsScreen must use canonical max-w-[430px]'
  );
  assert(
    !searchResultsFile.includes('max-w-md'),
    'SearchResultsScreen must not use max-w-md'
  );

  assert(
    headerFile.includes('max-w-[430px]'),
    'CustomerHeader must use canonical max-w-[430px]'
  );
  assert(
    !headerFile.includes('max-w-md'),
    'CustomerHeader must not use max-w-md'
  );

  // 5. Screen 03 Explore Preserved Architecture
  assert(
    propertyCardFile.includes('items-end justify-between gap-3 pt-0.5'),
    'PropertyCard comparison row architecture must remain unchanged'
  );
  assert(
    propertyCardFile.includes('text-[18px]'),
    'PropertyCard price scale must remain unchanged'
  );

  console.log('Customer cross-device responsive hardening contract tests passed (12/12)');
}

run().catch((err) => {
  console.error('RESPONSIVE HARDENING REGRESSION TEST FAILURE:', err);
  throw err;
});
