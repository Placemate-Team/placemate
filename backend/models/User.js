import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLES = ['Ignite', 'Spark', 'Alumni', 'Faculty', 'Coordinator', 'Admin'];
const STATUS = ['active', 'pending', 'rejected'];

const userSchema = new mongoose.Schema(
    {
        // ── Core identity ─────────────────────────────────────
        name: {
            type: String,
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
            default: '',
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        googleId: {
            type: String,
            default: '',
        },

        // ── Profile state ─────────────────────────────────────
        role: {
            type: String,
            enum: ROLES,
            default: 'Ignite',
        },
        status: {
            type: String,
            enum: STATUS,
            default: 'active',
        },
        profileComplete: {
            type: Boolean,
            default: false,
        },

        // ── Shared fields ─────────────────────────────────────
        nickname: { type: String, default: '' },
        phone: { type: String, default: '' },
        branch: { type: String, default: '' },
        batch: { type: String, default: '' },
        linkedIn: { type: String, default: '' },
        profileImage: { type: String, default: '' },

        // ── Student specific ──────────────────────────────────
        rollNumber: { type: String, default: '' },
        college: { type: String, default: '' }, // 'ANITS' | 'Other'

        // ── Alumni specific ───────────────────────────────────
        placedCompany: { type: String, default: '' },
        currentCompany: { type: String, default: '' },
        currentDesignation: { type: String, default: '' },

        // ── Faculty specific ──────────────────────────────────
        department: { type: String, default: '' },
        designation: { type: String, default: '' },
        yearsOfExperience: { type: Number, default: 0 },
        employeeId: { type: String, default: '' },

        // ── Misc ──────────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

// Hash password before saving (only if password is set)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare entered password with hashed
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Return user without password
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
