/**
 * P2.3 Owner Core Contracts & DTOs
 * Location: backend/server/src/contracts/ownerCore.ts
 */

export interface OwnerProfileDto {
  id: string;
  phoneNumber: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  verificationStatus: string;
  ownerOnboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toOwnerProfileDto(raw: unknown): OwnerProfileDto {
  const row = raw as Record<string, unknown>;
  if (!row || typeof row !== 'object') throw new Error('MALFORMED_OWNER_PROFILE');
  if (typeof row.id !== 'string' || row.id.trim() === '' || typeof row.phoneNumber !== 'string' || row.phoneNumber.trim() === '') {
    throw new Error('MALFORMED_OWNER_PROFILE: missing or invalid id/phoneNumber');
  }
  if (row.status !== undefined && (typeof row.status !== 'string' || row.status.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid status');
  }
  if (row.verificationStatus !== undefined && (typeof row.verificationStatus !== 'string' || row.verificationStatus.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid verificationStatus');
  }
  if (row.createdAt !== undefined && (typeof row.createdAt !== 'string' || row.createdAt.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid createdAt');
  }
  if (row.updatedAt !== undefined && (typeof row.updatedAt !== 'string' || row.updatedAt.trim() === '')) {
    throw new Error('MALFORMED_OWNER_PROFILE: invalid updatedAt');
  }

  const nowIso = new Date().toISOString();
  return {
    id: row.id as string,
    phoneNumber: row.phoneNumber as string,
    fullName: typeof row.fullName === 'string' ? row.fullName : null,
    email: typeof row.email === 'string' ? row.email : null,
    avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl : null,
    status: (row.status as string) || 'ACTIVE',
    verificationStatus: (row.verificationStatus as string) || 'UNVERIFIED',
    ownerOnboardingCompletedAt: typeof row.ownerOnboardingCompletedAt === 'string' ? row.ownerOnboardingCompletedAt : null,
    createdAt: (row.createdAt as string) || (row.created_at as string) || nowIso,
    updatedAt: (row.updatedAt as string) || (row.updated_at as string) || nowIso,
  };
}
