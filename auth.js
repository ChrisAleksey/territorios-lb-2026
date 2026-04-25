'use strict';

const AdminAuth = {
  API_KEY: 'AIzaSyBsdDG-k1zgHuYwjo05Ba5rcqlkxmIG4FA',
  ADMIN_EMAIL_DOMAIN: 'admin.territorios-lb.local',
  ADMIN_USERS: ['aleksey', 'rene'],
  SESSION_KEY: 'firebase_admin_auth',
  CLOCK_SKEW_MS: 5 * 60 * 1000,

  _session: null,
  _initPromise: null,

  init() {
    if (!this._initPromise) this._initPromise = this._init();
    return this._initPromise;
  },

  async _init() {
    const session = this._readSession();
    if (!session) return null;
    this._setSession(session);
    if (this._shouldRefresh(session)) {
      try {
        await this._refresh();
      } catch {
        this.signOut();
      }
    }
    return this._session;
  },

  async signInAdmin(passcode) {
    let lastError = null;
    for (const email of this._candidateEmails()) {
      try {
        const session = await this._signInWithEmail(email, passcode);
        this._setSession(session);
        this._writeSession(session);
        return session;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Contraseña incorrecta.');
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

    const session = this._sessionFromAuthResponse(data);
    if (!session.claims.admin) {
      this.signOut();
      throw new Error('Tu usuario no tiene permisos de administrador.');
    }
    return session;
  },

  async requireAdmin() {
    await this.init();
    return !!this._session?.claims?.admin;
  },

  async getIdToken() {
    await this.init();
    if (!this._session) return null;
    if (this._shouldRefresh(this._session)) {
      await this._refresh();
    }
    return this._session?.idToken || null;
  },

  signOut() {
    this._session = null;
    this._initPromise = null;
    sessionStorage.removeItem(this.SESSION_KEY);
    if (window.FB?.configureSecurity) {
      FB.configureSecurity({ authTokenProvider: null });
    }
  },

  _setSession(session) {
    this._session = session;
    if (window.FB?.configureSecurity) {
      FB.configureSecurity({ authTokenProvider: () => this.getIdToken() });
    }
  },

  _readSession() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _writeSession(session) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
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

  async _refresh() {
    if (!this._session?.refreshToken) throw new Error('Sesión expirada.');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this._session.refreshToken
    });
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${this.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(this._authError(data));
    const session = this._sessionFromAuthResponse({
      ...data,
      email: this._session.email
    });
    if (!session.claims.admin) throw new Error('Tu usuario no tiene permisos de administrador.');
    this._setSession(session);
    this._writeSession(session);
    return session;
  },

  _candidateEmails() {
    return this.ADMIN_USERS.map(user => `${user}@${this.ADMIN_EMAIL_DOMAIN}`);
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

  _authError(data) {
    const code = data?.error?.message || '';
    if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
      return 'Contraseña incorrecta.';
    }
    if (code.includes('USER_DISABLED')) return 'Este usuario está deshabilitado.';
    if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) return 'Demasiados intentos. Intenta más tarde.';
    return 'No se pudo iniciar sesión.';
  }
};

AdminAuth.init();
