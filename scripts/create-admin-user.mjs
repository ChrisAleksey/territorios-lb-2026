#!/usr/bin/env node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import bcrypt from 'bcryptjs';

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'territorios-lb-2026-27d76';
const ADMIN_EMAIL_DOMAIN = 'admin.territorios-lb.local';
const ADMIN_USERS = {
  aleksey: 'aleksey',
  rene: 'rene'
};
const args = process.argv.slice(2);

if (args.length === 0 || args.length % 2 !== 0) {
  console.error('Uso: npm run admin:create -- nombre passcode [nombre passcode...]');
  process.exit(1);
}

const users = [];
for (let i = 0; i < args.length; i += 2) {
  const adminName = String(args[i]).trim().toLowerCase();
  const passcode = args[i + 1];
  if (!ADMIN_USERS[adminName]) {
    console.error(`Admin no reconocido: ${args[i]}`);
    process.exit(1);
  }

  users.push({
    localId: `admin:${adminName}`,
    email: `${adminName}@${ADMIN_EMAIL_DOMAIN}`,
    emailVerified: true,
    displayName: adminName,
    passwordHash: Buffer.from(await bcrypt.hash(passcode, 10), 'utf8').toString('base64'),
    customAttributes: JSON.stringify({ admin: true, adminName }),
    disabled: false
  });
}

const dir = await mkdtemp(join(tmpdir(), 'territorios-admin-import-'));
const file = join(dir, 'users.json');

try {
  await writeFile(file, JSON.stringify({ users }), { mode: 0o600 });
  const result = spawnSync('firebase', [
    'auth:import',
    file,
    '--hash-algo=BCRYPT',
    '--project',
    projectId
  ], { stdio: 'inherit' });

  if (result.status !== 0) process.exit(result.status || 1);
  console.log(`Admins listos en ${projectId}: ${users.map(user => user.localId).join(', ')}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
