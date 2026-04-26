'use strict';

const FirebasePasscodeAuth = {
  API_KEY: 'AIzaSyBsdDG-k1zgHuYwjo05Ba5rcqlkxmIG4FA',
  ADMIN_EMAIL_DOMAIN: 'admin.territorios-lb.local',
  CAPTAIN_EMAIL_DOMAIN: 'capitan.territorios-lb.local',
  ADMIN_USERS: ['aleksey', 'rene'],
  ADMIN_SESSION_KEY: 'firebase_admin_auth',
  CAPTAIN_SESSION_PREFIX: 'firebase_captain_auth_',
  CLOCK_SKEW_MS: 5 * 60 * 1000,

  _adminSession: null,
  _captainSessions: {},
  _adminInitPromise: null,

  initAdmin() {
    if (!this._adminInitPromise) this._adminInitPromise = this._initAdmin();
    return this._adminInitPromise;
  },

  async _initAdmin() {
    const session = this._readSession(this.ADMIN_SESSION_KEY);
    if (!session) return null;
    this._setAdminSession(session);
    if (this._shouldRefresh(session)) {
      try {
        await this._refreshAdmin();
      } catch {
        this.signOutAdmin();
      }
    }
    return this._adminSession;
  },

  async signInAdmin(passcode) {
    let lastError = null;
    for (const email of this.ADMIN_USERS.map(user => `${user}@${this.ADMIN_EMAIL_DOMAIN}`)) {
      try {
        const session = await this._signInWithEmail(email, passcode);
        if (!session.claims.admin) throw new Error('Tu usuario no tiene permisos de administrador.');
        this._setAdminSession(session);
        this._writeSession(this.ADMIN_SESSION_KEY, session);
        return session;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Contraseña incorrecta.');
  },

  async requireAdmin() {
    await this.initAdmin();
    return !!this._adminSession?.claims?.admin;
  },

  async getAdminIdToken() {
    await this.initAdmin();
    if (!this._adminSession) return null;
    if (this._shouldRefresh(this._adminSession)) await this._refreshAdmin();
    return this._adminSession?.idToken || null;
  },

  signOutAdmin() {
    this._adminSession = null;
    this._adminInitPromise = null;
    sessionStorage.removeItem(this.ADMIN_SESSION_KEY);
    this._configureFirebaseTokenProvider();
  },

  _setAdminSession(session) {
    this._adminSession = session;
    this._configureFirebaseTokenProvider();
  },

  async signInCaptain(token) {
    const normalizedToken = this._normalizeToken(token);
    if (!normalizedToken) throw new Error('Link de capitán inválido.');

    const key = this._captainSessionKey(normalizedToken);
    let session = this._captainSessions[normalizedToken] || this._readSession(key);
    if (session?.claims?.capitanToken === normalizedToken) {
      this._captainSessions[normalizedToken] = session;
      this._configureFirebaseTokenProvider(normalizedToken);
      if (this._shouldRefresh(session)) session = await this._refreshCaptain(normalizedToken);
      return session;
    }

    session = await this._signInWithEmail(this._captainEmail(normalizedToken), normalizedToken);
    if (session.claims.capitanToken !== normalizedToken) {
      this.signOutCaptain(normalizedToken);
      throw new Error('El link de capitán no tiene permisos válidos.');
    }
    this._captainSessions[normalizedToken] = session;
    this._writeSession(key, session);
    this._configureFirebaseTokenProvider(normalizedToken);
    return session;
  },

  async getCaptainIdToken(token) {
    const normalizedToken = this._normalizeToken(token);
    if (!normalizedToken) return null;
    let session = this._captainSessions[normalizedToken] || this._readSession(this._captainSessionKey(normalizedToken));
    if (!session) return null;
    this._captainSessions[normalizedToken] = session;
    if (this._shouldRefresh(session)) session = await this._refreshCaptain(normalizedToken);
    return session?.idToken || null;
  },

  signOutCaptain(token) {
    const normalizedToken = this._normalizeToken(token);
    if (!normalizedToken) return;
    delete this._captainSessions[normalizedToken];
    sessionStorage.removeItem(this._captainSessionKey(normalizedToken));
    this._configureFirebaseTokenProvider();
  },

  async _signInWithEmail(email, passcode) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: passcode,
        returnSecureToken: true
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(this._authError(data));
    return this._sessionFromAuthResponse(data);
  },

  _configureFirebaseTokenProvider(preferredCaptainToken = null) {
    if (!window.FB?.configureSecurity) return;
    FB.configureSecurity({ authTokenProvider: async () => {
      if (this._adminSession) return this.getAdminIdToken();
      if (preferredCaptainToken) return this.getCaptainIdToken(preferredCaptainToken);
      const token = Object.keys(this._captainSessions)[0];
      return token ? this.getCaptainIdToken(token) : null;
    }});
  },

  _readSession(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _writeSession(key, session) {
    sessionStorage.setItem(key, JSON.stringify(session));
  },

  _sessionFromAuthResponse(data) {
    const expiresAt = Date.now() + (Number(data.expiresIn || data.expires_in || 3600) * 1000);
    const idToken = data.idToken || data.id_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    return {
      idToken,
      refreshToken,
      expiresAt,
      uid: data.localId || data.user_id || '',
      email: data.email || '',
      claims: this._decodeClaims(idToken)
    };
  },

  _shouldRefresh(session) {
    return !session.idToken || !session.expiresAt || Date.now() > session.expiresAt - this.CLOCK_SKEW_MS;
  },

  async _refreshAdmin() {
    const session = await this._refreshSession(this._adminSession);
    if (!session.claims.admin) throw new Error('Tu usuario no tiene permisos de administrador.');
    this._setAdminSession(session);
    this._writeSession(this.ADMIN_SESSION_KEY, session);
    return session;
  },

  async _refreshCaptain(token) {
    const normalizedToken = this._normalizeToken(token);
    const current = this._captainSessions[normalizedToken] || this._readSession(this._captainSessionKey(normalizedToken));
    const session = await this._refreshSession(current);
    if (session.claims.capitanToken !== normalizedToken) throw new Error('Sesión de capitán inválida.');
    this._captainSessions[normalizedToken] = session;
    this._writeSession(this._captainSessionKey(normalizedToken), session);
    this._configureFirebaseTokenProvider(normalizedToken);
    return session;
  },

  async _refreshSession(session) {
    if (!session?.refreshToken) throw new Error('Sesión expirada.');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken
    });
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${this.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(this._authError(data));
    return this._sessionFromAuthResponse({
      ...data,
      email: session.email
    });
  },

  _decodeClaims(idToken) {
    try {
      const payload = idToken.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(Array.from(json).map(c => {
        return '%' + c.charCodeAt(0).toString(16).padStart(2, '0');
      }).join('')));
    } catch {
      return {};
    }
  },

  _normalizeToken(token) {
    return String(token || '').trim().toLowerCase();
  },

  _captainEmail(token) {
    return `${token}@${this.CAPTAIN_EMAIL_DOMAIN}`;
  },

  _captainSessionKey(token) {
    return `${this.CAPTAIN_SESSION_PREFIX}${token}`;
  },

  _authError(data) {
    const code = data?.error?.message || '';
    if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
      return 'Contraseña incorrecta.';
    }
    if (code.includes('USER_DISABLED')) return 'Este usuario está deshabilitado.';
    if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return 'Demasiados intentos. Intenta más tarde.';
    if (code.includes('API_KEY_HTTP_REFERRER_BLOCKED')) return 'Este dominio no está autorizado para iniciar sesión.';
    return 'No se pudo iniciar sesión.';
  }
};

const AdminAuth = {
  init: () => FirebasePasscodeAuth.initAdmin(),
  signInAdmin: passcode => FirebasePasscodeAuth.signInAdmin(passcode),
  requireAdmin: () => FirebasePasscodeAuth.requireAdmin(),
  getIdToken: () => FirebasePasscodeAuth.getAdminIdToken(),
  signOut: () => FirebasePasscodeAuth.signOutAdmin()
};

const CaptainAuth = {
  signIn: token => FirebasePasscodeAuth.signInCaptain(token),
  getIdToken: token => FirebasePasscodeAuth.getCaptainIdToken(token),
  signOut: token => FirebasePasscodeAuth.signOutCaptain(token)
};

AdminAuth.init();
