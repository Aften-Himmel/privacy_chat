import mongoose from 'mongoose'

const verificationCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    }
  },
  { timestamps: true }
)

// Proper TTL index — MongoDB removes docs automatically when expiresAt is passed
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Index by email for fast lookups
verificationCodeSchema.index({ email: 1 })

const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema)
export default VerificationCode
