import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { isString } from '../utils/validation.js';

// bcrypt only uses the first 72 bytes; cap length so huge bodies can't waste hashing time
const MAX_PASSWORD_LENGTH = 128;

const validationMessage = (error) => Object.values(error.errors || {})[0]?.message || 'Invalid input';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs (type checks also block operator objects such as {"$gt": ""})
    if (!isString(name) || !isString(email) || !isString(password) || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6 || password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be between 6 and ${MAX_PASSWORD_LENGTH} characters` });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: validationMessage(error) });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isString(email) || !isString(password) || !email.trim() || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check for user (must explicitly select password since select: false)
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

/**
 * @desc    Update current user's name and/or email
 * @route   PUT /api/auth/me
 * @access  Private
 */
export const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    if ((name !== undefined && !isString(name)) || (email !== undefined && !isString(email))) {
      return res.status(400).json({ error: 'Name and email must be text' });
    }
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      if (!normalized) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      const taken = await User.findOne({ email: normalized, _id: { $ne: req.user._id } });
      if (taken) {
        return res.status(400).json({ error: 'That email is already used by another account' });
      }
    }

    const user = await User.findById(req.user._id);
    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    await user.save(); // runs schema validation (email format, name length)

    res.status(200).json({ success: true, user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: validationMessage(error) });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'That email is already used by another account' });
    }
    console.error('UpdateMe error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // req.user is set by protect middleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Server error retrieving current user' });
  }
};
