const Papa = require('papaparse')

/**
 * Supported CSV formats:
 *
 * Format A — Single column:
 *   full_conversation
 *   "Customer: Hi\nAgent: Hello..."
 *
 * Format B — Multi column (Zendesk/Intercom style):
 *   id, customer_message, agent_message
 *   "123", "Where is my order?", "Let me check..."
 *
 * Format C — Multi turn (one row per message):
 *   conversation_id, role, message
 *   "abc", "customer", "Hi"
 *   "abc", "agent", "Hello"
 */

function parseCSV (buffer) {
  const text = buffer.toString('utf8')
  const { data, errors } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_')
  })

  if (errors.length > 0) {
    console.warn('CSV parse warnings:', errors.slice(0, 3))
  }

  if (!data.length) throw new Error('CSV file is empty or has no valid rows')

  const cols = Object.keys(data[0])

  // Format A: single full_conversation column
  if (cols.includes('full_conversation') || cols.includes('conversation') || cols.includes('transcript')) {
    const key = cols.find(c => ['full_conversation', 'conversation', 'transcript'].includes(c))
    return data.map((row, i) => ({
      externalId: row.id || row.conversation_id || `row-${i + 1}`,
      rawText: row[key]?.trim()
    })).filter(r => r.rawText)
  }

  // Format B: customer_message + agent_message columns
  if (cols.includes('customer_message') && cols.includes('agent_message')) {
    return data.map((row, i) => ({
      externalId: row.id || row.conversation_id || `row-${i + 1}`,
      rawText: `Customer: ${row.customer_message?.trim()}\nAgent: ${row.agent_message?.trim()}`
    })).filter(r => r.rawText)
  }

  // Format C: multi-turn (group by conversation_id)
  if (cols.includes('conversation_id') && cols.includes('role') && cols.includes('message')) {
    const grouped = {}
    data.forEach(row => {
      const id = row.conversation_id
      if (!grouped[id]) grouped[id] = []
      grouped[id].push(`${row.role}: ${row.message?.trim()}`)
    })
    return Object.entries(grouped).map(([id, lines]) => ({
      externalId: id,
      rawText: lines.join('\n')
    }))
  }

  // Fallback: join all column values as text
  return data.map((row, i) => ({
    externalId: row.id || `row-${i + 1}`,
    rawText: Object.values(row).filter(Boolean).join(' | ')
  })).filter(r => r.rawText)
}

/**
 * Supported JSON formats:
 *
 * Format A: [{ "id": "1", "transcript": "Customer: Hi\nAgent: Hello" }]
 * Format B: [{ "id": "1", "messages": [{ "role": "customer", "text": "Hi" }] }]
 * Format C: [{ "id": "1", "customer": "Hi", "agent": "Hello" }]
 */
function parseJSON (buffer) {
  let data
  try {
    data = JSON.parse(buffer.toString('utf8'))
  } catch {
    throw new Error('Invalid JSON file — could not parse')
  }

  if (!Array.isArray(data)) throw new Error('JSON must be an array of conversations')
  if (!data.length) throw new Error('JSON array is empty')

  return data.map((item, i) => {
    const id = item.id || item.conversation_id || `item-${i + 1}`

    // Format A: pre-built transcript string
    if (item.transcript || item.full_conversation || item.text) {
      return { externalId: id, rawText: (item.transcript || item.full_conversation || item.text).trim() }
    }

    // Format B: messages array
    if (Array.isArray(item.messages)) {
      const text = item.messages
        .map(m => `${m.role || m.author || 'unknown'}: ${m.text || m.content || m.body}`)
        .join('\n')
      return { externalId: id, rawText: text }
    }

    // Format C: flat customer/agent fields
    if (item.customer || item.agent) {
      return {
        externalId: id,
        rawText: [
          item.customer ? `Customer: ${item.customer}` : '',
          item.agent ? `Agent: ${item.agent}` : ''
        ].filter(Boolean).join('\n')
      }
    }

    // Fallback: stringify the whole object
    return { externalId: id, rawText: JSON.stringify(item) }
  }).filter(r => r.rawText?.trim())
}

function parseFile (buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase()

  if (ext === 'csv' || mimetype === 'text/csv') {
    return parseCSV(buffer)
  }

  if (ext === 'json' || mimetype === 'application/json') {
    return parseJSON(buffer)
  }

  throw new Error(`Unsupported file type: ${ext}`)
}

module.exports = { parseFile, parseCSV, parseJSON }
