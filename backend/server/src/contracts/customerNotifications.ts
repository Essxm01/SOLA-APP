import { isValidUuid } from '../utils/quoteFingerprint.js';

export const CUSTOMER_NOTIFICATION_EVENT_TYPES = [
  'BOOKING_APPROVED_PENDING_PAYMENT',
  'BOOKING_REJECTED',
] as const;

export type CustomerNotificationEventType = typeof CUSTOMER_NOTIFICATION_EVENT_TYPES[number];

export interface CustomerNotificationRecord {
  notificationId: string;
  eventType: CustomerNotificationEventType;
  bookingId: string;
  propertyTitle: string | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
  actionRequired: boolean;
}

export interface CustomerNotificationDto {
  notificationId: string;
  eventType: CustomerNotificationEventType;
  bookingId: string;
  propertyTitle: string | null;
  createdAt: string;
  isRead: boolean;
  actionRequired: boolean;
}

export interface CustomerNotificationCursor {
  createdAt: string;
  id: string;
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value));

export function assertCustomerNotificationRecord(value: any): asserts value is CustomerNotificationRecord {
  if (!value || typeof value !== 'object' ||
      !isValidUuid(value.notificationId) ||
      !CUSTOMER_NOTIFICATION_EVENT_TYPES.includes(value.eventType) ||
      !isValidUuid(value.bookingId) ||
      !(value.propertyTitle === null || (typeof value.propertyTitle === 'string' && value.propertyTitle.length <= 200)) ||
      !isIsoDate(value.createdAt) ||
      !(value.readAt === null || isIsoDate(value.readAt)) ||
      typeof value.isRead !== 'boolean' ||
      typeof value.actionRequired !== 'boolean') {
    throw new Error('MALFORMED_CUSTOMER_NOTIFICATION_RECORD');
  }
}

export function toCustomerNotificationDto(record: CustomerNotificationRecord): CustomerNotificationDto {
  assertCustomerNotificationRecord(record);
  return {
    notificationId: record.notificationId,
    eventType: record.eventType,
    bookingId: record.bookingId,
    propertyTitle: record.propertyTitle,
    createdAt: record.createdAt,
    isRead: record.isRead,
    actionRequired: record.actionRequired,
  };
}

export function encodeCustomerNotificationCursor(cursor: CustomerNotificationCursor): string {
  if (!isValidUuid(cursor.id) || !isIsoDate(cursor.createdAt)) throw new Error('INVALID_NOTIFICATION_CURSOR');
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCustomerNotificationCursor(raw: string | null | undefined): CustomerNotificationCursor | null {
  if (raw === null || raw === undefined || raw === '') return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || !isValidUuid(parsed.id) || !isIsoDate(parsed.createdAt)) {
      throw new Error('INVALID_NOTIFICATION_CURSOR');
    }
    return { id: parsed.id, createdAt: parsed.createdAt };
  } catch {
    throw new Error('INVALID_NOTIFICATION_CURSOR');
  }
}

