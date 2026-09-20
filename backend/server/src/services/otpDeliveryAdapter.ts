/**
 * Sola Vacation Rentals — Auth V2 Provider-Neutral OTP Delivery Abstraction
 * Location: backend/server/src/services/otpDeliveryAdapter.ts
 * 
 * Invariants:
 *   1. Provider-neutral interface for SMS and Email delivery.
 *   2. Development providerless adapters allow testing without external network or provider credentials.
 *   3. Providerless adapters FAIL CLOSED in production environments.
 *   4. OTP is never leaked in log messages, telemetry, or return payloads.
 *   5. Real SMS/Email providers remain DEFERRED_BY_FOUNDER.
 */

import { isProductionEnvironment, type AuthEnvironmentConfig } from './otpPolicy.js';

export interface DeliveryResult {
  success: boolean;
  provider: string;
  messageId: string;
  error?: string;
}

export interface IOtpDeliveryAdapter {
  readonly name: string;
  readonly method: 'PHONE' | 'EMAIL';
  sendOtp(recipient: string, otp: string, config?: AuthEnvironmentConfig): Promise<DeliveryResult>;
}

export class ProviderlessDevelopmentSmsAdapter implements IOtpDeliveryAdapter {
  readonly name = 'PROVIDERLESS_DEV_SMS';
  readonly method = 'PHONE' as const;

  async sendOtp(recipient: string, _otp: string, config?: AuthEnvironmentConfig): Promise<DeliveryResult> {
    if (isProductionEnvironment(config)) {
      throw new Error('PRODUCTION_PROVIDERLESS_ADAPTER_FORBIDDEN: Real SMS provider required in production');
    }

    // In development mode: simulated delivery without network calls or OTP leakage
    const messageId = `dev_sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      provider: this.name,
      messageId,
    };
  }
}

export class ProviderlessDevelopmentEmailAdapter implements IOtpDeliveryAdapter {
  readonly name = 'PROVIDERLESS_DEV_EMAIL';
  readonly method = 'EMAIL' as const;

  async sendOtp(recipient: string, _otp: string, config?: AuthEnvironmentConfig): Promise<DeliveryResult> {
    if (isProductionEnvironment(config)) {
      throw new Error('PRODUCTION_PROVIDERLESS_ADAPTER_FORBIDDEN: Real Email provider required in production');
    }

    // In development mode: simulated delivery without network calls or OTP leakage
    const messageId = `dev_email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      provider: this.name,
      messageId,
    };
  }
}
