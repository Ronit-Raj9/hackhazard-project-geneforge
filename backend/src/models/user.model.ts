import mongoose, { Document, Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../config';

// User document interface
export interface IUser extends Document {
  email?: string;
  password?: string;
  name?: string;
  walletAddress?: string;
  googleId?: string;
  role: 'user' | 'admin';
  authProvider?: 'email' | 'google' | 'wallet';
  preferences: {
    theme?: 'light' | 'dark';
    aiVoice?: string;
  };
  
  profileImageUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile?: { onboardingCompleted: boolean };
  
  // Instance methods
  generateAccessToken: () => string;
}

// User schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false, // Don't include by default in queries
    },
    name: {
      type: String,
      trim: true,
    },
    walletAddress: {
      type: String,
      sparse: true, // Index only docs with this field
      trim: true,
      lowercase: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
    },
    authProvider: {
      type: String,
      enum: ['email', 'google', 'wallet'],
      default: 'email',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      aiVoice: {
        type: String,
        default: 'default',
      },
    },
    profileImageUrl: {
      type: String,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Virtual for profile data - creates a relationship with Profile model
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Method to generate access token
userSchema.methods.generateAccessToken = function () {
  // Using 'any' type to bypass TypeScript checking for JWT
  // This is not ideal but helps us get past the build issues
  const jwtSign: any = jwt.sign;
  
  return jwtSign(
    {
      _id: this._id.toString(),
      email: this.email,
      walletAddress: this.walletAddress,
      role: this.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRY,
    }
  );
};

// Pre-save middleware to set auth provider based on credentials
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('googleId') || this.isModified('walletAddress')) {
    if (this.googleId && !this.authProvider) {
      this.authProvider = 'google';
    } else if (this.walletAddress && !this.authProvider) {
      this.authProvider = 'wallet';
    } else if (!this.authProvider) {
      this.authProvider = 'email';
    }
  }
  next();
});

// Create and export User model
const User = mongoose.model<IUser>('User', userSchema);
export default User; 