const xml2js = require('xml2js');
const normalize = require('./normalize');

/**
 * Parse Aadhaar XML file and extract data
 * @param {Buffer} xmlBuffer - XML buffer from uploaded file
 * @returns {Promise<{attrs: Object, reference: string}>} Parsed attributes and reference
 */
async function parseXMLFile(xmlBuffer) {
  try {
    // Convert buffer to string
    const xmlString = xmlBuffer.toString('utf8');
    
    // Validate XML format
    validateXMLFormat(xmlString);
    
    // Parse XML
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });
    
    const result = await parser.parseStringPromise(xmlString);
    
    // Extract Aadhaar data from parsed XML
    const xmlData = extractXMLData(result);
    
    // Mock signature verification (in production, implement proper verification)
    const isSignatureValid = mockSignatureVerification(xmlString);
    if (!isSignatureValid) {
      throw new Error('XML signature verification failed');
    }
    
    // Normalize attributes
    const attrs = extractAttributes(xmlData);
    const reference = extractReference(xmlData);
    
    return { attrs, reference };
    
  } catch (error) {
    throw new Error(`XML parsing failed: ${error.message}`);
  }
}

/**
 * Validate XML format and structure
 * @param {string} xmlString - XML content as string
 */
function validateXMLFormat(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Invalid XML content');
  }
  
  // Check for basic XML structure
  if (!xmlString.trim().startsWith('<')) {
    throw new Error('Invalid XML format - missing opening tag');
  }
  
  // Check for Aadhaar-specific elements (simplified check)
  const hasAadhaarElements = xmlString.includes('uid') || 
                            xmlString.includes('name') || 
                            xmlString.includes('Aadhaar');
  
  if (!hasAadhaarElements) {
    throw new Error('XML does not appear to contain Aadhaar data');
  }
}

/**
 * Extract Aadhaar data from parsed XML object
 * @param {Object} parsedXML - Parsed XML object
 * @returns {Object} Extracted Aadhaar data
 */
function extractXMLData(parsedXML) {
  // Handle different XML structures that might contain Aadhaar data
  
  // Look for common root elements
  let dataNode = parsedXML.OfflinePaperlessKyc || 
                 parsedXML.KycRes || 
                 parsedXML.UidData || 
                 parsedXML.PrintLetterBarcodeData ||
                 parsedXML;
  
  // If it's an array, take the first element
  if (Array.isArray(dataNode)) {
    dataNode = dataNode[0];
  }
  
  // Extract demographic data
  const demo = dataNode.UidData?.Demo || dataNode.Demo || dataNode;
  const poa = demo?.Poa || demo; // Proof of Address
  const poi = demo?.Poi || demo; // Proof of Identity
  
  // For demo purposes, also create mock data if real structure not found
  if (!demo && !poi) {
    return createMockXMLData();
  }
  
  const data = {
    name: poi?.name || demo?.name || dataNode.name || 'Unknown',
    gender: poi?.gender || demo?.gender || dataNode.gender || 'M',
    dob: poi?.dob || demo?.dob || dataNode.dob || null,
    yob: poi?.yob || demo?.yob || dataNode.yob || null,
    phone: poi?.phone || demo?.phone || dataNode.phone || null,
    email: poi?.email || demo?.email || dataNode.email || null,
    address: formatAddress(poa || demo || dataNode),
    reference: dataNode.uid || dataNode.referenceId || Date.now().toString()
  };
  
  return data;
}

/**
 * Format address from XML address components
 * @param {Object} addressNode - Address node from XML
 * @returns {string} Formatted address
 */
function formatAddress(addressNode) {
  if (!addressNode) return '';
  
  const addressParts = [
    addressNode.house || addressNode.building,
    addressNode.street || addressNode.landmark,
    addressNode.locality || addressNode.area,
    addressNode.vtc || addressNode.city,
    addressNode.district,
    addressNode.state,
    addressNode.pc || addressNode.pincode
  ].filter(Boolean);
  
  return addressParts.join(', ');
}

/**
 * Mock signature verification for development
 * @param {string} xmlString - XML content
 * @returns {boolean} True if signature is valid (mock)
 */
function mockSignatureVerification(xmlString) {
  // In production, implement proper XML signature verification
  // For now, just check if it contains signature-like elements
  
  const hasSignature = xmlString.includes('Signature') ||
                      xmlString.includes('SignedInfo') ||
                      xmlString.includes('DigestValue');
  
  // For demo, always return true if it looks like signed XML
  return hasSignature || process.env.NODE_ENV === 'development';
}

/**
 * Create mock XML data for demo purposes
 * @returns {Object} Mock Aadhaar data
 */
function createMockXMLData() {
  const mockNames = ['Arjun Mehta', 'Kavya Nair', 'Vikram Patel', 'Shreya Joshi', 'Rohan Gupta'];
  const mockAddresses = [
    { 
      house: '23A', 
      street: 'Residency Road', 
      city: 'Pune', 
      state: 'Maharashtra', 
      pincode: '411001' 
    },
    { 
      house: '456', 
      street: 'Brigade Road', 
      city: 'Bangalore', 
      state: 'Karnataka', 
      pincode: '560025' 
    },
    { 
      house: '789', 
      street: 'Anna Salai', 
      city: 'Chennai', 
      state: 'Tamil Nadu', 
      pincode: '600002' 
    }
  ];
  
  const randomIndex = Math.floor(Math.random() * mockNames.length);
  const randomAddress = mockAddresses[randomIndex % mockAddresses.length];
  const currentYear = new Date().getFullYear();
  
  return {
    name: mockNames[randomIndex],
    gender: Math.random() > 0.5 ? 'M' : 'F',
    yob: currentYear - 25 - Math.floor(Math.random() * 40), // Age 25-65
    dob: null,
    phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
    email: null,
    address: formatAddress(randomAddress),
    reference: `XML${Date.now().toString().slice(-8)}`
  };
}

/**
 * Extract normalized attributes from XML data
 * @param {Object} xmlData - Raw XML data
 * @returns {Object} Normalized attributes
 */
function extractAttributes(xmlData) {
  const attrs = {
    name: normalize.normalizeName(xmlData.name),
    gender: normalize.normalizeGender(xmlData.gender),
    yearOfBirth: normalize.deriveYearOfBirth(xmlData.yob || xmlData.dob),
    addressMasked: normalize.maskAddress(xmlData.address)
  };
  
  // Add optional fields if available
  if (xmlData.phone) {
    attrs.phone = normalize.normalizePhone(xmlData.phone);
  }
  
  if (xmlData.email) {
    attrs.email = normalize.normalizeEmail(xmlData.email);
  }
  
  return attrs;
}

/**
 * Extract reference from XML data
 * @param {Object} xmlData - Raw XML data
 * @returns {string} Reference number
 */
function extractReference(xmlData) {
  return xmlData.reference || xmlData.uid || Date.now().toString();
}

/**
 * Validate XML file format and size
 * @param {Buffer} xmlBuffer - XML buffer
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {boolean} True if valid
 */
function validateXMLFile(xmlBuffer, maxSize = 2 * 1024 * 1024) {
  if (!xmlBuffer || !Buffer.isBuffer(xmlBuffer)) {
    throw new Error('Invalid XML buffer');
  }
  
  if (xmlBuffer.length > maxSize) {
    throw new Error(`XML file size (${xmlBuffer.length} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
  }
  
  // Check if it starts with XML declaration or root element
  const xmlString = xmlBuffer.toString('utf8', 0, Math.min(xmlBuffer.length, 1000));
  const isXML = xmlString.includes('<?xml') || xmlString.trim().startsWith('<');
  
  if (!isXML) {
    throw new Error('Invalid XML file format');
  }
  
  return true;
}

module.exports = {
  parseXMLFile,
  extractXMLData,
  extractAttributes,
  extractReference,
  validateXMLFile,
  mockSignatureVerification,
  createMockXMLData
};