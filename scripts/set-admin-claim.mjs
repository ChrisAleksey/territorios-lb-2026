#!/usr/bin/env node
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'territorios-lb-2026-27d76';
const email = process.argv[2];

if (!email) {
  console.error('Uso: npm run admin:claim -- correo@dominio.com');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId
});

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = {
  ...(user.customClaims || {}),
  admin: true
};

await auth.setCustomUserClaims(user.uid, claims);

console.log(`Admin claim activado para ${email} (${user.uid}) en ${projectId}`);
