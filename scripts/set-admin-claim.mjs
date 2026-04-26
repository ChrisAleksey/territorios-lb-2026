#!/usr/bin/env node
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || 'territorios-lb-2026-27d76';
const identifier = process.argv[2];

if (!identifier) {
  console.error('Uso: npm run admin:claim -- uid-o-email');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId
});

const auth = getAuth();
const user = identifier.includes('@')
  ? await auth.getUserByEmail(identifier)
  : await auth.getUser(identifier);

await auth.setCustomUserClaims(user.uid, {
  ...(user.customClaims || {}),
  admin: true,
  adminName: user.displayName || user.uid.replace(/^admin:/, '')
});

console.log(`Admin claim activado para ${user.email || user.uid} (${user.uid}) en ${projectId}`);
