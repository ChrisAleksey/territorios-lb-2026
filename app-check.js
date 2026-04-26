'use strict';

const FirebaseAppCheck = {
  CONFIG: {
    appId: '1:41037652213:web:5402152c15385c4f5ee5bc',
    messagingSenderId: '41037652213',
    measurementId: 'G-VP1TZPJCF7',
    storageBucket: 'territorios-lb-2026-27d76.firebasestorage.app',
    siteKey: '', // reCAPTCHA v3 site key; vacío mantiene App Check apagado.
    sdkVersion: '12.6.0'
  },

  _readyPromise: null,
  _appCheck: null,
  _getToken: null,

  ready() {
    if (!this._readyPromise) this._readyPromise = Promise.resolve().then(() => this.init());
    return this._readyPromise;
  },

  async init() {
    const config = this._config();
    if (!config.appId || !config.siteKey || !window.FB?.configureSecurity) return false;

    const originalReadyPromise = this._readyPromise;
    FB.configureSecurity({ appCheckTokenProvider: async () => {
      await originalReadyPromise;
      return this.getToken();
    }});

    try {
      const baseUrl = `https://www.gstatic.com/firebasejs/${config.sdkVersion}`;
      const [appSdk, appCheckSdk] = await Promise.all([
        import(`${baseUrl}/firebase-app.js`),
        import(`${baseUrl}/firebase-app-check.js`)
      ]);

      const appName = 'territorios-lb-app-check';
      const existingApp = appSdk.getApps().find(app => app.name === appName);
      const app = existingApp || appSdk.initializeApp({
        apiKey: FB.API_KEY,
        authDomain: `${FB.PROJECT}.firebaseapp.com`,
        projectId: FB.PROJECT,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId
      }, appName);

      this._appCheck = appCheckSdk.initializeAppCheck(app, {
        provider: new appCheckSdk.ReCaptchaV3Provider(config.siteKey),
        isTokenAutoRefreshEnabled: true
      });
      this._getToken = appCheckSdk.getToken;
      return true;
    } catch (err) {
      console.warn('[AppCheck] No se pudo inicializar:', err?.message || err);
      return false;
    }
  },

  async getToken() {
    if (!this._appCheck || !this._getToken) return null;

    try {
      const response = await this._getToken(this._appCheck, false);
      return response?.token || null;
    } catch (err) {
      console.warn('[AppCheck] No se pudo obtener token:', err?.message || err);
      return null;
    }
  },

  _config() {
    return {
      ...this.CONFIG,
      ...(window.FIREBASE_APPCHECK_CONFIG || {})
    };
  }
};

window.FirebaseAppCheck = FirebaseAppCheck;
window.AppCheck = FirebaseAppCheck;
FirebaseAppCheck.ready();
