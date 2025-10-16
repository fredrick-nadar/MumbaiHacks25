const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, annualIncome, panNumber, ageGroup } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      annualIncome,
      panNumber,
      ageGroup,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          annualIncome: user.annualIncome,
          panNumber: user.panNumber,
          ageGroup: user.ageGroup,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          annualIncome: user.annualIncome,
          panNumber: user.panNumber,
          ageGroup: user.ageGroup,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message,
    });
  }
});

// Demo login (for testing)
router.post('/demo-login', async (req, res) => {
  try {
    // Create or find demo user
    let demoUser = await User.findOne({ email: 'demo@taxwise.com' });
    
    if (!demoUser) {
      const hashedPassword = await bcrypt.hash('demo123', 12);
      demoUser = new User({
        email: 'demo@taxwise.com',
        password: hashedPassword,
        name: 'Demo User',
        annualIncome: 800000,
        panNumber: 'ABCDE1234F',
        ageGroup: '30-60',
      });
      await demoUser.save();
    }

    // Generate token
    const token = generateToken(demoUser._id);

    res.json({
      status: 'success',
      message: 'Demo login successful',
      data: {
        user: {
          id: demoUser._id,
          email: demoUser.email,
          name: demoUser.name,
          annualIncome: demoUser.annualIncome,
          panNumber: demoUser.panNumber,
          ageGroup: demoUser.ageGroup,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Demo login failed',
      error: error.message,
    });
  }
});

module.exports = router;