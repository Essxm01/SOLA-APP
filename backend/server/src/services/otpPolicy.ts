/**
 * Sola Vacation Rentals — Canonical Auth V2 OTP & Challenge Policy
 * Location: backend/server/src/services/otpPolicy.ts
 * Master Source of Truth: AUTH_V2_FOUNDATION_01 Specification
 */

export const OTP_POLICY = {
  OTP_LENGTH: 6,
  OTP_TTL_MS: 5 * 60 * 1000,           // 5 minutes
  RESEND_COOLDOWN_MS: 60 * 1000,       // 60 seconds
  MAX_FAILED_ATTEMPTS: 5,              // 5 attempts before locking
  MAX_CHALLENGE_LIFECYCLE_MS: 10 * 60 * 1000, // 10 minutes total lifecycle
  CONTINUATION_TOKEN_TTL_MS: 10 * 60 * 1000,  // 10 minutes
  RATE_LIMIT_MAX_ISSUES_PER_WINDOW: 5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,       // 15 minutes
} as const;

export type AuthDeliveryMode = 'DEVELOPMENT_FIXED_OTP' | 'MOCK_ADAPTER' | 'REAL_PROVIDER';

export interface AuthEnvironmentConfig {
  nodeEnv?: string;
  authEnv?: string;
  deliveryMode?: AuthDeliveryMode | string;
  developmentOtp?: string;
  hmacSecret?: string;
  hasRealSmsProvider?: boolean;
  hasRealEmailProvider?: boolean;
}

export function isProductionEnvironment(config?: AuthEnvironmentConfig): boolean {
  const nodeEnv = (config?.nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase();
  const authEnv = (config?.authEnv ?? process.env.AUTH_ENVIRONMENT ?? '').toLowerCase();
  return nodeEnv === 'production' || authEnv === 'production';
}

export function isFixedOtpAllowed(config?: AuthEnvironmentConfig): boolean {
  if (isProductionEnvironment(config)) {
    return false;
  }
  const mode = (config?.deliveryMode ?? process.env.AUTH_DELIVERY_MODE ?? '').toUpperCase();
  return mode === 'DEVELOPMENT_FIXED_OTP';
}

export function getDevelopmentOtpValue(config?: AuthEnvironmentConfig): string {
  if (isProductionEnvironment(config)) {
    throw new Error('PRODUCTION_STATIC_OTP_FORBIDDEN');
  }
  return config?.developmentOtp ?? process.env.AUTH_DEVELOPMENT_OTP ?? '123456';
}

export function getAuthHmacSecret(config?: AuthEnvironmentConfig): string {
  const secret = config?.hmacSecret ?? process.env.AUTH_OTP_HMAC_SECRET;
  if (!secret) {
    if (isProductionEnvironment(config)) {
      throw new Error('AUTH_OTP_HMAC_SECRET_REQUIRED_IN_PRODUCTION');
    }
    // Safe deterministic development secret (strictly non-production)
    return 'sola_dev_otp_hmac_secret_insecure_for_dev_only';
  }
  return secret;
}

export function validateEnvironmentSafety(config?: AuthEnvironmentConfig): void {
  const isProd = isProductionEnvironment(config);
  const mode = (config?.deliveryMode ?? process.env.AUTH_DELIVERY_MODE ?? '').toUpperCase();

  if (isProd && mode === 'DEVELOPMENT_FIXED_OTP') {
    throw new Error('PRODUCTION_STATIC_OTP_FORBIDDEN');
  }

  if (isProd) {
    const hasSms = config?.hasRealSmsProvider ?? Boolean(process.env.AUTH_REAL_SMS_PROVIDER_CONFIGURED);
    const hasEmail = config?.hasRealEmailProvider ?? Boolean(process.env.AUTH_REAL_EMAIL_PROVIDER_CONFIGURED);
    if (!hasSms && !hasEmail) {
      // In production without real configured providers, auth fails closed
      // (Founder has explicitly deferred real SMS/Email providers)
    }
  }
}
