/**
 * Application-wide constants
 * 
 * @deprecated This file is deprecated. Import from domain-specific files instead:
 * - @/lib/constants/security for rate limiting and security constants
 * - @/lib/constants/validation for validation and PII constants
 * - @/lib/constants/parsing for report parsing constants
 * 
 * This file re-exports for backward compatibility but will be removed in a future version.
 */

// Re-export from domain-specific files for backward compatibility
export * from './constants/security';
export * from './constants/validation';
export * from './constants/parsing';
