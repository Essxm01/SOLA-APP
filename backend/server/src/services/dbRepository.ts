/**
 * Sola Vacation Rentals — Production PostgreSQL Repository Data Access Layer
 * Location: server/src/services/dbRepository.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import { queryDb } from './dbClient.js';
import { GLOBAL_MIN_STAY_NIGHTS, GLOBAL_MAX_STAY_NIGHTS, BLOCKING_BOOKING_STATUSES } from '../constants/bookingRules.js';
import { PublicPropertySearchFilters, validatePublicPropertyBaseRow } from '../contracts/publicProperty.js';

// Helper to mask PII strings for admin queue outputs
export function maskPii(val?: string, visibleLength = 4): string {
  if (!val) return '****';
  if (val.length <= visibleLength) return '*'.repeat(val.length);
  return '*'.repeat(val.length - visibleLength) + val.slice(-visibleLength);
}

// ----------------------------------------------------------------------------
// 0. USERS REPOSITORY (AUTH-02A)
// ----------------------------------------------------------------------------
export const userDb = {
  async getById(userId: string) {
    const res = await queryDb(
      'SELECT id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1',
      [userId]
    );
    return res.rows[0] || null;
  },

  async getByPhone(phoneNumber: string) {
    const res = await queryDb(
      'SELECT id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return res.rows[0] || null;
  },

  async create(user: { id?: string; phoneNumber: string; status?: string; fullName?: string | null; email?: string | null; avatarUrl?: string | null }) {
    const id = user.id || crypto.randomUUID();
    const res = await queryDb(
      `INSERT INTO users (id, phone_number, phone_verified_at, full_name, email, avatar_url, status, created_at, updated_at)
       VALUES ($1, $2, NULL, $3, $4, $5, COALESCE($6, 'ACTIVE'), NOW(), NOW())
       ON CONFLICT (phone_number)
       DO UPDATE SET
         full_name = CASE WHEN EXCLUDED.full_name IS NOT NULL AND EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE users.full_name END,
         email = CASE WHEN EXCLUDED.email IS NOT NULL THEN EXCLUDED.email ELSE users.email END,
         avatar_url = CASE WHEN EXCLUDED.avatar_url IS NOT NULL THEN EXCLUDED.avatar_url ELSE users.avatar_url END,
         updated_at = NOW()
       RETURNING id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, user.phoneNumber, user.fullName || null, user.email || null, user.avatarUrl || null, user.status || 'ACTIVE']
    );
    return res.rows[0] || null;
  },

  async updatePhoneVerified(userId: string) {
    const res = await queryDb(
      `UPDATE users SET phone_verified_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async updateProfile(userId: string, data: { fullName?: string | null; email?: string | null; avatarUrl?: string | null }) {
    const res = await queryDb(
      `UPDATE users
       SET full_name = CASE WHEN $2 IS NOT NULL AND $2 <> '' THEN $2 ELSE full_name END,
           email = CASE WHEN $3::text = '__NULL__' THEN NULL WHEN $3 IS NOT NULL THEN $3 ELSE email END,
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, phone_number AS "phoneNumber", phone_verified_at AS "phoneVerifiedAt", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, data.fullName || null, data.email === null ? '__NULL__' : (data.email || null), data.avatarUrl || null]
    );
    return res.rows[0] || null;
  }
};

// ----------------------------------------------------------------------------
// 1. OWNERS & VERIFICATION REPOSITORY
// ----------------------------------------------------------------------------
export const ownerDb = {
  async getById(ownerId: string) {
    const res = await queryDb(
      'SELECT id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", owner_onboarding_completed_at AS "ownerOnboardingCompletedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM owners WHERE id = $1',
      [ownerId]
    );
    return res.rows[0] || null;
  },

  async getByPhone(phoneNumber: string) {
    const res = await queryDb(
      'SELECT id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", owner_onboarding_completed_at AS "ownerOnboardingCompletedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM owners WHERE phone_number = $1',
      [phoneNumber]
    );
    return res.rows[0] || null;
  },

  async upsert(owner: { id: string; phoneNumber: string; fullName: string; email?: string; avatarUrl?: string; status?: string; verificationStatus?: string }) {
    // 1. Ensure parent users identity record exists (1:1 Identity Invariant - AUTH-02A)
    await queryDb(
      `INSERT INTO users (id, phone_number, phone_verified_at, status, created_at, updated_at)
       VALUES ($1, $2, NOW(), COALESCE($3, 'ACTIVE'), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone_number = EXCLUDED.phone_number,
         status = COALESCE(EXCLUDED.status, users.status),
         updated_at = NOW()`,
      [owner.id, owner.phoneNumber, owner.status || 'ACTIVE']
    ).catch(() => null);

    // 2. Upsert owners record referencing users.id
    const res = await queryDb(
      `INSERT INTO owners (id, phone_number, full_name, email, avatar_url, status, verification_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'ACTIVE'), COALESCE($7, 'UNVERIFIED'), NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone_number = EXCLUDED.phone_number,
         full_name = COALESCE(EXCLUDED.full_name, owners.full_name),
         email = COALESCE(EXCLUDED.email, owners.email),
         avatar_url = COALESCE(EXCLUDED.avatar_url, owners.avatar_url),
         status = COALESCE(EXCLUDED.status, owners.status),
         verification_status = COALESCE(EXCLUDED.verification_status, owners.verification_status),
         updated_at = NOW()
       RETURNING id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [owner.id, owner.phoneNumber, owner.fullName, owner.email || null, owner.avatarUrl || null, owner.status || 'ACTIVE', owner.verificationStatus || 'UNVERIFIED']
    );
    return res.rows[0];
  },

  async updateProfile(ownerId: string, data: { fullName?: string; email?: string | null; avatarUrl?: string }) {
    const res = await queryDb(
      `UPDATE owners
       SET full_name = CASE WHEN $2 IS NOT NULL AND $2 <> '' THEN $2 ELSE full_name END,
           email = CASE WHEN $3::text = '__NULL__' THEN NULL WHEN $3 IS NOT NULL THEN $3 ELSE email END,
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [ownerId, data.fullName || null, data.email === null ? '__NULL__' : (data.email || null), data.avatarUrl || null]
    );
    return res.rows[0] || null;
  },

  async submitDocument(doc: { ownerId: string; documentType: string; documentUrl: string; title?: string }) {
    const res = await queryDb(
      `INSERT INTO owner_verification_documents (owner_id, document_type, document_url, status, uploaded_at)
       VALUES ($1, $2, $3, 'PENDING', NOW())
       RETURNING id, owner_id AS "ownerId", document_type AS "documentType", document_url AS "documentUrl", status, uploaded_at AS "uploadedAt"`,
      [doc.ownerId, doc.documentType, doc.documentUrl]
    );
    return res.rows[0];
  },

  async getDocuments(ownerId: string) {
    const res = await queryDb(
      `SELECT id, owner_id AS "ownerId", document_type AS "documentType", storage_key AS "storageKey", mime_type AS "mimeType", file_size_bytes AS "fileSizeBytes", submission_id AS "submissionId", status, rejection_reason AS "rejectionReason", uploaded_at AS "uploadedAt", reviewed_at AS "reviewedAt"
       FROM owner_verification_documents WHERE owner_id = $1 ORDER BY uploaded_at DESC`,
      [ownerId]
    );
    return res.rows;
  },

  async registerExplicit(phoneNumber: string, fullName: string) {
    const res = await queryDb('SELECT * FROM konfrm_register_owner($1, $2)', [phoneNumber, fullName]);
    return res.rows[0] || null;
  },

  async submitKycPackage(ownerId: string, documents: Array<{ documentType: string; storageKey: string; mimeType: string; fileSizeBytes: number }>) {
    const res = await queryDb('SELECT * FROM konfrm_submit_owner_kyc($1, $2)', [ownerId, documents]);
    return res.rows[0] || null;
  },

  async reviewKycPackage(ownerId: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    const res = await queryDb('SELECT * FROM konfrm_review_owner_kyc($1, $2, $3)', [ownerId, decision, rejectionReason || null]);
    return res.rows[0] || null;
  },

  async getPendingVerifications() {
    const res = await queryDb(
      `SELECT o.id AS "ownerId", o.full_name AS "fullName", o.phone_number AS "phoneNumber", o.verification_status AS "verificationStatus",
              d.id AS "documentId", d.document_type AS "documentType", d.storage_key AS "storageKey", d.status AS "docStatus", d.uploaded_at AS "uploadedAt", d.submission_id AS "submissionId"
       FROM owners o
       LEFT JOIN owner_verification_documents d ON o.id = d.owner_id
       WHERE o.verification_status = 'PENDING_VERIFICATION' AND d.status = 'PENDING'`
    );
    return res.rows;
  }
};

// ----------------------------------------------------------------------------
// 2. PROPERTIES REPOSITORY
// ----------------------------------------------------------------------------
const defaultGetAllForPublic = async function() {
  const res = await queryDb(
    `SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
     address, region, resort_name AS "resortName", bedrooms, bathrooms,
     max_guests AS "maxGuests", base_price_per_night AS "basePricePerNight"
FROM properties
WHERE deleted_at IS NULL
  AND status = 'PUBLISHED'
  AND verification_status = 'VERIFIED'
ORDER BY created_at DESC`
  );
  return res.rows;
};

export const propertyDb = {
  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
              address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
              base_price_per_night AS "basePricePerNight", description, region, resort_name AS "resortName",
              area_sq_m AS "areaSqM", beds_count AS "bedsCount", amenities, house_rules AS "houseRules",
              status, verification_status AS "verificationStatus",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM properties WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
      [ownerId]
    );

    const properties = await Promise.all(res.rows.map(async p => {
      // Images are canonical persistence, not optional decoration. A failed
      // image read must propagate to the route rather than masquerading as an
      // honest zero-image property.
      const dbImages = await imageDb.getImagesByPropertyId(p.id);
      const images = dbImages.map(img => img.fileUrl);
      return {
        ...p,
        pricePerNight: Number(p.pricePerNight),
        basePricePerNight: Number(p.basePricePerNight),
        images,
        amenities: Array.isArray(p.amenities) ? p.amenities : [],
        houseRules: p.houseRules && typeof p.houseRules === 'object' ? p.houseRules : {},
        locationName: p.resortName ? `${p.resortName}${p.region || p.address ? ` — ${p.region || p.address}` : ''}` : (p.address || p.region || ''),
        pricing: { basePricePerNight: Number(p.pricePerNight), currency: 'EGP' },
        location: { governorate: '', city: p.region || '', district: p.resortName || '', address: p.address || '' },
        capacity: { baseGuests: p.maxGuests, maxGuests: p.maxGuests, bedrooms: p.bedrooms, beds: p.bedsCount || p.bedrooms, bathrooms: p.bathrooms },
      };
    }));

    return properties;
  },

  async getById(id: string) {
    const res = await queryDb(
      `SELECT id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
              address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
              base_price_per_night AS "basePricePerNight", description, region, resort_name AS "resortName",
              area_sq_m AS "areaSqM", beds_count AS "bedsCount", amenities, house_rules AS "houseRules",
              status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM properties WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!res || !res.rows || !res.rows[0]) {
      return null;
    }

    const p = res.rows[0];
    const dbImages = await imageDb.getImagesByPropertyId(p.id);
    const images = dbImages.map(img => img.fileUrl);

    return {
      ...p,
      pricePerNight: Number(p.pricePerNight),
      basePricePerNight: Number(p.basePricePerNight),
      images,
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      houseRules: p.houseRules && typeof p.houseRules === 'object' ? p.houseRules : {},
      locationName: p.resortName ? `${p.resortName}${p.region || p.address ? ` — ${p.region || p.address}` : ''}` : (p.address || p.region || ''),
      pricing: { basePricePerNight: Number(p.pricePerNight), currency: 'EGP' },
      location: { governorate: '', city: p.region || '', district: p.resortName || '', address: p.address || '' },
      capacity: { baseGuests: p.maxGuests, maxGuests: p.maxGuests, bedrooms: p.bedrooms, beds: p.bedsCount || p.bedrooms, bathrooms: p.bathrooms },
    };
  },

  async getByOwnerAndId(id: string, ownerId: string) {
    const property = await this.getById(id);
    if (!property || property.ownerId !== ownerId) return null;
    return property;
  },

  async create(prop: any) {
    const res = await queryDb(
      `INSERT INTO properties (
        id, owner_id, title, unit_type, property_type, address, bedrooms, bathrooms, max_guests, base_price_per_night,
        description, region, resort_name, area_sq_m, beds_count, amenities, house_rules, status, verification_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
                 address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
                 description, region, resort_name AS "resortName", area_sq_m AS "areaSqM", beds_count AS "bedsCount",
                 amenities, house_rules AS "houseRules", status, verification_status AS "verificationStatus",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        prop.id,
        prop.ownerId,
        prop.title,
        prop.unitType,
        prop.propertyType,
        prop.address || '',
        Number(prop.bedrooms),
        Number(prop.bathrooms),
        Number(prop.maxGuests),
        Number(prop.basePricePerNight ?? prop.pricePerNight),
        prop.description || null,
        prop.region || null,
        prop.resortName || null,
        prop.areaSqM ? Number(prop.areaSqM) : null,
        prop.bedsCount ? Number(prop.bedsCount) : null,
        JSON.stringify(prop.amenities || []),
        JSON.stringify(prop.houseRules || {}),
        prop.status || 'DRAFT',
        prop.verificationStatus || 'UNVERIFIED',
      ]
    );
    return res.rows[0];
  },

  async updateStatus(id: string, status: string, verificationStatus?: string) {
    const res = await queryDb(
      `UPDATE properties
       SET status = COALESCE($2, status),
           verification_status = COALESCE($3, verification_status),
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, owner_id AS "ownerId", title, status, verification_status AS "verificationStatus", updated_at AS "updatedAt"`,
      [id, status, verificationStatus || null]
    );
    return res.rows[0] || null;
  },

  async updateStatusForOwner(id: string, ownerId: string, status: string, verificationStatus?: string) {
    const res = await queryDb(
      `UPDATE properties
       SET status = COALESCE($3, status),
           verification_status = COALESCE($4, verification_status),
           updated_at = NOW()
       WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id, owner_id AS "ownerId", title, status, verification_status AS "verificationStatus", updated_at AS "updatedAt"`,
      [id, ownerId, status, verificationStatus || null]
    );
    return res.rows[0] || null;
  },

  async getAllForAdmin(statusFilter?: string) {
    const params: any[] = [];
    let whereClause = 'WHERE p.deleted_at IS NULL';
    if (statusFilter === 'REJECTED') {
      // A rejected property is schema-valid DRAFT + rejected verification;
      // properties.status never has a REJECTED value.
      whereClause += ` AND p.status = 'DRAFT' AND p.verification_status = 'REJECTED'`;
    } else if (statusFilter) {
      params.push(statusFilter);
      whereClause += ` AND p.status = $${params.length}`;
    }
    const res = await queryDb(
      `SELECT p.id, p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.description, p.region, p.resort_name AS "resortName",
              p.area_sq_m AS "areaSqM", p.beds_count AS "bedsCount",
              p.amenities, p.house_rules AS "houseRules",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.id, p.owner_id) AS "ownerId", COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       ${whereClause} ORDER BY p.created_at DESC`,
      params
    );
    return res.rows.map(r => ({
      ...r,
      pricePerNight: Number(r.pricePerNight),
    }));
  },

  async searchPublic(filters?: PublicPropertySearchFilters) {
    let rows: any[];
    if (this.getAllForPublic !== defaultGetAllForPublic && typeof this.getAllForPublic === 'function') {
      rows = await this.getAllForPublic();
    } else {
      rows = await defaultGetAllForPublic();
    }
    let mapped = rows.map((p: any) => {
      const base = validatePublicPropertyBaseRow(p);
      return {
        ...p,
        ...base,
        pricePerNight: base.basePricePerNight,
      };
    });

    if (!filters) {
      return mapped;
    }

    if (filters.destination) {
      const term = filters.destination.toLowerCase();
      mapped = mapped.filter((p: any) => {
        const title = (p.title || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        const region = (p.region || '').toLowerCase();
        const resort = (p.resortName || '').toLowerCase();
        return title.includes(term) || address.includes(term) || region.includes(term) || resort.includes(term);
      });
    }

    if (filters.unitType) {
      const targetType = filters.unitType.toUpperCase();
      mapped = mapped.filter((p: any) => {
        const type = (p.unitType || '').toUpperCase();
        return type === targetType;
      });
    }

    if (filters.guests !== undefined) {
      const minGuests = filters.guests;
      mapped = mapped.filter((p: any) => p.maxGuests >= minGuests);
    }

    if (filters.maxPrice !== undefined) {
      const cap = filters.maxPrice;
      mapped = mapped.filter((p: any) => p.basePricePerNight <= cap);
    }

    return mapped;
  },

  getAllForPublic: defaultGetAllForPublic,

  async getPublicById(id: string) {
    const res = await queryDb(
      `SELECT id, title, unit_type AS "unitType", property_type AS "propertyType",
       address, region, resort_name AS "resortName", bedrooms, bathrooms,
       beds_count AS "bedsCount", max_guests AS "maxGuests", area_sq_m AS "areaSqM",
       description, amenities, house_rules AS "houseRules",
       base_price_per_night AS "basePricePerNight"
       FROM properties
       WHERE id = $1
         AND deleted_at IS NULL
         AND status = 'PUBLISHED'
         AND verification_status = 'VERIFIED'`,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      pricePerNight: Number(row.basePricePerNight),
      basePricePerNight: Number(row.basePricePerNight),
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      bedsCount: row.bedsCount !== null && row.bedsCount !== undefined ? Number(row.bedsCount) : null,
      maxGuests: Number(row.maxGuests),
      areaSqM: row.areaSqM !== null && row.areaSqM !== undefined ? Number(row.areaSqM) : null,
    };
  },

  async getPendingForAdmin() {
    const res = await queryDb(
      `SELECT p.id, p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.description, p.region, p.resort_name AS "resortName",
              p.area_sq_m AS "areaSqM", p.beds_count AS "bedsCount",
              p.amenities, p.house_rules AS "houseRules",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.id, p.owner_id) AS "ownerId", COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       WHERE p.deleted_at IS NULL
         AND (p.status = 'PENDING_REVIEW'
              OR (p.status = 'DRAFT' AND p.verification_status = 'REJECTED'))
       ORDER BY p.created_at ASC`
    );
    return res.rows.map(r => ({
      ...r,
      pricePerNight: Number(r.pricePerNight),
    }));
  },

  async getDetailForAdmin(id: string) {
    const res = await queryDb(
      `SELECT p.id, p.owner_id AS "ownerId", p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.description, p.region, p.resort_name AS "resortName",
              p.area_sq_m AS "areaSqM", p.beds_count AS "bedsCount",
              p.amenities, p.house_rules AS "houseRules",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone", o.email AS "ownerEmail",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus", COALESCE(o.status, 'ACTIVE') AS "ownerStatus",
              o.created_at AS "ownerCreatedAt"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [id]
    );
    if (!res.rows[0]) return null;
    const p = res.rows[0];
    return {
      ...p,
      pricePerNight: Number(p.pricePerNight),
    };
  },

  async update(id: string, ownerId: string, updates: {
    title?: string; unitType?: string; propertyType?: string; address?: string;
    bedrooms?: number; bathrooms?: number; maxGuests?: number; basePricePerNight?: number;
    description?: string | null; region?: string | null; resortName?: string | null;
    areaSqM?: number | null; bedsCount?: number | null;
    amenities?: string[] | null; houseRules?: any | null;
    status?: string; verificationStatus?: string;
  }) {
    const fields: string[] = [];
    const values: any[] = [id, ownerId];
    let paramIdx = 3;

    if (updates.title !== undefined) { fields.push(`title = $${paramIdx++}`); values.push(updates.title); }
    if (updates.unitType !== undefined) { fields.push(`unit_type = $${paramIdx++}`); values.push(updates.unitType); }
    if (updates.propertyType !== undefined) { fields.push(`property_type = $${paramIdx++}`); values.push(updates.propertyType); }
    if (updates.address !== undefined) { fields.push(`address = $${paramIdx++}`); values.push(updates.address); }
    if (updates.bedrooms !== undefined) { fields.push(`bedrooms = $${paramIdx++}`); values.push(Number(updates.bedrooms)); }
    if (updates.bathrooms !== undefined) { fields.push(`bathrooms = $${paramIdx++}`); values.push(Number(updates.bathrooms)); }
    if (updates.maxGuests !== undefined) { fields.push(`max_guests = $${paramIdx++}`); values.push(Number(updates.maxGuests)); }
    if (updates.basePricePerNight !== undefined) { fields.push(`base_price_per_night = $${paramIdx++}`); values.push(Number(updates.basePricePerNight)); }
    if (updates.description !== undefined) { fields.push(`description = $${paramIdx++}`); values.push(updates.description); }
    if (updates.region !== undefined) { fields.push(`region = $${paramIdx++}`); values.push(updates.region); }
    if (updates.resortName !== undefined) { fields.push(`resort_name = $${paramIdx++}`); values.push(updates.resortName); }
    if (updates.areaSqM !== undefined) { fields.push(`area_sq_m = $${paramIdx++}`); values.push(updates.areaSqM ? Number(updates.areaSqM) : null); }
    if (updates.bedsCount !== undefined) { fields.push(`beds_count = $${paramIdx++}`); values.push(updates.bedsCount ? Number(updates.bedsCount) : null); }
    if (updates.amenities !== undefined) { fields.push(`amenities = $${paramIdx++}`); values.push(JSON.stringify(updates.amenities || [])); }
    if (updates.houseRules !== undefined) { fields.push(`house_rules = $${paramIdx++}`); values.push(JSON.stringify(updates.houseRules || {})); }
    if (updates.status !== undefined) { fields.push(`status = $${paramIdx++}`); values.push(updates.status); }
    if (updates.verificationStatus !== undefined) { fields.push(`verification_status = $${paramIdx++}`); values.push(updates.verificationStatus); }

    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');

    const res = await queryDb(
      `UPDATE properties SET ${fields.join(', ')} WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
                 address, bedrooms, bathrooms, max_guests AS "maxGuests",
                 base_price_per_night AS "pricePerNight",
                 description, region, resort_name AS "resortName",
                 area_sq_m AS "areaSqM", beds_count AS "bedsCount",
                 amenities, house_rules AS "houseRules",
                 status, verification_status AS "verificationStatus",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );
    return res.rows[0] || null;
  },

  async getAdminStats() {
    const res = await queryDb(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') AS "pendingReview",
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS "published",
        COUNT(*) FILTER (WHERE status = 'DRAFT' AND verification_status = 'REJECTED') AS "rejected",
        COUNT(*) AS "total"
       FROM properties WHERE deleted_at IS NULL`
    );
    return res.rows[0] || { pendingReview: 0, published: 0, rejected: 0, total: 0 };
  }
};

// ----------------------------------------------------------------------------
// 3. BOOKINGS REPOSITORY
// ----------------------------------------------------------------------------
export const bookingDb = {
  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT id, booking_number AS "bookingNumber", property_id AS "propertyId", owner_id AS "ownerId",
              customer_id AS "customerId", guest_name AS "guestName", check_in AS "checkIn", check_out AS "checkOut",
              nights, total_guests AS "guestsCount", status, created_at AS "createdAt",
              confirmed_at AS "confirmedAt", rejected_at AS "rejectedAt"
       FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
    return Promise.all(res.rows.map((booking) => hydrateBooking(booking)));
  },

  // P1.5: one atomic database boundary creates the booking request AND its
  // canonical financial summary (migration 026 RPC). Never fall back to
  // sequential booking + summary writes with compensating deletes.
  async create(bk: any) {
    const res = await queryDb(
      `SELECT * FROM konfrm_create_booking_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        bk.id, bk.bookingNumber, bk.propertyId, bk.ownerId, bk.customerId,
        bk.guestName, bk.guestPhone, bk.checkIn, bk.checkOut, bk.nights,
        bk.totalGuests, bk.status,
        bk.totalBookingValue, bk.depositAmount, bk.solaCommissionAmount,
        bk.ownerNetDepositAmount, bk.remainingBalance,
        bk.commissionOnRemainingBalance ?? 0,
      ]
    );
    return res.rows[0] || null;
  },

  async createFinancialSummary(summary: any) {
    const res = await queryDb(
      `INSERT INTO booking_financial_summaries (booking_id, total_booking_value, deposit_amount, sola_commission_amount, owner_net_deposit_amount, remaining_balance, commission_on_remaining_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING booking_id AS "bookingId", total_booking_value AS "totalBookingValue", deposit_amount AS "depositAmount", sola_commission_amount AS "solaCommissionAmount", owner_net_deposit_amount AS "ownerNetDepositAmount", remaining_balance AS "remainingBalance", commission_on_remaining_balance AS "commissionOnRemainingBalance", created_at AS "createdAt"`,
      [summary.bookingId, summary.totalBookingValue, summary.depositAmount, summary.solaCommissionAmount, summary.ownerNetDepositAmount, summary.remainingBalance, 0]
    );
    return res.rows[0] || null;
  },

  async deleteNewBooking(id: string, customerId: string) {
    await queryDb(
      `DELETE FROM bookings WHERE id = $1 AND customer_id = $2 AND status = 'PENDING_OWNER_APPROVAL'`,
      [id, customerId]
    );
  },

  async getFinancialSummary(bookingId: string) {
    const res = await queryDb(
      `SELECT booking_id AS "bookingId", total_booking_value AS "totalBookingValue", deposit_amount AS "depositAmount", sola_commission_amount AS "solaCommissionAmount", owner_net_deposit_amount AS "ownerNetDepositAmount", remaining_balance AS "remainingBalance", commission_on_remaining_balance AS "commissionOnRemainingBalance", created_at AS "createdAt"
       FROM booking_financial_summaries WHERE booking_id = $1`,
      [bookingId]
    );
    return res.rows[0] || null;
  },

  async getById(id: string) {
    const res = await queryDb(
      `SELECT id, booking_number AS "bookingNumber", property_id AS "propertyId", owner_id AS "ownerId", customer_id AS "customerId", guest_name AS "guestName", check_in AS "checkIn", check_out AS "checkOut", nights, total_guests AS "guestsCount", status, created_at AS "createdAt", confirmed_at AS "confirmedAt", rejected_at AS "rejectedAt"
       FROM bookings WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? hydrateBooking(res.rows[0]) : null;
  },

  async updateStatusForOwner(id: string, ownerId: string, status: 'APPROVED_PENDING_PAYMENT' | 'REJECTED') {
    const res = await queryDb(
      `UPDATE bookings SET status = $3,
           rejected_at = CASE WHEN $3 = 'REJECTED' THEN NOW() ELSE rejected_at END
       WHERE id = $1 AND owner_id = $2 AND status = 'PENDING_OWNER_APPROVAL'
       RETURNING id, booking_number AS "bookingNumber", property_id AS "propertyId", owner_id AS "ownerId", customer_id AS "customerId", guest_name AS "guestName", check_in AS "checkIn", check_out AS "checkOut", nights, total_guests AS "guestsCount", status, created_at AS "createdAt", confirmed_at AS "confirmedAt", rejected_at AS "rejectedAt"`,
      [id, ownerId, status]
    );
    return res.rows[0] ? hydrateBooking(res.rows[0]) : null;
  },

  // Retained for legacy cancellation code paths outside BOOKING-01.
  async updateStatus(id: string, status: string) {
    const res = await queryDb(
      `UPDATE bookings SET status = $2 WHERE id = $1
       RETURNING id, booking_number AS "bookingNumber", status`,
      [id, status]
    );
    return res.rows[0] || null;
  },

  async getBlocksByPropertyId(propertyId: string) {
    const res = await queryDb(
      `SELECT check_in AS "checkIn", check_out AS "checkOut", status
       FROM bookings
       WHERE property_id = $1 AND status IN ('APPROVED_PENDING_PAYMENT', 'CONFIRMED')`,
      [propertyId]
    );
    if (res && res.rows) {
      return res.rows;
    }

    return [];
  },

  async getByCustomerId(customerId: string) {
    const res = await queryDb(
      `SELECT id, booking_number AS "bookingNumber", property_id AS "propertyId", owner_id AS "ownerId", customer_id AS "customerId", guest_name AS "guestName", check_in AS "checkIn", check_out AS "checkOut", nights, total_guests AS "guestsCount", status, created_at AS "createdAt", confirmed_at AS "confirmedAt", rejected_at AS "rejectedAt"
       FROM bookings WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return Promise.all(res.rows.map((booking) => hydrateBooking(booking)));
  }
};

function normalizeCanonicalNumeric(val: unknown): any {
  if (val === null || val === undefined || typeof val === 'boolean') return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
    return Number(val);
  }
  return val;
}

function normalizeCanonicalFinance(val: unknown): any {
  if (val === null || val === undefined || typeof val === 'boolean') return val;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
    return Number(val);
  }
  return val;
}

export async function hydrateBooking(booking: any) {
  const [property, financialSummary] = await Promise.all([
    propertyDb.getById(booking.propertyId),
    bookingDb.getFinancialSummary(booking.id),
  ]);

  if (!property || !financialSummary) {
    throw new Error('CANONICAL_BOOKING_RELATION_MISSING');
  }

  return {
    ...booking,
    propertyTitle: property.title,
    locationName: property.resortName ? `${property.resortName} — ${property.region || property.address || ''}` : (property.address || property.region || ''),
    propertyImage: property.images?.[0] || '',
    property: {
      id: property.id,
      title: property.title,
      images: property.images || [],
      address: property.address || '',
      region: property.region || '',
      resortName: property.resortName || '',
      locationName: property.locationName || '',
      description: property.description !== undefined ? property.description : null,
      bedrooms: normalizeCanonicalNumeric(property.bedrooms),
      bathrooms: normalizeCanonicalNumeric(property.bathrooms),
      maxGuests: normalizeCanonicalNumeric(property.maxGuests ?? property.max_guests),
      pricePerNight: normalizeCanonicalNumeric(property.pricePerNight ?? property.price_per_night),
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      houseRules: property.houseRules && typeof property.houseRules === 'object' ? property.houseRules : {},
    },
    totalPrice: normalizeCanonicalFinance(financialSummary.totalBookingValue),
    deposit: normalizeCanonicalFinance(financialSummary.depositAmount),
    totalStay: normalizeCanonicalFinance(financialSummary.totalBookingValue),
    depositAmount: normalizeCanonicalFinance(financialSummary.depositAmount),
    remainingAmount: normalizeCanonicalFinance(financialSummary.remainingBalance),
    currency: 'EGP',
    renter: { id: booking.customerId, name: booking.guestName || 'مستأجر', avatar: '', rating: 0 },
    financialSummary: {
      ...financialSummary,
      totalBookingValue: normalizeCanonicalFinance(financialSummary.totalBookingValue),
      depositAmount: normalizeCanonicalFinance(financialSummary.depositAmount),
      solaCommissionAmount: normalizeCanonicalFinance(financialSummary.solaCommissionAmount),
      ownerNetDepositAmount: normalizeCanonicalFinance(financialSummary.ownerNetDepositAmount),
      remainingBalance: normalizeCanonicalFinance(financialSummary.remainingBalance),
      depositPaymentStatus: 'NOT_DUE',
      remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
      remainingBalanceStatus: 'NOT_DUE',
      ownerPayoutStatus: 'OWNER_PAYOUT_PENDING',
      currency: 'EGP',
    },
  };
}

export const BOOKING_CHAT_ENABLED_STATUSES = new Set(['APPROVED_PENDING_PAYMENT', 'CONFIRMED']);

export function isBookingChatEligible(status: string) {
  return BOOKING_CHAT_ENABLED_STATUSES.has(status);
}

function mapConversationRestRow(row: any) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    propertyId: row.property_id,
    customerId: row.customer_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageRestRow(row: any) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role === 'CUSTOMER' ? 'RENTER' : 'OWNER',
    text: row.text,
    type: 'TEXT',
    timestamp: row.created_at,
    isRead: true,
  };
}

async function hydrateConversation(conversation: any) {
  const booking = await bookingDb.getById(conversation.bookingId);
  if (!booking) throw new Error('CANONICAL_CONVERSATION_BOOKING_MISSING');

  const messages = await messageDb.getByConversationId(conversation.id);
  const latest = messages[messages.length - 1];
  return {
    ...conversation,
    propertyTitle: booking.propertyTitle,
    propertyImage: booking.propertyImage,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    bookingStatus: booking.status,
    renter: { id: booking.customerId, name: booking.guestName || 'مستأجر', avatar: '', rating: 0 },
    lastMessage: latest?.text || '',
    lastMessageTimestamp: latest?.timestamp || conversation.createdAt,
    unreadCount: 0,
  };
}

export const conversationDb = {
  async getOrCreateForBooking(booking: any) {
    const existing = await queryDb(
      `SELECT id, booking_id AS "bookingId", property_id AS "propertyId", customer_id AS "customerId", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM booking_conversations WHERE booking_id = $1`,
      [booking.id]
    );
    if (existing.rows[0]) return hydrateConversation(existing.rows[0]);

    const inserted = await queryDb(
      `INSERT INTO booking_conversations (booking_id, property_id, customer_id, owner_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id) DO UPDATE SET updated_at = NOW()
       RETURNING id, booking_id AS "bookingId", property_id AS "propertyId", customer_id AS "customerId", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [booking.id, booking.propertyId, booking.customerId, booking.ownerId]
    );
    if (!inserted.rows[0]) throw new Error('CONVERSATION_PERSISTENCE_FAILED');
    return hydrateConversation(inserted.rows[0]);
  },

  async getForCustomer(conversationId: string, customerId: string) {
    const res = await queryDb(
      `SELECT id, booking_id AS "bookingId", property_id AS "propertyId", customer_id AS "customerId", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM booking_conversations WHERE id = $1 AND customer_id = $2`,
      [conversationId, customerId]
    );
    return res.rows[0] ? hydrateConversation(res.rows[0]) : null;
  },

  async getForOwner(conversationId: string, ownerId: string) {
    const res = await queryDb(
      `SELECT id, booking_id AS "bookingId", property_id AS "propertyId", customer_id AS "customerId", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM booking_conversations WHERE id = $1 AND owner_id = $2`,
      [conversationId, ownerId]
    );
    return res.rows[0] ? hydrateConversation(res.rows[0]) : null;
  },

  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT id, booking_id AS "bookingId", property_id AS "propertyId", customer_id AS "customerId", owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM booking_conversations WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId]
    );
    return Promise.all(res.rows.map(hydrateConversation));
  },
};

export const messageDb = {
  async getByConversationId(conversationId: string) {
    const res = await queryDb(
      `SELECT id, conversation_id AS "conversationId", sender_id AS "senderId", sender_role AS "senderRole", text, created_at AS "timestamp"
       FROM booking_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );
    return res.rows.map((row: any) => ({
      ...row,
      senderRole: row.senderRole === 'CUSTOMER' ? 'RENTER' : 'OWNER',
      type: 'TEXT',
      isRead: true,
    }));
  },

  async create(conversationId: string, senderId: string, senderRole: 'CUSTOMER' | 'OWNER', text: string) {
    const res = await queryDb(
      `INSERT INTO booking_messages (conversation_id, sender_id, sender_role, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id AS "conversationId", sender_id AS "senderId", sender_role AS "senderRole", text, created_at AS "timestamp"`,
      [conversationId, senderId, senderRole, text]
    );
    const row = res.rows[0];
    return row ? { ...row, senderRole: row.senderRole === 'CUSTOMER' ? 'RENTER' : 'OWNER', type: 'TEXT', isRead: true } : null;
  },
};

// ----------------------------------------------------------------------------
// 4. PAYOUTS REPOSITORY (With Idempotency & PII Masking)
// ----------------------------------------------------------------------------
export const payoutDb = {
  async createRequest(req: { id: string; requestNumber: string; ownerId: string; payoutMethodId: string; grossAmount: number; fee: number; netAmount: number; idempotencyKey: string }) {
    const res = await queryDb(
      `INSERT INTO payout_requests (id, request_number, owner_id, payout_method_id, gross_amount, actual_provider_fee, net_amount, status, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_ADMIN_PROCESSING', $8, NOW())
       RETURNING id, request_number AS "requestNumber", owner_id AS "ownerId", gross_amount AS "grossAmount", actual_provider_fee AS "fee", net_amount AS "netAmount", status, idempotency_key AS "idempotencyKey", created_at AS "requestedAt"`,
      [req.id, req.requestNumber, req.ownerId, req.payoutMethodId, req.grossAmount, req.fee, req.netAmount, req.idempotencyKey]
    );
    return res.rows[0];
  },

  async getByIdempotencyKey(key: string) {
    const res = await queryDb(
      `SELECT id, request_number AS "requestNumber", owner_id AS "ownerId", gross_amount AS "grossAmount", actual_provider_fee AS "fee", net_amount AS "netAmount", status, idempotency_key AS "idempotencyKey", created_at AS "requestedAt"
       FROM payout_requests WHERE idempotency_key = $1`,
      [key]
    );
    return res.rows[0] || null;
  },

  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT pr.id, pr.request_number AS "requestNumber", pr.gross_amount AS "amount", pr.actual_provider_fee AS "fee", pr.net_amount AS "netAmount",
              pr.status, pr.created_at AS "requestedAt", pr.processed_at AS "processedAt", pr.rejection_reason AS "rejectionReason",
              pm.account_title AS "accountTitle", pm.method_type AS "type"
       FROM payout_requests pr
       JOIN owner_payout_methods pm ON pr.payout_method_id = pm.id
       WHERE pr.owner_id = $1 ORDER BY pr.created_at DESC`,
      [ownerId]
    );
    return res.rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      fee: Number(r.fee),
      netAmount: Number(r.netAmount),
      currency: 'EGP',
      payoutMethod: { accountTitle: r.accountTitle, type: r.type }
    }));
  },

  async getPendingForAdmin() {
    const res = await queryDb(
      `SELECT pr.id, pr.request_number AS "requestNumber", pr.gross_amount AS "grossAmount", pr.actual_provider_fee AS "fee", pr.net_amount AS "netAmount",
              pr.status, pr.created_at AS "requestedAt",
              o.id AS "ownerId", o.full_name AS "ownerName", o.phone_number AS "ownerPhone",
              pm.method_type AS "methodType", pm.account_title AS "accountTitle", pm.account_number AS "accountNumber"
       FROM payout_requests pr
       JOIN owners o ON pr.owner_id = o.id
       JOIN owner_payout_methods pm ON pr.payout_method_id = pm.id
       ORDER BY pr.created_at DESC`
    );

    return res.rows.map(r => ({
      id: r.id,
      requestNumber: r.requestNumber,
      ownerId: r.ownerId,
      ownerName: r.ownerName,
      ownerPhone: r.ownerPhone,
      grossAmountEgp: Number(r.grossAmount),
      feeEgp: Number(r.fee),
      netAmountEgp: Number(r.netAmount),
      estimatedNetAmountEgp: Number(r.netAmount), // FLOW-ADM-07 PII Fix
      bankMasked: maskPii(r.accountNumber),
      walletMasked: maskPii(r.accountNumber),
      instapayMasked: maskPii(r.accountNumber),
      methodType: r.methodType,
      accountTitle: r.accountTitle,
      status: r.status,
      requestedAt: r.requestedAt
    }));
  },

  async updateStatus(id: string, status: string, rejectionReason?: string, providerTxId?: string) {
    const res = await queryDb(
      `UPDATE payout_requests
       SET status = $2,
           rejection_reason = COALESCE($3, rejection_reason),
           provider_tx_id = COALESCE($4, provider_tx_id),
           processed_at = CASE WHEN $2 = 'COMPLETED' THEN NOW() ELSE processed_at END
       WHERE id = $1
       RETURNING id, request_number AS "requestNumber", status, net_amount AS "netAmount", processed_at AS "processedAt"`,
      [id, status, rejectionReason || null, providerTxId || null]
    );
    return res.rows[0];
  }
};

// ----------------------------------------------------------------------------
// 5. DISPUTES REPOSITORY
// ----------------------------------------------------------------------------
export const disputeDb = {
  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT d.id, d.dispute_number AS "disputeNumber", d.booking_id AS "bookingId", d.property_id AS "propertyId",
              d.reason AS "description", d.status, d.created_at AS "openedAt",
              p.title AS "propertyTitle", p.address AS "locationName",
              b.guest_name AS "renterName", b.guest_phone AS "renterPhone"
       FROM disputes d
       JOIN properties p ON d.property_id = p.id
       JOIN bookings b ON d.booking_id = b.id
       WHERE d.owner_id = $1 ORDER BY d.created_at DESC`,
      [ownerId]
    );

    return res.rows.map(d => ({
      ...d,
      type: 'PROPERTY_MISMATCH',
      severity: 'MEDIUM',
      propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      renterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      evidence: []
    }));
  },

  async getPendingForAdmin() {
    const res = await queryDb(
      `SELECT d.id, d.dispute_number AS "disputeNumber", d.booking_id AS "bookingId", d.reason AS "description",
              d.status, d.created_at AS "openedAt", d.guest_refund_amount AS "guestRefundAmount", d.owner_released_amount AS "ownerReleasedAmount",
              p.title AS "propertyTitle", o.full_name AS "ownerName", b.guest_name AS "renterName"
       FROM disputes d
       JOIN properties p ON d.property_id = p.id
       JOIN owners o ON d.owner_id = o.id
       JOIN bookings b ON d.booking_id = b.id
       ORDER BY d.created_at DESC`
    );
    return res.rows;
  },

  async updateResolution(id: string, status: string, resolutionType: string, refundAmount?: number, adminNotes?: string) {
    const res = await queryDb(
      `UPDATE disputes
       SET status = $2,
           resolution_type = $3,
           guest_refund_amount = COALESCE($4, 0.00),
           admin_notes = COALESCE($5, admin_notes),
           resolved_at = NOW()
       WHERE id = $1
       RETURNING id, dispute_number AS "disputeNumber", status, resolution_type AS "resolutionType", resolved_at AS "resolvedAt"`,
      [id, status, resolutionType, refundAmount || 0, adminNotes || null]
    );
    return res.rows[0];
  }
};

// ----------------------------------------------------------------------------
// 6. NOTIFICATIONS REPOSITORY
// ----------------------------------------------------------------------------
export const notificationDb = {
  async getByOwnerId(ownerId: string) {
    const res = await queryDb(
      `SELECT id, owner_id AS "ownerId", title, message, type, is_read AS "isRead", action_route AS "actionRoute", created_at AS "createdAt"
       FROM notifications WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
    return res.rows;
  },

  async create(notif: { ownerId: string; title: string; message: string; type: string; actionRoute?: string }) {
    const res = await queryDb(
      `INSERT INTO notifications (owner_id, title, message, type, action_route, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING id, owner_id AS "ownerId", title, message, type, is_read AS "isRead", action_route AS "actionRoute", created_at AS "createdAt"`,
      [notif.ownerId, notif.title, notif.message, notif.type, notif.actionRoute || null]
    );
    return res.rows[0];
  }
};

// ----------------------------------------------------------------------------
// 7. UPLOAD INTENT REPOSITORY (TASK 1E-REMEDIATION)
// ----------------------------------------------------------------------------
export const uploadIntentDb = {
  async createIntent(intent: {
    ownerId: string;
    propertyId: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: number;
    idempotencyKey: string;
    expiresAt: Date;
  }) {
    const intentNumber = `INT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await queryDb(
      `INSERT INTO upload_intents (intent_number, owner_id, property_id, object_key, expected_mime_type, expected_size_bytes, idempotency_key, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_key) DO UPDATE SET
         expires_at = EXCLUDED.expires_at
       RETURNING id, intent_number AS "intentNumber", owner_id AS "ownerId", property_id AS "propertyId",
                 object_key AS "objectKey", expected_mime_type AS "expectedMimeType",
                 expected_size_bytes AS "expectedSizeBytes", idempotency_key AS "idempotencyKey",
                 status, expires_at AS "expiresAt", created_at AS "createdAt"`,
      [
        intentNumber,
        intent.ownerId,
        intent.propertyId,
        intent.objectKey,
        intent.mimeType,
        intent.sizeBytes,
        intent.idempotencyKey,
        intent.expiresAt.toISOString(),
      ]
    );
    return res.rows[0];
  },

  async getIntentById(id: string) {
    const res = await queryDb(
      `SELECT id, intent_number AS "intentNumber", owner_id AS "ownerId", property_id AS "propertyId",
              object_key AS "objectKey", expected_mime_type AS "expectedMimeType",
              expected_size_bytes AS "expectedSizeBytes", idempotency_key AS "idempotencyKey",
              status, expires_at AS "expiresAt", created_at AS "createdAt"
       FROM upload_intents WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async commitIntent(id: string, ownerId?: string, propertyId?: string, objectKey?: string) {
    if (!ownerId || !propertyId || !objectKey) {
      throw new Error('UPLOAD_INTENT_COMMIT_SCOPE_REQUIRED');
    }
    const res = await queryDb(
      `UPDATE upload_intents SET status = 'COMMITTED'
       WHERE id = $1 AND owner_id = $2 AND property_id = $3 AND object_key = $4
         AND status = 'PENDING_UPLOAD' AND expires_at > NOW()
       RETURNING id, status`,
      [id, ownerId, propertyId, objectKey]
    );
    return res.rows[0] || null;
  },

  async getExpiredPendingIntents() {
    const res = await queryDb(
      `SELECT id, object_key AS "objectKey" FROM upload_intents WHERE status = 'PENDING_UPLOAD' AND expires_at < NOW()`
    );
    return res.rows;
  },
};

// ----------------------------------------------------------------------------
// 8. PROPERTY IMAGES REPOSITORY (REMEDIATED)
// ----------------------------------------------------------------------------
export const imageDb = {
  async commitPropertyMediaAtomic(img: {
    uploadIntentId: string;
    propertyId: string;
    ownerId: string;
    objectKey: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sortOrder?: number;
    sha256Checksum?: string;
  }) {
    const res = await queryDb(
      `SELECT * FROM konfrm_commit_property_media($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        img.uploadIntentId,
        img.ownerId,
        img.propertyId,
        img.objectKey,
        img.fileUrl,
        img.fileName,
        img.mimeType,
        Number(img.fileSize),
        Number(img.sortOrder || 0),
        img.sha256Checksum || null,
      ]
    );
    return res.rows[0] || null;
  },

  async addImage(img: {
    propertyId: string;
    ownerId: string;
    objectKey: string;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sortOrder?: number;
    uploadIntentId?: string;
    sha256Checksum?: string;
  }) {
    const res = await queryDb(
      `INSERT INTO property_images (property_id, owner_id, object_key, file_url, file_name, mime_type, file_size_bytes, sort_order, upload_intent_id, sha256_checksum, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 0), $9, $10, 'ACTIVE')
       ON CONFLICT (object_key) DO UPDATE SET
         file_url = EXCLUDED.file_url,
         file_name = EXCLUDED.file_name,
         mime_type = EXCLUDED.mime_type,
         file_size_bytes = EXCLUDED.file_size_bytes,
         sha256_checksum = COALESCE(EXCLUDED.sha256_checksum, property_images.sha256_checksum),
         status = 'ACTIVE',
         deleted_at = NULL
       WHERE property_images.owner_id = EXCLUDED.owner_id AND property_images.property_id = EXCLUDED.property_id
       RETURNING id, property_id AS "propertyId", owner_id AS "ownerId", object_key AS "objectKey",
                 file_url AS "fileUrl", file_name AS "fileName", mime_type AS "mimeType",
                 file_size_bytes AS "fileSize", sort_order AS "sortOrder",
                 upload_intent_id AS "uploadIntentId", sha256_checksum AS "sha256Checksum",
                 status, uploaded_at AS "uploadedAt"`,
      [
        img.propertyId,
        img.ownerId,
        img.objectKey,
        img.fileUrl,
        img.fileName,
        img.mimeType,
        img.fileSize,
        img.sortOrder || 0,
        img.uploadIntentId || null,
        img.sha256Checksum || null,
      ]
    );
    return res.rows[0];
  },

  async getImagesByPropertyId(propertyId: string) {
    const res = await queryDb(
      `SELECT id, property_id AS "propertyId", owner_id AS "ownerId", object_key AS "objectKey",
              file_url AS "fileUrl", file_name AS "fileName", mime_type AS "mimeType",
              file_size_bytes AS "fileSize", sort_order AS "sortOrder",
              upload_intent_id AS "uploadIntentId", sha256_checksum AS "sha256Checksum",
              status, uploaded_at AS "uploadedAt"
       FROM property_images
       WHERE property_id = $1 AND status = 'ACTIVE'
       ORDER BY sort_order ASC, uploaded_at ASC`,
      [propertyId]
    );
    return res.rows;
  },

  async getImageByUploadIntentId(uploadIntentId: string) {
    const res = await queryDb(
      `SELECT id, property_id AS "propertyId", owner_id AS "ownerId", object_key AS "objectKey",
              file_url AS "fileUrl", file_name AS "fileName", mime_type AS "mimeType",
              file_size_bytes AS "fileSize", sort_order AS "sortOrder", upload_intent_id AS "uploadIntentId",
              sha256_checksum AS "sha256Checksum", status, uploaded_at AS "uploadedAt"
       FROM property_images WHERE upload_intent_id = $1 AND status = 'ACTIVE'`,
      [uploadIntentId]
    );
    return res.rows[0] || null;
  },

  async getImageForOwnerIncludingDeleted(imageId: string, ownerId: string) {
    const res = await queryDb(
      `SELECT id, property_id AS "propertyId", owner_id AS "ownerId", object_key AS "objectKey",
              file_url AS "fileUrl", file_name AS "fileName", mime_type AS "mimeType",
              file_size_bytes AS "fileSize", sort_order AS "sortOrder",
              upload_intent_id AS "uploadIntentId", sha256_checksum AS "sha256Checksum",
              status, uploaded_at AS "uploadedAt", deleted_at AS "deletedAt"
       FROM property_images WHERE id = $1 AND owner_id = $2`,
      [imageId, ownerId]
    );
    return res.rows[0] || null;
  },

  async deleteImage(imageId: string, ownerId: string) {
    const res = await queryDb(
      `UPDATE property_images
       SET status = 'DELETED', deleted_at = NOW()
       WHERE id = $1 AND owner_id = $2 AND status = 'ACTIVE'
       RETURNING id, object_key AS "objectKey", property_id AS "propertyId"`,
      [imageId, ownerId]
    );
    return res.rows[0] || null;
  },
};

// ----------------------------------------------------------------------------
// 8.5 PROPERTY AVAILABILITY REPOSITORY (P1.4 — manual blocks + unified view)
// ----------------------------------------------------------------------------
// DATE values are rendered with to_char so both the PostgreSQL pool and the
// Worker REST adapter return deterministic 'YYYY-MM-DD' strings.
export const propertyAvailabilityDb = {
  async getByPropertyId(propertyId: string) {
    const res = await queryDb(
      `SELECT id, property_id AS "propertyId", to_char(date, 'YYYY-MM-DD') AS "date",
              is_booked AS "isBooked", custom_price_per_night AS "customPricePerNight",
              note
       FROM property_availability
       WHERE property_id = $1
       ORDER BY date ASC`,
      [propertyId]
    );
    return res.rows;
  },

  // Upsert one date's block state. custom_price_per_night is deliberately not
  // in the SET list: toggling availability never destroys a price override.
  async setBlockedForDate(propertyId: string, date: string, isBooked: boolean, note?: string | null) {
    const res = await queryDb(
      `INSERT INTO property_availability (property_id, date, is_booked, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (property_id, date) DO UPDATE
         SET is_booked = EXCLUDED.is_booked,
             note = EXCLUDED.note
       RETURNING id, property_id AS "propertyId", to_char(date, 'YYYY-MM-DD') AS "date",
                 is_booked AS "isBooked", custom_price_per_night AS "customPricePerNight",
                 note`,
      [propertyId, date, isBooked, note ?? null]
    );
    return res.rows[0] || null;
  },
};

// Unified availability source: canonical blocking booking intervals plus
// manual one-night blocks [D, D+1). Manual entries carry no booking status so
// hasDateRangeOverlap treats them as hard blocks. Fail-closed: callers must
// let read failures surface as 5xx, never as empty availability.
export async function getUnifiedUnavailableBlocks(propertyId: string) {
  const [bookingBlocks, manualRows] = await Promise.all([
    bookingDb.getBlocksByPropertyId(propertyId),
    propertyAvailabilityDb.getByPropertyId(propertyId),
  ]);
  const manualBlocks = manualRows
    .filter((row: any) => row.isBooked === true)
    .map((row: any) => {
      const dayStart = new Date(`${row.date}T00:00:00Z`);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      return { checkIn: row.date, checkOut: dayEnd.toISOString().slice(0, 10) };
    });
  return [...bookingBlocks, ...manualBlocks];
}

// ----------------------------------------------------------------------------
// 9. ADMIN OVERVIEW STATS REPOSITORY
// ----------------------------------------------------------------------------
export const adminStatsDb = {
  async getOverviewStats() {
    const [propRes, bookRes, verRes, payRes, dispRes] = await Promise.all([
      queryDb(`SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') AS "pendingProperties",
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS "publishedProperties",
        COUNT(*) FILTER (WHERE status = 'DRAFT' AND verification_status = 'REJECTED') AS "rejectedProperties",
        COUNT(*) AS "totalProperties"
       FROM properties WHERE deleted_at IS NULL`),
      queryDb(`SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_OWNER_APPROVAL') AS "pendingBookings",
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS "confirmedBookings",
        COUNT(*) AS "totalBookings"
       FROM bookings`),
      queryDb(`SELECT
        COUNT(*) FILTER (WHERE verification_status = 'PENDING_VERIFICATION') AS "pendingVerifications",
        COUNT(*) FILTER (WHERE verification_status = 'VERIFIED') AS "verifiedOwners",
        COUNT(*) AS "totalOwners"
       FROM owners`),
      queryDb(`SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_ADMIN_PROCESSING') AS "pendingPayouts",
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS "completedPayouts",
        COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED'), 0) AS "totalPaidOutEgp"
       FROM payout_requests`),
      queryDb(`SELECT
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'ESCALATED_TO_ADMIN', 'WAITING_FOR_MORE_EVIDENCE')) AS "openDisputes",
        COUNT(*) FILTER (WHERE status = 'RESOLVED') AS "resolvedDisputes",
        COUNT(*) AS "totalDisputes"
       FROM disputes`),
    ]);
    return {
      properties: propRes.rows[0] || {},
      bookings: bookRes.rows[0] || {},
      verifications: verRes.rows[0] || {},
      payouts: payRes.rows[0] || {},
      disputes: dispRes.rows[0] || {},
    };
  },
};

// ----------------------------------------------------------------------------
// 10. WALLET / LEDGER REPOSITORY
// ----------------------------------------------------------------------------
export const walletDb = {
  async getOwnerWalletSummary(ownerId: string) {
    // PAYMENT-01 made owner_wallets and wallet_ledger_entries the financial
    // source of truth. Never rebuild wallet amounts from booking/property data.
    const [walletRes, ledgerRes] = await Promise.all([
      queryDb(
        `SELECT owner_id AS "ownerId", currency,
                available_balance AS "availableBalance", pending_balance AS "pendingBalance",
                held_balance AS "heldBalance", reserved_for_payout_balance AS "reservedForPayout",
                updated_at AS "updatedAt"
         FROM owner_wallets WHERE owner_id = $1`,
        [ownerId]
      ),
      queryDb(
        `SELECT transaction_type AS type, amount
         FROM wallet_ledger_entries WHERE owner_id = $1`,
        [ownerId]
      ),
    ]);

    const wallet = walletRes.rows[0];
    const ledgerRows = ledgerRes.rows;
    const earningTypes = new Set(['DEPOSIT_HELD_IN_ESCROW', 'DEPOSIT_AVAILABLE', 'ADJUSTMENT_CREDIT']);
    const withdrawnTypes = new Set(['PAYOUT_WITHDRAWAL', 'PAYOUT_COMPLETED']);
    const totalEarnedLifeTime = ledgerRows
      .filter((row: any) => earningTypes.has(row.type) && Number(row.amount) > 0)
      .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
    const totalWithdrawnLifeTime = ledgerRows
      .filter((row: any) => withdrawnTypes.has(row.type))
      .reduce((sum: number, row: any) => sum + Math.abs(Number(row.amount)), 0);

    // An owner with no wallet row and no immutable financial history is a
    // genuine zero wallet. Query failures are allowed to throw to the route.
    if (!wallet && ledgerRows.length === 0) {
      return {
        ownerId,
        currency: 'EGP',
        availableBalance: 0,
        pendingBalance: 0,
        reservedForPayout: 0,
        heldBalance: 0,
        totalEarnedLifeTime: 0,
        totalWithdrawnLifeTime: 0,
        updatedAt: null,
      };
    }

    return {
      ownerId,
      currency: wallet?.currency || 'EGP',
      availableBalance: Number(wallet?.availableBalance || 0),
      pendingBalance: Number(wallet?.pendingBalance || 0),
      reservedForPayout: Number(wallet?.reservedForPayout || 0),
      heldBalance: Number(wallet?.heldBalance || 0),
      totalEarnedLifeTime,
      totalWithdrawnLifeTime,
      updatedAt: wallet?.updatedAt || null,
    };
  },

  async getOwnerLedger(ownerId: string, limit = 50, offset = 0) {
    const res = await queryDb(
      `SELECT id, owner_id AS "ownerId", booking_id AS "bookingId", payout_request_id AS "payoutRequestId",
              dispute_id AS "disputeId", transaction_type AS type, amount, balance_after AS "newBalance",
              idempotency_key AS "idempotencyKey", created_at AS "createdAt"
       FROM wallet_ledger_entries
       WHERE owner_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [ownerId, limit, offset]
    );
    return res.rows.map((row: any) => {
      const amount = Number(row.amount || 0);
      const type = String(row.type || 'ADJUSTMENT_CREDIT');
      const presentation = type === 'DEPOSIT_HELD_IN_ESCROW'
        ? { title: 'صافي عربون حجز مؤكد', statusLabel: 'معلق حتى موعد الإتاحة' }
        : type.startsWith('PAYOUT')
          ? { title: 'عملية سحب أرباح', statusLabel: 'تمت المعالجة' }
          : { title: 'حركة مالية في المحفظة', statusLabel: 'مسجلة' };
      return {
        ...row,
        type,
        amount,
        fee: 0,
        netAmount: amount,
        currency: 'EGP',
        previousBalance: Number(row.newBalance || 0) - amount,
        newBalance: Number(row.newBalance || 0),
        description: presentation.title,
        title: presentation.title,
        statusLabel: presentation.statusLabel,
      };
    });
  },
};

// ----------------------------------------------------------------------------
// 8. OTP CHALLENGES REPOSITORY (AUTH-02B2)
// ----------------------------------------------------------------------------
export interface OtpChallengeRecord {
  phoneNumber: string;
  code: string;
  expiresAt: string;
  requestCount: number;
  failedAttempts: number;
  createdAt?: string;
  updatedAt?: string;
}

export const otpDb = {
  async getByPhone(phoneNumber: string): Promise<OtpChallengeRecord | null> {
    const res = await queryDb(
      `SELECT phone_number AS "phoneNumber", code, expires_at AS "expiresAt", request_count AS "requestCount", failed_attempts AS "failedAttempts", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM otp_challenges WHERE phone_number = $1`,
      [phoneNumber]
    );
    return res.rows[0] || null;
  },

  async upsert(challenge: { phoneNumber: string; code: string; expiresAt: string; requestCount: number; failedAttempts?: number }) {
    const res = await queryDb(
      `INSERT INTO otp_challenges (phone_number, code, expires_at, request_count, failed_attempts, created_at, updated_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, 0), NOW(), NOW())
       ON CONFLICT (phone_number) DO UPDATE SET
         code = EXCLUDED.code,
         expires_at = EXCLUDED.expires_at,
         request_count = EXCLUDED.request_count,
         failed_attempts = EXCLUDED.failed_attempts,
         updated_at = NOW()
       RETURNING phone_number AS "phoneNumber", code, expires_at AS "expiresAt", request_count AS "requestCount", failed_attempts AS "failedAttempts"`,
      [challenge.phoneNumber, challenge.code, challenge.expiresAt, challenge.requestCount, challenge.failedAttempts || 0]
    );
    return res.rows[0] || null;
  },

  async updateFailedAttempts(phoneNumber: string, failedAttempts: number) {
    const res = await queryDb(
      `UPDATE otp_challenges SET failed_attempts = $2, updated_at = NOW()
       WHERE phone_number = $1
       RETURNING phone_number AS "phoneNumber", code, expires_at AS "expiresAt", request_count AS "requestCount", failed_attempts AS "failedAttempts"`,
      [phoneNumber, failedAttempts]
    );
    return res.rows[0] || null;
  },

  async delete(phoneNumber: string) {
    await queryDb(
      `DELETE FROM otp_challenges WHERE phone_number = $1`,
      [phoneNumber]
    );
    return true;
  }
};

// ----------------------------------------------------------------------------
// 9. USER SESSIONS REPOSITORY (AUTH-02B2)
// ----------------------------------------------------------------------------
export interface SessionDbRecord {
  id: string;
  userId: string;
  ownerId?: string | null;
  surface: 'CUSTOMER' | 'OWNER';
  role: string;
  refreshTokenHash: string;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  isRevoked: boolean;
  expiresAt: string;
  createdAt: string;
}

export const sessionDb = {
  async create(session: {
    id?: string;
    userId: string;
    ownerId?: string | null;
    surface: 'CUSTOMER' | 'OWNER';
    role: string;
    refreshTokenHash: string;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    expiresAt: string;
  }) {
    const id = session.id || crypto.randomUUID();
    const res = await queryDb(
      `INSERT INTO user_sessions (id, user_id, owner_id, surface, role, refresh_token_hash, device_info, ip_address, is_revoked, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9, NOW(), NOW())
       RETURNING id, user_id AS "userId", owner_id AS "ownerId", surface, role, refresh_token_hash AS "refreshTokenHash", device_info AS "deviceInfo", ip_address AS "ipAddress", is_revoked AS "isRevoked", expires_at AS "expiresAt", created_at AS "createdAt"`,
      [
        id,
        session.userId,
        session.ownerId || null,
        session.surface,
        session.role,
        session.refreshTokenHash,
        session.deviceInfo || null,
        session.ipAddress || null,
        session.expiresAt
      ]
    );
    return res.rows[0];
  },

  async getByRefreshTokenHash(hash: string): Promise<SessionDbRecord | null> {
    const res = await queryDb(
      `SELECT id, user_id AS "userId", owner_id AS "ownerId", surface, role, refresh_token_hash AS "refreshTokenHash", device_info AS "deviceInfo", ip_address AS "ipAddress", is_revoked AS "isRevoked", expires_at AS "expiresAt", created_at AS "createdAt"
       FROM user_sessions WHERE refresh_token_hash = $1`,
      [hash]
    );
    return res.rows[0] || null;
  },

  async revokeByRefreshTokenHash(hash: string): Promise<boolean> {
    const res = await queryDb(
      `UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token_hash = $1`,
      [hash]
    );
    return (res.rowCount || 0) > 0;
  },

  async revokeAllForUser(userId: string, surface?: 'CUSTOMER' | 'OWNER'): Promise<boolean> {
    const query = surface
      ? `UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1 AND surface = $2`
      : `UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1`;
    const params = surface ? [userId, surface] : [userId];
    await queryDb(query, params);
    return true;
  }
};

// ----------------------------------------------------------------------------
// 14. CUSTOMER FAVORITES REPOSITORY
// ----------------------------------------------------------------------------
export const favoriteDb = {
  async getByCustomerId(customerId: string) {
    const res = await queryDb(
      `SELECT customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"
       FROM customer_favorites WHERE customer_id = $1 ORDER BY created_at DESC`,
      [customerId]
    );
    return res.rows;
  },

  async add(customerId: string, propertyId: string) {
    const res = await queryDb(
      'SELECT * FROM konfrm_add_customer_favorite($1, $2)',
      [customerId, propertyId]
    );
    if (res.rows.length === 0) return null;
    if (res.rows.length !== 1) throw new Error('CUSTOMER_FAVORITE_ADD_ROW_COUNT_INVALID');
    return res.rows[0];
  },

  async remove(customerId: string, propertyId: string) {
    await queryDb(
      `DELETE FROM customer_favorites WHERE customer_id = $1 AND property_id = $2
       RETURNING customer_id AS "customerId", property_id AS "propertyId", created_at AS "createdAt"`,
      [customerId, propertyId]
    );
  },
};

