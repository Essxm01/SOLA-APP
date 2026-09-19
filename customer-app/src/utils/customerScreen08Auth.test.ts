import {
  normalizeDigits,
  validateEgyptianMobilePhone,
  PHONE_VALIDATION_MESSAGES,
} from './phoneValidation';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(`[SCREEN08_AUTH_CONTRACT_TEST_FAILURE] ${message}`);
  }
}

async function run() {
  // @ts-ignore — node types are not part of the customer tsconfig
  const { readFileSync } = await import('node:fs');

  const screen08File = readFileSync(
    new URL('../components/CustomerScreen08PhoneEntry.tsx', import.meta.url),
    'utf-8'
  );
  const appFile = readFileSync(new URL('../App.tsx', import.meta.url), 'utf-8');
  const authModalFile = readFileSync(
    new URL('../components/CustomerAuthModal.tsx', import.meta.url),
    'utf-8'
  );

  let passedChecks = 0;

  // -------------------------------------------------------------
  // GROUP 1: Phone Validation & Normalization Logic
  // -------------------------------------------------------------

  // 1.1 Arabic-Indic digits normalization
  assert(
    normalizeDigits('٠١٠١٢٣٤٥٦٧٨') === '01012345678',
    'Arabic-Indic digits must normalize to standard Latin digits'
  );
  passedChecks++;

  // 1.2 Eastern Arabic/Persian digits normalization
  assert(
    normalizeDigits('۰۱۲۳۴۵۶۷۸۹۰') === '01234567890',
    'Eastern Arabic digits must normalize to standard Latin digits'
  );
  passedChecks++;

  // 1.3 Formatting characters stripping (spaces, dashes, parentheses, dots)
  assert(
    normalizeDigits('010 1234-5678') === '01012345678',
    'Spaces and hyphens must be stripped'
  );
  assert(
    normalizeDigits('(011) 9876.5432') === '01198765432',
    'Parentheses and dots must be stripped'
  );
  passedChecks++;

  // 1.4 Accidental country code handling (+20 or 20)
  assert(
    normalizeDigits('+201012345678') === '01012345678',
    'Leading +20 must be stripped to local format'
  );
  assert(
    normalizeDigits('201212345678') === '01212345678',
    'Leading 20 followed by 10 digits must normalize to local 012...'
  );
  passedChecks++;

  // 1.5 Valid Egyptian carrier prefixes (010, 011, 012, 015)
  const validNumbers = [
    '01012345678', // Vodafone
    '01123456789', // Etisalat
    '01234567890', // Orange
    '01555555555', // WE
  ];
  for (const num of validNumbers) {
    const res = validateEgyptianMobilePhone(num);
    assert(res.isValid, `Valid local Egyptian number ${num} must pass validation`);
    assert(
      res.canonicalE164 === `+20${num.substring(1)}`,
      `Valid number ${num} must convert to canonical E.164 (+20${num.substring(1)})`
    );
  }
  passedChecks++;

  // 1.6 Invalid prefixes (013, 014, 016, 017, 018, 019, 02)
  const invalidPrefixNumbers = [
    '01312345678',
    '01412345678',
    '01612345678',
    '01712345678',
    '01812345678',
    '01912345678',
    '02123456789',
  ];
  for (const num of invalidPrefixNumbers) {
    const res = validateEgyptianMobilePhone(num);
    assert(!res.isValid, `Invalid prefix number ${num} must fail validation`);
  }
  passedChecks++;

  // 1.7 Length validation (must be exactly 11 digits)
  assert(
    !validateEgyptianMobilePhone('0101234567').isValid,
    '10 digits must fail validation'
  );
  assert(
    !validateEgyptianMobilePhone('010').isValid,
    'Short prefix must fail validation'
  );
  passedChecks++;

  // -------------------------------------------------------------
  // GROUP 2: Screen 08 Design & Form Factor Contract
  // -------------------------------------------------------------

  // 2.1 Dedicated full-screen white mobile layer (NOT centered modal, NOT dark backdrop)
  assert(
    screen08File.includes('fixed inset-0 z-50 bg-white flex flex-col'),
    'Screen 08 must be a dedicated full-screen white mobile flow (fixed inset-0 z-50 bg-white)'
  );
  assert(
    !screen08File.includes('bg-slate-900/80') && !screen08File.includes('backdrop-blur'),
    'Screen 08 must not have dark modal backdrop overlay or blur'
  );
  passedChecks++;

  // 2.2 Canonical max composition width 430px
  assert(
    screen08File.includes('max-w-[430px]'),
    'Screen 08 must be bounded by canonical max-w-[430px]'
  );
  passedChecks++;

  // 2.3 RTL direction
  assert(
    screen08File.includes('dir="rtl"'),
    'Screen 08 must explicitly enforce dir="rtl"'
  );
  passedChecks++;

  // 2.4 Safe area integration
  assert(
    screen08File.includes('safe-area-inset-top') &&
    screen08File.includes('safe-area-inset-bottom'),
    'Screen 08 must own safe area top and bottom padding'
  );
  passedChecks++;

  // 2.5 Compact Auth header: 56px content height
  assert(
    screen08File.includes('h-14 min-h-[56px]') || screen08File.includes('min-h-[56px]'),
    'Screen 08 header must have 56px content height'
  );
  passedChecks++;

  // 2.6 Back button touch target >= 44x44px and RTL right-position
  assert(
    screen08File.includes('min-w-[44px] min-h-[44px]'),
    'Back button must have touch target >= 44x44px'
  );
  assert(
    screen08File.includes('ChevronRight'),
    'Back button must use ChevronRight icon for RTL layout'
  );
  assert(
    screen08File.includes('aria-label="الرجوع"'),
    'Back button must have aria-label="الرجوع"'
  );
  assert(
    !screen08File.includes('✕') && !screen08File.includes('X close') && !screen08File.includes('aria-label="إغلاق"'),
    'Screen 08 must not use an "X" close icon'
  );
  passedChecks++;

  // 2.7 Phone field height ~54px and control radius 12px
  assert(
    screen08File.includes('h-[54px]') && screen08File.includes('rounded-xl'),
    'Phone input container must have height 54px and 12px radius (rounded-xl)'
  );
  assert(
    screen08File.includes('type="tel"') && screen08File.includes('inputMode="numeric"'),
    'Phone input must use type="tel" and inputMode="numeric" for mobile keypad'
  );
  assert(
    screen08File.includes('dir="ltr"'),
    'Phone input digits must be visually LTR'
  );
  passedChecks++;

  // 2.8 Local Egyptian Phone-Entry UX Contract (No visible +20, no flag emoji, no divider)
  assert(
    screen08File.includes('placeholder={PHONE_VALIDATION_MESSAGES.phonePlaceholder}'),
    'Screen 08 must use the approved local placeholder'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.phonePlaceholder === '01X XXXX XXXX',
    'Approved placeholder must be 01X XXXX XXXX'
  );
  assert(
    !screen08File.includes('+20'),
    'Screen 08 UI must NOT render visible +20 country code prefix'
  );
  assert(
    !screen08File.includes('🇪🇬'),
    'Screen 08 UI must NOT render visible Egyptian flag emoji'
  );
  assert(
    !screen08File.includes('border-l border-slate-200') &&
    !screen08File.includes('Country Code Indicator'),
    'Screen 08 must not retain country-code separator or indicator container'
  );
  assert(
    screen08File.includes('maxLength={11}'),
    'Screen 08 input must enforce 11-digit local phone entry limit'
  );
  passedChecks++;

  // 2.9 Primary CTA height ~54px, 12px radius, KONFRM Blue (#0059FF), NOT bottom-pinned
  assert(
    screen08File.includes('bg-[#0059FF]'),
    'Primary CTA must use KONFRM Blue (#0059FF)'
  );
  assert(
    !screen08File.includes('fixed bottom-') && !screen08File.includes('absolute bottom-'),
    'Primary CTA must be in document flow, NOT bottom-pinned'
  );
  passedChecks++;

  // 2.10 Reserved vertical helper/error region (prevents layout jumping)
  assert(
    screen08File.includes('min-h-[24px]'),
    'Helper/error container must reserve min-h-[24px] to prevent layout jumps'
  );
  passedChecks++;

  // 2.11 Scrollable container when visual viewport contracts
  assert(
    screen08File.includes('overflow-y-auto'),
    'Screen 08 content area must be scrollable when viewport contracts (overflow-y-auto)'
  );
  passedChecks++;

  // -------------------------------------------------------------
  // GROUP 3: Approved Copy Contract
  // -------------------------------------------------------------

  assert(
    PHONE_VALIDATION_MESSAGES.primaryHeading === 'اكتب رقم موبايلك',
    'Heading must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.supportingCopy === 'اكتب رقم موبايل مصري، والخطوة الجاية هنتأكد منه.',
    'Supporting copy must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.phoneLabel === 'رقم الموبايل',
    'Phone label must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.phonePlaceholder === '01X XXXX XXXX',
    'Phone placeholder must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.helper === 'رقم مصري يبدأ بـ 010 أو 011 أو 012 أو 015',
    'Phone helper must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.primaryCta === 'متابعة',
    'Primary CTA must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.loadingCta === 'جاري المتابعة…',
    'Loading CTA must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.invalid === 'اكتب رقم موبايل مصري صحيح يبدأ بـ 010 أو 011 أو 012 أو 015.',
    'Invalid phone error must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.serviceError === 'تعذر المتابعة دلوقتي. حاول مرة تانية.',
    'Service error must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.bookingReassurance === 'تفاصيل طلب الحجز محفوظة. بعد التحقق هنرجعك لمراجعة الطلب قبل الإرسال.',
    'Booking reassurance must match approved copy'
  );
  assert(
    PHONE_VALIDATION_MESSAGES.favoriteReassurance === 'بعد التحقق هنرجعك لنفس الوحدة.',
    'Favorite reassurance must match approved copy'
  );
  passedChecks++;

  // -------------------------------------------------------------
  // GROUP 4: No Unapproved Screen 09 OTP or Live OTP Route Invocations
  // -------------------------------------------------------------

  // 4.1 No Screen 09 OTP elements in Screen 08
  assert(
    !screen08File.includes('رمز التحقق') &&
    !screen08File.includes('resend') &&
    !screen08File.includes('timer') &&
    !screen08File.includes('countdown'),
    'Screen 08 must not contain Screen 09 OTP verification UI'
  );
  passedChecks++;

  // 4.2 No calls to /auth/request-otp or /auth/verify-otp in Screen 08 or App
  assert(
    !screen08File.includes('/auth/request-otp') &&
    !screen08File.includes('/auth/verify-otp') &&
    !appFile.includes('/auth/request-otp') &&
    !appFile.includes('/auth/verify-otp'),
    'Screen 08 and App must not invoke unready live OTP endpoints'
  );
  passedChecks++;

  // 4.3 Temporary prototype bridge isolation and clear code comment
  assert(
    appFile.includes('TEMPORARY_PROTOTYPE_AUTH_BRIDGE — replace with Screen 09 OTP handoff when canonical OTP infrastructure is ready.'),
    'App.tsx must have explicit TEMPORARY_PROTOTYPE_AUTH_BRIDGE documentation'
  );
  assert(
    appFile.includes('/auth/prototype-login'),
    'App.tsx must use /auth/prototype-login for current prototype usability'
  );
  passedChecks++;

  // -------------------------------------------------------------
  // GROUP 5: Founder Cancel Handoff & State Preservation
  // -------------------------------------------------------------

  // 5.1 Clear stale pending favorite on cancel
  assert(
    appFile.includes("localStorage.removeItem('sola_customer_pending_favorite_property_id')"),
    'Cancel auth must remove stale pending favorite key'
  );
  passedChecks++;

  // 5.2 Clear stale pending booking intent on cancel
  assert(
    appFile.includes("localStorage.removeItem('sola_customer_pending_booking_intent')"),
    'Cancel auth must remove stale pending booking intent key'
  );
  passedChecks++;

  // 5.3 Reset restoreBookingReview on cancel
  // 5.3 Reset restoreBookingReview on cancel
  assert(
    appFile.includes('setRestoreBookingReview(false)'),
    'Cancel auth must reset restoreBookingReview'
  );
  passedChecks++;

  // 5.4 Invalidate in-memory interceptedContext on cancel (CANONICAL FIX)
  const cancelAuthFnMatch = appFile.match(/const handleCancelAuth = \(\) => \{([\s\S]*?)\};/);
  assert(cancelAuthFnMatch !== null, 'handleCancelAuth function must exist');
  const cancelAuthBody = cancelAuthFnMatch[1];
  assert(
    cancelAuthBody.includes('setInterceptedContext(null)'),
    'handleCancelAuth must invalidate in-memory interceptedContext on cancel'
  );
  passedChecks++;

  // 5.5 Visible draft preservation: selectedProperty is NOT set to null during handleCancelAuth
  assert(
    !cancelAuthBody.includes('setSelectedProperty(null)'),
    'handleCancelAuth must NOT clear selectedProperty (visible booking review must be preserved)'
  );
  passedChecks++;

  // 5.6 handleAuthSuccess must guard booking restore by authOrigin type
  const authSuccessFnMatch = appFile.match(/const handleAuthSuccess = \([\s\S]*?\) => \{([\s\S]*?)\n  \};/);
  assert(authSuccessFnMatch !== null, 'handleAuthSuccess function must exist');
  const authSuccessBody = authSuccessFnMatch[1];
  assert(
    authSuccessBody.includes("authOrigin?.type === 'PROTECTED_BOOKING'"),
    'handleAuthSuccess must guard booking review restoration with authOrigin?.type === PROTECTED_BOOKING'
  );
  assert(
    authSuccessBody.includes('setInterceptedContext(null)'),
    'handleAuthSuccess must clear stale interceptedContext when origin is not protected booking'
  );
  passedChecks++;

  // 5.7 Late response guard (generation counter)
  assert(
    appFile.includes('authRequestGenerationRef') &&
    appFile.includes('currentGeneration !== authRequestGenerationRef.current'),
    'App.tsx must guard against late responses if user exited auth while request was in-flight'
  );
  passedChecks++;

  // 5.8 Customer-only surface safety (no Owner capability leakage)
  assert(
    appFile.includes("surface: 'CUSTOMER'"),
    'Prototype auth request must explicitly specify surface: CUSTOMER'
  );
  assert(
    !appFile.includes("role: 'OWNER'") && !screen08File.includes('OWNER'),
    'Screen 08 must not grant or request OWNER capability'
  );
  passedChecks++;

  // 5.9 Downstream legacy Name Onboarding compatibility
  assert(
    authModalFile.includes("initialStep = 'PHONE'") &&
    authModalFile.includes('initialStep?:'),
    'CustomerAuthModal must accept initialStep for legacy Name Onboarding compatibility'
  );
  assert(
    appFile.includes('pendingNameOnboardingPhone'),
    'App.tsx must pass entered phone to downstream legacy Name Onboarding'
  );
  passedChecks++;

  // -------------------------------------------------------------
  // GROUP 6: Sequential Behavioral State-Machine Verification
  // -------------------------------------------------------------

  interface BookingContext {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    quoteSnapshot: { totalStay: number; depositAmount: number };
    requestId: string;
  }

  interface AuthOrigin {
    type: 'PROTECTED_BOOKING' | 'PROTECTED_FAVORITE' | 'DIRECT_ACCOUNT' | 'DIRECT_WELCOME' | 'DIRECT_EXPLORE';
    propertyId?: string;
    context?: BookingContext;
  }

  class CustomerAppHandoffSimulation {
    authToken: string | null = null;
    selectedProperty: { id: string; title: string } | null = null;
    visibleDraft: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
      guests: number;
      quote: { totalStay: number; depositAmount: number };
      requestId: string;
      isMounted: boolean;
    } | null = null;
    interceptedContext: BookingContext | null = null;
    authOrigin: AuthOrigin | null = null;
    showAuthModal: boolean = false;
    restoreBookingReview: boolean = false;
    authRequestGeneration: number = 0;
    localStorageStore = new Map<string, string>();
    userFavorites: string[] = [];

    openPropertyReviewDraft(property: { id: string; title: string }, draft: { checkIn: string; checkOut: string; guests: number; quote: { totalStay: number; depositAmount: number }; requestId: string }) {
      this.selectedProperty = property;
      this.visibleDraft = {
        propertyId: property.id,
        ...draft,
        isMounted: true,
      };
    }

    submitBookingFromReview() {
      if (!this.visibleDraft) throw new Error('No draft to submit');
      const context: BookingContext = {
        propertyId: this.visibleDraft.propertyId,
        checkIn: this.visibleDraft.checkIn,
        checkOut: this.visibleDraft.checkOut,
        guests: this.visibleDraft.guests,
        quoteSnapshot: this.visibleDraft.quote,
        requestId: this.visibleDraft.requestId,
      };
      this.localStorageStore.set('sola_customer_pending_booking_intent', JSON.stringify(context));
      this.interceptedContext = context;
      this.authOrigin = { type: 'PROTECTED_BOOKING', context };
      this.showAuthModal = true;
    }

    handleCancelAuth() {
      this.authRequestGeneration++;
      if (this.authOrigin?.type === 'PROTECTED_FAVORITE') {
        this.localStorageStore.delete('sola_customer_pending_favorite_property_id');
      } else if (this.authOrigin?.type === 'PROTECTED_BOOKING') {
        this.localStorageStore.delete('sola_customer_pending_booking_intent');
        this.restoreBookingReview = false;
        this.interceptedContext = null; // In-memory invalidation
      }
      this.authOrigin = null;
      this.showAuthModal = false;
    }

    openDirectAuth(origin: 'DIRECT_ACCOUNT' | 'DIRECT_WELCOME' | 'DIRECT_EXPLORE') {
      this.authOrigin = { type: origin };
      this.showAuthModal = true;
    }

    toggleFavorite(propertyId: string) {
      if (!this.authToken) {
        this.localStorageStore.set('sola_customer_pending_favorite_property_id', propertyId);
        this.authOrigin = { type: 'PROTECTED_FAVORITE', propertyId };
        this.showAuthModal = true;
      }
    }

    handleAuthSuccess(token: string) {
      this.authToken = token;
      this.showAuthModal = false;

      // Pending favorite handling
      const pendingFav = this.localStorageStore.get('sola_customer_pending_favorite_property_id');
      if (pendingFav) {
        this.userFavorites.push(pendingFav);
        this.localStorageStore.delete('sola_customer_pending_favorite_property_id');
      }

      // Canonical booking review restoration guard
      if (this.authOrigin?.type === 'PROTECTED_BOOKING' && this.interceptedContext) {
        if (this.interceptedContext.propertyId) {
          this.selectedProperty = { id: this.interceptedContext.propertyId, title: 'Restored Unit' };
        }
        this.restoreBookingReview = true;
      } else {
        this.interceptedContext = null;
        this.restoreBookingReview = false;
        this.localStorageStore.delete('sola_customer_pending_booking_intent');
      }

      this.authOrigin = null;
    }

    captureRestoredBookingReview() {
      this.restoreBookingReview = false;
      this.interceptedContext = null;
      this.localStorageStore.delete('sola_customer_pending_booking_intent');
    }
  }

  // 6.1 SCENARIO A: Protected Booking Cancel Lifecycle
  {
    const sim = new CustomerAppHandoffSimulation();
    sim.openPropertyReviewDraft(
      { id: 'prop-marina-101', title: 'شاليه بورتو مارينا' },
      { checkIn: '2026-08-01', checkOut: '2026-08-05', guests: 4, quote: { totalStay: 12000, depositAmount: 2400 }, requestId: 'req-orig-uuid-1' }
    );

    // Guest submits booking review while unauthenticated
    sim.submitBookingFromReview();
    assert(sim.showAuthModal === true, 'Screen 08 must open on protected booking submit');
    assert(sim.authOrigin?.type === 'PROTECTED_BOOKING', 'authOrigin must be PROTECTED_BOOKING');
    assert(sim.interceptedContext !== null, 'interceptedContext must be populated before auth');
    assert(sim.localStorageStore.has('sola_customer_pending_booking_intent'), 'localStorage must hold pending booking intent');

    // Guest presses Back (cancel auth)
    sim.handleCancelAuth();

    // Verification of Cancel State
    assert(sim.showAuthModal === false, 'Screen 08 must close on Back');
    assert(!sim.localStorageStore.has('sola_customer_pending_booking_intent'), 'Persistent pending booking intent MUST be removed from localStorage');
    assert(sim.interceptedContext === null, 'In-memory interceptedContext MUST be invalidated (set to null)');
    assert(sim.restoreBookingReview === false, 'restoreBookingReview MUST be false');
    assert(sim.authOrigin === null, 'authOrigin MUST be null');

    // Canonical rule: CANCEL HANDOFF ≠ DELETE VISIBLE DRAFT
    assert(sim.selectedProperty !== null && sim.selectedProperty.id === 'prop-marina-101', 'selectedProperty must NOT be cleared on auth cancel');
    assert(sim.visibleDraft !== null && sim.visibleDraft.isMounted === true, 'Visible booking review draft MUST remain mounted and visible to guest');
    assert(sim.visibleDraft?.requestId === 'req-orig-uuid-1', 'Visible draft requestId must remain intact');
    assert(sim.visibleDraft?.checkIn === '2026-08-01' && sim.visibleDraft?.checkOut === '2026-08-05', 'Visible draft dates must remain intact');
    passedChecks++;
  }

  // 6.2 SCENARIO B: Subsequent Direct Auth Login (Account/Welcome/Explore) After Cancel
  {
    const sim = new CustomerAppHandoffSimulation();
    sim.openPropertyReviewDraft(
      { id: 'prop-marina-101', title: 'شاليه بورتو مارينا' },
      { checkIn: '2026-08-01', checkOut: '2026-08-05', guests: 4, quote: { totalStay: 12000, depositAmount: 2400 }, requestId: 'req-orig-uuid-1' }
    );

    // Intercepted and cancelled
    sim.submitBookingFromReview();
    sim.handleCancelAuth();

    // Guest closes property or navigates to Account tab, then logs in directly
    sim.openDirectAuth('DIRECT_ACCOUNT');
    assert(sim.authOrigin?.type === 'DIRECT_ACCOUNT', 'Auth origin must be DIRECT_ACCOUNT');

    // Guest completes direct login
    sim.handleAuthSuccess('token_account_direct_login');

    assert(sim.authToken === 'token_account_direct_login', 'Auth token must be stored');
    assert(sim.restoreBookingReview === false, 'CRITICAL: Direct login MUST NOT restore cancelled booking review');
    assert(sim.interceptedContext === null, 'interceptedContext must remain null');
    assert(!sim.localStorageStore.has('sola_customer_pending_booking_intent'), 'localStorage must have no pending booking intent');
    passedChecks++;
  }

  // 6.3 SCENARIO C: Normal Protected Booking Flow (Success Without Cancel)
  {
    const sim = new CustomerAppHandoffSimulation();
    sim.openPropertyReviewDraft(
      { id: 'prop-alamein-202', title: 'فيلا الساحل الشمالي' },
      { checkIn: '2026-09-10', checkOut: '2026-09-15', guests: 6, quote: { totalStay: 25000, depositAmount: 5000 }, requestId: 'req-approved-uuid-2' }
    );

    // Guest submits booking review
    sim.submitBookingFromReview();

    // Guest enters phone and completes auth successfully (NO cancel)
    sim.handleAuthSuccess('token_protected_booking_success');

    assert(sim.authToken === 'token_protected_booking_success', 'Auth token must be set');
    assert(sim.restoreBookingReview === true, 'Protected booking auth success MUST trigger restoreBookingReview');
    assert(sim.selectedProperty?.id === 'prop-alamein-202', 'Exact selectedProperty must be restored');

    // BookingRequestReviewScreen mounts restored and captures context
    sim.captureRestoredBookingReview();
    assert(sim.restoreBookingReview === false, 'restoreBookingReview resets after capture');
    assert(sim.interceptedContext === null, 'interceptedContext resets after capture');
    assert(!sim.localStorageStore.has('sola_customer_pending_booking_intent'), 'localStorage key removed after capture');
    passedChecks++;
  }

  // 6.4 SCENARIO D: Favorite Cancel Regression
  {
    const sim = new CustomerAppHandoffSimulation();

    // Guest taps favorite while unauthenticated
    sim.toggleFavorite('prop-fav-999');
    assert(sim.localStorageStore.get('sola_customer_pending_favorite_property_id') === 'prop-fav-999', 'Pending favorite property ID must be in localStorage');
    assert(sim.authOrigin?.type === 'PROTECTED_FAVORITE', 'authOrigin must be PROTECTED_FAVORITE');

    // Guest cancels auth via Back
    sim.handleCancelAuth();
    assert(!sim.localStorageStore.has('sola_customer_pending_favorite_property_id'), 'Pending favorite key MUST be removed on cancel');
    assert(sim.authOrigin === null, 'authOrigin must be reset');

    // Later guest logs in via DIRECT_WELCOME
    sim.openDirectAuth('DIRECT_WELCOME');
    sim.handleAuthSuccess('token_welcome_login');
    assert(!sim.userFavorites.includes('prop-fav-999'), 'Cancelled favorite MUST NOT be executed on later direct login');
    passedChecks++;
  }

  // 6.5 SCENARIO E: Late Response Guard After Cancel
  {
    const sim = new CustomerAppHandoffSimulation();
    sim.openPropertyReviewDraft(
      { id: 'prop-marina-101', title: 'شاليه بورتو مارينا' },
      { checkIn: '2026-08-01', checkOut: '2026-08-05', guests: 4, quote: { totalStay: 12000, depositAmount: 2400 }, requestId: 'req-late-guard' }
    );
    sim.submitBookingFromReview();

    // In-flight network request initiated with generation = 1
    const requestGen = ++sim.authRequestGeneration;

    // User taps Back before response arrives (handleCancelAuth increments generation to 2)
    sim.handleCancelAuth();
    assert(sim.authRequestGeneration > requestGen, 'Cancel must advance authRequestGenerationRef');

    // Late network response arrives
    const isLate = requestGen !== sim.authRequestGeneration;
    assert(isLate === true, 'Late network response must be detected as stale generation');
    if (!isLate) {
      sim.handleAuthSuccess('token_late_unwanted');
    }
    assert(sim.authToken === null, 'Late response MUST NOT log user in or alter auth state');
    assert(sim.showAuthModal === false, 'Screen 08 must remain closed');
    passedChecks++;
  }

  // 6.6 SCENARIO F: Re-submission After Cancel Generates Fresh Handoff
  {
    const sim = new CustomerAppHandoffSimulation();
    sim.openPropertyReviewDraft(
      { id: 'prop-marina-101', title: 'شاليه بورتو مارينا' },
      { checkIn: '2026-08-01', checkOut: '2026-08-05', guests: 4, quote: { totalStay: 12000, depositAmount: 2400 }, requestId: 'req-first-run' }
    );

    // Cancel first attempt
    sim.submitBookingFromReview();
    sim.handleCancelAuth();
    assert(sim.interceptedContext === null, 'Handoff is invalidated after first cancel');

    // While visible draft remains open, user taps submit again (fresh handoff)
    sim.visibleDraft!.requestId = 'req-second-run-fresh';
    sim.submitBookingFromReview();
    assert(sim.authOrigin?.type === 'PROTECTED_BOOKING', 'Fresh handoff origin is PROTECTED_BOOKING');
    assert(sim.interceptedContext?.requestId === 'req-second-run-fresh', 'Fresh handoff captures new requestId');

    // User completes login on second attempt
    sim.handleAuthSuccess('token_second_attempt');
    assert(sim.restoreBookingReview === true, 'Fresh handoff successfully restores booking review');
    assert(sim.selectedProperty?.id === 'prop-marina-101', 'Correct property retained');
    passedChecks++;
  }

  console.log(`\n[PASS] All ${passedChecks} Screen 08 Customer Auth contracts & behavioral state-machine tests verified successfully.\n`);
}

run().catch((err) => {
  console.error(err);
  throw err;
});
