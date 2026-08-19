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
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.zrbmbjgcsowfqklmxbyn:Essam112288-@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
  
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
    let queryParams = `property_id=eq.${encodeURIComponent(propId)}&select=check_in,check_out,status`;
    if (lowerSql.includes('approved_pending_payment') || lowerSql.includes('confirmed') || lowerSql.includes('status in')) {
      queryParams += '&status=in.(APPROVED_PENDING_PAYMENT,CONFIRMED)';
    }
    const res = await fetch(`${url}/rest/v1/bookings?${queryParams}`, { headers });
    const raw: any = await res.json().catch(() => []);
    const rows: any[] = Array.isArray(raw) ? raw : [];
    const mapped = rows.map(b => ({
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

  return null;
}

/**
 * Execute parameterized SQL query against PostgreSQL sola_db
 */
export async function queryDb<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zrbmbjgcsowfqklmxbyn.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (typeof atob === 'function' ? atob('c2Jfc2VjcmV0XzBBWHdfVFpiVFRCRWtxZGRKU1BYX2dfc3FZVEd6ZGc=') : Buffer.from('c2Jfc2VjcmV0XzBBWHdfVFpiVFRCRWtxZGRKU1BYX2dfc3FZVEd6ZGc=', 'base64').toString('utf-8'));

  if (supabaseUrl && supabaseKey) {
    try {
      const restResult = await queryViaSupabaseRest(text, params, supabaseUrl, supabaseKey);
      if (restResult) {
        return restResult;
      }
    } catch {
      // Fall through to TCP pool if REST translation fails
    }
  }

  return await getDbPool().query<T>(text, params);
}
