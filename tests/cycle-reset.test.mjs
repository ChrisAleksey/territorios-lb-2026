import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import vm from 'node:vm';

function createDomStub() {
  const noop = () => {};
  const classList = {
    add: noop,
    remove: noop,
    contains: () => false,
    toggle: noop,
  };

  return {
    documentElement: { style: { setProperty: noop } },
    addEventListener: noop,
    getElementById: () => ({
      addEventListener: noop,
      setAttribute: noop,
      removeAttribute: noop,
      querySelector: () => null,
      querySelectorAll: () => [],
      appendChild: noop,
      remove: noop,
      classList,
      style: { setProperty: noop, removeProperty: noop },
      dataset: {},
      value: '',
      textContent: '',
      innerHTML: '',
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      classList,
      style: {},
      dataset: {},
      appendChild: noop,
      remove: noop,
      setAttribute: noop,
    }),
  };
}

function loadAppContext() {
  const window = {
    location: { search: '' },
    addEventListener: () => {},
    innerHeight: 800,
    innerWidth: 1200,
  };
  const context = {
    window,
    document: createDomStub(),
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    screen: { height: 800 },
    console: { ...console, info: () => {} },
    setTimeout,
    clearTimeout,
    URLSearchParams,
    FB: {
      todayMX: () => '2026-04-26',
      addCicloReset: async () => {},
    },
    maplibregl: {
      Map: class {},
      GeolocateControl: class {},
      LngLatBounds: class {},
    },
  };
  context.globalThis = context;
  context.window = Object.assign(window, context);
  context.Alpine = null;
  context.gsap = null;

  vm.createContext(context);
  vm.runInContext(readFileSync('territory-model.js', 'utf8'), context, { filename: 'territory-model.js' });
  context.TerritoryModel = context.window.TerritoryModel;
  vm.runInContext(readFileSync('app.js', 'utf8'), context, { filename: 'app.js' });
  return context;
}

function createAppHarness(context, overrides = {}) {
  const app = Object.create(context.window.TerritorialApp);
  Object.assign(app, {
    territoryLastWorked: {},
    territoryStatus: {},
    _cicloResets: {},
    _canWriteCycleReset: true,
    sessionInfo: {},
    currentType: 'casaencasa',
    showToast: () => {},
  }, overrides);
  return app;
}

describe('ciclo_reset automático', () => {
  test('registra reset cuando todos los territorios del lugar están completos', async () => {
    const context = loadAppContext();
    const calls = [];
    context.FB.addCicloReset = async (...args) => calls.push(args);

    const app = createAppHarness(context, {
      territoryLastWorked: {
        'casaencasa::t1': '2026-04-01',
        'casaencasa::t2': '2026-04-02',
        'casaencasa::t3': '2026-04-03',
        'casaencasa::t4': '2026-04-04',
        'casaencasa::t6': '2026-04-06',
        'casaencasa::t7': '2026-04-07',
        'casaencasa::t8': '2026-04-08',
        'casaencasa::t9': '2026-04-09',
        'casaencasa::t10': '2026-04-10',
      },
      territoryStatus: { t11: 'completo' },
    });

    await app._checkCompletedCycles([{
      territorio: 't11',
      lugar: 'Fam. Hernández Mora',
      estado: 'completo',
      tipo: 'casaencasa',
    }]);

    assert.deepEqual(calls, [['Fam. Hernández Mora', '2026-04-26', 'casaencasa']]);
    assert.equal(app._cicloResets['Fam. Hernández Mora::casaencasa'], '2026-04-26');
    assert.equal(app.territoryLastWorked['casaencasa::t1'], undefined);
  });

  test('no registra reset si falta un territorio del ciclo', async () => {
    const context = loadAppContext();
    const calls = [];
    context.FB.addCicloReset = async (...args) => calls.push(args);

    const app = createAppHarness(context, {
      territoryLastWorked: {
        'casaencasa::t1': '2026-04-01',
        'casaencasa::t2': '2026-04-02',
        'casaencasa::t3': '2026-04-03',
        'casaencasa::t4': '2026-04-04',
        'casaencasa::t6': '2026-04-06',
        'casaencasa::t7': '2026-04-07',
        'casaencasa::t8': '2026-04-08',
        'casaencasa::t9': '2026-04-09',
      },
      territoryStatus: { t11: 'completo' },
    });

    await app._checkCompletedCycles([{
      territorio: 't11',
      lugar: 'Fam. Hernández Mora',
      estado: 'completo',
      tipo: 'casaencasa',
    }]);

    assert.deepEqual(calls, []);
  });

  test('detecta ciclo completo pero no escribe reset sin permisos admin', async () => {
    const context = loadAppContext();
    const calls = [];
    context.FB.addCicloReset = async (...args) => calls.push(args);

    const app = createAppHarness(context, {
      _canWriteCycleReset: false,
      territoryLastWorked: {
        'carta::t5': '2026-04-05',
        'carta::t15': '2026-04-15',
        'carta::t20': '2026-04-20',
        'carta::t25': '2026-04-25',
      },
      territoryStatus: { t25: 'completo' },
    });

    await app._checkCompletedCycles([{
      territorio: 't25',
      lugar: 'Fam. Hernández Mora',
      estado: 'completo',
      tipo: 'carta',
    }]);

    assert.deepEqual(calls, []);
    assert.equal(app._cicloResets['Fam. Hernández Mora::carta'], undefined);
  });

  test('separa ciclos por tipo de territorio', async () => {
    const context = loadAppContext();
    const calls = [];
    context.FB.addCicloReset = async (...args) => calls.push(args);

    const app = createAppHarness(context, {
      territoryLastWorked: {
        'carta::t5': '2026-04-05',
        'carta::t15': '2026-04-15',
        'carta::t20': '2026-04-20',
      },
      territoryStatus: { t25: 'completo' },
    });

    await app._checkCompletedCycles([{
      territorio: 't25',
      lugar: 'Fam. Hernández Mora',
      estado: 'completo',
      tipo: 'carta',
    }]);

    assert.deepEqual(calls, [['Fam. Hernández Mora', '2026-04-26', 'carta']]);
    assert.equal(app._cicloResets['Fam. Hernández Mora::carta'], '2026-04-26');
    assert.equal(app._cicloResets['Fam. Hernández Mora::casaencasa'], undefined);
  });
});
