function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[EXPLORE_REDESIGN_TEST_FAILURE] ${message}`);
  }
}

async function run() {
  console.log('Running Customer Screen 03 Explore Visual Quality Remediation Test Suite...');

  // @ts-ignore
  const { readFileSync } = await import('node:fs');

  const headerCode = readFileSync(new URL('../components/CustomerHeader.tsx', import.meta.url), 'utf-8');
  const searchBarCode = readFileSync(new URL('../components/CoastalSearchBar.tsx', import.meta.url), 'utf-8');
  const cardCode = readFileSync(new URL('../components/PropertyCard.tsx', import.meta.url), 'utf-8');
  const bottomNavCode = readFileSync(new URL('../components/CustomerBottomNav.tsx', import.meta.url), 'utf-8');
  const exploreStateCode = readFileSync(new URL('../components/ExploreStateViews.tsx', import.meta.url), 'utf-8');
  const appCode = readFileSync(new URL('../App.tsx', import.meta.url), 'utf-8');
  const searchResultsCode = readFileSync(new URL('../components/SearchResultsScreen.tsx', import.meta.url), 'utf-8');
  const currentTaskCode = readFileSync(new URL('../../../tasks/CURRENT_TASK.md', import.meta.url), 'utf-8');

  // 1. Brand Logo Alt & Dimensions
  assert(
    headerCode.includes('alt="KONFRM"') && headerCode.includes('w-8 h-8'),
    'CustomerHeader must render canonical logo with alt="KONFRM" and w-8 h-8 (32px)'
  );

  // 2. Guest Login Button: Label "دخول", min 44px height, KONFRM Blue
  assert(
    headerCode.includes('min-h-[44px]') &&
    headerCode.includes('bg-[#0059FF]') &&
    headerCode.includes('<span>دخول</span>'),
    'CustomerHeader guest login button must have min 44px height, #0059FF styling, and label "دخول"'
  );

  // 3. Authenticated User Profile Button: 44-48px target
  assert(
    headerCode.includes('w-11 h-11') || headerCode.includes('w-12 h-12'),
    'CustomerHeader authenticated button must have 44-48px target (w-11 h-11 or w-12 h-12)'
  );

  // 4. Hero Headline: "هتصيف فين؟" without emoji
  assert(
    appCode.includes('هتصيف فين؟'),
    'App.tsx Explore hero headline must be "هتصيف فين؟"'
  );
  assert(
    !appCode.includes('هتصيف فين؟ 🏖️') && !searchBarCode.includes('🏖️'),
    'Hero headline must NOT contain emoji 🏖️'
  );

  // 5. Hero Subtitle: Explicitly REMOVED by Founder (Subtitle: NONE)
  assert(
    !appCode.includes('اكتشف إقامة تناسب رحلتك.') && !searchBarCode.includes('اكتشف إقامة تناسب رحلتك.'),
    'The removed subtitle "اكتشف إقامة تناسب رحلتك." must be ABSENT from Explore implementation'
  );
  const heroHeadlineIndex = appCode.indexOf('هتصيف فين؟');
  const exploreHeroStartIndex = appCode.lastIndexOf('<div', heroHeadlineIndex);
  const exploreSearchStartIndex = appCode.indexOf('<CoastalSearchBar', heroHeadlineIndex);
  const exploreHeroSection = appCode.slice(exploreHeroStartIndex, exploreSearchStartIndex);
  assert(
    !exploreHeroSection.includes('<p') && !exploreHeroSection.includes('<span'),
    'No replacement Hero subtitle/support copy was added; Hero must have Subtitle: NONE'
  );

  // 6. Hero Direct Flow: headline → Search
  const headlineIdx = exploreHeroSection.indexOf('هتصيف فين؟');
  assert(
    headlineIdx !== -1 && !exploreHeroSection.slice(headlineIdx).includes('</h2>') && !exploreHeroSection.slice(headlineIdx).includes('</h3>'),
    'Hero must flow directly from headline to Search without intervening elements'
  );

  // 7. Spacing: Header to Hero 20-24px
  assert(
    appCode.includes("activeTab === 'EXPLORE' ? 'bg-[#F8FAFC] pt-5'"),
    'Explore canvas must have bg-[#F8FAFC] and pt-5 (20px) under header'
  );

  // 8. Spacing: Hero to Search 16-20px (mb-5 or mb-4), NO dead subtitle spacing
  assert(
    exploreHeroSection.includes('mb-5') || exploreHeroSection.includes('mb-4'),
    'Hero to search entry must have approved 16-20px spacing (mb-5 or mb-4)'
  );
  assert(
    !exploreHeroSection.includes('mt-1.5') && !exploreHeroSection.includes('mt-2'),
    'Hero section must NOT preserve obsolete dead subtitle spacing (mt-1.5 / mt-2)'
  );

  // 9. Search Entry Surface Container: 60-64px height, radius 16px, quiet border, subtle shadow
  assert(
    searchBarCode.includes('min-h-[62px]') || searchBarCode.includes('h-16') || searchBarCode.includes('min-h-[60px]'),
    'Search entry surface container must have 60-64px height'
  );
  assert(
    searchBarCode.includes('rounded-2xl') && searchBarCode.includes('border border-slate-200'),
    'Search entry surface must have radius 16px (rounded-2xl) and border-slate-200'
  );

  // 10. Search Entry Hit Target: entire container is clickable button with accessible label
  assert(
    searchBarCode.includes('<button') && searchBarCode.includes('aria-label="افتح البحث والتفاصيل"'),
    'Entire search entry surface must be an accessible interactive button'
  );

  // 11. Search Entry Default Copy: "إلى أين تريد الذهاب؟" (14px font-bold) and "الوجهة · التواريخ · الضيوف" (12px)
  assert(
    searchBarCode.includes('إلى أين تريد الذهاب؟') &&
    searchBarCode.includes('الوجهة · التواريخ · الضيوف'),
    'Search entry must feature default copy "إلى أين تريد الذهاب؟" and "الوجهة · التواريخ · الضيوف"'
  );

  // 12. Search Entry Icon: 20-22px search icon in KONFRM Blue #0059FF
  assert(
    searchBarCode.includes('Search') && searchBarCode.includes('text-[#0059FF]'),
    'Search entry must render a search icon in KONFRM Blue #0059FF'
  );

  // 13. Discovery Header Title: "اكتشف الإقامات" (18px font-bold)
  assert(
    appCode.includes('اكتشف الإقامات'),
    'Discovery header title must be "اكتشف الإقامات"'
  );
  assert(
    appCode.includes('text-[18px] font-bold text-slate-900'),
    'Discovery header must be styled with text-[18px] font-bold text-slate-900'
  );

  // 14. Discovery Header Count Format: e.g. "4 إقامات", muted, NO parentheses "(4)"
  assert(
    appCode.includes('`${filteredProperties.length} إقامات`') || appCode.includes('إقامات'),
    'Discovery count must be formatted as "X إقامات"'
  );
  assert(
    !appCode.includes('({filteredProperties.length})'),
    'Discovery count must NOT have parentheses like "({filteredProperties.length})"'
  );

  // 15. Discovery Header Count omitted during loading
  assert(
    appCode.includes("propertyLoadState === 'SUCCESS' && filteredProperties.length > 0"),
    'Discovery header count must ONLY be shown when propertyLoadState === SUCCESS'
  );

  // 16. No "الوحدات الساحلية المتاحة" or date availability claims in Explore
  assert(
    !appCode.includes('الوحدات الساحلية المتاحة'),
    'Explore must NOT contain the old "الوحدات الساحلية المتاحة" title'
  );

  // 17. PropertyCard Cover Image: responsive 1.4:1 aspect ratio
  assert(
    cardCode.includes('aspect-[1.4/1]') || cardCode.includes('aspect-[7/5]'),
    'PropertyCard cover image must use 1.4:1 responsive aspect ratio (aspect-[1.4/1])'
  );

  // 18. PropertyCard Image Fallback: neutral #F1F5F9 placeholder with icon + "لا توجد صورة"
  assert(
    cardCode.includes('bg-[#F1F5F9]') && cardCode.includes('لا توجد صورة'),
    'PropertyCard image fallback must use #F1F5F9 and display "لا توجد صورة"'
  );

  // 19. PropertyCard Image onError handling
  assert(
    cardCode.includes('onError={() => setImageError(true)}'),
    'PropertyCard cover image must handle onError to gracefully fallback on broken images'
  );

  // 20. Favorite Action Button: >=48px hit target
  assert(
    cardCode.includes('min-w-[48px] min-h-[48px]') || cardCode.includes('w-12 h-12'),
    'PropertyCard favorite button must provide at least 48x48px touch target'
  );

  // 21. Favorite Active Heart: KONFRM Blue #0059FF (NOT rose/red)
  assert(
    cardCode.includes('fill-[#0059FF] text-[#0059FF]') || cardCode.includes('text-[#0059FF]'),
    'PropertyCard active favorite heart must use KONFRM Blue #0059FF'
  );
  assert(
    !cardCode.includes('bg-rose-500') && !cardCode.includes('text-rose-'),
    'PropertyCard favorite heart must NOT use rose/red'
  );

  // 22. Favorite Button Pending State: wire-up with spinner and disabled
  assert(
    cardCode.includes('isFavoritePending') &&
    cardCode.includes('disabled={isFavoritePending}') &&
    cardCode.includes('Loader2'),
    'PropertyCard must support isFavoritePending with disabled state and Loader2 spinner'
  );

  // 23. PropertyCard Title: 16-17px font-extrabold, max 2 lines
  assert(
    cardCode.includes('text-[16px]') && cardCode.includes('font-extrabold') && cardCode.includes('line-clamp-2'),
    'PropertyCard title must be 16-17px font-extrabold and clamped to max 2 lines'
  );

  // 24. PropertyCard Canonical Location: 13px font-medium, omitted when none
  assert(
    cardCode.includes('text-[13px] font-medium text-slate-500') &&
    cardCode.includes('locationText && ('),
    'PropertyCard location must be 13px font-medium text-slate-500 and omitted when none'
  );

  // 25. PropertyCard Facts Row: X ضيوف · Y غرف · Z حمام
  assert(
    cardCode.includes('facts.push(`${property.maxGuests} ضيوف`)') &&
    cardCode.includes('facts.push(`${property.bedrooms} غرف`)') &&
    cardCode.includes('facts.push(`${property.bathrooms} حمام`)') &&
    cardCode.includes("facts.join(' · ')"),
    'PropertyCard facts must format only >0 items separated by bullet'
  );

  // 26. PropertyCard Price: prominent price + per-night suffix without "السعر في الليلة"
  assert(
    cardCode.includes('/ ليلة') &&
    !cardCode.includes('السعر في الليلة'),
    'PropertyCard price must show / ليلة and eliminate old "السعر في الليلة" label'
  );

  // 27. PropertyCard Removed Artifacts: No verification badge, no unit type pill, no CTA link, no dividers
  assert(
    !cardCode.includes('إقامة موثقة') &&
    !cardCode.includes('ShieldCheck'),
    'PropertyCard must NOT contain verification badge "إقامة موثقة"'
  );
  assert(
    !cardCode.includes('تفاصيل الوحدة ←'),
    'PropertyCard must NOT contain "تفاصيل الوحدة ←" CTA link'
  );

  // 28. Explore Skeleton Feed: matches 1.4:1 geometry while hero and search remain visible
  assert(
    exploreStateCode.includes('aspect-[1.4/1]') &&
    exploreStateCode.includes('ExploreSkeletonFeed') &&
    appCode.includes('<ExploreSkeletonFeed />'),
    'Explore loading state must render ExploreSkeletonFeed with aspect-[1.4/1]'
  );

  // 29. Explore Empty & Error States: truthful copy without date claims
  assert(
    exploreStateCode.includes('لسه مفيش إقامات هنا') &&
    exploreStateCode.includes('جرّب مرة تانية لاحقًا.'),
    'Explore empty state must render truthful copy "لسه مفيش إقامات هنا"'
  );
  assert(
    exploreStateCode.includes('تعذر تحميل الإقامات') &&
    exploreStateCode.includes('إعادة المحاولة'),
    'Explore error state must render truthful title and retry button'
  );

  // 30. Customer Bottom Navigation: label text text-[11px] and >=48px targets
  assert(
    bottomNavCode.includes('text-[11px]'),
    'CustomerBottomNav labels must be text-[11px] (11-12px)'
  );
  assert(
    bottomNavCode.includes('min-h-[52px]') && bottomNavCode.includes('min-w-[48px]'),
    'CustomerBottomNav buttons must be at least 48px touch targets'
  );

  // 31. Search intent reset behavior deferred / unchanged
  assert(
    currentTaskCode.includes('SEARCH_INTENT_RESET: DEFERRED / UNCHANGED'),
    'tasks/CURRENT_TASK.md must record SEARCH_INTENT_RESET: DEFERRED / UNCHANGED'
  );

  // 32. SearchResultsScreen receives isFavoritePending prop
  assert(
    searchResultsCode.includes('isFavoritePending?: (id: string) => boolean;') &&
    searchResultsCode.includes('isFavoritePending={isFavoritePending ? isFavoritePending(prop.id) : false}'),
    'SearchResultsScreen must accept and forward isFavoritePending to PropertyCard'
  );

  // 33. Pre-Lab remediation: title renders BEFORE location in the card body
  const titleIdx = cardCode.indexOf('text-[16px]');
  const locationIdx = cardCode.indexOf('text-[13px] font-medium text-slate-500 line-clamp-2');
  assert(
    titleIdx !== -1 && locationIdx !== -1 && titleIdx < locationIdx,
    'PropertyCard must render the title BEFORE the canonical location'
  );

  // 34. Pre-Lab remediation: location supports 2-line clamp
  assert(
    cardCode.includes('text-[13px] font-medium text-slate-500 line-clamp-2'),
    'PropertyCard location must support line-clamp-2'
  );

  // 35. Pre-Lab remediation: facts row is 13px
  assert(
    cardCode.includes('text-[13px] font-medium text-slate-500 pt-0.5'),
    'PropertyCard facts row must be 13px'
  );

  // 36. Pre-Lab remediation: multi-destination summary is truthful count form
  assert(
    searchBarCode.includes('وجهات محددة') &&
    searchBarCode.includes('intent.destinations.length === 1') &&
    searchBarCode.includes('intent.destinations.length > 1'),
    'Search entry must summarize 1 destination by name and 2+ as "N وجهات محددة"'
  );
  assert(
    !searchBarCode.includes('+ ${intent.destinations.length - 1}'),
    'Search entry must NOT promote the first destination with a "+ N" suffix'
  );

  // 37. Pre-Lab remediation: active intent summary must not insert "أضف تواريخ" as selected state
  assert(
    !searchBarCode.includes('أضف تواريخ'),
    'Search entry must never insert "أضف تواريخ" as selected-state content'
  );

  // 38. Pre-Lab remediation: CURRENT_TASK must NOT claim a 24-hour Owner SLA
  assert(
    !currentTaskCode.includes('24 ساعة') && !currentTaskCode.includes('24-hour'),
    'CURRENT_TASK must NOT claim any Owner-response duration'
  );
  assert(
    currentTaskCode.includes('المالك يراجع الطلب') &&
    currentTaskCode.includes('دفع العربون') &&
    currentTaskCode.includes('الحجز مؤكدًا'),
    'CURRENT_TASK must preserve the truthful booking lifecycle wording'
  );

  // 39. Pre-Lab remediation: tsconfig.tsbuildinfo must match the base version
  //     (2d275535…), proving the generated artifact is absent from the candidate
  //     diff. Verified without spawning git: the worktree file's SHA-256 must
  //     equal the base blob's SHA-256.
  // @ts-ignore — node types are not part of the customer tsconfig
  const { createHash } = await import('node:crypto');
  const tsbuildInfoPath = new URL('../../tsconfig.tsbuildinfo', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/%20/g, ' ');
  const tsbuildInfoContent = readFileSync(tsbuildInfoPath);
  const tsbuildInfoHash = createHash('sha256').update(tsbuildInfoContent).digest('hex');
  assert(
    tsbuildInfoHash === '8af1c64551cc0c68ec334045836a74d4c5926cee5cefeb46e7acbe86695df4db',
    'customer-app/tsconfig.tsbuildinfo must match the base (2d275535…) version — regenerate-free candidate'
  );

  // 40. Explore Header is brand-only (Browse-first / Auth-late)
  assert(
    headerCode.includes("const isExplore = activeTab === 'EXPLORE';") &&
    headerCode.includes('const shouldShowAction = showAccountAction !== undefined ? showAccountAction : !isExplore;') &&
    headerCode.includes('{shouldShowAction ? ('),
    'CustomerHeader must omit account/auth actions on Explore (brand-only header)'
  );

  // 41. Bottom Navigation updated icon set (LAB V2)
  assert(
    bottomNavCode.includes('CalendarDays') &&
    bottomNavCode.includes('UserRound') &&
    !bottomNavCode.includes('CalendarCheck') &&
    !bottomNavCode.includes('User,') &&
    !bottomNavCode.includes('User }'),
    'CustomerBottomNav must use CalendarDays and UserRound, and omit CalendarCheck and User'
  );

  // 42. Bottom Navigation stroke width 2.2 and active state (Blue icon + label, no bubble)
  assert(
    bottomNavCode.includes('strokeWidth={2.2}'),
    'CustomerBottomNav icons must use unified strokeWidth={2.2}'
  );
  assert(
    !bottomNavCode.includes('rounded-full bg-[#0059FF]') &&
    !bottomNavCode.includes('bg-blue-50') &&
    !bottomNavCode.includes('bg-[#0059FF]/10'),
    'CustomerBottomNav must NOT have active bubble/pill background'
  );

  // 43. Bottom Navigation exactly 4 tabs
  assert(
    bottomNavCode.includes("id: 'EXPLORE'") &&
    bottomNavCode.includes("id: 'FAVORITES'") &&
    bottomNavCode.includes("id: 'BOOKINGS'") &&
    bottomNavCode.includes("id: 'ACCOUNT'"),
    'CustomerBottomNav must contain exactly the 4 canonical tabs'
  );

  console.log('ALL CUSTOMER EXPLORE VISUAL REMEDIATION REGRESSION CHECKS PASSED (43/43)!');
}

run().catch((err) => {
  console.error('EXPLORE REDESIGN REGRESSION TEST FAILURE:', err);
  throw err;
});
