/**
 * Sola Vacation Rentals — Production PostgreSQL Repository Data Access Layer
 * Location: server/src/services/dbRepository.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { queryDb } from './dbClient.js';
// Helper to mask PII strings for admin queue outputs
export function maskPii(val, visibleLength = 4) {
    if (!val)
        return '****';
    if (val.length <= visibleLength)
        return '*'.repeat(val.length);
    return '*'.repeat(val.length - visibleLength) + val.slice(-visibleLength);
}
// ----------------------------------------------------------------------------
// 1. OWNERS & VERIFICATION REPOSITORY
// ----------------------------------------------------------------------------
export const ownerDb = {
    async getById(ownerId) {
        const res = await queryDb('SELECT id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt" FROM owners WHERE id = $1', [ownerId]);
        return res.rows[0] || null;
    },
    async upsert(owner) {
        const res = await queryDb(`INSERT INTO owners (id, phone_number, full_name, email, avatar_url, status, verification_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'ACTIVE'), COALESCE($7, 'UNVERIFIED'), NOW())
       ON CONFLICT (id) DO UPDATE SET
         phone_number = EXCLUDED.phone_number,
         full_name = COALESCE(EXCLUDED.full_name, owners.full_name),
         email = COALESCE(EXCLUDED.email, owners.email),
         avatar_url = COALESCE(EXCLUDED.avatar_url, owners.avatar_url),
         status = COALESCE(EXCLUDED.status, owners.status),
         verification_status = COALESCE(EXCLUDED.verification_status, owners.verification_status),
         updated_at = NOW()
       RETURNING id, phone_number AS "phoneNumber", full_name AS "fullName", email, avatar_url AS "avatarUrl", status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt"`, [owner.id, owner.phoneNumber, owner.fullName, owner.email || null, owner.avatarUrl || null, owner.status || 'ACTIVE', owner.verificationStatus || 'UNVERIFIED']);
        return res.rows[0];
    },
    async submitDocument(doc) {
        const res = await queryDb(`INSERT INTO owner_verification_documents (owner_id, document_type, document_url, status, uploaded_at)
       VALUES ($1, $2, $3, 'PENDING', NOW())
       RETURNING id, owner_id AS "ownerId", document_type AS "documentType", document_url AS "documentUrl", status, uploaded_at AS "uploadedAt"`, [doc.ownerId, doc.documentType, doc.documentUrl]);
        return res.rows[0];
    },
    async getDocuments(ownerId) {
        const res = await queryDb(`SELECT id, owner_id AS "ownerId", document_type AS "documentType", document_url AS "fileUrl", document_type AS "title", status, uploaded_at AS "uploadedAt"
       FROM owner_verification_documents WHERE owner_id = $1 ORDER BY uploaded_at DESC`, [ownerId]);
        return res.rows;
    },
    async getPendingVerifications() {
        const res = await queryDb(`SELECT o.id AS "ownerId", o.full_name AS "fullName", o.phone_number AS "phoneNumber", o.verification_status AS "verificationStatus",
              d.id AS "documentId", d.document_type AS "documentType", d.document_url AS "fileUrl", d.status AS "docStatus", d.uploaded_at AS "uploadedAt"
       FROM owners o
       LEFT JOIN owner_verification_documents d ON o.id = d.owner_id
       WHERE o.verification_status = 'PENDING_VERIFICATION' OR d.status = 'PENDING'`);
        return res.rows;
    }
};
// ----------------------------------------------------------------------------
// 2. PROPERTIES REPOSITORY
// ----------------------------------------------------------------------------
export const propertyDb = {
    async getByOwnerId(ownerId) {
        const res = await queryDb(`SELECT id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
              address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
              base_price_per_night AS "basePricePerNight", status, verification_status AS "verificationStatus",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM properties WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`, [ownerId]);
        return res.rows.map(p => ({
            ...p,
            pricePerNight: Number(p.pricePerNight),
            basePricePerNight: Number(p.basePricePerNight),
            images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
            locationName: p.address || 'الساحل الشمالي',
            pricing: { basePricePerNight: Number(p.pricePerNight), currency: 'EGP' },
            location: { governorate: 'مطروح', city: 'الساحل الشمالي', district: 'رأس الحكمة', address: p.address },
            capacity: { baseGuests: p.maxGuests, maxGuests: p.maxGuests, bedrooms: p.bedrooms, beds: p.bedrooms, bathrooms: p.bathrooms },
            houseRules: { minStay: 1, maxStay: 30, smokingAllowed: false, partiesAllowed: false, petsAllowed: false, checkInTime: '14:00', checkOutTime: '12:00' },
            amenities: ['شاطئ خاص', 'حمام سباحة', 'تكييف central', 'واي فاي']
        }));
    },
    async getById(id) {
        const res = await queryDb(`SELECT id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
              address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight",
              status, verification_status AS "verificationStatus", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM properties WHERE id = $1 AND deleted_at IS NULL`, [id]);
        if (!res.rows[0])
            return null;
        const p = res.rows[0];
        return {
            ...p,
            pricePerNight: Number(p.pricePerNight),
            images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
            locationName: p.address || 'الساحل الشمالي',
            pricing: { basePricePerNight: Number(p.pricePerNight), currency: 'EGP' },
            location: { governorate: 'مطروح', city: 'الساحل الشمالي', district: 'رأس الحكمة', address: p.address },
            capacity: { baseGuests: p.maxGuests, maxGuests: p.maxGuests, bedrooms: p.bedrooms, beds: p.bedrooms, bathrooms: p.bathrooms },
            houseRules: { minStay: 1, maxStay: 30, smokingAllowed: false, partiesAllowed: false, petsAllowed: false, checkInTime: '14:00', checkOutTime: '12:00' },
            amenities: ['شاطئ خاص', 'حمام سباحة']
        };
    },
    async create(prop) {
        const res = await queryDb(`INSERT INTO properties (id, owner_id, title, unit_type, property_type, address, bedrooms, bathrooms, max_guests, base_price_per_night, status, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType", address, bedrooms, bathrooms, max_guests AS "maxGuests", base_price_per_night AS "pricePerNight", status, verification_status AS "verificationStatus", created_at AS "createdAt"`, [
            prop.id,
            prop.ownerId,
            prop.title,
            prop.unitType || 'CHALET',
            prop.propertyType || prop.unitType || 'CHALET',
            prop.address || 'الساحل الشمالي',
            prop.bedrooms || 2,
            prop.bathrooms || 1,
            prop.maxGuests || 4,
            prop.basePricePerNight || prop.pricePerNight || 3000,
            prop.status || 'PENDING_REVIEW',
            prop.verificationStatus || 'PENDING_VERIFICATION'
        ]);
        return res.rows[0];
    },
    async updateStatus(id, status, verificationStatus) {
        const res = await queryDb(`UPDATE properties
       SET status = COALESCE($2, status),
           verification_status = COALESCE($3, verification_status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, owner_id AS "ownerId", title, status, verification_status AS "verificationStatus", updated_at AS "updatedAt"`, [id, status, verificationStatus || null]);
        return res.rows[0];
    },
    async getAllForAdmin(statusFilter) {
        const params = [];
        let whereClause = 'WHERE p.deleted_at IS NULL';
        if (statusFilter) {
            params.push(statusFilter);
            whereClause += ` AND p.status = $${params.length}`;
        }
        const res = await queryDb(`SELECT p.id, p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.id, p.owner_id) AS "ownerId", COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       ${whereClause} ORDER BY p.created_at DESC`, params);
        return res.rows.map(r => ({
            ...r,
            pricePerNight: Number(r.pricePerNight),
        }));
    },
    async getPendingForAdmin() {
        const res = await queryDb(`SELECT p.id, p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.id, p.owner_id) AS "ownerId", COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       WHERE p.deleted_at IS NULL AND (p.status = 'PENDING_REVIEW' OR p.status = 'REJECTED')
       ORDER BY CASE WHEN p.status = 'PENDING_REVIEW' THEN 0 ELSE 1 END, p.created_at ASC`);
        return res.rows.map(r => ({
            ...r,
            pricePerNight: Number(r.pricePerNight),
        }));
    },
    async getDetailForAdmin(id) {
        const res = await queryDb(`SELECT p.id, p.owner_id AS "ownerId", p.title, p.unit_type AS "unitType", p.property_type AS "propertyType",
              p.address, p.bedrooms, p.bathrooms, p.max_guests AS "maxGuests",
              p.base_price_per_night AS "pricePerNight",
              p.status, p.verification_status AS "verificationStatus",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              COALESCE(o.full_name, 'مالك صولا') AS "ownerName", COALESCE(o.phone_number, '') AS "ownerPhone", o.email AS "ownerEmail",
              COALESCE(o.verification_status, 'UNVERIFIED') AS "ownerVerificationStatus", COALESCE(o.status, 'ACTIVE') AS "ownerStatus",
              o.created_at AS "ownerCreatedAt"
       FROM properties p
       LEFT JOIN owners o ON p.owner_id = o.id
       WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
        if (!res.rows[0])
            return null;
        const p = res.rows[0];
        return {
            ...p,
            pricePerNight: Number(p.pricePerNight),
        };
    },
    async update(id, ownerId, updates) {
        const fields = [];
        const values = [id, ownerId];
        let paramIdx = 3;
        if (updates.title !== undefined) {
            fields.push(`title = $${paramIdx++}`);
            values.push(updates.title);
        }
        if (updates.unitType !== undefined) {
            fields.push(`unit_type = $${paramIdx++}`);
            values.push(updates.unitType);
        }
        if (updates.propertyType !== undefined) {
            fields.push(`property_type = $${paramIdx++}`);
            values.push(updates.propertyType);
        }
        if (updates.address !== undefined) {
            fields.push(`address = $${paramIdx++}`);
            values.push(updates.address);
        }
        if (updates.bedrooms !== undefined) {
            fields.push(`bedrooms = $${paramIdx++}`);
            values.push(updates.bedrooms);
        }
        if (updates.bathrooms !== undefined) {
            fields.push(`bathrooms = $${paramIdx++}`);
            values.push(updates.bathrooms);
        }
        if (updates.maxGuests !== undefined) {
            fields.push(`max_guests = $${paramIdx++}`);
            values.push(updates.maxGuests);
        }
        if (updates.basePricePerNight !== undefined) {
            fields.push(`base_price_per_night = $${paramIdx++}`);
            values.push(updates.basePricePerNight);
        }
        if (updates.status !== undefined) {
            fields.push(`status = $${paramIdx++}`);
            values.push(updates.status);
        }
        if (updates.verificationStatus !== undefined) {
            fields.push(`verification_status = $${paramIdx++}`);
            values.push(updates.verificationStatus);
        }
        if (fields.length === 0)
            return null;
        fields.push('updated_at = NOW()');
        const res = await queryDb(`UPDATE properties SET ${fields.join(', ')} WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
       RETURNING id, owner_id AS "ownerId", title, unit_type AS "unitType", property_type AS "propertyType",
                 address, bedrooms, bathrooms, max_guests AS "maxGuests",
                 base_price_per_night AS "pricePerNight", status, verification_status AS "verificationStatus",
                 created_at AS "createdAt", updated_at AS "updatedAt"`, values);
        return res.rows[0] || null;
    },
    async getAdminStats() {
        const res = await queryDb(`SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') AS "pendingReview",
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS "published",
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS "rejected",
        COUNT(*) AS "total"
       FROM properties WHERE deleted_at IS NULL`);
        return res.rows[0] || { pendingReview: 0, published: 0, rejected: 0, total: 0 };
    }
};
// ----------------------------------------------------------------------------
// 3. BOOKINGS REPOSITORY
// ----------------------------------------------------------------------------
export const bookingDb = {
    async getByOwnerId(ownerId) {
        const res = await queryDb(`SELECT b.id, b.booking_number AS "bookingNumber", b.property_id AS "propertyId", b.owner_id AS "ownerId",
              b.guest_name AS "guestName", b.guest_phone AS "guestPhone", b.check_in AS "checkIn", b.check_out AS "checkOut",
              b.nights, b.total_guests AS "guestsCount", b.status, b.created_at AS "createdAt", b.confirmed_at AS "confirmedAt",
              p.title AS "propertyTitle", p.address AS "locationName"
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       WHERE b.owner_id = $1 ORDER BY b.created_at DESC`, [ownerId]);
        return res.rows.map(b => ({
            ...b,
            propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
            totalPrice: b.nights * 5000,
            deposit: 5000,
            currency: 'EGP',
            renter: {
                id: 'cust001',
                name: b.guestName || 'مستأجر صولا المعتمد',
                phone: b.guestPhone || '+201111111111',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                rating: 5.0
            },
            financialSummary: {
                totalBookingValue: b.nights * 5000,
                depositAmount: 5000,
                depositPaymentStatus: 'PAID',
                solaCommissionAmount: 1000,
                ownerNetDepositAmount: 4000,
                remainingBalance: (b.nights - 1) * 5000,
                remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
                remainingBalanceStatus: 'NOT_DUE',
                ownerPayoutStatus: 'OWNER_PAYOUT_PENDING',
                currency: 'EGP',
                createdAt: b.createdAt
            }
        }));
    },
    async create(bk) {
        const res = await queryDb(`INSERT INTO bookings (id, booking_number, property_id, owner_id, guest_name, guest_phone, check_in, check_out, nights, total_guests, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, booking_number AS "bookingNumber", property_id AS "propertyId", owner_id AS "ownerId", guest_name AS "guestName", guest_phone AS "guestPhone", check_in AS "checkIn", check_out AS "checkOut", nights, total_guests AS "guestsCount", status, created_at AS "createdAt"`, [bk.id, bk.bookingNumber, bk.propertyId, bk.ownerId, bk.guestName || 'مستأجر صولا', bk.guestPhone || '+201111111111', bk.checkIn, bk.checkOut, bk.nights, bk.totalGuests || 2, bk.status || 'PENDING_OWNER_APPROVAL']);
        return res.rows[0];
    },
    async updateStatus(id, status) {
        const res = await queryDb(`UPDATE bookings
       SET status = $2,
           confirmed_at = CASE WHEN $2 = 'CONFIRMED' THEN NOW() ELSE confirmed_at END,
           rejected_at = CASE WHEN $2 = 'REJECTED' THEN NOW() ELSE rejected_at END
       WHERE id = $1
       RETURNING id, booking_number AS "bookingNumber", status, confirmed_at AS "confirmedAt", rejected_at AS "rejectedAt"`, [id, status]);
        return res.rows[0];
    },
    async getBlocksByPropertyId(propertyId) {
        const res = await queryDb(`SELECT check_in AS "checkIn", check_out AS "checkOut", status
       FROM bookings
       WHERE property_id = $1 AND status NOT IN ('REJECTED', 'CANCELLED_BY_GUEST', 'EXPIRED')`, [propertyId]);
        return res.rows;
    }
};
// ----------------------------------------------------------------------------
// 4. PAYOUTS REPOSITORY (With Idempotency & PII Masking)
// ----------------------------------------------------------------------------
export const payoutDb = {
    async createRequest(req) {
        const res = await queryDb(`INSERT INTO payout_requests (id, request_number, owner_id, payout_method_id, gross_amount, actual_provider_fee, net_amount, status, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_ADMIN_PROCESSING', $8, NOW())
       RETURNING id, request_number AS "requestNumber", owner_id AS "ownerId", gross_amount AS "grossAmount", actual_provider_fee AS "fee", net_amount AS "netAmount", status, idempotency_key AS "idempotencyKey", created_at AS "requestedAt"`, [req.id, req.requestNumber, req.ownerId, req.payoutMethodId, req.grossAmount, req.fee, req.netAmount, req.idempotencyKey]);
        return res.rows[0];
    },
    async getByIdempotencyKey(key) {
        const res = await queryDb(`SELECT id, request_number AS "requestNumber", owner_id AS "ownerId", gross_amount AS "grossAmount", actual_provider_fee AS "fee", net_amount AS "netAmount", status, idempotency_key AS "idempotencyKey", created_at AS "requestedAt"
       FROM payout_requests WHERE idempotency_key = $1`, [key]);
        return res.rows[0] || null;
    },
    async getByOwnerId(ownerId) {
        const res = await queryDb(`SELECT pr.id, pr.request_number AS "requestNumber", pr.gross_amount AS "amount", pr.actual_provider_fee AS "fee", pr.net_amount AS "netAmount",
              pr.status, pr.created_at AS "requestedAt", pr.processed_at AS "processedAt", pr.rejection_reason AS "rejectionReason",
              pm.account_title AS "accountTitle", pm.method_type AS "type"
       FROM payout_requests pr
       JOIN owner_payout_methods pm ON pr.payout_method_id = pm.id
       WHERE pr.owner_id = $1 ORDER BY pr.created_at DESC`, [ownerId]);
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
        const res = await queryDb(`SELECT pr.id, pr.request_number AS "requestNumber", pr.gross_amount AS "grossAmount", pr.actual_provider_fee AS "fee", pr.net_amount AS "netAmount",
              pr.status, pr.created_at AS "requestedAt",
              o.id AS "ownerId", o.full_name AS "ownerName", o.phone_number AS "ownerPhone",
              pm.method_type AS "methodType", pm.account_title AS "accountTitle", pm.account_number AS "accountNumber"
       FROM payout_requests pr
       JOIN owners o ON pr.owner_id = o.id
       JOIN owner_payout_methods pm ON pr.payout_method_id = pm.id
       ORDER BY pr.created_at DESC`);
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
    async updateStatus(id, status, rejectionReason, providerTxId) {
        const res = await queryDb(`UPDATE payout_requests
       SET status = $2,
           rejection_reason = COALESCE($3, rejection_reason),
           provider_tx_id = COALESCE($4, provider_tx_id),
           processed_at = CASE WHEN $2 = 'COMPLETED' THEN NOW() ELSE processed_at END
       WHERE id = $1
       RETURNING id, request_number AS "requestNumber", status, net_amount AS "netAmount", processed_at AS "processedAt"`, [id, status, rejectionReason || null, providerTxId || null]);
        return res.rows[0];
    }
};
// ----------------------------------------------------------------------------
// 5. DISPUTES REPOSITORY
// ----------------------------------------------------------------------------
export const disputeDb = {
    async getByOwnerId(ownerId) {
        const res = await queryDb(`SELECT d.id, d.dispute_number AS "disputeNumber", d.booking_id AS "bookingId", d.property_id AS "propertyId",
              d.reason AS "description", d.status, d.created_at AS "openedAt",
              p.title AS "propertyTitle", p.address AS "locationName",
              b.guest_name AS "renterName", b.guest_phone AS "renterPhone"
       FROM disputes d
       JOIN properties p ON d.property_id = p.id
       JOIN bookings b ON d.booking_id = b.id
       WHERE d.owner_id = $1 ORDER BY d.created_at DESC`, [ownerId]);
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
        const res = await queryDb(`SELECT d.id, d.dispute_number AS "disputeNumber", d.booking_id AS "bookingId", d.reason AS "description",
              d.status, d.created_at AS "openedAt", d.guest_refund_amount AS "guestRefundAmount", d.owner_released_amount AS "ownerReleasedAmount",
              p.title AS "propertyTitle", o.full_name AS "ownerName", b.guest_name AS "renterName"
       FROM disputes d
       JOIN properties p ON d.property_id = p.id
       JOIN owners o ON d.owner_id = o.id
       JOIN bookings b ON d.booking_id = b.id
       ORDER BY d.created_at DESC`);
        return res.rows;
    },
    async updateResolution(id, status, resolutionType, refundAmount, adminNotes) {
        const res = await queryDb(`UPDATE disputes
       SET status = $2,
           resolution_type = $3,
           guest_refund_amount = COALESCE($4, 0.00),
           admin_notes = COALESCE($5, admin_notes),
           resolved_at = NOW()
       WHERE id = $1
       RETURNING id, dispute_number AS "disputeNumber", status, resolution_type AS "resolutionType", resolved_at AS "resolvedAt"`, [id, status, resolutionType, refundAmount || 0, adminNotes || null]);
        return res.rows[0];
    }
};
// ----------------------------------------------------------------------------
// 6. NOTIFICATIONS REPOSITORY
// ----------------------------------------------------------------------------
export const notificationDb = {
    async getByOwnerId(ownerId) {
        const res = await queryDb(`SELECT id, owner_id AS "ownerId", title, message, type, is_read AS "isRead", action_route AS "actionRoute", created_at AS "createdAt"
       FROM notifications WHERE owner_id = $1 ORDER BY created_at DESC`, [ownerId]);
        return res.rows;
    },
    async create(notif) {
        const res = await queryDb(`INSERT INTO notifications (owner_id, title, message, type, action_route, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING id, owner_id AS "ownerId", title, message, type, is_read AS "isRead", action_route AS "actionRoute", created_at AS "createdAt"`, [notif.ownerId, notif.title, notif.message, notif.type, notif.actionRoute || null]);
        return res.rows[0];
    }
};
// ----------------------------------------------------------------------------
// 7. UPLOAD INTENT REPOSITORY (TASK 1E-REMEDIATION)
// ----------------------------------------------------------------------------
export const uploadIntentDb = {
    async createIntent(intent) {
        const intentNumber = `INT_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const res = await queryDb(`INSERT INTO upload_intents (intent_number, owner_id, property_id, object_key, expected_mime_type, expected_size_bytes, idempotency_key, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (idempotency_key) DO UPDATE SET
         expires_at = EXCLUDED.expires_at
       RETURNING id, intent_number AS "intentNumber", owner_id AS "ownerId", property_id AS "propertyId",
                 object_key AS "objectKey", expected_mime_type AS "expectedMimeType",
                 expected_size_bytes AS "expectedSizeBytes", idempotency_key AS "idempotencyKey",
                 status, expires_at AS "expiresAt", created_at AS "createdAt"`, [
            intentNumber,
            intent.ownerId,
            intent.propertyId,
            intent.objectKey,
            intent.mimeType,
            intent.sizeBytes,
            intent.idempotencyKey,
            intent.expiresAt.toISOString(),
        ]);
        return res.rows[0];
    },
    async getIntentById(id) {
        const res = await queryDb(`SELECT id, intent_number AS "intentNumber", owner_id AS "ownerId", property_id AS "propertyId",
              object_key AS "objectKey", expected_mime_type AS "expectedMimeType",
              expected_size_bytes AS "expectedSizeBytes", idempotency_key AS "idempotencyKey",
              status, expires_at AS "expiresAt", created_at AS "createdAt"
       FROM upload_intents WHERE id = $1`, [id]);
        return res.rows[0] || null;
    },
    async commitIntent(id) {
        const res = await queryDb(`UPDATE upload_intents SET status = 'COMMITTED' WHERE id = $1 RETURNING id, status`, [id]);
        return res.rows[0] || null;
    },
    async getExpiredPendingIntents() {
        const res = await queryDb(`SELECT id, object_key AS "objectKey" FROM upload_intents WHERE status = 'PENDING_UPLOAD' AND expires_at < NOW()`);
        return res.rows;
    },
};
// ----------------------------------------------------------------------------
// 8. PROPERTY IMAGES REPOSITORY (REMEDIATED)
// ----------------------------------------------------------------------------
export const imageDb = {
    async addImage(img) {
        const res = await queryDb(`INSERT INTO property_images (property_id, owner_id, object_key, file_url, file_name, mime_type, file_size_bytes, sort_order, upload_intent_id, sha256_checksum, status)
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
                 status, uploaded_at AS "uploadedAt"`, [
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
        ]);
        return res.rows[0];
    },
    async getImagesByPropertyId(propertyId) {
        const res = await queryDb(`SELECT id, property_id AS "propertyId", owner_id AS "ownerId", object_key AS "objectKey",
              file_url AS "fileUrl", file_name AS "fileName", mime_type AS "mimeType",
              file_size_bytes AS "fileSize", sort_order AS "sortOrder",
              upload_intent_id AS "uploadIntentId", sha256_checksum AS "sha256Checksum",
              status, uploaded_at AS "uploadedAt"
       FROM property_images
       WHERE property_id = $1 AND status = 'ACTIVE'
       ORDER BY sort_order ASC, uploaded_at ASC`, [propertyId]);
        return res.rows;
    },
    async deleteImage(imageId, ownerId) {
        const res = await queryDb(`UPDATE property_images
       SET status = 'DELETED', deleted_at = NOW()
       WHERE id = $1 AND owner_id = $2 AND status = 'ACTIVE'
       RETURNING id, object_key AS "objectKey", property_id AS "propertyId"`, [imageId, ownerId]);
        return res.rows[0] || null;
    },
};
// ----------------------------------------------------------------------------
// 9. ADMIN OVERVIEW STATS REPOSITORY
// ----------------------------------------------------------------------------
export const adminStatsDb = {
    async getOverviewStats() {
        const [propRes, bookRes, verRes, payRes, dispRes] = await Promise.all([
            queryDb(`SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') AS "pendingProperties",
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS "publishedProperties",
        COUNT(*) FILTER (WHERE status = 'REJECTED') AS "rejectedProperties",
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
    async getOwnerWalletSummary(ownerId) {
        // Compute wallet from bookings that have been settled
        const res = await queryDb(`SELECT
        COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' THEN p.base_price_per_night * 0.80 ELSE 0 END), 0) AS "totalEarnedLifeTime",
        COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' AND b.check_in <= CURRENT_DATE THEN p.base_price_per_night * 0.80 ELSE 0 END), 0) AS "availableBalance",
        COALESCE(SUM(CASE WHEN b.status = 'CONFIRMED' AND b.check_in > CURRENT_DATE THEN p.base_price_per_night * 0.80 ELSE 0 END), 0) AS "pendingBalance"
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       WHERE b.owner_id = $1`, [ownerId]);
        const payoutRes = await queryDb(`SELECT
        COALESCE(SUM(net_amount) FILTER (WHERE status = 'COMPLETED'), 0) AS "totalWithdrawnLifeTime",
        COALESCE(SUM(net_amount) FILTER (WHERE status IN ('PENDING_ADMIN_PROCESSING', 'PROCESSING')), 0) AS "reservedForPayout"
       FROM payout_requests WHERE owner_id = $1`, [ownerId]);
        const disputeRes = await queryDb(`SELECT COALESCE(SUM(d.guest_refund_amount), 0) AS "heldBalance"
       FROM disputes d WHERE d.owner_id = $1 AND d.status IN ('OPEN', 'ESCALATED_TO_ADMIN', 'WAITING_FOR_MORE_EVIDENCE')`, [ownerId]);
        const w = res.rows[0] || {};
        const p = payoutRes.rows[0] || {};
        const d = disputeRes.rows[0] || {};
        return {
            ownerId,
            currency: 'EGP',
            availableBalance: Number(w.availableBalance || 0) - Number(p.reservedForPayout || 0) - Number(p.totalWithdrawnLifeTime || 0),
            pendingBalance: Number(w.pendingBalance || 0),
            reservedForPayout: Number(p.reservedForPayout || 0),
            heldBalance: Number(d.heldBalance || 0),
            totalEarnedLifeTime: Number(w.totalEarnedLifeTime || 0),
            totalWithdrawnLifeTime: Number(p.totalWithdrawnLifeTime || 0),
        };
    },
    async getOwnerLedger(ownerId, limit = 50, offset = 0) {
        // Combine booking credits and payout debits into a unified ledger
        const res = await queryDb(`(SELECT 'DEPOSIT_CREDIT' AS type, b.id, p.base_price_per_night * 0.80 AS amount,
              p.base_price_per_night * 0.20 AS fee, p.base_price_per_night * 0.80 AS "netAmount",
              'EGP' AS currency, b.created_at AS "createdAt",
              CONCAT('حجز #', b.booking_number) AS description
       FROM bookings b JOIN properties p ON b.property_id = p.id
       WHERE b.owner_id = $1 AND b.status = 'CONFIRMED')
       UNION ALL
       (SELECT 'PAYOUT_DEBIT' AS type, pr.id, pr.gross_amount * -1 AS amount,
              pr.actual_provider_fee AS fee, pr.net_amount * -1 AS "netAmount",
              'EGP' AS currency, pr.created_at AS "createdAt",
              CONCAT('سحب #', pr.request_number) AS description
       FROM payout_requests pr WHERE pr.owner_id = $1 AND pr.status = 'COMPLETED')
       ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`, [ownerId, limit, offset]);
        return res.rows.map(r => ({
            ...r,
            amount: Number(r.amount),
            fee: Number(r.fee),
            netAmount: Number(r.netAmount),
        }));
    },
};
