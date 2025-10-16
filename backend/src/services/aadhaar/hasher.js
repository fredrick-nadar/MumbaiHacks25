const crypto = require('crypto');
const config = require('../../config/env');

/**
 * Hash Aadhaar reference with salt for secure storage
 * @param {string} reference - Aadhaar reference number
 * @param {string} salt - Salt from environment
 * @returns {string} SHA256 hash in hex format
 */
function hashReference(reference, salt = config.aadhaarSalt) {
  if (!reference || !salt) {
    throw new Error('Reference and salt are required for hashing');
  }
  
  const hash = crypto.createHash('sha256');
  hash.update(salt + reference);
  return hash.digest('hex');
}

/**
 * Create a preview of reference for UI display (masked)
 * @param {string} reference - Aadhaar reference number
 * @returns {string} Masked reference for display
 */
function previewReference(reference) {
  if (!reference) return '****';
  
  if (reference.length <= 4) {
    return '*'.repeat(reference.length);
  }
  
  // Show last 4 characters, mask the rest
  const lastFour = reference.slice(-4);
  const maskedPart = '*'.repeat(Math.max(0, reference.length - 4));
  
  return maskedPart + lastFour;
}

/**
 * Generate a short hash preview for UI (first 8 chars of hash)
 * @param {string} reference - Aadhaar reference number
 * @returns {string} Short hash for preview
 */
function shortHashPreview(reference) {
  if (!reference) return '********';
  
  const hash = crypto.createHash('sha256');
  hash.update(reference);
  return hash.digest('hex').substring(0, 8).toUpperCase();
}

/**
 * Validate reference format (basic validation)
 * @param {string} reference - Aadhaar reference to validate
 * @returns {boolean} True if format looks valid
 */
function validateReferenceFormat(reference) {
  if (!reference || typeof reference !== 'string') {
    return false;
  }
  
  // Basic validation - should be alphanumeric and reasonable length
  const cleaned = reference.replace(/\s/g, '');
  return /^[A-Za-z0-9]{8,20}$/.test(cleaned);
}

/**
 * Create a deterministic hash for duplicate detection
 * @param {string} reference - Aadhaar reference
 * @param {string} name - Full name
 * @param {number} yearOfBirth - Year of birth
 * @returns {string} Deterministic hash
 */
function createDuplicateDetectionHash(reference, name, yearOfBirth) {
  const normalized = `${reference}-${name.toLowerCase().trim()}-${yearOfBirth}`;
  const hash = crypto.createHash('sha256');
  hash.update(normalized);
  return hash.digest('hex');
}

module.exports = {
  hashReference,
  previewReference,
  shortHashPreview,
  validateReferenceFormat,
  createDuplicateDetectionHash
};