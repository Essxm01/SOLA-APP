/**
 * Sola Vacation Rentals — SMS Provider Abstraction Interface & Development Mock
 * Location: server/src/services/smsProvider.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 * 
 * Scope Isolation:
 * - Real SMS Gateways (Twilio / Infobip) are EXPLICITLY OUT OF SCOPE for Phase 7.
 * - Provides clean ISmsProvider interface + Dev/Mock implementation for development & testing.
 */

export interface SmsDispatchPayload {
  phone: string;
  message: string;
  otpCode: string;
}

export interface ISmsProvider {
  sendOtpSms(payload: SmsDispatchPayload): Promise<{ success: boolean; providerMessageId: string }>;
}

export class MockSmsProvider implements ISmsProvider {
  async sendOtpSms(payload: SmsDispatchPayload): Promise<{ success: boolean; providerMessageId: string }> {
    // Development/Mock implementation logging to console / test harness
    const providerMessageId = `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      success: true,
      providerMessageId,
    };
  }
}
