const Batch = require('../models/Batch')
const Conversation = require('../models/Conversation')
const User = require('../models/User')
const { parseFile } = require('./parseService')
const { processBatch } = require('./evalService')
const { checkAndSend } = require('./alertService')

async function createAndProcessBatch (userId, file, batchName) {
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  await user.resetMonthlyUsageIfNeeded()

  const conversations = parseFile(file.buffer, file.mimetype, file.originalname)
  if (!conversations.length) throw new Error('No valid conversations found in file')

  if (!user.hasQuota(conversations.length)) {
    const remaining = Math.max(0, user.evalLimit - user.evalUsed)
    throw new Error(`Quota exceeded. ${remaining} evaluations remaining, uploaded file has ${conversations.length}.`)
  }

  const reserved = await User.findOneAndUpdate(
    {
      _id: user._id,
      $expr: {
        $lt: [
          { $ifNull: ['$batchUploadsUsed', 0] },
          { $ifNull: ['$batchUploadLimit', 5] }
        ]
      }
    },
    { $inc: { batchUploadsUsed: 1 } },
    { new: true }
  )
  if (!reserved) {
    throw new Error(`Monthly file limit reached. Your ${user.plan} plan allows ${user.batchUploadLimit} files per month.`)
  }

  let batch
  try {
    batch = await Batch.create({
    userId: user._id,
    batchName,
    name: batchName,
    status: 'processing',
    totalConversations: conversations.length,
    totalCount: conversations.length,
    alertThreshold: user.alertThreshold
    })

  const docs = conversations.map(conversation => ({
    batchId: batch._id,
    userId: user._id,
    externalId: conversation.externalId || '',
    rawText: conversation.rawText
  }))

    const inserted = await Conversation.insertMany(docs)
    await User.findByIdAndUpdate(user._id, { $inc: { evalUsed: inserted.length } })

  setImmediate(async () => {
    try {
      await processBatch(batch._id, inserted, user.companyPolicy, user.alertThreshold)
      await checkAndSend(batch._id)
    } catch (err) {
      await Batch.findByIdAndUpdate(batch._id, {
        status: 'failed',
        errorMessage: err.message,
        completedAt: new Date()
      })
    }
  })

    return {
    batchId: batch._id,
    batchName: batch.batchName,
    totalConversations: inserted.length,
    status: batch.status,
    message: 'Evaluation started'
    }
  } catch (error) {
    await User.findByIdAndUpdate(user._id, { $inc: { batchUploadsUsed: -1 } })
    if (batch?._id) await Batch.findByIdAndDelete(batch._id)
    throw error
  }
}

module.exports = { createAndProcessBatch }
