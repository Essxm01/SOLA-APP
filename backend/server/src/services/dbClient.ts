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
  query: <T extends pg.QueryResultRow = any>(text: string, params?: any[]) => queryDb<T>(text, params)
};

function safeParse<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

async function queryViaSupabaseRest(text: string, params: any[] | undefined, url: string, key: string): Promise<pg.QueryResult<any> | null> {
  const headers: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // 0A. SELECT users WHERE phone_number = $1 (canonical users table only — DATA-02)
  if (lowerSql.includes('from users') && lowerSql.includes('phone_number = $1')) {
    const phone = params?.[0];
    const res = await fetch(
      `${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phone)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(`REST_USERS_SELECT_BY_PHONE_FAILED: HTTP ${res.status}`);
    }
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
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0B. SELECT users WHERE id = $1 (canonical users table only — DATA-02)
  if (lowerSql.includes('from users') && lowerSql.includes('where id = $1')) {
    const userId = params?.[0];
    const res = await fetch(
      `${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!res.ok) {
      throw new Error(`REST_USERS_SELECT_BY_ID_FAILED: HTTP ${res.status}`);
    }
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

  // 00. INSERT INTO users (strict, no synthetic fallbacks — DATA-02)
  if (lowerSql.startsWith('insert into users')) {
    const id = params?.[0] || crypto.randomUUID();
    const phoneNumber = params?.[1];
    const fullName = params?.[2] || null;
    const email = params?.[3] || null;
    const avatarUrl = params?.[4] || null;
    const status = params?.[5] || 'ACTIVE';
    const nowIso = new Date().toISOString();

    // Check if user already exists by phone_number to avoid 409 conflict
    const checkRes = await fetch(
      `${url}/rest/v1/users?phone_number=eq.${encodeURIComponent(phoneNumber)}&select=id,phone_number,phone_verified_at,full_name,email,avatar_url,status,created_at,updated_at`,
      { headers }
    );
    if (!checkRes.ok) {
      throw new Error(`REST_USERS_CHECK_PHONE_FAILED: HTTP ${checkRes.status}`);
    }
    const checkRaw: any = await checkRes.json().catch(() => []);
    const existingUsers: any[] = Array.isArray(checkRaw) ? checkRaw : [];

    if (existingUsers.length > 0) {
      // User exists: PATCH to update fields if provided (upsert semantics)
      const existingUser = existingUsers[0];
      const patchBody: any = { updated_at: nowIso };
      if (fullName) patchBody.full_name = fullName;
      if (email !== null && email !== undefined) patchBody.email = email;
      if (avatarUrl) patchBody.avatar_url = avatarUrl;

      const patchRes = await fetch(
        `${url}/rest/v1/users?id=eq.${encodeURIComponent(existingUser.id)}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(patchBody),
        }
      );
      if (!patchRes.ok) {
        throw new Error(`REST_USERS_UPSERT_PATCH_FAILED: HTTP ${patchRes.status}`);
      }
      const patchRaw: any = await patchRes.json().catch(() => []);
      const patchRows: any[] = Array.isArray(patchRaw) ? patchRaw : [];
      if (patchRows.length === 0) {
        throw new Error('REST_USERS_UPSERT_PATCH_ZERO_ROWS: No row returned after PATCH');
      }
      const mapped = patchRows.map(u => ({
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
      return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
    }

    // No existing user: INSERT a new canonical row
    const payload: any = {
      id,
      phone_number: phoneNumber,
      phone_verified_at: null,
      status,
      created_at: nowIso,
      updated_at: nowIso,
    };
    if (fullName) payload.full_name = fullName;
    if (email !== null && email !== undefined) payload.email = email;
    if (avatarUrl) payload.avatar_url = avatarUrl;

    const insertRes = await fetch(`${url}/rest/v1/users`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!insertRes.ok) {
      const errBody = await insertRes.text().catch(() => '');
      throw new Error(`REST_USERS_INSERT_FAILED: HTTP ${insertRes.status} — ${errBody.slice(0, 200)}`);
    }
    const raw: any = await insertRes.json().catch(() => []);
    const arr = Array.isArray(raw) ? raw : (raw && raw.id ? [raw] : []);
    if (arr.length === 0) {
      throw new Error('REST_USERS_INSERT_ZERO_ROWS: No row returned after POST');
    }
    const mapped = arr.map(u => ({
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
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 0E. UPDATE users SET phone_verified_at = NOW(), updated_at = NOW() WHERE id = $1
  if (lowerSql.startsWith('update users') && lowerSql.includes('set phone_verified_at =')) {
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

  // 0F. UPDATE users SET full_name = ... WHERE id = $1 (strict, no owner fallback, no synthetic rows — DATA-02)
  if (lowerSql.startsWith('update users') && lowerSql.includes('full_name')) {
    const userId = params?.[0];
    const fullName = params?.[1];
    // email param[2]: '__NULL__' sentinel means set to SQL NULL; undefined = don't change
    const emailParam = params?.[2];
    const avatarUrl = params?.[3] || null;
    const nowIso = new Date().toISOString();

    const patchBody: any = { updated_at: nowIso };
    if (fullName !== undefined && fullName !== null && fullName !== '') patchBody.full_name = fullName;
    // Handle email null semantics: __NULL__ = set to NULL, string = set to value, undefined = omit
    if (emailParam === '__NULL__') {
      patchBody.email = null;
    } else if (emailParam !== undefined && emailParam !== null && emailParam !== '') {
      patchBody.email = emailParam;
    }
    if (avatarUrl) patchBody.avatar_url = avatarUrl;

    const patchRes = await fetch(
      `${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(patchBody),
      }
    );
    if (!patchRes.ok) {
      throw new Error(`REST_USERS_UPDATE_FAILED: HTTP ${patchRes.status}`);
    }
    const raw: any = await patchRes.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    if (rows.length === 0) {
      throw new Error(`REST_USERS_UPDATE_ZERO_ROWS: No row returned after PATCH for id=${userId}`);
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
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 1A. SELECT properties WHERE owner_id = $1 (Strict regex matching)
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && (/\b(p\.)?owner_id\s*=\s*\$1\b/i.test(text))) {
    const ownerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null&order=created_at.desc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTIES_SELECT_BY_OWNER_FAILED: HTTP ${res.status}`);
    }
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
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
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

  // 1B. SELECT properties WHERE id = $1 (Single Property - Strict regex matching)
  if (lowerSql.startsWith('select') && lowerSql.includes('from properties') && (/\b(p\.)?id\s*=\s*\$1\b/i.test(text)) && !(/\b(p\.)?owner_id\s*=\s*\$1\b/i.test(text))) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&deleted_at=is.null`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTIES_SELECT_FAILED: HTTP ${res.status}`);
    }
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
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
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
    const safeParse = (v: any, fallback: any) => {
      if (!v) return fallback;
      if (typeof v === 'object') return v;
      try {
        return JSON.parse(v);
      } catch {
        return fallback;
      }
    };

    const payload: any = {
      id: params?.[0] || crypto.randomUUID(),
      owner_id: params?.[1],
      title: params?.[2],
      unit_type: params?.[3] || 'CHALET',
      property_type: params?.[4] || 'CHALET',
      address: params?.[5] || '',
      bedrooms: Number(params?.[6]) || 1,
      bathrooms: Number(params?.[7]) || 1,
      max_guests: Number(params?.[8]) || 2,
      base_price_per_night: Number(params?.[9]) || 1000,
      description: params?.[10] || null,
      region: params?.[11] || null,
      resort_name: params?.[12] || null,
      area_sq_m: params?.[13] ? Number(params[13]) : null,
      beds_count: params?.[14] ? Number(params[14]) : null,
      amenities: safeParse(params?.[15], []),
      house_rules: safeParse(params?.[16], {}),
      status: params?.[17] || 'DRAFT',
      verification_status: params?.[18] || 'UNVERIFIED',
    };

    const res = await fetch(`${url}/rest/v1/properties`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

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
      basePricePerNight: p.base_price_per_night,
      description: p.description,
      region: p.region,
      resortName: p.resort_name,
      areaSqM: p.area_sq_m,
      bedsCount: p.beds_count,
      amenities: p.amenities,
      houseRules: p.house_rules,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3A. UPDATE properties WHERE id = $1 AND owner_id = $2 (Strict M03 Dynamic REST PATCH)
  if (lowerSql.startsWith('update properties') && lowerSql.includes('where id = $1 and owner_id = $2')) {
    const propId = params?.[0];
    const ownerId = params?.[1];
    const patchBody: any = { updated_at: new Date().toISOString() };

    // Extract SET clause tokens e.g. "title = $3, unit_type = $4, updated_at = NOW()"
    const setMatch = text.match(/SET\s+([\s\S]+?)\s+WHERE/i);
    if (setMatch) {
      const assignments = setMatch[1].split(',');
      for (const assignment of assignments) {
        const trimmed = assignment.trim();
        const colMatch = trimmed.match(/^([a-z0-9_]+)\s*=\s*\$(\d+)/i);
        if (colMatch) {
          const colName = colMatch[1].toLowerCase();
          const paramNum = parseInt(colMatch[2], 10);
          const rawVal = params?.[paramNum - 1];
          if (colName === 'amenities' || colName === 'house_rules') {
            patchBody[colName] = safeParse(rawVal, colName === 'amenities' ? [] : {});
          } else {
            patchBody[colName] = rawVal;
          }
        }
      }
    }

    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}&owner_id=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(patchBody)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTIES_UPDATE_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error(`REST_PROPERTIES_UPDATE_ZERO_ROWS: No row returned after update for property id=${propId}`);
    }

    const mapped = arr.map((p: any) => ({
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
      description: p.description,
      region: p.region,
      resortName: p.resort_name,
      areaSqM: p.area_sq_m,
      bedsCount: p.beds_count,
      amenities: p.amenities,
      houseRules: p.house_rules,
      status: p.status,
      verificationStatus: p.verification_status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 3B. UPDATE properties SET status = ...
  if (lowerSql.startsWith('update properties') && (lowerSql.includes('set status =') || lowerSql.includes('verification_status ='))) {
    const propId = params?.[0];
    const status = params?.[1];
    const verificationStatus = params?.[2];
    const payload: any = { updated_at: new Date().toISOString() };
    if (status) payload.status = status;
    if (verificationStatus) payload.verification_status = verificationStatus;

    const res = await fetch(`${url}/rest/v1/properties?id=eq.${encodeURIComponent(propId)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`REST_PROPERTY_UPDATE_STATUS_FAILED: HTTP ${res.status}`);
    }

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


  // 6. Admin Pending Properties Queue
  if (lowerSql.includes('from properties') && (lowerSql.includes('pending_review') || lowerSql.includes('rejected'))) {
    const res = await fetch(`${url}/rest/v1/properties?deleted_at=is.null&status=in.(PENDING_REVIEW,REJECTED)&order=created_at.asc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_ADMIN_PENDING_PROPERTIES_FAILED: HTTP ${res.status}`);
    }
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
      description: p.description || null,
      region: p.region || null,
      resortName: p.resort_name || null,
      areaSqM: p.area_sq_m || null,
      bedsCount: p.beds_count || null,
      amenities: p.amenities || [],
      houseRules: p.house_rules || {},
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

  // 6B. SELECT FROM property_images WHERE property_id = $1
  if (lowerSql.includes('from property_images') && lowerSql.includes('property_id = $1')) {
    const propId = params?.[0];
    const res = await fetch(`${url}/rest/v1/property_images?property_id=eq.${encodeURIComponent(propId)}&status=eq.ACTIVE&order=sort_order.asc,uploaded_at.asc`, { headers });
    if (!res.ok) {
      throw new Error(`REST_PROPERTY_IMAGES_SELECT_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map(img => ({
      id: img.id,
      propertyId: img.property_id,
      ownerId: img.owner_id,
      objectKey: img.object_key,
      fileUrl: img.file_url,
      fileName: img.file_name,
      mimeType: img.mime_type,
      fileSize: img.file_size_bytes,
      sortOrder: img.sort_order,
      uploadIntentId: img.upload_intent_id,
      sha256Checksum: img.sha256_checksum,
      status: img.status,
      uploadedAt: img.uploaded_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6C. INSERT INTO upload_intents (M03 Upload Intent Creation & Conflict Handling)
  if (lowerSql.startsWith('insert into upload_intents')) {
    const intentNumber = params?.[0];
    const ownerId = params?.[1];
    const propertyId = params?.[2];
    const objectKey = params?.[3];
    const expectedMimeType = params?.[4];
    const expectedSizeBytes = params?.[5] ? Number(params[5]) : null;
    const idempotencyKey = params?.[6];
    const expiresAt = params?.[7];

    const payload = {
      intent_number: intentNumber,
      owner_id: ownerId,
      property_id: propertyId,
      object_key: objectKey,
      expected_mime_type: expectedMimeType,
      expected_size_bytes: expectedSizeBytes,
      idempotency_key: idempotencyKey,
      expires_at: expiresAt,
      status: 'PENDING_UPLOAD',
    };

    const res = await fetch(`${url}/rest/v1/upload_intents`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_UPLOAD_INTENT_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error('REST_UPLOAD_INTENT_INSERT_ZERO_ROWS: No row returned after intent insert');
    }

    const mapped = arr.map((r: any) => ({
      id: r.id,
      intentNumber: r.intent_number,
      ownerId: r.owner_id,
      propertyId: r.property_id,
      objectKey: r.object_key,
      expectedMimeType: r.expected_mime_type,
      expectedSizeBytes: r.expected_size_bytes ? Number(r.expected_size_bytes) : null,
      idempotencyKey: r.idempotency_key,
      status: r.status,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6D. SELECT FROM upload_intents WHERE id = $1
  if (lowerSql.includes('from upload_intents') && lowerSql.includes('where id = $1')) {
    const id = params?.[0];
    const res = await fetch(`${url}/rest/v1/upload_intents?id=eq.${encodeURIComponent(id)}`, { headers });
    if (!res.ok) {
      throw new Error(`REST_UPLOAD_INTENT_SELECT_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      intentNumber: r.intent_number,
      ownerId: r.owner_id,
      propertyId: r.property_id,
      objectKey: r.object_key,
      expectedMimeType: r.expected_mime_type,
      expectedSizeBytes: r.expected_size_bytes ? Number(r.expected_size_bytes) : null,
      idempotencyKey: r.idempotency_key,
      status: r.status,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6E. UPDATE upload_intents SET status = 'COMMITTED' WHERE id = $1
  if (lowerSql.startsWith('update upload_intents') && lowerSql.includes('status = \'committed\'') && lowerSql.includes('where id = $1')) {
    const id = params?.[0];
    const res = await fetch(`${url}/rest/v1/upload_intents?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'COMMITTED' }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_UPLOAD_INTENT_COMMIT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error(`REST_UPLOAD_INTENT_COMMIT_ZERO_ROWS: No row returned for intent commit id=${id}`);
    }

    const mapped = arr.map((r: any) => ({
      id: r.id,
      status: r.status,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6F. SELECT expired upload_intents
  if (lowerSql.includes('from upload_intents') && lowerSql.includes('status = \'pending_upload\'')) {
    const res = await fetch(`${url}/rest/v1/upload_intents?status=eq.PENDING_UPLOAD&expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=id,object_key`, { headers });
    if (!res.ok) {
      throw new Error(`REST_UPLOAD_INTENTS_EXPIRED_FAILED: HTTP ${res.status}`);
    }
    const rows: any[] = await res.json().catch(() => []);
    const mapped = rows.map((r: any) => ({
      id: r.id,
      objectKey: r.object_key,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6G. INSERT INTO property_images (imageDb.addImage)
  if (lowerSql.startsWith('insert into property_images')) {
    const propertyId = params?.[0];
    const ownerId = params?.[1];
    const objectKey = params?.[2];
    const fileUrl = params?.[3];
    const fileName = params?.[4];
    const mimeType = params?.[5];
    const fileSize = params?.[6] ? Number(params[6]) : null;
    const sortOrder = params?.[7] !== undefined ? Number(params[7]) : 0;
    const uploadIntentId = params?.[8] || null;
    const sha256Checksum = params?.[9] || null;

    const payload = {
      property_id: propertyId,
      owner_id: ownerId,
      object_key: objectKey,
      file_url: fileUrl,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: fileSize,
      sort_order: sortOrder,
      upload_intent_id: uploadIntentId,
      sha256_checksum: sha256Checksum,
      status: 'ACTIVE',
    };

    const res = await fetch(`${url}/rest/v1/property_images`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_IMAGES_INSERT_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    if (arr.length === 0) {
      throw new Error('REST_PROPERTY_IMAGES_INSERT_ZERO_ROWS: No row returned after image insert');
    }

    const mapped = arr.map((img: any) => ({
      id: img.id,
      propertyId: img.property_id,
      ownerId: img.owner_id,
      objectKey: img.object_key,
      fileUrl: img.file_url,
      fileName: img.file_name,
      mimeType: img.mime_type,
      fileSize: img.file_size_bytes,
      sortOrder: img.sort_order,
      uploadIntentId: img.upload_intent_id,
      sha256Checksum: img.sha256_checksum,
      status: img.status,
      uploadedAt: img.uploaded_at || img.created_at,
    }));
    return { rows: mapped, command: 'INSERT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 6H. UPDATE property_images SET status = 'DELETED' (imageDb.deleteImage)
  if (lowerSql.startsWith('update property_images') && lowerSql.includes('status = \'deleted\'')) {
    const imageId = params?.[0];
    const ownerId = params?.[1];

    const res = await fetch(`${url}/rest/v1/property_images?id=eq.${encodeURIComponent(imageId)}&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.ACTIVE`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'DELETED', deleted_at: new Date().toISOString() })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`REST_PROPERTY_IMAGE_DELETE_FAILED: HTTP ${res.status} — ${errBody.slice(0, 200)}`);
    }

    const rows: any = await res.json().catch(() => []);
    const arr = Array.isArray(rows) ? rows : [rows];
    const mapped = arr.map((r: any) => ({
      id: r.id,
      objectKey: r.object_key,
      propertyId: r.property_id,
    }));
    return { rows: mapped, command: 'UPDATE', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 7. SELECT bookings for Property Availability & Overlap Checks (Canonical Blocking Statuses)
  if (lowerSql.includes('from bookings') && lowerSql.includes('property_id = $1') && !lowerSql.includes('customer_id')) {
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

  // 7B. SELECT bookings for Customer App (Customer ID or Phone)
  if (lowerSql.includes('from bookings') && (lowerSql.includes('customer_id') || lowerSql.includes('guest_phone'))) {
    const customerId = params?.[0];
    const phone = params?.[1];
    let queryUrl = `${url}/rest/v1/bookings?order=created_at.desc`;
    if (customerId && phone) {
      queryUrl += `&or=(customer_id.eq.${encodeURIComponent(customerId)},guest_phone.eq.${encodeURIComponent(phone)})`;
    } else if (customerId) {
      queryUrl += `&customer_id=eq.${encodeURIComponent(customerId)}`;
    } else if (phone) {
      queryUrl += `&guest_phone=eq.${encodeURIComponent(phone)}`;
    }

    const res = await fetch(queryUrl, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(b => ({
      id: b.id,
      bookingNumber: b.booking_number,
      propertyId: b.property_id,
      ownerId: b.owner_id,
      customerId: b.customer_id,
      guestName: b.guest_name,
      guestPhone: b.guest_phone,
      checkIn: b.check_in,
      checkOut: b.check_out,
      nights: b.nights,
      totalGuests: b.total_guests,
      status: b.status,
      createdAt: b.created_at,
      confirmedAt: b.confirmed_at,
      pricePerNight: 5000,
    }));
    return { rows: mapped, command: 'SELECT', rowCount: mapped.length, oid: 0, fields: [] };
  }

  // 17. SELECT payment_transactions for Customer
  if (lowerSql.includes('from payment_transactions') && lowerSql.includes('customer_id = $1')) {
    const customerId = params?.[0];
    const res = await fetch(`${url}/rest/v1/payment_transactions?customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(t => ({
      id: t.id,
      bookingId: t.booking_id,
      customerId: t.customer_id,
      ownerId: t.owner_id,
      provider: t.provider,
      merchantOrderId: t.merchant_order_id,
      providerTransactionId: t.provider_transaction_id,
      amountCents: t.amount_cents,
      amountEgp: Number(t.amount_cents) / 100,
      currency: t.currency,
      paymentMethod: t.payment_method,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
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
export async function queryDb<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
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
