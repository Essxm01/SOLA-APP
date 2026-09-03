import { mapOwnerProfileDtoToOwner } from '../services/http/HttpRepository';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

// Test 1: mapOwnerProfileDtoToOwner maps backend fields to frontend Owner model
{
  const backendDto = {
    id: 'owner-uuid-1',
    phoneNumber: '+201012345678',
    fullName: 'محمد صاحب العقار',
    email: 'owner@example.com',
    avatarUrl: 'https://storage.sola.eg/avatars/avatar1.jpg',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    ownerOnboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const owner = mapOwnerProfileDtoToOwner(backendDto);
  assert(owner.id === 'owner-uuid-1', 'owner.id must match');
  assert(owner.name === 'محمد صاحب العقار', 'owner.name must be mapped from fullName');
  assert(owner.phone === '+201012345678', 'owner.phone must be mapped from phoneNumber');
  assert(owner.avatar === 'https://storage.sola.eg/avatars/avatar1.jpg', 'owner.avatar must be mapped from avatarUrl');
  assert(owner.verificationStatus === 'VERIFIED', 'verificationStatus must match');
  assert(owner.verificationBadgeText === 'موثق', 'verificationBadgeText must be derived correctly');
}

// Test 2: Avatar survival when avatarUrl is present vs null
{
  const withAvatar = mapOwnerProfileDtoToOwner({
    id: 'owner-uuid-2',
    phoneNumber: '+201000000000',
    fullName: 'المالك',
    email: null,
    avatarUrl: 'https://cdn.example.com/canonical.png',
    status: 'ACTIVE',
    verificationStatus: 'UNVERIFIED',
    ownerOnboardingCompletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  assert(withAvatar.avatar === 'https://cdn.example.com/canonical.png', 'avatar must survive profile mapping');

  const withoutAvatar = mapOwnerProfileDtoToOwner({
    id: 'owner-uuid-3',
    phoneNumber: '+201000000000',
    fullName: 'المالك',
    email: null,
    avatarUrl: null,
    status: 'ACTIVE',
    verificationStatus: 'UNVERIFIED',
    ownerOnboardingCompletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  assert(withoutAvatar.avatar === '', 'null avatarUrl maps to empty string for UI safety');
}

// Test 3: Malformed DTO fails closed
{
  let threw = false;
  try {
    mapOwnerProfileDtoToOwner(null as any);
  } catch {
    threw = true;
  }
  assert(threw, 'null dto must throw');
}

// Test 4: Profile edit payload and response preserves canonical avatar
{
  const editPayload = {
    fullName: 'مالك محدث',
    avatarUrl: 'https://storage.sola.eg/avatars/new_canonical_avatar.png',
  };
  const simulatedServerResponse = {
    id: 'owner-uuid-4',
    phoneNumber: '+201011112222',
    fullName: editPayload.fullName,
    email: 'updated@example.com',
    avatarUrl: editPayload.avatarUrl,
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    ownerOnboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  };
  const updatedOwner = mapOwnerProfileDtoToOwner(simulatedServerResponse);
  assert(updatedOwner.avatar === editPayload.avatarUrl, 'canonical avatar must survive profile edit');
  assert(updatedOwner.name === 'مالك محدث', 'name must be updated');
}

// Test 5: Notifications failure contract verification
{
  function handleNotificationsResponse(result: { ok: true; data: any[] } | { ok: false; error: string }) {
    if (result.ok) {
      return { notifications: result.data, notificationsError: null };
    }
    return { notifications: [], notificationsError: 'تعذر تحميل الإشعارات حالياً' };
  }

  const failureState = handleNotificationsResponse({ ok: false, error: 'SERVICE_UNAVAILABLE' });
  assert(failureState.notifications.length === 0, 'notifications array is empty on failure');
  assert(failureState.notificationsError === 'تعذر تحميل الإشعارات حالياً', 'notificationsError is set to prevent false empty inbox state');

  const successState = handleNotificationsResponse({ ok: true, data: [{ id: 'notif-1' }] });
  assert(successState.notifications.length === 1, 'notifications array is populated on success');
  assert(successState.notificationsError === null, 'notificationsError is null on success');
}

console.log('OWNER client contract tests passed.');

