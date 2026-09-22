import fs from 'node:fs';

function replaceOnce(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue);
  if (first < 0) throw new Error(`${label}: anchor not found`);
  if (source.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`${label}: anchor not unique`);
  return source.slice(0, first) + newValue + source.slice(first + oldValue.length);
}

const path = 'backend/server/src/services/authV2Service.ts';
let source = fs.readFileSync(path, 'utf8');

source = replaceOnce(
  source,
  "    this.emailCustomerRegistration = options?.emailCustomerRegistration ?? createCanonicalEmailCustomer;",
  `    this.emailCustomerRegistration = options?.emailCustomerRegistration ?? (options?.userRepo
      ? async (input) => {
          // Isolated repository fallback for unit tests only. Runtime AuthV2Service
          // uses createCanonicalEmailCustomer(), which is backed by migration 032's
          // database-atomic RPC. No fake phone is generated in either path.
          const before = await this.userIdentifierRepo.getByIdentifier('EMAIL', input.email);
          if (before) {
            const existingUser = await this.userRepo.getById(before.userId);
            if (!existingUser) throw new Error('EMAIL_IDENTIFIER_USER_MISSING');
            return { user: existingUser, created: false };
          }

          const candidate = await this.userRepo.create({
            id: input.userId,
            phoneNumber: null as unknown as string,
            email: input.email,
            fullName: input.fullName,
            status: 'ACTIVE',
          });
          const candidateId = candidate?.id;
          if (!candidateId) throw new Error('EMAIL_CUSTOMER_REGISTRATION_USER_MALFORMED');
          try {
            await this.userIdentifierRepo.create({
              userId: candidateId,
              identifierType: 'EMAIL',
              normalizedValue: input.email,
              verifiedAt: input.verifiedAt,
            });
            return { user: candidate, created: true };
          } catch (error) {
            const winner = await this.userIdentifierRepo.getByIdentifier('EMAIL', input.email);
            if (!winner) throw error;
            const winnerUser = await this.userRepo.getById(winner.userId);
            if (!winnerUser) throw error;
            return { user: winnerUser, created: false };
          }
        }
      : createCanonicalEmailCustomer);`,
  'isolated email registration fallback',
);

fs.writeFileSync(path, source);
console.log('Applied bounded AuthV2Service isolated email-registration fallback');
