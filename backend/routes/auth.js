import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// POST /api/auth/register (legacy email/password)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please provide name, email and password.' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        const user = await User.create({ name, email, password, role: role || 'Ignite' });
        const token = generateToken(user._id);
        res.status(201).json({ message: 'Registration successful.', token, user: user.toJSON() });
    } catch (error) {
        console.error('[Register Error]', error.message);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST /api/auth/login (legacy email/password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password.' });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
        const token = generateToken(user._id);
        res.json({ message: 'Login successful.', token, user: user.toJSON() });
    } catch (error) {
        console.error('[Login Error]', error.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// POST /api/auth/google — Google OAuth sign-in/sign-up
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: 'Google credential is required.' });
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload.email_verified) {
            return res.status(401).json({ message: 'Google email is not verified.' });
        }

        const { sub: googleId, email } = payload;

        // Find or create user
        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            // New user — create with bare minimum, mark profile incomplete
            user = await User.create({
                email,
                googleId,
                name: '',
                profileComplete: false,
                status: 'active',
            });
        } else if (!user.googleId) {
            // Existing email/password user, link Google
            user.googleId = googleId;
            await user.save({ validateBeforeSave: false });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = generateToken(user._id);
        res.json({
            message: 'Google sign-in successful.',
            token,
            user: user.toJSON(),
            profileComplete: user.profileComplete,
        });
    } catch (error) {
        console.error('[Google Auth Error]', error.message);
        res.status(500).json({ message: 'Google authentication failed.' });
    }
});

// POST /api/auth/google-code — Google OAuth with auth-code flow
// Frontend sends the authorization code; backend exchanges it for user info
router.post('/google-code', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Authorization code is required.' });
        }

        // Exchange auth code for tokens at Google's token endpoint
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
                redirect_uri: 'postmessage',   // required for auth-code popup flow
                grant_type: 'authorization_code',
            }),
        });
        const tokens = await tokenRes.json();

        if (tokens.error) {
            console.error('[Google Code Exchange Error]', tokens.error_description || tokens.error);
            return res.status(401).json({ message: tokens.error_description || 'Failed to exchange Google code.' });
        }

        // Fetch user info using the access_token
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const info = await infoRes.json();

        if (!info.email_verified) {
            return res.status(401).json({ message: 'Google email is not verified.' });
        }

        const { sub: googleId, email } = info;

        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        const wasExisting = !!user; // true if user existed before this request
        if (!user) {
            user = await User.create({
                email,
                googleId,
                name: '',
                profileComplete: false,
                status: 'active',
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save({ validateBeforeSave: false });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = generateToken(user._id);
        res.json({
            message: 'Google sign-in successful.',
            token,
            user: user.toJSON(),
            profileComplete: user.profileComplete,
            isNewUser: !wasExisting,  // true only for brand-new accounts
        });
    } catch (error) {
        console.error('[Google Code Error]', error.message);
        res.status(500).json({ message: 'Google authentication failed.' });
    }
});

// POST /api/auth/google-implicit — Google OAuth with implicit flow (access_token flow)
// Frontend fetches userinfo from Google directly, sends us the verified data
router.post('/google-implicit', async (req, res) => {
    try {
        const { email, googleId, emailVerified } = req.body;

        if (!email || !googleId) {
            return res.status(400).json({ message: 'Email and Google ID are required.' });
        }
        if (!emailVerified) {
            return res.status(401).json({ message: 'Google email is not verified.' });
        }

        // Find or create user
        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
            user = await User.create({
                email,
                googleId,
                name: '',
                profileComplete: false,
                status: 'active',
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save({ validateBeforeSave: false });
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = generateToken(user._id);
        res.json({
            message: 'Google sign-in successful.',
            token,
            user: user.toJSON(),
            profileComplete: user.profileComplete,
        });
    } catch (error) {
        console.error('[Google Implicit Error]', error.message);
        res.status(500).json({ message: 'Google authentication failed.' });
    }
});

// POST /api/auth/complete-profile — finalize user profile after Google OAuth
router.post('/complete-profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const data = req.body;
        const { selectedRole } = data; // 'Student' | 'Alumni' | 'Faculty'

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        let assignedRole = user.role;
        let assignedStatus = 'active';
        let redirectMessage = null;

        if (selectedRole === 'Student') {
            const isANITS = data.college === 'ANITS';
            assignedRole = isANITS ? 'Ignite' : 'Spark';
            user.name = data.name || '';
            user.nickname = data.nickname || '';
            user.phone = data.phone || '';
            user.college = data.college || '';
            if (isANITS) {
                user.rollNumber = data.rollNumber || '';
                user.branch = data.branch || '';
                user.batch = data.batch || '';
                user.linkedIn = data.linkedIn || '';
            } else {
                redirectMessage = "Ready to compete? Complete details when the next contest opens!";
            }
        } else if (selectedRole === 'Alumni') {
            assignedRole = 'Alumni';
            assignedStatus = 'pending';
            user.name = data.name || '';
            user.branch = data.branch || '';
            user.batch = data.batch || '';
            user.rollNumber = data.rollNumber || '';
            user.linkedIn = data.linkedIn || '';
            user.placedCompany = data.placedCompany || '';
            user.currentCompany = data.currentCompany || '';
            user.currentDesignation = data.currentDesignation || '';
        } else if (selectedRole === 'Faculty') {
            assignedRole = 'Faculty';
            // Auto-approve if email ends with @anits.edu.in
            assignedStatus = user.email.endsWith('@anits.edu.in') ? 'active' : 'pending';
            user.name = data.name || '';
            user.department = data.department || '';
            user.designation = data.designation || '';
            user.yearsOfExperience = data.yearsOfExperience || 0;
            user.employeeId = data.employeeId || '';
            user.phone = data.phone || '';
        }

        user.role = assignedRole;
        user.status = assignedStatus;
        user.profileComplete = true;
        await user.save({ validateBeforeSave: false });

        const token = generateToken(user._id);
        res.json({
            message: 'Profile completed successfully.',
            token,
            user: user.toJSON(),
            redirectMessage,
            status: assignedStatus,
        });
    } catch (error) {
        console.error('[Complete Profile Error]', error.message);
        res.status(500).json({ message: 'Server error completing profile.' });
    }
});

// GET /api/auth/check-email — check if email exists and profile status
router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.json({ exists: false, profileComplete: false });
        }
        const token = generateToken(user._id);
        return res.json({
            exists: true,
            profileComplete: user.profileComplete,
            token,
            user: user.toJSON(),
        });
    } catch (error) {
        console.error('[Check Email Error]', error.message);
        res.status(500).json({ message: 'Server error checking email.' });
    }
});

// GET /api/auth/me — protected
router.get('/me', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

export default router;
