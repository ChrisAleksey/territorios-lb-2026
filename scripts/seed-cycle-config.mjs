#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'territorios-lb-2026-27d76';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'territory-model.js'), 'utf8');
const match = source.match(/const DEFAULT_CYCLE_CONFIG = (\{[\s\S]*?\n  \});/);

if (!match) {
  console.error('No se pudo leer DEFAULT_CYCLE_CONFIG desde territory-model.js');
  process.exit(1);
}

const tRange = (from, to) => {
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(`t${i}`);
  return arr;
};
const TERRITORY_TYPES = ['casaencasa', 'carta'];
const config = Function('tRange', 'TERRITORY_TYPES', `return (${match[1]});`)(tRange, TERRITORY_TYPES);

initializeApp({
  credential: applicationDefault(),
  projectId
});

await getFirestore().doc('config/ciclos').set(config);
console.log(`Configuración de ciclos guardada en ${projectId}: ${Object.keys(config.lugares).length} lugares`);
