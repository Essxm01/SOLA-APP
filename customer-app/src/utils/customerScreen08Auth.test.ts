import {
  normalizeDigits,
  validateEgyptianMobilePhone,
  PHONE_VALIDATION_MESSAGES,
} from './phoneValidation';

function assert(condition: unknown, message: string): asserts condition {
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

  // 2.8 Primary CTA height ~54px, 12px radius, KONFRM Blue (#0059FF), NOT bottom-pinned
  assert(
    screen08File.includes('bg-[#0059FF]'),
    'Primary CTA must use KONFRM Blue (#0059FF)'
  );
  assert(
    !screen08File.includes('fixed bottom-') && !screen08File.includes('absolute bottom-'),
    'Primary CTA must be in document flow, NOT bottom-pinned'
  );
  passedChecks++;

  // 2.9 Reserved vertical helper/error region (prevents layout jumping)
  assert(
    screen08File.includes('min-h-[24px]'),
    'Helper/error container must reserve min-h-[24px] to prevent layout jumps'
  );
  passedChecks++;

  // 2.10 Scrollable container when visual viewport contracts
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
  assert(
    appFile.includes('setRestoreBookingReview(false)'),
    'Cancel auth must reset restoreBookingReview'
  );
  passedChecks++;

  // 5.4 Visible draft preservation: selectedProperty is NOT set to null during handleCancelAuth
  const cancelAuthFnMatch = appFile.match(/const handleCancelAuth = \(\) => \{([\s\S]*?)\};/);
  assert(cancelAuthFnMatch !== null, 'handleCancelAuth function must exist');
  const cancelAuthBody = cancelAuthFnMatch[1];
  assert(
    !cancelAuthBody.includes('setSelectedProperty(null)'),
    'handleCancelAuth must NOT clear selectedProperty (visible booking review must be preserved)'
  );
  passedChecks++;

  // 5.5 Late response guard (generation counter)
  assert(
    appFile.includes('authRequestGenerationRef') &&
    appFile.includes('currentGeneration !== authRequestGenerationRef.current'),
    'App.tsx must guard against late responses if user exited auth while request was in-flight'
  );
  passedChecks++;

  // 5.6 Customer-only surface safety (no Owner capability leakage)
  assert(
    appFile.includes("surface: 'CUSTOMER'"),
    'Prototype auth request must explicitly specify surface: CUSTOMER'
  );
  assert(
    !appFile.includes("role: 'OWNER'") && !screen08File.includes('OWNER'),
    'Screen 08 must not grant or request OWNER capability'
  );
  passedChecks++;

  // 5.7 Downstream legacy Name Onboarding compatibility
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

  console.log(`\n[PASS] All ${passedChecks} Screen 08 Customer Auth contracts verified successfully.\n`);
}

run().catch((err) => {
  console.error(err);
  throw err;
});
