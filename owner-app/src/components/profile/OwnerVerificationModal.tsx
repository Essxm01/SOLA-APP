import React from 'react';
import { OwnerKycOnboarding } from '../auth/OwnerKycOnboarding';

export interface OwnerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The profile entry point deliberately reuses the canonical private KYC flow. */
export const OwnerVerificationModal: React.FC<OwnerVerificationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <OwnerKycOnboarding allowClose onClose={onClose} onComplete={onClose} />;
};
