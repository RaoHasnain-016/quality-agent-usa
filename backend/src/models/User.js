const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const { Schema } = mongoose

const { getPlan } = require('../services/planService')

const userSchema = new Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, default: '' },
  company: { type: String, default: '', trim: true },
  displayName: { type: String, default: '', trim: true },
  timezone: { type: String, default: 'Asia/Karachi', trim: true },
  theme: { type: String, enum: ['midnight', 'graphite', 'ocean', 'light'], default: 'midnight' },
  dataRetentionDays: { type: Number, default: 90, min: 7, max: 3650 },
  notificationsEnabled: { type: Boolean, default: true },
  weeklyDigest: { type: Boolean, default: true },
  requireReviewForFlagged: { type: Boolean, default: true },
  plan: { type: String, enum: ['free', 'starter', 'pro', 'team'], default: 'free' },
  alertThreshold: { type: Number, default: 70, min: 0, max: 100 },
  alertEmail: { type: String, default: '', trim: true },
  companyPolicy: { type: String, default: '' },
  evalUsed: { type: Number, default: 0 },
  evalLimit: { type: Number, default: 100 },
  batchUploadsUsed: { type: Number, default: 0 },
  batchUploadLimit: { type: Number, default: 5 },
  usageResetAt: { type: Date, default: () => firstDayOfNextMonth() },
  stripeCustomerId: { type: String, default: '', index: true },
  stripeSubscriptionId: { type: String, default: '', index: true },
  subscriptionStatus: { type: String, default: 'inactive' },
  subscriptionCurrentPeriodEnd: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

function firstDayOfNextMonth () {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

userSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  const plan = getPlan(this.plan)
  this.evalLimit = plan.evalLimit
  this.batchUploadLimit = plan.batchUploadLimit
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
  const plan = getPlan(this.plan)
  const needsReset = !this.usageResetAt || this.usageResetAt <= new Date()
  const needsSync = this.evalLimit !== plan.evalLimit || this.batchUploadLimit !== plan.batchUploadLimit
  if (!needsReset && !needsSync) return this
  if (needsReset) {
    this.evalUsed = 0
    this.batchUploadsUsed = 0
    this.usageResetAt = firstDayOfNextMonth()
  }
  this.evalLimit = plan.evalLimit
  this.batchUploadLimit = plan.batchUploadLimit
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
    displayName: this.displayName,
    timezone: this.timezone,
    theme: this.theme,
    dataRetentionDays: this.dataRetentionDays,
    notificationsEnabled: this.notificationsEnabled,
    weeklyDigest: this.weeklyDigest,
    requireReviewForFlagged: this.requireReviewForFlagged,
    plan: this.plan,
    alertThreshold: this.alertThreshold,
    alertEmail: this.alertEmail,
    companyPolicy: this.companyPolicy,
    evalUsed: this.evalUsed,
    evalLimit: this.evalLimit,
    batchUploadsUsed: this.batchUploadsUsed,
    batchUploadLimit: this.batchUploadLimit,
    subscriptionStatus: this.subscriptionStatus,
    subscriptionCurrentPeriodEnd: this.subscriptionCurrentPeriodEnd,
    usageResetAt: this.usageResetAt,
    createdAt: this.createdAt
  }
}

module.exports = mongoose.model('User', userSchema)
