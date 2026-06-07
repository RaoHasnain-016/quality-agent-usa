const { GoogleGenerativeAI } = require('@google/generative-ai')

let geminiModel = null

function getGemini () {
  if (geminiModel) return geminiModel

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey.includes('YOUR_KEY_HERE')) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  geminiModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  })

  return geminiModel
}

module.exports = { getGemini }
