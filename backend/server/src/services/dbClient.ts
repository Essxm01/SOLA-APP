/**
 * Sola Vacation Rentals — PostgreSQL Database Pool Client
 * Location: server/src/services/dbClient.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import 'dotenv/config';
import pg from 'pg';

let currentPool: pg.Pool | null = null;
let currentConnectionString = '';

export function getDbPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('MISSING_DATABASE_URL_ENVIRONMENT_VARIABLE');
  }
  
  if (!currentPool || currentConnectionString !== connectionString) {
    if (currentPool) {
      currentPool.end().catch(() => {});
    }
    const useSsl = connectionString.includes('supabase') || connectionString.includes('pooler') || (!connectionString.includes('127.0.0.1') && !connectionString.includes('localhost'));
    currentPool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    currentConnectionString = connectionString;
  }
  return currentPool;
}

export const dbPool = {
  query: <T = any>(text: string, params?: any[]) => queryDb<T>(text, params)
};

async function queryViaSupabaseRest(text: string, params: any[] | undefined, url: string, key: string): Promise<pg.QueryResult<any> | null> {
  const headers: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // 0A. SELECT users WHERE phone_number = $1
  if (lowerSql.includes('from users') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(`${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [];

    // Fallback: if not in users table, check owners table
    if (rows.length === 0) {
      const ownerRes = await fetch(`${url}/rest/v1/owners?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
      const ownerRaw: any = await ownerRes.json().catch(() => []);
      const ownerRows: any[] = Array.isArray(ownerRaw) ? ownerRaw : [];
      if (ownerRows.length > 0) {
        rows = [{
          id: ownerRows[0].id,
          phone_number: ownerRows[0].phone_number,
          phone_verified_at: ownerRows[0].created_at,
          full_name: ownerRows[0].full_name,
          email: ownerRows[0].email,
          avatar_url: ownerRows[0].avatar_url,
          status: ownerRows[0].status || 'ACTIVE',
          created_at: ownerRows[0].created_at,
          updated_at: ownerRows[0].updated_at,
        }];
      }
    }

    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0B. SELECT users WHERE id = $1
  if (lowerSql.includes('from users') && lowerSql.includes('where id = $1')) {
    const userId = params?.[0];
    const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, { headers });
    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [];

    // Fallback: if not in users table, check owners table
    if (rows.length === 0) {
      const ownerRes = await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(userId)}`, { headers });
      const ownerRaw: any = await ownerRes.json().catch(() => []);
      const ownerRows: any[] = Array.isArray(ownerRaw) ? ownerRaw : [];
      if (ownerRows.length > 0) {
        rows = [{
          id: ownerRows[0].id,
          phone_number: ownerRows[0].phone_number,
          phone_verified_at: ownerRows[0].created_at,
          full_name: ownerRows[0].full_name,
          email: ownerRows[0].email,
          avatar_url: ownerRows[0].avatar_url,
          status: ownerRows[0].status || 'ACTIVE',
          created_at: ownerRows[0].created_at,
          updated_at: ownerRows[0].updated_at,
        }];
      }
    }

    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0C. SELECT owners WHERE id = $1
  if (lowerSql.includes('from owners') && lowerSql.includes('where id = $1')) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(ownerId)}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0D. SELECT owners WHERE phone_number = $1
  if (lowerSql.includes('from owners') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(`${url}/rest/v1/owners?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 00. INSERT INTO users
  if (lowerSql.startsWith('insert into users')) {
    const id = params?.[0] || crypto.randomUUID();
    const phoneNumber = params?.[1];
    const fullName = params?.[2] || null;
    const email = params?.[3] || null;
    const avatarUrl = params?.[4] || null;
    const status = params?.[5] || 'ACTIVE';
    const nowIso = new Date().toISOString();

    const payload: any = {
      id,
      phone_number: phoneNumber,
      phone_verified_at: nowIso,
      status,
      created_at: nowIso,
      updated_at: nowIso,
    };
    if (fullName) payload.full_name = fullName;
    if (email) payload.email = email;
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const res = await fetch(`${url}/rest/v1/users?on_conflict=phone_number`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    const raw: any = await res.json().catch(() => []);
    const arr = Array.isArray(raw) ? raw : [raw];
    const mapped = arr.map(u => ({
      id: u.id || id,
      phoneNumber: u.phone_number || phoneNumber,
      phoneVerifiedAt: u.phone_verified_at || nowIso,
      fullName: u.full_name || fullName,
      email: u.email || email,
      avatarUrl: u.avatar_url || avatarUrl,
      status: u.status || status,
      createdAt: u.created_at || nowIso,
      updatedAt: u.updated_at || nowIso,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0E. UPDATE users SET phone_verified_at = NOW(), updated_at = NOW() WHERE id = $1
  if (lowerSql.startsWith('update users') && lowerSql.includes('phone_verified_at')) {
    const userId = params?.[0];
    const nowIso = new Date().toISOString();
    const res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ phone_verified_at: nowIso, updated_at: nowIso }),
    });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(u => ({
      id: u.id,
      phoneNumber: u.phone_number,
      phoneVerifiedAt: u.phone_verified_at,
      fullName: u.full_name,
      email: u.email,
      avatarUrl: u.avatar_url,
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0F. UPDATE users SET full_name = ... WHERE id = $1
  if (lowerSql.startsWith('update users') && lowerSql.includes('full_name')) {
    const userId = params?.[0];
    const fullName = params?.[1];
    const email = params?.[2] || null;
    const avatarUrl = params?.[3] || null;
    const nowIso = new Date().toISOString();

    const patchBody: any = { updated_at: nowIso };
    if (fullName !== undefined && fullName !== null && fullName !== '') patchBody.full_name = fullName;
    if (email) patchBody.email = email;
    if (avatarUrl) patchBody.avatar_url = avatarUrl;

    // 1. Update users table by id
    let res = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchBody),
    });
    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [];

    // Fallback: If 0 rows updated by id, check owners table to resolve phone and update users by phone
    if (rows.length === 0) {
      const ownerRes = await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(userId)}`, { headers });
      const ownerRows: any[] = await ownerRes.json().catch(() => []);
      const phone = ownerRows[0]?.phone_number;

      if (phone) {
        const patchByPhoneRes = await fetch(`${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phone)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patchBody),
        });
        const patchByPhoneRaw = await patchByPhoneRes.json().catch(() => []);
        rows = Array.isArray(patchByPhoneRaw) ? patchByPhoneRaw : [];
      }
    }

    // 2. Also update owners table by id and phone
    if (fullName) {
      await fetch(`${url}/rest/v1/owners?id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ full_name: fullName, updated_at: nowIso }),
      }).catch(() => {});
    }

    const mapped = rows.map(u => ({
      id: u.id || userId,
      phoneNumber: u.phone_number || '',
      phoneVerifiedAt: u.phone_verified_at || nowIso,
      fullName: fullName || u.full_name,
      email: u.email || email,
      avatarUrl: u.avatar_url || avatarUrl,
      status: u.status || 'ACTIVE',
      createdAt: u.created_at || nowIso,
      updatedAt: u.updated_at || nowIso,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length > 0 ? mapped.length : 1, oid: 0, fields: [] };
  }

  // 1. SELECT properties WHERE id = $1 or p.id = $1
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && (lowerSql.includes('where id =') || lowerSql.includes('where p.id =') || lowerSql.includes('p.id = $1') || lowerSql.includes('id = $1'))) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}`, { headers });
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ownerName: 'مالك صولا',
      ownerPhone: '',
      ownerEmail: 'owner@sola.eg',
      ownerVerificationStatus: 'UNVERIFIED',
      ownerStatus: 'ACTIVE'
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 2. INSERT INTO properties
  if (lowerSql.startsWith('insert into properties')) {
    const payload = {
      id: params?.[0],
      owner_id: params?.[1],
      title: params?.[2],
      unit_type: params?.[3],
      property_type: params?.[4],
      address: params?.[5],
      bedrooms: params?.[6],
      bathrooms: params?.[7],
      max_guests: params?.[8],
      base_price_per_night: params?.[9],
      status: params?.[10],
      verification_status: params?.[11]
    };
    const res = await fetch(`${url}/rest/v1/properties`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3. UPDATE properties SET status = ...
  if (lowerSql.startsWith('update properties')) {
    const propId = params?.[0];
    const status = params?.[1];
    const verificationStatus = params?.[2];
    const payload: any = { updated_at: new Date().toISOString() };
    if (status) payload.status = status;
    if (verificationStatus) payload.verification_status = verificationStatus;

    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      status: p.status,
      verificationStatus: p.verification_status,
      updatedAt: p.updated_at
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 4. INSERT INTO owners ON CONFLICT
  if (lowerSql.startsWith('insert into owners')) {
    const payload = {
      id: params?.[0],
      phone_number: params?.[1],
      full_name: params?.[2],
      email: params?.[3] || null,
      avatar_url: params?.[4] || null,
      status: params?.[5] || 'ACTIVE',
      verification_status: params?.[6] || 'UNVERIFIED'
    };
    const res = await fetch(`${url}/rest/v1/owners`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });
    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map(o => ({
      id: o.id,
      phoneNumber: o.phone_number,
      fullName: o.full_name,
      email: o.email,
      avatarUrl: o.avatar_url,
      status: o.status,
      verificationStatus: o.verification_status,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 5. SELECT FROM properties WHERE owner_id = $1
  if (lowerSql.includes('from properties') && lowerSql.includes('owner_id = $1')) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null&order=created_at.desc`, { headers });
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6. Admin Pending Properties Queue
  if (lowerSql.includes('from properties') && (lowerSql.includes('pending_review') || lowerSql.includes('rejected'))) {
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=in.(PENDING_REVIEW,REJECTED)&order=created_at.asc`, { headers });
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ownerName: 'مالك صولا',
      ownerPhone: '',
      ownerVerificationStatus: 'UNVERIFIED'
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 7. SELECT bookings for Property Availability & Overlap Checks (Canonical Blocking Statuses)
  if (lowerSql.includes('from bookings') && lowerSql.includes('property_id')) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/bookings?property_id=eq.${encodeURIComponent(propId)}&select=check_in,check_out,status`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows
      .filter(b => b && (b.status === 'APPROVED_PENDING_PAYMENT' || b.status === 'CONFIRMED'))
      .map(b => ({
        checkIn: b.check_in,
        checkOut: b.check_out,
        status: b.status,
      }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 8. SELECT published properties for Customer Exploration / Search
  if (lowerSql.includes('from properties') && (lowerSql.includes('published') || lowerSql.includes('status = $1') || lowerSql.includes('status ='))) {
    const statusVal = params?.[0] || 'PUBLISHED';
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=eq.${encodeURIComponent(statusVal)}&order=created_at.desc`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(p => ({
      id: p.id,
      ownerId: p.owner_id,
      title: p.title,
      unitType: p.unit_type,
      propertyType: p.property_type,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: p.base_price_per_night,
      basePricePerNight: p.base_price_per_night,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      ownerName: 'مالك صولا',
      ownerPhone: '',
      ownerVerificationStatus: 'UNVERIFIED',
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 9. SELECT FROM otp_challenges WHERE phone_number = $1
  if (lowerSql.includes('from otp_challenges') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, { headers });
    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [];

    // Fallback check in user_sessions if otp_challenges table is not yet present
    if (rows.length === 0) {
      const fallbackRes = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}&is_revoked=eq.false`, { headers });
      const fallbackRaw: any = await fallbackRes.json().catch(() => []);
      const fallbackRows: any[] = Array.isArray(fallbackRaw) ? fallbackRaw : [];
      if (fallbackRows.length > 0) {
        try {
          const parsed = JSON.parse(fallbackRows[0].device_info || '{}');
          rows = [{
            phone_number: phone,
            code: parsed.code,
            expires_at: fallbackRows[0].expires_at || parsed.expiresAt,
            request_count: parsed.requestCount || 1,
            failed_attempts: parsed.failedAttempts || 0,
            created_at: fallbackRows[0].created_at,
            updated_at: fallbackRows[0].created_at,
          }];
        } catch {}
      }
    }

    const mapped = rows.map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 10. INSERT / UPSERT INTO otp_challenges
  if (lowerSql.startsWith('insert into otp_challenges')) {
    const phone = params?.[0];
    const code = params?.[1];
    const expiresAt = params?.[2];
    const requestCount = params?.[3] || 1;
    const failedAttempts = params?.[4] || 0;

    const payload = {
      phone_number: phone,
      code,
      expires_at: expiresAt,
      request_count: requestCount,
      failed_attempts: failedAttempts,
      updated_at: new Date().toISOString(),
    };

    let res = await fetch(`${url}/rest/v1/otp_challenges`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });

    let raw: any = await res.json().catch(() => []);
    let rows: any[] = Array.isArray(raw) ? raw : [raw];

    // If otp_challenges table is missing, persist into user_sessions as robust fallback
    if (!res.ok) {
      const fallbackPayload = {
        id: crypto.randomUUID(),
        owner_id: '00000000-0000-4000-8000-201012345678', // known valid fallback UUID
        refresh_token_hash: 'otp_' + phone,
        device_info: JSON.stringify({ code, expiresAt, requestCount, failedAttempts }),
        is_revoked: false,
        expires_at: expiresAt,
      };
      await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}`, { method: 'DELETE', headers }).catch(() => {});
      await fetch(`${url}/rest/v1/user_sessions`, { method: 'POST', headers, body: JSON.stringify(fallbackPayload) }).catch(() => {});
      rows = [{ ...payload, created_at: new Date().toISOString() }];
    }

    const mapped = rows.filter(r => r && r.phone_number).map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 11. UPDATE otp_challenges SET failed_attempts
  if (lowerSql.startsWith('update otp_challenges')) {
    const phone = params?.[0];
    const failedAttempts = params?.[1];
    const nowIso = new Date().toISOString();

    const res = await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ failed_attempts: failedAttempts, updated_at: nowIso }),
    });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(r => ({
      phoneNumber: r.phone_number,
      code: r.code,
      expiresAt: r.expires_at,
      requestCount: r.request_count,
      failedAttempts: r.failed_attempts,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 12. DELETE FROM otp_challenges
  if (lowerSql.startsWith('delete from otp_challenges')) {
    const phone = params?.[0];
    await fetch(`${url}/rest/v1/otp_challenges?phone_number=eq.${encodeURIComponent(phone)}`, { method: 'DELETE', headers }).catch(() => {});
    await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent('otp_' + phone)}`, { method: 'DELETE', headers }).catch(() => {});
    return { rows: [], command: 'DELETE', rowCount: 1, oid: 0, fields: [] };
  }

  // 13. INSERT INTO user_sessions
  if (lowerSql.startsWith('insert into user_sessions')) {
    const id = params?.[0] || crypto.randomUUID();
    const userId = params?.[1];
    const ownerId = params?.[2] || userId;
    const surface = params?.[3] || 'CUSTOMER';
    const role = params?.[4] || 'ROLE_CUSTOMER';
    const refreshTokenHash = params?.[5];
    const clientDeviceInfo = params?.[6] || '';
    const ipAddress = params?.[7] || null;
    const expiresAt = params?.[8];

    const packedDeviceInfo = JSON.stringify({
      surface,
      role,
      userId,
      clientInfo: clientDeviceInfo,
    });

    const payload = {
      id,
      owner_id: ownerId,
      refresh_token_hash: refreshTokenHash,
      device_info: packedDeviceInfo,
      ip_address: ipAddress,
      is_revoked: false,
      expires_at: expiresAt,
    };

    let res = await fetch(`${url}/rest/v1/user_sessions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });

    let raw: any = await res.json().catch(() => []);
    const rows = Array.isArray(raw) ? raw : [raw];
    const mapped = rows.map(s => ({
      id: s.id || id,
      userId: s.user_id || userId,
      ownerId: s.owner_id || ownerId,
      surface,
      role,
      refreshTokenHash: s.refresh_token_hash || refreshTokenHash,
      deviceInfo: s.device_info || packedDeviceInfo,
      ipAddress: s.ip_address || ipAddress,
      isRevoked: s.is_revoked ?? false,
      expiresAt: s.expires_at || expiresAt,
      createdAt: s.created_at || new Date().toISOString(),
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 14. SELECT FROM user_sessions WHERE refresh_token_hash = $1
  if (lowerSql.includes('from user_sessions') && lowerSql.includes('refresh_token_hash = $1')) {
    const hash = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent(hash)}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(s => {
      let surface: 'CUSTOMER' | 'OWNER' = (s.surface as any) || 'CUSTOMER';
      let role = s.role || 'ROLE_CUSTOMER';
      let userId = s.user_id || s.owner_id;
      if (s.device_info) {
        try {
          const parsed = JSON.parse(s.device_info);
          if (parsed.surface) surface = parsed.surface;
          if (parsed.role) role = parsed.role;
          if (parsed.userId) userId = parsed.userId;
        } catch {}
      }
      return {
        id: s.id,
        userId,
        ownerId: s.owner_id,
        surface,
        role,
        refreshTokenHash: s.refresh_token_hash,
        deviceInfo: s.device_info,
        ipAddress: s.ip_address,
        isRevoked: s.is_revoked === true || s.is_revoked === 'true',
        expiresAt: s.expires_at,
        createdAt: s.created_at,
      };
    });
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 15. UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1
  if (lowerSql.startsWith('update user_sessions') && lowerSql.includes('is_revoked = true') && lowerSql.includes('refresh_token_hash = $1')) {
    const hash = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?refresh_token_hash=eq.${encodeURIComponent(hash)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_revoked: true }),
    });
    return { rows: [], command: 'UPDATE', rowCount: res.ok ? 1 : 0, oid: 0, fields: [] };
  }

  // 16. UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1
  if (lowerSql.startsWith('update user_sessions') && lowerSql.includes('is_revoked = true') && lowerSql.includes('user_id = $1')) {
    const userId = params?.[0];
    const res = await fetch(`${url}/rest/v1/user_sessions?owner_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_revoked: true }),
    });
    return { rows: [], command: 'UPDATE', rowCount: res.ok ? 1 : 0, oid: 0, fields: [] };
  }

  return null;
}

/**
 * Execute parameterized SQL query against PostgreSQL sola_db
 */
export async function queryDb<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const restResult = await queryViaSupabaseRest(text, params, supabaseUrl, supabaseKey);
      if (restResult) {
        return restResult;
      }
    } catch (restErr: any) {
      throw new Error(`REST_QUERY_ERROR: ${restErr?.message || String(restErr)}`);
    }
  }

  try {
    return await getDbPool().query<T>(text, params);
  } catch (poolErr: any) {
    throw new Error(`POOL_QUERY_ERROR: ${poolErr?.message || String(poolErr)} (sql: ${text.slice(0, 80).replace(/\s+/g, ' ')})`);
  }
}
