const admin = require('firebase-admin')

function initFirebase () {
  if (admin.apps.length > 0) return admin

  const projectId = process.env.FIREBASE_PROJECT_ID
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

  const missing =
    !projectId ||
    !privateKey ||
    !clientEmail ||
    projectId.includes('xxxxx') ||
    privateKey.includes('YOUR_KEY_HERE')

  if (missing) {
    console.warn('Firebase Admin credentials are not configured. Firebase ID token auth is disabled.')
    return null
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail
    })
  })

  console.log('Firebase Admin initialized')
  return admin
}

module.exports = initFirebase()
