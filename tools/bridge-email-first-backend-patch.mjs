import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`${label}: anchor not found`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`${label}: anchor not unique`);
  return source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}
function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`${label}: start anchor not found`);
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start anchor not unique`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`${label}: end anchor not found`);
  return source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

const path = 'backend/server/src/services/authV2Service.ts';
let source = read(path);

source = replaceOnce(
  source,
  "import type { AuthSessionTokens } from '../types/server.js';",
  "import type { AuthSessionTokens } from '../types/server.js';\nimport { createCanonicalEmailCustomer, type EmailCustomerRegistrationInput, type EmailCustomerRegistrationResult } from './emailCustomerRegistration.js';",
  'auth service email registration import',
);

source = replaceOnce(
  source,
  "  private emailAdapter: IOtpDeliveryAdapter;\n  private config?: AuthEnvironmentConfig;",
  "  private emailAdapter: IOtpDeliveryAdapter;\n  private config?: AuthEnvironmentConfig;\n  private emailCustomerRegistration: (input: EmailCustomerRegistrationInput) => Promise<EmailCustomerRegistrationResult>;",
  'auth service registration property',
);

source = replaceOnce(
  source,
  "    emailAdapter?: IOtpDeliveryAdapter;\n    config?: AuthEnvironmentConfig;",
  "    emailAdapter?: IOtpDeliveryAdapter;\n    emailCustomerRegistration?: (input: EmailCustomerRegistrationInput) => Promise<EmailCustomerRegistrationResult>;\n    config?: AuthEnvironmentConfig;",
  'auth service constructor option',
);

source = replaceOnce(
  source,
  "    this.emailAdapter = options?.emailAdapter ?? new ProviderlessDevelopmentEmailAdapter();\n    this.config = options?.config;",
  "    this.emailAdapter = options?.emailAdapter ?? new ProviderlessDevelopmentEmailAdapter();\n    this.emailCustomerRegistration = options?.emailCustomerRegistration ?? createCanonicalEmailCustomer;\n    this.config = options?.config;",
  'auth service registration assignment',
);

const start = "  /**\n   * 5. Complete Account Creation (Screen 10 Backend Support)";
const end = "  /**\n   * Issues customer session with SHA-256 canonical refresh token hash and awaited persistence.";
const replacement = `  /**
   * 5. Complete Account Creation (Screen 10 Backend Support)
   * Enforces:
   *   - Single-use continuation token (replay rejected via challenge consumption).
   *   - PHONE and EMAIL are equal verified Customer account-creation methods.
   *   - Email-only creation uses the migration-032 atomic user + identifier boundary.
   *   - Requires FULL NAME ONLY for Customer onboarding.
   */
  async completeAccountCreation(input: {
    continuationToken: string;
    fullName: string;
    deviceInfo?: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; user: any; tokens: AuthSessionTokens }> {
    if (!input.fullName || typeof input.fullName !== 'string' || input.fullName.trim().length < 2) {
      throw new Error('INVALID_FULL_NAME: Full name must be at least 2 characters');
    }

    const payload = AuthV2ContinuationService.verifyToken(input.continuationToken, this.config);

    // Atomically claim the verified challenge BEFORE any account/profile mutation.
    const challenge = await this.challengeRepo.markConsumed(payload.challengeId);
    if (challenge.normalizedValue !== payload.normalizedValue || challenge.method !== payload.method) {
      throw new Error('CHALLENGE_BINDING_MISMATCH: Continuation token does not match challenge identity');
    }

    // Registration may have completed between OTP verification and Screen 10.
    const existing = await this.userIdentifierRepo.getByIdentifier(payload.method, payload.normalizedValue);
    if (existing) {
      const existingUser = await this.userRepo.getById(existing.userId);
      if (existingUser) {
        const tokens = await this.issueCustomerSession(existingUser.id, input.deviceInfo, input.ipAddress);
        return { success: true, user: existingUser, tokens };
      }
    }

    const cleanName = input.fullName.trim().replace(/\\s+/g, ' ');

    if (payload.method === 'EMAIL') {
      // The database RPC serializes the exact normalized email, re-checks the
      // canonical identifier owner, and creates users + user_identifiers in one
      // transaction. A concurrent winner is returned instead of duplicated.
      const registration = await this.emailCustomerRegistration({
        userId: randomUUID(),
        email: payload.normalizedValue,
        fullName: cleanName,
        verifiedAt: payload.verifiedAt,
      });
      const canonicalUserId = registration.user?.id;
      if (!canonicalUserId) throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_MALFORMED');
      const tokens = await this.issueCustomerSession(canonicalUserId, input.deviceInfo, input.ipAddress);
      return { success: true, user: registration.user, tokens };
    }

    // Existing PHONE path remains unchanged: no fake phone, verified phone is
    // persisted canonically and then represented as an additive identifier.
    const userId = randomUUID();
    const phoneValue = payload.normalizedValue;
    const newUser = await this.userRepo.create({
      id: userId,
      phoneNumber: phoneValue,
      fullName: cleanName,
      status: 'ACTIVE',
    });

    const canonicalUserId = newUser?.id || userId;
    await this.userRepo.updatePhoneVerified(canonicalUserId);
    await this.userIdentifierRepo.create({
      userId: canonicalUserId,
      identifierType: 'PHONE',
      normalizedValue: payload.normalizedValue,
      verifiedAt: payload.verifiedAt,
    });

    const tokens = await this.issueCustomerSession(canonicalUserId, input.deviceInfo, input.ipAddress);
    return {
      success: true,
      user: newUser || { id: canonicalUserId, phoneNumber: phoneValue, fullName: cleanName },
      tokens,
    };
  }

`;
source = replaceBetween(source, start, end, replacement, 'auth service completeAccountCreation');

write(path, source);
console.log('Applied bounded AuthV2Service email-first patch');
