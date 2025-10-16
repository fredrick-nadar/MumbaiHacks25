/**
 * Normalize name from Aadhaar data
 * @param {string} rawName - Raw name from Aadhaar
 * @returns {string} Normalized name
 */
function normalizeName(rawName) {
  if (!rawName) return '';
  
  return rawName
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()); // Title case
}

/**
 * Extract first name token from full name
 * @param {string} name - Full name
 * @returns {string} First name token
 */
function firstNameToken(name) {
  if (!name) return '';
  
  const tokens = name.trim().split(/\s+/);
  return tokens[0] || '';
}

/**
 * Generate name login key (uppercase letters only from first name)
 * @param {string} name - Full name
 * @returns {string} Name login key
 */
function nameLoginKey(name) {
  const firstName = firstNameToken(name);
  return firstName
    .replace(/[^A-Za-z]/g, '') // Remove non-letters
    .toUpperCase();
}

/**
 * Normalize gender from Aadhaar data
 * @param {string} rawGender - Raw gender from Aadhaar (M/F/Male/Female/etc)
 * @returns {string} Normalized gender (M/F/T)
 */
function normalizeGender(rawGender) {
  if (!rawGender) return 'M'; // Default fallback
  
  const gender = rawGender.toString().toUpperCase().trim();
  
  if (gender.startsWith('F') || gender === 'FEMALE') return 'F';
  if (gender.startsWith('M') || gender === 'MALE') return 'M';
  if (gender.startsWith('T') || gender === 'TRANSGENDER' || gender === 'THIRD GENDER') return 'T';
  
  return 'M'; // Default fallback
}

/**
 * Derive year of birth from raw DOB or YOB
 * @param {string|number} rawDobOrYob - Raw date of birth or year of birth
 * @returns {number} Year of birth
 */
function deriveYearOfBirth(rawDobOrYob) {
  if (!rawDobOrYob) return new Date().getFullYear() - 25; // Default fallback
  
  // If it's already a 4-digit year
  if (typeof rawDobOrYob === 'number' && rawDobOrYob >= 1900 && rawDobOrYob <= new Date().getFullYear()) {
    return rawDobOrYob;
  }
  
  // If it's a string that looks like a year
  const yearMatch = rawDobOrYob.toString().match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return year;
    }
  }
  
  // Try to parse as date
  try {
    const date = new Date(rawDobOrYob);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1900 && year <= new Date().getFullYear()) {
        return year;
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return new Date().getFullYear() - 25; // Default fallback
}

/**
 * Mask address for privacy
 * @param {string} rawAddress - Raw address from Aadhaar
 * @returns {string} Masked address
 */
function maskAddress(rawAddress) {
  if (!rawAddress) return '';
  
  // Clean and normalize
  const cleaned = rawAddress
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s,.-]/g, '');
  
  // If address is too short, return as is
  if (cleaned.length <= 20) {
    return cleaned;
  }
  
  // Extract meaningful parts (city, state, pincode)
  const parts = cleaned.split(/[,\s]+/);
  const meaningfulParts = [];
  
  // Look for pincode (6 digits)
  const pincodePattern = /\b\d{6}\b/;
  const pincode = parts.find(part => pincodePattern.test(part));
  
  // Look for state-like words (longer words at the end)
  const stateLike = parts
    .filter(part => part.length >= 4)
    .slice(-2); // Last 2 meaningful parts
  
  if (pincode) meaningfulParts.push(pincode);
  meaningfulParts.push(...stateLike);
  
  // Join with masked indicator
  const maskedParts = meaningfulParts.slice(-3).join(', '); // Last 3 parts
  return `***${maskedParts ? ', ' + maskedParts : ''}`;
}

/**
 * Normalize phone number
 * @param {string} rawPhone - Raw phone number
 * @returns {string} Normalized phone number
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  
  // Extract digits only
  const digits = rawPhone.replace(/\D/g, '');
  
  // Indian mobile number validation
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  return digits.length >= 10 ? digits : '';
}

/**
 * Normalize email address
 * @param {string} rawEmail - Raw email address
 * @returns {string} Normalized email address
 */
function normalizeEmail(rawEmail) {
  if (!rawEmail) return '';
  
  const email = rawEmail.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : '';
}

/**
 * Parse and normalize age to year of birth
 * @param {string|number} rawAge - Raw age
 * @returns {number} Estimated year of birth
 */
function ageToYearOfBirth(rawAge) {
  const age = parseInt(rawAge);
  if (isNaN(age) || age < 0 || age > 120) {
    return new Date().getFullYear() - 25; // Default fallback
  }
  
  return new Date().getFullYear() - age;
}

/**
 * Normalize complete Aadhaar data object
 * @param {Object} rawData - Raw Aadhaar data
 * @returns {Object} Normalized Aadhaar data
 */
function normalizeAadhaarData(rawData) {
  if (!rawData) return {};
  
  return {
    name: normalizeName(rawData.name),
    dob: rawData.dob || '', // Keep original DOB format for now
    gender: normalizeGender(rawData.gender),
    address: maskAddress(rawData.address),
    phone: normalizePhone(rawData.phone),
    email: normalizeEmail(rawData.email),
    referenceId: rawData.referenceId || rawData.uid || ''
  };
}

module.exports = {
  normalizeName,
  firstNameToken,
  nameLoginKey,
  normalizeGender,
  deriveYearOfBirth,
  maskAddress,
  normalizePhone,
  normalizeEmail,
  ageToYearOfBirth,
  normalizeAadhaarData
};