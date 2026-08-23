import type { Owner } from '../types';

type CanonicalOwner = Partial<Owner> & {
  id?: string;
  phoneNumber?: string;
  phone?: string;
};

type OwnerLoginResponse = {
  tokens?: { accessToken?: string; refreshToken?: string };
  accessToken?: string;
  refreshToken?: string;
  isOwner?: boolean;
  owner?: CanonicalOwner | null;
  ownerOnboardingRequired?: boolean;
  createdOwner?: boolean;
  data?: OwnerLoginResponse;
};

export const getOwnerDraftStorageKey = (ownerId: string) => `sola_owner_property_draft:${ownerId}`;

export const getCanonicalOwnerPhone = (owner: CanonicalOwner | null | undefined) =>
  owner?.phoneNumber || owner?.phone || '';

export const unwrapOwnerLoginResponse = (response: OwnerLoginResponse) => response.data || response;

export const isValidOwnerLogin = (response: OwnerLoginResponse) => {
  const result = unwrapOwnerLoginResponse(response);
  const accessToken = result.tokens?.accessToken || result.accessToken;

  return Boolean(
    accessToken &&
    result.isOwner === true &&
    result.owner?.id &&
    result.ownerOnboardingRequired !== true,
  );
};
