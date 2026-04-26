#!/usr/bin/env node
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'territorios-lb-2026-27d76';
const CAPTAIN_EMAIL_DOMAIN = 'capitan.territorios-lb.local';
const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter(arg => arg.startsWith('--')));
const tokenArgs = rawArgs.filter(arg => !arg.startsWith('--'));
const allowedFlags = new Set(['--from-firestore', '--dry-run']);
const unknownFlags = [...flags].filter(flag => !allowedFlags.has(flag));
const fromFirestore = flags.has('--from-firestore');
const dryRun = flags.has('--dry-run');

function usage() {
  console.error('Uso:');
  console.error('  npm run captains:import -- token [token...]');
  console.error('  npm run captains:import -- --from-firestore [--dry-run]');
  console.error('Cada token será también el passcode interno de su usuario Firebase Auth.');
}

if (unknownFlags.length || (!fromFirestore && tokenArgs.length === 0) || (fromFirestore && tokenArgs.length > 0)) {
  if (unknownFlags.length) console.error(`Flag(s) no reconocidas: ${unknownFlags.join(', ')}`);
  usage();
  process.exit(1);
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function redactToken(token) {
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function validateCaptains(captains) {
  const invalid = captains.filter(captain => !/^[a-z0-9][a-z0-9-]{2,80}$/.test(captain.token));
  if (invalid.length) {
    console.error(`Token(s) inválido(s): ${invalid.map(c => redactToken(c.token)).join(', ')}`);
    process.exit(1);
  }

  const seen = new Set();
  const duplicates = new Set();
  for (const captain of captains) {
    if (seen.has(captain.token)) duplicates.add(captain.token);
    seen.add(captain.token);
  }
  if (duplicates.size) {
    console.error(`Token(s) duplicados: ${[...duplicates].map(redactToken).join(', ')}`);
    process.exit(1);
  }
}

async function loadCaptainsFromFirestore() {
  const snap = await getFirestore().collection('capitanes').where('activo', '==', true).get();
  return snap.docs
    .map(doc => {
      const data = doc.data() || {};
      const token = normalizeToken(data.token || doc.id);
      return {
        token,
        nombre: String(data.nombre || token).trim()
      };
    })
    .filter(captain => captain.token)
    .sort((a, b) => a.token.localeCompare(b.token));
}

async function getExistingCaptainUser(auth, uid, email) {
  try {
    return await auth.getUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  try {
    return await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    return null;
  }
}

async function upsertCaptain(captain) {
  const auth = getAuth();
  const uid = `capitan:${captain.token}`;
  const email = `${captain.token}@${CAPTAIN_EMAIL_DOMAIN}`;
  const user = {
    email,
    emailVerified: true,
    displayName: captain.nombre || captain.token,
    password: captain.token,
    disabled: false
  };

  const existing = await getExistingCaptainUser(auth, uid, email);
  if (existing) {
    await auth.updateUser(existing.uid, user);
    await auth.setCustomUserClaims(existing.uid, { capitanToken: captain.token });
    return 'updated';
  }

  await auth.createUser({ uid, ...user });
  await auth.setCustomUserClaims(uid, { capitanToken: captain.token });
  return 'created';
}

initializeApp({
  credential: applicationDefault(),
  projectId
});

const captains = fromFirestore
  ? await loadCaptainsFromFirestore()
  : [...new Set(tokenArgs.map(normalizeToken).filter(Boolean))].map(token => ({ token, nombre: token }));

if (!captains.length) {
  console.error('No hay capitanes activos para importar.');
  process.exit(1);
}

validateCaptains(captains);

if (dryRun) {
  console.log(`Dry-run: ${captains.length} capitán(es) activo(s) listo(s) para Auth en ${projectId}.`);
  console.log('No se hicieron cambios en Firebase Auth.');
  process.exit(0);
}

const result = { created: 0, updated: 0 };
for (const captain of captains) {
  const action = await upsertCaptain(captain);
  result[action] += 1;
}

console.log(`Capitanes Auth listos en ${projectId}: ${result.created} creados, ${result.updated} actualizados.`);
