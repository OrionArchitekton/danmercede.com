import React from 'react';

interface IconProps {
  className?: string;
}

export const AuthorityGateIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <line x1="12" y1="6.5" x2="12" y2="17.5" stroke="#FFC08B" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.2" fill="#E68249" />
  </svg>
);

export const ImmutableReceiptIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="8" y1="8" x2="16" y2="8" stroke="#FFC08B" strokeWidth="1.5" />
    <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8.5 16L10.8 18.2L15.5 13.8" stroke="#E68249" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DriftGuardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
    <path d="M12 7V12L15.5 14" stroke="#FFC08B" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.5" fill="#E68249" />
  </svg>
);

export const GatedSubstrateIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <polygon points="12,3 20,7.5 12,12 4,7.5" stroke="#FFC08B" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4 12L12 16.5L20 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4 16.5L12 21L20 16.5" stroke="#E68249" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const OperatorLedgerIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="4" x2="9" y2="20" stroke="#E68249" strokeWidth="1.5" />
    <line x1="12.5" y1="9" x2="17.5" y2="9" stroke="#FFC08B" strokeWidth="1.5" />
    <line x1="12.5" y1="13" x2="17.5" y2="13" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const MeridianCompassIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" />
    <polygon points="12,5 14.5,12 12,19 9.5,12" stroke="#E68249" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="1.4" fill="#FFC08B" />
  </svg>
);
