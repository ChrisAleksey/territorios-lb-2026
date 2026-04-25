#!/usr/bin/env node
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'territorios-lb-2026-27d76';
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Uso: npm run admin:create -- correo@dominio.com "contraseña-temporal"');
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId
});

const auth = getAuth();
let user;

try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password, disabled: false });
} catch (err) {
  if (err.code !== 'auth/user-not-found') throw err;
  user = await auth.createUser({
    email,
    password,
    emailVerified: true,
    disabled: false
  });
}

await auth.setCustomUserClaims(user.uid, {
  ...(user.customClaims || {}),
  admin: true
});

console.log(`Admin listo: ${email} (${user.uid}) en ${projectId}`);
