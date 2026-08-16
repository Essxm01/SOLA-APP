/**
 * Sola Vacation Rentals — Phase 7 Repository Factory
 * Location: src/services/repositoryFactory.ts
 * 
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 * 
 * Decouples AppContext from direct mockRepository coupling.
 * Toggleable via environment variable VITE_USE_MOCK_REPO:
 * - VITE_USE_MOCK_REPO=true (or default) => Returns mockRepository instance for local offline mode.
 * - VITE_USE_MOCK_REPO=false => Returns HttpRepository client for production API mode.
 */

import { mockRepository } from './mockRepository';
import { HttpRepository } from './http/HttpRepository';
import type {
  IAuthRepository,
  IOwnerRepository,
  IPropertyRepository,
  ICalendarRepository,
  IBookingRepository,
  IFinancialRepository,
  IWalletRepository,
  IPayoutRepository,
  IDisputeRepository,
  IMessagingRepository,
  INotificationRepository,
  IAnalyticsRepository,
  IDocumentRepository,
} from './contracts';

// Factory flag checking environment configuration
const useMockRepo = import.meta.env.VITE_USE_MOCK_REPO === 'true';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const httpRepo = new HttpRepository(apiBaseUrl);

export const repositoryFactory = {
  useMockMode: useMockRepo,
  
  auth: (useMockRepo ? mockRepository : httpRepo) as unknown as IAuthRepository,
  owner: (useMockRepo ? mockRepository : httpRepo) as unknown as IOwnerRepository,
  property: (useMockRepo ? mockRepository : httpRepo) as unknown as IPropertyRepository,
  calendar: (useMockRepo ? mockRepository : httpRepo) as unknown as ICalendarRepository,
  booking: (useMockRepo ? mockRepository : httpRepo) as unknown as IBookingRepository,
  financial: (useMockRepo ? mockRepository : httpRepo) as unknown as IFinancialRepository,
  wallet: (useMockRepo ? mockRepository : httpRepo) as unknown as IWalletRepository,
  payout: (useMockRepo ? mockRepository : httpRepo) as unknown as IPayoutRepository,
  dispute: (useMockRepo ? mockRepository : httpRepo) as unknown as IDisputeRepository,
  messaging: (useMockRepo ? mockRepository : httpRepo) as unknown as IMessagingRepository,
  notification: (useMockRepo ? mockRepository : httpRepo) as unknown as INotificationRepository,
  analytics: (useMockRepo ? mockRepository : httpRepo) as unknown as IAnalyticsRepository,
  document: (useMockRepo ? mockRepository : httpRepo) as unknown as IDocumentRepository,
};
