import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

let testEnv;

const projectId = 'territorios-lb-2026-rules-test';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

function dbAsAdmin() {
  return testEnv.authenticatedContext('admin-user', { admin: true }).firestore();
}

function dbAsCaptain(token) {
  return testEnv.authenticatedContext(`captain-${token}`, { capitanToken: token }).firestore();
}

function dbAsAnon() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

const capitan = {
  nombre: 'Hno. Prueba',
  token: 'cap-token',
  tel: '5555555555',
  activo: true,
};

const sesion = {
  capitanToken: 'cap-token',
  fecha: '2026-04-25',
  tipo: 'casaencasa',
  hora: '09:30',
  lugar: 'Fam. Prueba',
  grupos: '1, 2',
  territorios: ['t1', 't2'],
  capitan: 'Hno. Prueba',
  estados: {},
};

const historial = {
  territorio: 't1',
  lugar: 'Fam. Prueba',
  estado: 'completo',
  notas: '',
  capitan: 'Hno. Prueba',
  capitanToken: 'cap-token',
  tipo: 'casaencasa',
  fechaPredicacion: '2026-04-25',
  fechaCompletado: '2026-04-25',
  fechaArchivado: '2026-04-25',
};

describe('capitanes', () => {
  test('bloquea lectura y escritura anónima', async () => {
    await seed('capitanes/cap-token', capitan);

    await assertFails(getDoc(doc(dbAsAnon(), 'capitanes/cap-token')));
    await assertFails(setDoc(doc(dbAsAnon(), 'capitanes/cap-token'), capitan));
  });

  test('permite al admin administrar capitanes', async () => {
    await assertSucceeds(setDoc(doc(dbAsAdmin(), 'capitanes/cap-token'), capitan));
    await assertSucceeds(getDocs(collection(dbAsAdmin(), 'capitanes')));
    await assertSucceeds(deleteDoc(doc(dbAsAdmin(), 'capitanes/cap-token')));
  });

  test('permite al capitán leer solo su propio documento', async () => {
    await seed('capitanes/cap-token', capitan);
    await seed('capitanes/otro-token', { ...capitan, token: 'otro-token' });

    await assertSucceeds(getDoc(doc(dbAsCaptain('cap-token'), 'capitanes/cap-token')));
    await assertFails(getDoc(doc(dbAsCaptain('cap-token'), 'capitanes/otro-token')));
    await assertFails(getDocs(collection(dbAsCaptain('cap-token'), 'capitanes')));
  });
});

describe('sesiones', () => {
  test('permite al admin crear sesión válida', async () => {
    await assertSucceeds(setDoc(doc(dbAsAdmin(), 'sesiones/2026-04-25_cap-token'), sesion));
  });

  test('bloquea sesión con ID que no coincide con fecha y token', async () => {
    await assertFails(setDoc(doc(dbAsAdmin(), 'sesiones/2026-04-26_cap-token'), sesion));
  });

  test('permite al capitán leer y actualizar solo estados de su sesión', async () => {
    await seed('sesiones/2026-04-25_cap-token', sesion);

    await assertSucceeds(getDoc(doc(dbAsCaptain('cap-token'), 'sesiones/2026-04-25_cap-token')));
    await assertSucceeds(updateDoc(doc(dbAsCaptain('cap-token'), 'sesiones/2026-04-25_cap-token'), {
      estados: {
        t1: { estado: 'completo', notas: '' },
      },
    }));
    await assertFails(updateDoc(doc(dbAsCaptain('cap-token'), 'sesiones/2026-04-25_cap-token'), {
      lugar: 'Otro lugar',
    }));
  });

  test('bloquea a un capitán ajeno', async () => {
    await seed('sesiones/2026-04-25_cap-token', sesion);

    await assertFails(getDoc(doc(dbAsCaptain('otro-token'), 'sesiones/2026-04-25_cap-token')));
    await assertFails(updateDoc(doc(dbAsCaptain('otro-token'), 'sesiones/2026-04-25_cap-token'), {
      estados: {
        t1: { estado: 'completo', notas: '' },
      },
    }));
  });
});

describe('historial', () => {
  test('bloquea lectura anónima y permite lectura autenticada', async () => {
    await seed('historial/entry-1', historial);

    await assertFails(getDoc(doc(dbAsAnon(), 'historial/entry-1')));
    await assertSucceeds(getDoc(doc(dbAsCaptain('cap-token'), 'historial/entry-1')));
  });

  test('permite crear historial al capitán correspondiente', async () => {
    await assertSucceeds(setDoc(doc(dbAsCaptain('cap-token'), 'historial/entry-1'), historial));
  });

  test('bloquea ciclo_reset para capitán no admin', async () => {
    await assertFails(setDoc(doc(dbAsCaptain('cap-token'), 'historial/reset-1'), {
      ...historial,
      territorio: 'Fam. Prueba',
      estado: 'ciclo_reset',
    }));
  });

  test('permite update/delete solo al admin', async () => {
    await seed('historial/entry-1', historial);

    await assertFails(deleteDoc(doc(dbAsCaptain('cap-token'), 'historial/entry-1')));
    await assertSucceeds(updateDoc(doc(dbAsAdmin(), 'historial/entry-1'), { notas: 'ajustado' }));
    await assertSucceeds(deleteDoc(doc(dbAsAdmin(), 'historial/entry-1')));
  });
});
