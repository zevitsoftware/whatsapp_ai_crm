const { User } = require('../models');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { Op } = require('sequelize');

// Validation Schemas
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  companyName: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Helper: Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register
exports.register = async (req, res) => {
  try {
    // 1. Validate Input
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password, companyName } = req.body;

    // 2. Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 3. Create User (Password hashed by Sequelize Hook)
    const user = await User.create({
      name,
      email,
      password,
      companyName,
      role: 'user', // Default role
      status: 'active'
    });

    // 4. Generate Token
    const token = generateToken(user);

    // 5. Response
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    // 1. Validate Input
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;

    // 2. Find User
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.warn(`[Login] User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Check Status
    if (user.status !== 'active') {
      console.warn(`[Login] Inactive account: ${email} (${user.status})`);
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // 4. Validate Password
    const isValid = await user.validatePassword(password);
    if (!isValid) {
      console.warn(`[Login] Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.log(`[Login] Success: ${email} (Role: ${user.role})`);

    // 5. Generate Token
    const token = generateToken(user);

    // 6. Response
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Current User (Me)
exports.me = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] } // Exclude password from response
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Me Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
