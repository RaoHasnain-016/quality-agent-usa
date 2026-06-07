const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { Schema } = mongoose

const PLAN_LIMITS = {
  free: 100,
  starter: 1000,
  pro: 10000,
  team: 1000000
}

const userSchema = new Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, default: '' },
  company: { type: String, default: '', trim: true },
  plan: { type: String, enum: ['free', 'starter', 'pro', 'team'], default: 'free' },
  alertThreshold: { type: Number, default: 70, min: 0, max: 100 },
  alertEmail: { type: String, default: '', trim: true },
  companyPolicy: { type: String, default: '' },
  evalUsed: { type: Number, default: 0 },
  evalLimit: { type: Number, default: 100 },
  usageResetAt: { type: Date, default: () => firstDayOfNextMonth() },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

function firstDayOfNextMonth () {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

userSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  this.evalLimit = PLAN_LIMITS[this.plan] || PLAN_LIMITS.free
  next()
})

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 12)
}

userSchema.methods.comparePassword = async function (password) {
  if (!this.passwordHash) return false
  return bcrypt.compare(password, this.passwordHash)
}

userSchema.methods.resetMonthlyUsageIfNeeded = async function () {
  if (this.usageResetAt && this.usageResetAt > new Date()) return this
  this.evalUsed = 0
  this.usageResetAt = firstDayOfNextMonth()
  return this.save()
}

userSchema.methods.hasQuota = function (requested = 1) {
  return this.evalUsed + requested <= this.evalLimit
}

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    email: this.email,
    company: this.company,
    plan: this.plan,
    alertThreshold: this.alertThreshold,
    alertEmail: this.alertEmail,
    companyPolicy: this.companyPolicy,
    evalUsed: this.evalUsed,
    evalLimit: this.evalLimit,
    usageResetAt: this.usageResetAt,
    createdAt: this.createdAt
  }
}

module.exports = mongoose.model('User', userSchema)
