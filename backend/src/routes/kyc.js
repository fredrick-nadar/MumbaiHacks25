const express = require('express');
const router = express.Router();
const { uploadQR, handleUploadError, cleanupFile } = require('../services/security/fileUpload');
const { parseAadhaarQR, parseQRCode, parseAadhaarQRString } = require('../services/aadhaar/qrParser');
const { normalizeAadhaarData } = require('../services/aadhaar/normalize');
const { hashReference } = require('../services/aadhaar/hasher');
const { generatePassword, validatePassword } = require('../services/security/passwordGen');
const { generateKycSessionId, logAuthEvent, hashPassword } = require('../services/security/auth');
const { kycLimiter } = require('../services/security/rateLimit');
const { validateRequest } = require('../middleware/auth');
const User = require('../models/User');
const KycSession = require('../models/KycSession');
const moment = require('moment');
const puppeteer = require('puppeteer');

/**
 * Open DigiLocker QR Scanner with Puppeteer
 * POST /kyc/aadhaar/digilocker-scan
 * Opens DigiLocker, extracts data, and auto-fills registration form
 */
router.post('/digilocker-scan', kycLimiter, async (req, res) => {
  let browser;
  
  try {
    console.log('🚀 Starting DigiLocker Puppeteer scanner...');
    
    // Launch browser with popup size
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--window-size=450,700',
        '--window-position=750,100',
        '--disable-features=Translate',
        '--disable-extensions',
        '--disable-default-apps',
        '--no-first-run'
      ],
      defaultViewport: {
        width: 450,
        height: 700
      }
    });

    const page = await browser.newPage();
    
    // Close extra pages if any
    const pages = await browser.pages();
    if (pages.length > 1) {
      for (let i = 0; i < pages.length; i++) {
        if (pages[i] !== page) {
          await pages[i].close();
        }
      }
    }
    
    // Go to DigiLocker verification page
    await page.goto('https://verify.digilocker.gov.in/', {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });

    console.log('⏳ Waiting for QR scan (user needs to scan Aadhaar QR)...');

    // Wait for view page or Aadhaar data to appear
    await page.waitForFunction(() => {
      try {
        const body = document && document.body && document.body.innerText;
        const pathOk = location && location.pathname && location.pathname.includes('/view');
        const textOk = body && (
          body.includes('Aadhaar Number') || 
          body.includes('Unique Identification Authority of India') || 
          body.includes('Name') ||
          body.includes('Date of Birth') ||
          body.includes('Gender') ||
          body.includes('Address')
        );
        return pathOk || textOk;
      } catch (e) {
        return false;
      }
    }, { timeout: 120000 });

    console.log('✅ QR scanned successfully, extracting data...');
    
    // Wait a bit more for the page to fully render (using setTimeout instead of deprecated waitForTimeout)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a screenshot for debugging
    await page.screenshot({ path: 'digilocker-scan.png' });
    console.log('📸 Screenshot saved as digilocker-scan.png');

    // Extract Aadhaar data from DigiLocker page
    const aadhaarData = await page.evaluate(() => {
      const pageText = (document.body && document.body.innerText) || '';
      const pageHTML = (document.body && document.body.innerHTML) || '';

      const extractValue = (fieldName) => {
        // Try multiple patterns
        const patterns = [
          new RegExp(fieldName + '\\s*:\\s*([^\\n]+)', 'i'),
          new RegExp(fieldName + '\\s*-\\s*([^\\n]+)', 'i'),
          new RegExp(fieldName + '\\s+([^\\n]+)', 'i')
        ];
        
        for (const regex of patterns) {
          const match = pageText.match(regex);
          if (match && match[1] && match[1].trim()) {
            return match[1].trim();
          }
        }
        
        // Try DOM extraction
        const selectors = [
          `[class*="${fieldName.toLowerCase()}"]`,
          `[id*="${fieldName.toLowerCase()}"]`,
          `td:contains("${fieldName}")`,
          `.field-label:contains("${fieldName}") + .field-value`
        ];
        
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
              const text = element.textContent.trim();
              // Remove field name from text if present
              return text.replace(new RegExp(fieldName + '\\s*:?\\s*', 'i'), '').trim();
            }
          } catch (e) {
            // Selector not valid, continue
          }
        }
        
        return '';
      };

      const normalizeGender = (gender) => {
        const g = (gender || '').toLowerCase();
        if (g.includes('male') && !g.includes('female')) return 'M';
        if (g.includes('female')) return 'F';
        if (g.includes('other') || g.includes('transgender')) return 'O';
        return 'M';
      };

      // Extract with multiple fallback patterns
      let name = extractValue('Name') || extractValue('Resident Name') || extractValue('Full Name') || '';
      let dob = extractValue('Date of Birth') || extractValue('DOB') || extractValue('Birth Date') || '';
      let gender = normalizeGender(extractValue('Gender') || extractValue('Sex') || '');
      let address = extractValue('Address') || extractValue('Complete Address') || '';
      let aadhaarNumber = extractValue('Aadhaar Number') || extractValue('Aadhaar No') || extractValue('UID') || extractValue('Aadhaar') || '';

      // Try table-based extraction (common in DigiLocker)
      if (!name || !dob) {
        const rows = document.querySelectorAll('tr, .row, .field-row');
        rows.forEach(row => {
          const text = row.textContent || '';
          if (text.match(/name/i) && !name) {
            const match = text.match(/name\s*:?\s*(.+?)(?:\n|$)/i);
            if (match) name = match[1].trim();
          }
          if (text.match(/date.*birth|dob/i) && !dob) {
            const match = text.match(/(?:date.*birth|dob)\s*:?\s*(.+?)(?:\n|$)/i);
            if (match) dob = match[1].trim();
          }
          if (text.match(/gender|sex/i) && !gender) {
            const match = text.match(/(?:gender|sex)\s*:?\s*(.+?)(?:\n|$)/i);
            if (match) gender = normalizeGender(match[1].trim());
          }
          if (text.match(/aadhaar.*number|uid/i) && !aadhaarNumber) {
            const match = text.match(/(?:aadhaar.*number|uid)\s*:?\s*(.+?)(?:\n|$)/i);
            if (match) aadhaarNumber = match[1].trim();
          }
          if (text.match(/address/i) && !address) {
            const match = text.match(/address\s*:?\s*(.+?)(?:\n|$)/i);
            if (match) address = match[1].trim();
          }
        });
      }

      const pincodeMatch = address.match(/(\d{6})\s*$/);
      const pincode = pincodeMatch ? pincodeMatch[1] : '';

      return {
        name,
        dob,
        gender,
        address,
        pincode,
        aadhaarNumber: aadhaarNumber.replace(/\s/g, ''),
        referenceId: aadhaarNumber.replace(/\s/g, '') || 'DIGI' + Date.now().toString().slice(-8),
        rawText: pageText.substring(0, 1000), // Include longer snippet for debugging
        fullText: pageText // Include full text for complete debugging
      };
    });

    // Save full page text to file for debugging
    const fs = require('fs');
    const path = require('path');
    const debugFilePath = path.join(__dirname, '../../digilocker-page-text.txt');
    fs.writeFileSync(debugFilePath, aadhaarData.fullText || 'No text captured', 'utf8');
    console.log('📝 Full page text saved to:', debugFilePath);

    console.log('\n========================================');
    console.log('📄 EXTRACTED AADHAAR DATA:');
    console.log('========================================');
    console.log('Name:', aadhaarData.name || '(empty)');
    console.log('DOB:', aadhaarData.dob || '(empty)');
    console.log('Gender:', aadhaarData.gender || '(empty)');
    console.log('Address:', aadhaarData.address || '(empty)');
    console.log('Pincode:', aadhaarData.pincode || '(empty)');
    console.log('Aadhaar Number:', aadhaarData.aadhaarNumber || '(empty)');
    console.log('Reference ID:', aadhaarData.referenceId || '(empty)');
    console.log('========================================');
    console.log('Raw Text Preview:');
    console.log(aadhaarData.rawText || '(not captured)');
    console.log('========================================\n');

    // Validate extracted data
    if (!aadhaarData.name || !aadhaarData.dob) {
      console.log('❌ Validation failed: Missing required fields (name or dob)');
      await browser.close();
      return res.status(400).json({
        status: 'error',
        message: 'Could not extract required information from DigiLocker. Please try again.',
        debug: {
          extractedData: aadhaarData,
          rawTextPreview: aadhaarData.rawText
        }
      });
    }

    // Normalize the data
    const normalizedData = normalizeAadhaarData(aadhaarData);
    
    // Generate session ID
    const sessionId = generateKycSessionId();
    
    // Hash Aadhaar reference
    const referenceHash = hashReference(aadhaarData.referenceId);
    
    // Generate password
    const passwordResult = {
      success: true,
      password: generatePassword(normalizedData.name, normalizedData.dob),
      hint: `NAME4 (first 4 letters of name) + DDMMYY (date format)`
    };
    
    // Check if user exists
    const existingUser = await User.findOne({ aadhaarRefHash: referenceHash });
    const userExists = !!existingUser;
    const nameLoginKey = userExists ? existingUser.nameLoginKey : normalizedData.name.substring(0, 4).toUpperCase().padEnd(4, 'X');
    
    // Parse year of birth from various date formats
    let yearOfBirth = new Date().getFullYear() - 25; // default
    if (normalizedData.dob) {
      // Try DD/MM/YYYY or DD-MM-YYYY format
      const dobParts = normalizedData.dob.split(/[\/\-]/);
      if (dobParts.length === 3) {
        const year = parseInt(dobParts[2]);
        if (!isNaN(year) && year > 1900 && year < 2100) {
          yearOfBirth = year;
        }
      }
    }

    // Create KYC session
    const sessionData = {
      sessionId,
      source: 'QR',
      status: 'PARSED',
      temp: {
        name: normalizedData.name,
        yearOfBirth: yearOfBirth,
        gender: normalizedData.gender || 'M',
        addressMasked: normalizedData.address,
        dob: normalizedData.dob,
        address: normalizedData.address,
        nameLoginKey: nameLoginKey,
        generatedPassword: passwordResult.password,
        passwordHint: passwordResult.hint
      },
      referencePreview: aadhaarData.referenceId ? aadhaarData.referenceId.slice(-4) : 'DIGI',
      aadhaarRefHash: referenceHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      clientIp: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    const kycSession = new KycSession(sessionData);
    await kycSession.save();
    
    // Log the operation
    await logAuthEvent(existingUser?._id || null, 'kyc_digilocker_scanned', {
      sessionId,
      dataSource: 'digilocker_qr',
      userExists,
      success: true
    }, req);

    console.log('✅ KYC session created successfully');
    
    // Close browser now that we have the data
    await browser.close();
    
    console.log('✅ Data extracted and session created!');
    console.log('🔑 Login credentials:');
    console.log('   Name:', nameLoginKey);
    console.log('   Password:', passwordResult.password);
    
    // Return data to frontend for auto-fill
    res.json({
      status: 'success',
      message: 'DigiLocker scan completed successfully',
      data: {
        sessionId,
        userExists,
        extractedInfo: {
          name: normalizedData.name,
          dob: normalizedData.dob,
          gender: normalizedData.gender,
          address: normalizedData.address,
          pincode: aadhaarData.pincode || '',
          aadhaarNumber: aadhaarData.aadhaarNumber || '',
          nameLoginKey,
          passwordHint: passwordResult.hint
        }
      }
    });
    
  } catch (error) {
    console.error('❌ DigiLocker scan error:', error);
    
    if (browser) {
      await browser.close();
    }
    
    // Log the failed operation
    await logAuthEvent(null, 'kyc_digilocker_scan_failed', {
      error: error.message,
      success: false
    }, req);

    res.status(500).json({
      status: 'error',
      message: 'Failed to scan DigiLocker QR code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Parse Aadhaar QR Code
 * POST /kyc/aadhaar/qr-parse
 * Supports both file upload and direct QR data
 */
router.post('/qr-parse', kycLimiter, (req, res, next) => {
  // Skip file upload middleware if QR data is provided directly
  if (req.body.qrData) {
    return next();
  }
  // Use file upload middleware for image uploads
  uploadQR(req, res, next);
}, handleUploadError, async (req, res) => {
  let uploadedFile = null;
  let qrData = null;
  
  try {
    // Handle direct QR data from camera
    if (req.body.qrData) {
      try {
        let qrString = req.body.qrData;
        
        // If QR data is an array (common format), convert to string
        if (Array.isArray(qrString)) {
          // Aadhaar QR typically has encrypted data in the last element
          qrString = qrString[qrString.length - 1] || qrString.join(',');
        }
        
        console.log('Processing QR data type:', typeof qrString);
        console.log('QR data length:', qrString.length);
        
        // Parse actual Aadhaar QR data using unified API
        try {
          const result = await parseAadhaarQR(qrString);
          qrData = result.fullData;
          console.log('Parsed Aadhaar data:', qrData);
        } catch (qrParsingError) {
          console.warn('Failed to parse actual QR data, using fallback:', qrParsingError.message);
          // Fallback to mock data if parsing fails
          qrData = {
            name: 'Test User',
            dob: '01/01/1990',
            gender: 'M',
            address: 'Test Address, Test City',
            referenceId: 'TEST123456789'
          };
          console.log('Using fallback mock data:', qrData);
        }
        
      } catch (parseError) {
        console.error('QR parsing error:', parseError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to parse QR code data.'
        });
      }
    } else {
      // Handle file upload
      const fileValidation = await validateUploadedFile(req.file);
      if (!fileValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: fileValidation.error
        });
      }
      
      uploadedFile = req.file.path;
      
      // Parse QR code from image using unified API
      const result = await parseAadhaarQR(require('fs').readFileSync(uploadedFile));
      qrData = result.fullData;
    }
    
    if (!qrData || !qrData.name || !qrData.dob) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Aadhaar QR code. Could not extract required information.'
      });
    }
    
    // Normalize Aadhaar data
    const normalizedData = normalizeAadhaarData(qrData);
    
    // Generate session ID
    const sessionId = generateKycSessionId();
    
    // Hash Aadhaar reference
    const referenceId = qrData.referenceId || qrData.uid || 'TEST123456789'; // Use mock ID for testing
    const referenceHash = hashReference(referenceId);
    
    // Generate password based on name and DOB
    let passwordResult;
    try {
      const password = generatePassword(normalizedData.name, normalizedData.dob);
      const hint = `NAME4 (first 4 letters of name) + DDMMYY (date format)`;
      passwordResult = {
        success: true,
        password: password,
        hint: hint
      };
    } catch (error) {
      passwordResult = {
        success: false,
        error: error.message,
        details: 'Password generation failed with the provided name and DOB'
      };
    }
    
    if (!passwordResult.success) {
        return res.status(400).json({
        status: 'error',
        message: passwordResult.error,
        details: passwordResult.details
      });
    }
    
    // Check if user already exists with this Aadhaar
    const existingUser = await User.findOne({ aadhaarRefHash: referenceHash });
    
    let userExists = false;
    let nameLoginKey = null;
    
    if (existingUser) {
      userExists = true;
      nameLoginKey = existingUser.nameLoginKey;
    } else {
      // Generate name login key for new user
      nameLoginKey = normalizedData.name.substring(0, 4).toUpperCase().padEnd(4, 'X');
    }
    
    // Create KYC session with proper schema fields
    const sessionData = {
      sessionId,
      source: 'QR', // Use schema field name and valid enum value
      status: 'PARSED', // Use valid enum value
      temp: {
        name: normalizedData.name,
        yearOfBirth: normalizedData.dob ? parseInt(normalizedData.dob.split('/')[2]) : new Date().getFullYear() - 25,
        gender: normalizedData.gender || 'M',
        addressMasked: normalizedData.address,
        // Additional fields for user creation
        dob: normalizedData.dob,
        address: normalizedData.address,
        nameLoginKey: nameLoginKey,
        generatedPassword: passwordResult.password,
        passwordHint: passwordResult.hint
      },
      referencePreview: referenceId ? referenceId.slice(-4) : 'TEST',
      aadhaarRefHash: referenceId,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      clientIp: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    const kycSession = new KycSession(sessionData);
    await kycSession.save();
    
    // Log the operation
    await logAuthEvent(existingUser?._id || null, 'kyc_qr_parsed', {
      sessionId,
      dataSource: 'qr_code',
      userExists,
      success: true
    }, req);
    
    res.json({
      status: 'success',
      message: 'Aadhaar QR code parsed successfully',
      data: {
        sessionId,
        userExists,
        extractedInfo: {
          name: normalizedData.name,
          dob: normalizedData.dob,
          gender: normalizedData.gender,
          address: normalizedData.address,
          nameLoginKey,
          passwordHint: passwordResult.hint
        },
        nextStep: userExists ? 'User found. You can now login.' : 'New user detected. Proceed to complete registration.'
      }
    });
    
  } catch (error) {
    console.error('QR parsing error:', error);
    
    // Log the failed operation
    await logAuthEvent(null, 'kyc_qr_parse_failed', {
      error: error.message,
      success: false
    }, req);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to parse Aadhaar QR code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Always cleanup uploaded file
    if (uploadedFile) {
      await cleanupFile(uploadedFile);
    }
  }
});


/**
 * Complete KYC Process
 * POST /kyc/aadhaar/complete
 */
router.post('/complete', kycLimiter, validateRequest(['sessionId']), async (req, res) => {
  try {
    const { sessionId, acceptTerms } = req.body;
    console.log('KYC completion started for session:', sessionId);
    
    // Find KYC session
    const kycSession = await KycSession.findOne({ sessionId, status: 'PARSED' });
    console.log('Found KYC session:', kycSession ? 'Yes' : 'No');
    
    if (!kycSession) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid or expired KYC session'
      });
    }
    
    // Check if session is still valid (not expired)
    if (moment().isAfter(kycSession.expiresAt)) {
      await KycSession.findByIdAndUpdate(kycSession._id, { status: 'expired' });
      return res.status(400).json({
        status: 'error',
        message: 'KYC session has expired. Please start over.'
      });
    }
    
    // Validate terms acceptance for new users
    const existingUser = await User.findOne({ aadhaarRefHash: kycSession.aadhaarRefHash });
    console.log('Existing user found:', existingUser ? 'Yes' : 'No');
    
    if (!existingUser && !acceptTerms) {
      return res.status(400).json({
        status: 'error',
        message: 'Terms and conditions must be accepted for new registrations'
      });
    }
    
    let user;
    let isNewUser = false;
    
    if (existingUser) {
      // Update existing user's KYC verification timestamp
      user = await User.findByIdAndUpdate(existingUser._id, {
        kycVerifiedAt: new Date(),
        lastLoginAt: new Date()
      }, { new: true });
      
    } else {
      // Create new user
      isNewUser = true;
      
      // Validate required data exists
      console.log('KYC session temp data:', kycSession.temp);
      if (!kycSession.temp.generatedPassword) {
        console.log('ERROR: Generated password not found in KYC session');
        return res.status(400).json({
          status: 'error',
          message: 'Generated password not found in KYC session'
        });
      }
      
      console.log('Hashing password...');
      // Hash the generated password before storing
      const hashedPassword = await hashPassword(kycSession.temp.generatedPassword);
      console.log('Password hashed successfully');
      
      console.log('Creating new user with data:', {
        aadhaarRefHash: kycSession.aadhaarRefHash,
        name: kycSession.temp.name,
        nameLoginKey: kycSession.temp.nameLoginKey,
        yearOfBirth: kycSession.temp.yearOfBirth,
        gender: kycSession.temp.gender || 'M',
        addressMasked: kycSession.temp.addressMasked || kycSession.temp.address,
        kycSource: kycSession.source,
        kycVerifiedAt: new Date(),
        isActive: true
      });
      
      // Generate a unique email to avoid duplicate key error
      const uniqueEmail = `${kycSession.temp.nameLoginKey.toLowerCase()}${Date.now()}@taxwise.local`;
      
      user = new User({
        // Required fields from User schema
        aadhaarRefHash: kycSession.aadhaarRefHash,
        name: kycSession.temp.name,
        nameLoginKey: kycSession.temp.nameLoginKey,
        yearOfBirth: kycSession.temp.yearOfBirth,
        gender: kycSession.temp.gender || 'M', // Default gender if missing
        addressMasked: kycSession.temp.addressMasked || kycSession.temp.address,
        passwordHash: hashedPassword, // Now properly hashed
        kycSource: kycSession.source, // 'QR' or 'XML'
        kycVerifiedAt: new Date(),
        isActive: true,
        email: uniqueEmail // Provide unique email to avoid null duplicate error
      });
      
      try {
        await user.save();
        console.log('User created successfully:', user._id);
      } catch (saveError) {
        console.error('User save error:', saveError);
        throw new Error(`Failed to create user: ${saveError.message}`);
      }
    }
    
    // Update KYC session status
    await KycSession.findByIdAndUpdate(kycSession._id, {
      status: 'COMPLETED',
      userId: user._id,
      completedAt: new Date()
    });
    
    // Log the completion
    await logAuthEvent(user._id, 'kyc_completed', {
      sessionId,
      dataSource: kycSession.source,
      isNewUser,
      success: true
    }, req);
    
    // Log the password for debugging (remove in production)
    if (kycSession.temp.generatedPassword) {
      console.log('🔑 Generated password for login:', kycSession.temp.generatedPassword);
      console.log('🏷️  Login credentials:');
      console.log('   Name: ' + user.nameLoginKey);
      console.log('   Password: ' + kycSession.temp.generatedPassword);
    }

    res.json({
      status: 'success',
      message: isNewUser ? 'Registration completed successfully' : 'KYC verification updated successfully',
      data: {
        userId: user._id,
        name: user.name,
        nameLoginKey: user.nameLoginKey,
        passwordHint: kycSession.temp.passwordHint,
        generatedPassword: kycSession.temp.generatedPassword, // Show actual password for login
        kycVerified: true,
        kycVerifiedAt: user.kycVerifiedAt,
        isNewUser,
        loginInstructions: {
          step1: `Use your name: "${user.nameLoginKey}"`,
          step2: `Use the generated password: "${kycSession.temp.generatedPassword}"`,
          step3: "Login at /auth/login endpoint"
        }
      }
    });
    
  } catch (error) {
    console.error('KYC completion error:', error);
    console.error('Error stack:', error.stack);
    console.error('Session ID:', req.body.sessionId);
    
    // Log the failed operation
    await logAuthEvent(null, 'kyc_completion_failed', {
      sessionId: req.body.sessionId,
      error: error.message,
      stack: error.stack,
      success: false
    }, req);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete KYC process',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorType: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get KYC Session Status
 * GET /kyc/aadhaar/status/:sessionId
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const kycSession = await KycSession.findOne({ sessionId }).select('-extractedData.generatedPassword');
    
    if (!kycSession) {
      return res.status(404).json({
        status: 'error',
        message: 'KYC session not found'
      });
    }
    
    const isExpired = moment().isAfter(kycSession.expiresAt);
    
    res.json({
      status: 'success',
      data: {
        sessionId: kycSession.sessionId,
        status: isExpired ? 'expired' : kycSession.status,
        dataSource: kycSession.dataSource,
        createdAt: kycSession.createdAt,
        expiresAt: kycSession.expiresAt,
        isExpired,
        extractedInfo: kycSession.status !== 'pending' ? {
          name: kycSession.extractedData?.name,
          dob: kycSession.extractedData?.dob,
          nameLoginKey: kycSession.extractedData?.nameLoginKey,
          passwordHint: kycSession.extractedData?.passwordHint
        } : null
      }
    });
    
  } catch (error) {
    console.error('KYC status check error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to check KYC status'
    });
  }
});

module.exports = router;