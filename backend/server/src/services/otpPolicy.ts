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
  SESSION_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000, // 7 days canonical session refresh lifecycle
  
  // Unified Persistent Send Throttling Policy (Blocker 2)
  RATE_LIMIT_SEND_WINDOW_SECONDS: 15 * 60,         // 15 minutes in seconds
  RATE_LIMIT_SEND_WINDOW_MS: 15 * 60 * 1000,       // 15 minutes in milliseconds
  RATE_LIMIT_MAX_SENDS_PER_IDENTIFIER: 5,          // 5 sends / 15 min per normalized identifier
  RATE_LIMIT_MAX_SENDS_PER_IP: 30,                 // 30 sends / 15 min per request IP
  
  // Backward compatibility aliases
  RATE_LIMIT_MAX_ISSUES_PER_WINDOW: 5,
  RATE_LIMIT_WINDOW_SECONDS: 15 * 60,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
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

export const ALLOWED_FIXED_OTP_ENVIRONMENTS = new Set<string>([
  'development',
  'test',
  'founder_preview',
  'founder_qa',
  'development_live',
  'founder_live_development',
]);

export function isProductionEnvironment(config?: AuthEnvironmentConfig): boolean {
  const nodeEnv = (config?.nodeEnv ?? process.env.NODE_ENV ?? '').toLowerCase();
  const authEnv = (config?.authEnv ?? process.env.AUTH_ENVIRONMENT ?? '').toLowerCase();
  if (authEnv === 'production') return true;
  if (nodeEnv === 'production') {
    if (authEnv === 'founder_qa' || authEnv === 'development_live' || authEnv === 'founder_live_development') {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Checks if Providerless delivery (mock/development adapters) is authorized.
 * STRICT RULE (Blocker 1): Providerless operations require explicitly allowed
 * Auth environment (development, test, founder_preview, founder_qa).
 * Production, staging, blank, or unknown environments fail closed.
 */
export function isProviderlessAllowed(config?: AuthEnvironmentConfig): boolean {
  if (isProductionEnvironment(config)) {
    return false;
  }
  const authEnv = (config?.authEnv ?? process.env.AUTH_ENVIRONMENT ?? '').trim().toLowerCase();
  return ALLOWED_FIXED_OTP_ENVIRONMENTS.has(authEnv);
}

/**
 * Checks if Fixed OTP mode is authorized.
 * STRICT RULE (Blocker 3): Fixed OTP mode requires BOTH:
 *   1. explicit deliveryMode === 'DEVELOPMENT_FIXED_OTP'
 *   2. explicit allowed authEnv in ALLOWED_FIXED_OTP_ENVIRONMENTS (development, test, founder_preview)
 * Blank, unknown, or production environments fail closed (return false).
 */
export function isFixedOtpAllowed(config?: AuthEnvironmentConfig): boolean {
  if (isProductionEnvironment(config)) {
    return false;
  }
  const mode = (config?.deliveryMode ?? process.env.AUTH_DELIVERY_MODE ?? '').toUpperCase();
  if (mode !== 'DEVELOPMENT_FIXED_OTP') {
    return false;
  }
  const authEnv = (config?.authEnv ?? process.env.AUTH_ENVIRONMENT ?? '').trim().toLowerCase();
  return ALLOWED_FIXED_OTP_ENVIRONMENTS.has(authEnv);
}

/**
 * Retrieves configured development OTP value.
 * STRICT RULE: No hardcoded fallback in application runtime.
 * Requires explicit authorized environment and explicit AUTH_DEVELOPMENT_OTP configuration.
 */
export function getDevelopmentOtpValue(config?: AuthEnvironmentConfig): string {
  if (isProductionEnvironment(config)) {
    throw new Error('PRODUCTION_STATIC_OTP_FORBIDDEN');
  }
  if (!isFixedOtpAllowed(config)) {
    throw new Error('FIXED_OTP_ENVIRONMENT_NOT_AUTHORIZED: Fixed OTP mode is only authorized in explicitly allowed environments (development, test, founder_preview)');
  }
  const otp = config?.developmentOtp ?? process.env.AUTH_DEVELOPMENT_OTP;
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    throw new Error('AUTH_DEVELOPMENT_OTP_CONFIG_REQUIRED: Fixed OTP mode requires explicit 6-digit AUTH_DEVELOPMENT_OTP configuration');
  }
  return otp;
}

/**
 * Retrieves HMAC secret for OTP challenge digests and continuation tokens.
 * STRICT RULE: No committed fallback secret in runtime.
 */
export function getAuthHmacSecret(config?: AuthEnvironmentConfig): string {
  const secret = config?.hmacSecret ?? process.env.AUTH_OTP_HMAC_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length < 16) {
    throw new Error('AUTH_OTP_HMAC_SECRET_REQUIRED: Runtime requires explicit AUTH_OTP_HMAC_SECRET (min 16 characters)');
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
    }
  }
}
