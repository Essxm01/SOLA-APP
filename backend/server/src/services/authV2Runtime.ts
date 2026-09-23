import type { AuthEnvironmentConfig } from './otpPolicy.js';

export const AUTH_V2_QA_PROJECT_REF = 'vlowzglqruozxstiqzgn';
export const AUTH_V2_PRODUCTION_PROJECT_REF = 'zrbmbjgcsowfqklmxbyn';

export interface AuthV2RuntimeDecision {
  enabled: boolean;
  config?: AuthEnvironmentConfig;
  errorCode?: string;
}

function isExplicitlyEnabled(value: string | undefined): boolean {
  return String(value || '').trim().toLowerCase() === 'true';
}

export function extractSupabaseProjectRef(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const match = url.trim().match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co(?:\/|$)/i);
  return match?.[1]?.toLowerCase();
}

function hasSecret(value: string | undefined, minimumLength: number): boolean {
  return typeof value === 'string' && value.trim().length >= minimumLength;
}

/**
 * Auth V2 is deliberately dark unless an operator explicitly enables it.
 * This is the only place where runtime environment/project safety is decided.
 */
export function getAuthV2RuntimeDecision(env: NodeJS.ProcessEnv = process.env): AuthV2RuntimeDecision {
  if (!isExplicitlyEnabled(env.AUTH_V2_ENABLED)) {
    return { enabled: false, errorCode: 'AUTH_V2_DISABLED' };
  }

  const authEnv = String(env.AUTH_ENVIRONMENT || '').trim().toLowerCase();
  const deliveryMode = String(env.AUTH_DELIVERY_MODE || '').trim().toUpperCase();
  const explicitProjectRef = String(env.SUPABASE_PROJECT_REF || '').trim().toLowerCase();
  const urlProjectRef = extractSupabaseProjectRef(env.SUPABASE_URL);
  if (explicitProjectRef && urlProjectRef && explicitProjectRef !== urlProjectRef) {
    return { enabled: false, errorCode: 'AUTH_V2_SUPABASE_PROJECT_IDENTITY_MISMATCH' };
  }
  const projectRef = explicitProjectRef || urlProjectRef || '';
  const nodeEnv = String(env.NODE_ENV || '').trim().toLowerCase();
  const production = authEnv === 'production' || nodeEnv === 'production';

  if (!authEnv) return { enabled: false, errorCode: 'AUTH_ENVIRONMENT_REQUIRED' };
  if (!hasSecret(env.JWT_ACCESS_SECRET, 32) || !hasSecret(env.JWT_REFRESH_SECRET, 32)) {
    return { enabled: false, errorCode: 'AUTH_JWT_SECRETS_REQUIRED' };
  }
  if (!hasSecret(env.AUTH_OTP_HMAC_SECRET, 16)) {
    return { enabled: false, errorCode: 'AUTH_OTP_HMAC_SECRET_REQUIRED' };
  }
  if (!projectRef) return { enabled: false, errorCode: 'SUPABASE_PROJECT_REF_REQUIRED' };

  if (authEnv === 'founder_qa') {
    if (env.DATABASE_URL && env.DATABASE_URL.trim()) {
      return { enabled: false, errorCode: 'AUTH_V2_QA_DATABASE_URL_FORBIDDEN' };
    }
    if (!hasSecret(env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY, 20)) {
      return { enabled: false, errorCode: 'AUTH_V2_QA_SERVICE_ROLE_REQUIRED' };
    }
    if (!urlProjectRef || !explicitProjectRef) {
      return { enabled: false, errorCode: 'AUTH_V2_QA_PROJECT_REF_AND_URL_REQUIRED' };
    }
    if (projectRef !== AUTH_V2_QA_PROJECT_REF) {
      return { enabled: false, errorCode: 'AUTH_V2_QA_PROJECT_MISMATCH' };
    }
    if (production || deliveryMode !== 'DEVELOPMENT_FIXED_OTP' || !/^\d{6}$/.test(String(env.AUTH_DEVELOPMENT_OTP || ''))) {
      return { enabled: false, errorCode: 'AUTH_V2_QA_FIXED_OTP_CONFIGURATION_INVALID' };
    }
  } else if (production) {
    if (projectRef !== AUTH_V2_PRODUCTION_PROJECT_REF) {
      return { enabled: false, errorCode: 'AUTH_V2_PRODUCTION_PROJECT_MISMATCH' };
    }
    if (deliveryMode === 'DEVELOPMENT_FIXED_OTP') {
      return { enabled: false, errorCode: 'PRODUCTION_STATIC_OTP_FORBIDDEN' };
    }
    if (deliveryMode !== 'REAL_PROVIDER' || (env.AUTH_REAL_SMS_PROVIDER_CONFIGURED !== 'true' && env.AUTH_REAL_EMAIL_PROVIDER_CONFIGURED !== 'true')) {
      return { enabled: false, errorCode: 'AUTH_V2_REAL_PROVIDER_REQUIRED' };
    }
  } else {
    const allowedEnvironments = new Set(['development', 'test', 'founder_preview']);
    if (!allowedEnvironments.has(authEnv)) {
      return { enabled: false, errorCode: 'AUTH_V2_ENVIRONMENT_NOT_AUTHORIZED' };
    }
    if (deliveryMode === 'DEVELOPMENT_FIXED_OTP' && !/^\d{6}$/.test(String(env.AUTH_DEVELOPMENT_OTP || ''))) {
      return { enabled: false, errorCode: 'AUTH_DEVELOPMENT_OTP_CONFIG_REQUIRED' };
    }
    if (deliveryMode !== 'DEVELOPMENT_FIXED_OTP' && deliveryMode !== 'REAL_PROVIDER') {
      return { enabled: false, errorCode: 'AUTH_V2_DELIVERY_MODE_REQUIRED' };
    }
  }

  return {
    enabled: true,
    config: {
      nodeEnv,
      authEnv,
      deliveryMode,
      developmentOtp: env.AUTH_DEVELOPMENT_OTP,
      hmacSecret: env.AUTH_OTP_HMAC_SECRET,
      hasRealSmsProvider: env.AUTH_REAL_SMS_PROVIDER_CONFIGURED === 'true',
      hasRealEmailProvider: env.AUTH_REAL_EMAIL_PROVIDER_CONFIGURED === 'true',
    },
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_V2_UNAVAILABLE: 'خدمة تسجيل الدخول الجديدة غير متاحة حاليًا. حاول مرة أخرى لاحقًا.',
  INVALID_AUTH_INTENT: 'نوع العملية غير صالح.',
  INVALID_AUTH_METHOD: 'طريقة التحقق غير مدعومة.',
  INVALID_AUTH_REQUEST: 'بيانات طلب التحقق غير صالحة.',
  UNAUTHORIZED_SURFACE: 'هذا المسار متاح لتطبيق المستأجر فقط.',
  INVALID_PHONE_NUMBER: 'رقم الهاتف غير صالح.',
  INVALID_EGYPTIAN_MOBILE_NUMBER: 'أدخل رقم هاتف مصري صالح.',
  INVALID_EMAIL: 'البريد الإلكتروني غير صالح.',
  INVALID_FULL_NAME: 'أدخل الاسم الكامل.',
  CHALLENGE_NOT_FOUND: 'جلسة التحقق غير موجودة أو انتهت.',
  INVALID_OTP: 'رمز التحقق غير صحيح.',
  OTP_EXPIRED: 'انتهت صلاحية رمز التحقق.',
  CHALLENGE_EXPIRED: 'انتهت صلاحية جلسة التحقق.',
  CHALLENGE_CANCELLED: 'تم إلغاء جلسة التحقق.',
  CHALLENGE_ALREADY_VERIFIED: 'تم استخدام جلسة التحقق بالفعل.',
  CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED: 'تم إيقاف جلسة التحقق بعد محاولات متعددة.',
  CONTINUATION_ALREADY_CONSUMED: 'تم استخدام رابط المتابعة بالفعل.',
  CONTINUATION_TOKEN_EXPIRED: 'انتهت صلاحية خطوة إنشاء الحساب.',
  INVALID_CONTINUATION_TOKEN: 'خطوة إنشاء الحساب غير صالحة.',
  EMAIL_ONLY_ACCOUNT_CREATION_DEFERRED: 'إنشاء الحساب بالبريد الإلكتروني غير متاح في هذه المرحلة.',
  EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED: 'إنشاء الحساب بالبريد الإلكتروني غير متاح في هذه المرحلة.',
  RESEND_COOLDOWN_ACTIVE: 'انتظر قليلًا قبل إعادة إرسال الرمز.',
  RESEND_IN_PROGRESS: 'تجري إعادة إرسال الرمز حاليًا.',
  RATE_LIMIT_EXCEEDED: 'تم تجاوز عدد المحاولات. حاول لاحقًا.',
  OTP_DELIVERY_FAILED: 'تعذر إرسال رمز التحقق. حاول مرة أخرى.',
};

function errorCodeFromMessage(message: string): string {
  return String(message || '').split(':', 1)[0].trim() || 'AUTH_V2_UNAVAILABLE';
}

export function mapAuthV2Error(error: unknown): { statusCode: number; code: string; message: string } {
  const raw = error instanceof Error ? error.message : String(error || '');
  const code = errorCodeFromMessage(raw);
  if (code === 'CHALLENGE_NOT_FOUND') return { statusCode: 404, code, message: ERROR_MESSAGES[code] };
  if (code === 'CONTINUATION_TOKEN_EXPIRED') return { statusCode: 400, code, message: ERROR_MESSAGES.CONTINUATION_TOKEN_EXPIRED };
  if (code === 'INVALID_CONTINUATION_TOKEN' || code === 'MALFORMED_CONTINUATION_TOKEN' || code === 'INVALID_CONTINUATION_TOKEN_SIGNATURE' || code === 'CORRUPT_CONTINUATION_TOKEN_PAYLOAD') {
    return { statusCode: 400, code: 'INVALID_CONTINUATION_TOKEN', message: ERROR_MESSAGES.INVALID_CONTINUATION_TOKEN };
  }
  if (code === 'RATE_LIMIT_EXCEEDED' || code === 'RESEND_COOLDOWN_ACTIVE' || code === 'RESEND_IN_PROGRESS') {
    return { statusCode: 429, code, message: ERROR_MESSAGES[code] };
  }
  if (code === 'CHALLENGE_ALREADY_VERIFIED' || code === 'CONTINUATION_ALREADY_CONSUMED' || code === 'CHALLENGE_NOT_VERIFIED' || code === 'CHALLENGE_BINDING_MISMATCH' || code === 'EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED' || code === 'EMAIL_ONLY_ACCOUNT_CREATION_DEFERRED') {
    return { statusCode: 409, code: code === 'EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED' ? 'EMAIL_ONLY_ACCOUNT_CREATION_DEFERRED' : code, message: ERROR_MESSAGES[code] };
  }
  if (code.startsWith('INVALID_') || code === 'UNAUTHORIZED_SURFACE' || code === 'UNSUPPORTED_AUTH_METHOD' || code === 'CHALLENGE_CANCELLED' || code === 'CHALLENGE_EXPIRED' || code === 'OTP_EXPIRED' || code === 'CHALLENGE_LOCKED_MAX_ATTEMPTS_EXCEEDED' || code === 'PRODUCTION_STATIC_OTP_FORBIDDEN' || code === 'FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED') {
    return { statusCode: 400, code, message: ERROR_MESSAGES[code] || 'الطلب غير صالح.' };
  }
  if (code === 'OTP_DELIVERY_FAILED' || code.includes('PROVIDER') || code.includes('PERSISTENCE') || code.includes('DATABASE') || code.includes('DB_') || code.includes('QUERY') || code.includes('POSTGRES') || code.includes('POOL') || code === 'RESEND_FAILED' || code === 'RESEND_COMMIT_FAILED') {
    return { statusCode: 503, code: 'AUTH_V2_UNAVAILABLE', message: ERROR_MESSAGES.AUTH_V2_UNAVAILABLE };
  }
  return { statusCode: 503, code: 'AUTH_V2_UNAVAILABLE', message: ERROR_MESSAGES.AUTH_V2_UNAVAILABLE };
}

export function safeAuthUser(user: any): Record<string, unknown> | undefined {
  if (!user || typeof user !== 'object' || typeof user.id !== 'string') return undefined;
  return {
    id: user.id,
    fullName: typeof user.fullName === 'string' ? user.fullName : undefined,
  };
}
