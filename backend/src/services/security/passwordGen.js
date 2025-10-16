const moment = require('moment');

/**
 * Generate NAME4 component from full name
 * Rules: 
 * - Take first name token, remove non-letters, uppercase
 * - Take first 4 letters; if <4, append from next tokens
 * - If still <4, pad with 'X'
 * 
 * @param {string} fullName - Full name from Aadhaar
 * @returns {string} NAME4 component (4 characters, uppercase)
 */
function generateNAME4(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    throw new Error('Full name is required for password generation');
  }
  
  // Split name into tokens and clean
  const tokens = fullName.trim().split(/\s+/);
  let name4 = '';
  
  // Process each token to extract letters
  for (const token of tokens) {
    const letters = token.replace(/[^A-Za-z]/g, '').toUpperCase();
    name4 += letters;
    
    // Stop if we have enough characters
    if (name4.length >= 4) {
      break;
    }
  }
  
  // Take first 4 characters
  name4 = name4.substring(0, 4);
  
  // Pad with 'X' if needed
  while (name4.length < 4) {
    name4 += 'X';
  }
  
  return name4;
}

/**
 * Generate DOB6 component from date of birth
 * Rules:
 * - Accept DOB as dd/mm/yyyy or yyyy-mm-dd
 * - Output DDMMYY (day 2 digits, month 2 digits, last two digits of year)
 * 
 * @param {string} dob - Date of birth in supported format
 * @returns {string} DOB6 component (6 digits: DDMMYY)
 */
function generateDOB6(dob) {
  if (!dob || typeof dob !== 'string') {
    throw new Error('Date of birth is required for password generation');
  }
  
  let parsedDate;
  
  // Try different date formats
  const formats = [
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'YYYY-MM-DD',
    'YYYY/MM/DD',
    'DD.MM.YYYY',
    'MM/DD/YYYY'
  ];
  
  for (const format of formats) {
    parsedDate = moment(dob, format, true);
    if (parsedDate.isValid()) {
      break;
    }
  }
  
  if (!parsedDate || !parsedDate.isValid()) {
    throw new Error(`Invalid date format: ${dob}. Supported formats: DD/MM/YYYY, YYYY-MM-DD`);
  }
  
  // Validate reasonable date range
  const currentYear = new Date().getFullYear();
  const birthYear = parsedDate.year();
  
  if (birthYear < 1900 || birthYear > currentYear) {
    throw new Error(`Invalid birth year: ${birthYear}. Must be between 1900 and ${currentYear}`);
  }
  
  // Generate DDMMYY
  const day = parsedDate.format('DD');
  const month = parsedDate.format('MM');
  const year = parsedDate.format('YY');
  
  return `${day}${month}${year}`;
}

/**
 * Generate complete password using NAME4 + DOB6 rule
 * @param {string} fullName - Full name from Aadhaar
 * @param {string} dob - Date of birth
 * @returns {string} Generated password
 */
function generatePassword(fullName, dob) {
  try {
    const name4 = generateNAME4(fullName);
    const dob6 = generateDOB6(dob);
    
    return name4 + dob6;
  } catch (error) {
    throw new Error(`Password generation failed: ${error.message}`);
  }
}

/**
 * Validate password against generation rules
 * @param {string} password - Password to validate
 * @param {string} fullName - Full name to check against
 * @param {string} dob - Date of birth to check against
 * @returns {boolean} True if password matches generation rules
 */
function validatePassword(password, fullName, dob) {
  try {
    const expectedPassword = generatePassword(fullName, dob);
    return password === expectedPassword;
  } catch (error) {
    return false;
  }
}

/**
 * Validate year of birth matches DOB
 * @param {string} dob - Date of birth
 * @param {number} yearOfBirth - Year of birth from Aadhaar
 * @returns {boolean} True if they match
 */
function validateYearOfBirth(dob, yearOfBirth) {
  try {
    const parsedDate = moment(dob, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'], true);
    if (!parsedDate.isValid()) {
      return false;
    }
    
    return parsedDate.year() === yearOfBirth;
  } catch (error) {
    return false;
  }
}

/**
 * Generate password hint for reset scenarios
 * Shows NAME4 clearly but masks DOB6 partially
 * @param {string} fullName - Full name
 * @returns {string} Password hint
 */
function generatePasswordHint(fullName) {
  try {
    const name4 = generateNAME4(fullName);
    return `${name4}****` + '**'; // NAME4 + masked DOB6
  } catch (error) {
    return '****' + '******'; // Fully masked fallback
  }
}

/**
 * Extract name components for password generation testing
 * @param {string} fullName - Full name
 * @returns {Object} Name analysis
 */
function analyzeNameForPassword(fullName) {
  if (!fullName) {
    return {
      tokens: [],
      firstToken: '',
      lettersOnly: '',
      name4: 'XXXX',
      isShort: true
    };
  }
  
  const tokens = fullName.trim().split(/\s+/);
  const firstToken = tokens[0] || '';
  const lettersOnly = tokens.map(token => token.replace(/[^A-Za-z]/g, '')).join('');
  const name4 = generateNAME4(fullName);
  const isShort = lettersOnly.length < 4;
  
  return {
    tokens,
    firstToken,
    lettersOnly: lettersOnly.toUpperCase(),
    name4,
    isShort
  };
}

/**
 * Parse and validate DOB format
 * @param {string} dob - Date of birth string
 * @returns {Object} DOB analysis
 */
function analyzeDOBForPassword(dob) {
  if (!dob) {
    return {
      isValid: false,
      format: null,
      day: null,
      month: null,
      year: null,
      dob6: null
    };
  }
  
  const formats = [
    'DD/MM/YYYY',
    'DD-MM-YYYY', 
    'YYYY-MM-DD',
    'YYYY/MM/DD'
  ];
  
  let parsedDate = null;
  let detectedFormat = null;
  
  for (const format of formats) {
    const parsed = moment(dob, format, true);
    if (parsed.isValid()) {
      parsedDate = parsed;
      detectedFormat = format;
      break;
    }
  }
  
  if (!parsedDate) {
    return {
      isValid: false,
      format: null,
      day: null,
      month: null,
      year: null,
      dob6: null
    };
  }
  
  return {
    isValid: true,
    format: detectedFormat,
    day: parsedDate.date(),
    month: parsedDate.month() + 1, // moment uses 0-based months
    year: parsedDate.year(),
    dob6: generateDOB6(dob)
  };
}

/**
 * Test password generation with examples
 * @param {Array} testCases - Array of {name, dob, expected} objects
 * @returns {Array} Test results
 */
function testPasswordGeneration(testCases) {
  return testCases.map(testCase => {
    try {
      const generated = generatePassword(testCase.name, testCase.dob);
      const isCorrect = generated === testCase.expected;
      
      return {
        ...testCase,
        generated,
        isCorrect,
        error: null
      };
    } catch (error) {
      return {
        ...testCase,
        generated: null,
        isCorrect: false,
        error: error.message
      };
    }
  });
}

module.exports = {
  generateNAME4,
  generateDOB6,
  generatePassword,
  validatePassword,
  validateYearOfBirth,
  generatePasswordHint,
  analyzeNameForPassword,
  analyzeDOBForPassword,
  testPasswordGeneration
};