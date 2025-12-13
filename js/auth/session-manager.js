/**
 * Session Manager - Gestiona sesiones persistentes, remember-me y autenticación biométrica
 */

export class SessionManager {
    constructor() {
        this.storageKey = 'gestorInventory_session';
        this.biometricKey = 'gestorInventory_biometric';
        this.rememberMeKey = 'gestorInventory_rememberMe';
    }

    /**
     * Guardar datos de usuario para "Recordarme"
     */
    saveRememberedUser(email) {
        try {
            localStorage.setItem(this.rememberMeKey, JSON.stringify({
                email,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('Error guardando usuario recordado:', error);
        }
    }

    /**
     * Obtener usuario recordado
     */
    getRememberedUser() {
        try {
            const data = localStorage.getItem(this.rememberMeKey);
            return data ? JSON.parse(data).email : null;
        } catch (error) {
            console.warn('Error leyendo usuario recordado:', error);
            return null;
        }
    }

    /**
     * Limpiar usuario recordado
     */
    clearRememberedUser() {
        localStorage.removeItem(this.rememberMeKey);
    }

    /**
     * Guardar sesión con tokens
     */
    saveSession(sessionData) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                ...sessionData,
                savedAt: new Date().toISOString()
            }));
            // También guardar el usuario recordado
            if (sessionData.email) {
                this.saveRememberedUser(sessionData.email);
            }
        } catch (error) {
            console.error('Error guardando sesión:', error);
            return false;
        }
        return true;
    }

    /**
     * Obtener sesión guardada
     */
    getSession() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Error leyendo sesión:', error);
            return null;
        }
    }

    /**
     * Verificar si hay sesión válida
     */
    hasValidSession() {
        const session = this.getSession();
        if (!session) return false;

        // Verificar si el token está expirado
        try {
            const token = session.access_token;
            if (!token || !token.includes('.')) return false;

            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const bufferTime = 5 * 60 * 1000; // 5 minutos

            return Date.now() < (expirationTime - bufferTime);
        } catch (error) {
            console.warn('Error verificando validez de sesión:', error);
            return false;
        }
    }

    /**
     * Restaurar sesión guardada a localStorage del sistema
     */
    restoreSession(session) {
        if (!session) return false;

        try {
            localStorage.setItem('supabase.auth.token', session.access_token);
            if (session.refresh_token) {
                localStorage.setItem('supabase.auth.refresh', session.refresh_token);
            }
            localStorage.setItem('usuario_id', session.usuario_id);
            localStorage.setItem('categoria_id', session.categoria_id);
            localStorage.setItem('rol', session.rol);
            localStorage.setItem('email', session.email);
            localStorage.setItem('nombre', session.nombre);
            return true;
        } catch (error) {
            console.error('Error restaurando sesión:', error);
            return false;
        }
    }

    /**
     * Logout - Limpiar sesión pero recordar usuario
     */
    logout(rememberUser = true) {
        const session = this.getSession();
        const email = session?.email || localStorage.getItem('email');

        // Limpiar tokens y datos de sesión
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.refresh');
        localStorage.removeItem('usuario_id');
        localStorage.removeItem('categoria_id');
        localStorage.removeItem('rol');
        localStorage.removeItem(this.storageKey);

        // Opcionalmente recordar el usuario
        if (rememberUser && email) {
            this.saveRememberedUser(email);
        } else {
            this.clearRememberedUser();
        }

        return true;
    }

    /**
     * ============= AUTENTICACIÓN BIOMÉTRICA (WebAuthn) =============
     */

    /**
     * Registrar credencial biométrica durante el login
     */
    async registerBiometric(email) {
        if (!this.isBiometricAvailable()) {
            return false;
        }

        try {
            // Verificar si ya existe una credencial registrada
            if (await this.hasBiometricCredential(email)) {
                console.log('Ya existe una credencial biométrica para este usuario');
                return false;
            }

            // Preparar registro de credencial
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const registerOptions = {
                challenge: challenge,
                rp: {
                    name: 'Sistema de Gestión de Productos',
                    id: window.location.hostname
                },
                user: {
                    id: new Uint8Array(Buffer.from(email)),
                    name: email,
                    displayName: email
                },
                pubKeyCredParams: [
                    { type: 'public-key', alg: -7 },  // ES256
                    { type: 'public-key', alg: -257 } // RS256
                ],
                timeout: 60000,
                attestation: 'none',
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'preferred',
                    residentKey: 'preferred'
                }
            };

            const credential = await navigator.credentials.create({
                publicKey: registerOptions
            });

            if (credential) {
                // Guardar credencial localmente (en un caso real, enviar al servidor)
                this.saveBiometricCredential(email, credential);
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Error registrando credencial biométrica:', error);
            return false;
        }
    }

    /**
     * Autenticar usando biometría
     */
    async authenticateWithBiometric(email) {
        if (!this.isBiometricAvailable()) {
            return null;
        }

        try {
            const credential = await this.getBiometricCredential(email);
            if (!credential) {
                console.log('No hay credencial biométrica para:', email);
                return null;
            }

            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const assertionOptions = {
                challenge: challenge,
                timeout: 60000,
                userVerification: 'preferred',
                rpId: window.location.hostname
            };

            const assertion = await navigator.credentials.get({
                publicKey: assertionOptions,
                mediation: 'optional'
            });

            return assertion ? true : false;
        } catch (error) {
            console.warn('Error autenticando con biometría:', error);
            return false;
        }
    }

    /**
     * Verificar disponibilidad de WebAuthn
     */
    isBiometricAvailable() {
        return !!(
            window.PublicKeyCredential &&
            navigator.credentials &&
            navigator.credentials.create &&
            navigator.credentials.get
        );
    }

    /**
     * Guardar credencial biométrica
     */
    saveBiometricCredential(email, credential) {
        try {
            const credentials = JSON.parse(localStorage.getItem(this.biometricKey) || '{}');
            credentials[email] = {
                id: this.arrayBufferToBase64(credential.id),
                type: credential.type,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.biometricKey, JSON.stringify(credentials));
        } catch (error) {
            console.warn('Error guardando credencial biométrica:', error);
        }
    }

    /**
     * Obtener credencial biométrica
     */
    async getBiometricCredential(email) {
        try {
            const credentials = JSON.parse(localStorage.getItem(this.biometricKey) || '{}');
            return credentials[email] || null;
        } catch (error) {
            console.warn('Error obteniendo credencial biométrica:', error);
            return null;
        }
    }

    /**
     * Verificar si existe credencial biométrica
     */
    async hasBiometricCredential(email) {
        const credential = await this.getBiometricCredential(email);
        return !!credential;
    }

    /**
     * Eliminar credencial biométrica
     */
    removeBiometricCredential(email) {
        try {
            const credentials = JSON.parse(localStorage.getItem(this.biometricKey) || '{}');
            delete credentials[email];
            localStorage.setItem(this.biometricKey, JSON.stringify(credentials));
            return true;
        } catch (error) {
            console.warn('Error eliminando credencial biométrica:', error);
            return false;
        }
    }

    /**
     * Convertir ArrayBuffer a Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convertir Base64 a ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// Exportar instancia singleton
export const sessionManager = new SessionManager();
