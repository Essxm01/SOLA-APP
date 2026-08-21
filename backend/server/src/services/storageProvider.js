/**
 * Sola Vacation Rentals — Authoritative Object Storage Provider (Supabase Storage & Local Engine)
 * Location: server/src/services/storageProvider.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
/**
 * Validates Binary Magic Bytes against declared MIME type
 */
export function verifyMagicBytes(buffer, declaredMimeType) {
    if (!buffer || buffer.length < 4) {
        return { isValid: false };
    }
    // PNG: \x89PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return { isValid: declaredMimeType.toLowerCase() === 'image/png', detectedMime: 'image/png' };
    }
    // JPEG: \xFF\xD8\xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { isValid: declaredMimeType.toLowerCase() === 'image/jpeg' || declaredMimeType.toLowerCase() === 'image/jpg', detectedMime: 'image/jpeg' };
    }
    // WEBP: RIFF...WEBP
    if (buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer.length >= 12 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50) {
        return { isValid: declaredMimeType.toLowerCase() === 'image/webp', detectedMime: 'image/webp' };
    }
    // PDF: %PDF-
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return { isValid: declaredMimeType.toLowerCase() === 'application/pdf', detectedMime: 'application/pdf' };
    }
    return { isValid: false };
}
export function computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Local Disk Object Storage Engine (Real Binary File I/O under backend/storage_volume/)
 */
export class LocalStorageEngineProvider {
    baseDir;
    cdnHost;
    secretKey;
    constructor() {
        const isVercel = Boolean(process.env.VERCEL);
        this.baseDir = isVercel
            ? path.join(process.env.TMPDIR || '/tmp', 'storage_volume')
            : path.resolve(process.cwd(), 'storage_volume');
        this.cdnHost = process.env.STORAGE_CDN_HOST || 'http://localhost:4000/storage';
        this.secretKey = process.env.STORAGE_SECRET_KEY || 'sola_storage_secret_key_2026';
        try {
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
            }
        }
        catch (e) {
            console.warn('[StorageProvider] Could not create local storage directory:', e);
        }
    }
    getProviderName() {
        return 'local';
    }
    getPhysicalPath(objectKey) {
        const safeKey = objectKey.replace(/\.\./g, '_');
        return path.join(this.baseDir, safeKey);
    }
    async generateSignedUploadUrl(params) {
        const expiresTimestamp = params.expiresAt.getTime();
        const tokenPayload = `PUT:${params.intentId}:${params.ownerId}:${params.propertyId}:${params.objectKey}:${params.mimeType}:${expiresTimestamp}`;
        const sig = crypto.createHmac('sha256', this.secretKey).update(tokenPayload).digest('hex');
        const uploadUrl = `${this.cdnHost}/upload?intentId=${params.intentId}&key=${encodeURIComponent(params.objectKey)}&sig=${sig}&expires=${expiresTimestamp}`;
        const downloadUrl = `${this.cdnHost}/files/${params.objectKey}`;
        return {
            uploadUrl,
            downloadUrl,
            headers: {
                'content-type': params.mimeType,
                'x-sola-upload-intent': params.intentId,
            },
            objectKey: params.objectKey,
            expiresInSeconds: Math.floor((expiresTimestamp - Date.now()) / 1000),
        };
    }
    async verifyObjectExists(objectKey) {
        const target = this.getPhysicalPath(objectKey);
        if (!fs.existsSync(target)) {
            return { exists: false };
        }
        const stat = fs.statSync(target);
        const buffer = fs.readFileSync(target);
        return {
            exists: true,
            sizeBytes: stat.size,
            sha256Checksum: computeSha256(buffer),
        };
    }
    async putObject(objectKey, buffer, mimeType) {
        const target = this.getPhysicalPath(objectKey);
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(target, buffer);
        const checksum = computeSha256(buffer);
        return {
            success: true,
            objectKey,
            sizeBytes: buffer.length,
            sha256Checksum: checksum,
            downloadUrl: `${this.cdnHost}/files/${objectKey}`,
        };
    }
    async getObject(objectKey) {
        const target = this.getPhysicalPath(objectKey);
        if (!fs.existsSync(target)) {
            throw new Error('OBJECT_NOT_FOUND_IN_STORAGE');
        }
        const buffer = fs.readFileSync(target);
        const ext = objectKey.substring(objectKey.lastIndexOf('.')).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg')
            mimeType = 'image/jpeg';
        if (ext === '.png')
            mimeType = 'image/png';
        if (ext === '.webp')
            mimeType = 'image/webp';
        if (ext === '.pdf')
            mimeType = 'application/pdf';
        return {
            buffer,
            mimeType,
            sizeBytes: buffer.length,
        };
    }
    async deleteObject(objectKey) {
        const target = this.getPhysicalPath(objectKey);
        if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            return true;
        }
        return false;
    }
}
/**
 * Real Supabase Storage Provider Implementation (Strict Production Mode)
 */
export class SupabaseStorageProvider {
    client;
    bucketName;
    supabaseUrl;
    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'property-media';
        if (!url || !key) {
            throw new Error('FATAL_MISSING_SUPABASE_STORAGE_CREDENTIALS: SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables are required when OBJECT_STORAGE_PROVIDER=supabase.');
        }
        this.supabaseUrl = url;
        this.client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    getProviderName() {
        return 'supabase';
    }
    async ensureBucketExists() {
        try {
            const { data: buckets } = await this.client.storage.listBuckets();
            const exists = buckets?.some((b) => b.name === this.bucketName);
            if (!exists) {
                await this.client.storage.createBucket(this.bucketName, { public: true });
            }
        }
        catch {
            // Ignore if already exists or permission restricted
        }
    }
    async generateSignedUploadUrl(params) {
        await this.ensureBucketExists();
        const { data, error } = await this.client.storage
            .from(this.bucketName)
            .createSignedUploadUrl(params.objectKey);
        if (error || !data) {
            throw new Error(`SUPABASE_SIGNED_URL_ERROR: ${error?.message || 'Failed to generate signed URL from Supabase Storage'}`);
        }
        const downloadUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${params.objectKey}`;
        return {
            uploadUrl: data.signedUrl,
            downloadUrl,
            headers: { 'content-type': params.mimeType, 'x-sola-upload-intent': params.intentId },
            objectKey: params.objectKey,
            expiresInSeconds: 300,
        };
    }
    async verifyObjectExists(objectKey) {
        const dir = path.dirname(objectKey);
        const fileName = path.basename(objectKey);
        const { data, error } = await this.client.storage.from(this.bucketName).list(dir, { search: fileName });
        if (error || !data || data.length === 0) {
            return { exists: false };
        }
        const file = data.find((f) => f.name === fileName);
        if (!file)
            return { exists: false };
        return {
            exists: true,
            sizeBytes: file.metadata?.size || 0,
        };
    }
    async putObject(objectKey, buffer, mimeType) {
        await this.ensureBucketExists();
        const { error } = await this.client.storage.from(this.bucketName).upload(objectKey, buffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (error) {
            throw new Error(`SUPABASE_UPLOAD_ERROR: ${error.message}`);
        }
        const downloadUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${objectKey}`;
        return {
            success: true,
            objectKey,
            sizeBytes: buffer.length,
            sha256Checksum: computeSha256(buffer),
            downloadUrl,
        };
    }
    async getObject(objectKey) {
        const { data, error } = await this.client.storage.from(this.bucketName).download(objectKey);
        if (error || !data) {
            throw new Error(`SUPABASE_DOWNLOAD_ERROR: ${error?.message || 'Object not found in Supabase Storage'}`);
        }
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
            buffer,
            mimeType: data.type || 'application/octet-stream',
            sizeBytes: buffer.length,
        };
    }
    async deleteObject(objectKey) {
        const { error } = await this.client.storage.from(this.bucketName).remove([objectKey]);
        return !error;
    }
}
/**
 * Storage Provider Factory (Strict Policy: No Silent Fallback)
 */
export function createStorageProvider() {
    const defaultProvider = process.env.VERCEL ? 'supabase' : 'local';
    const providerType = (process.env.OBJECT_STORAGE_PROVIDER || defaultProvider).toLowerCase().trim();
    if (providerType === 'supabase') {
        return new SupabaseStorageProvider();
    }
    if (providerType === 'local') {
        return new LocalStorageEngineProvider();
    }
    throw new Error(`INVALID_OBJECT_STORAGE_PROVIDER: Unknown provider '${providerType}'. Must be 'supabase' or 'local'.`);
}
