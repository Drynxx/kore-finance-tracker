/**
 * Hardware Biometrics Utility (WebAuthn / FIDO2)
 * Enables sub-second authentication using Apple Face ID, Touch ID, Android Fingerprint, and Windows Hello.
 */

export const isBiometricsSupported = async () => {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        return false;
    }
    try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return Boolean(available);
    } catch (e) {
        console.debug("Biometrics availability check failed:", e);
        return false;
    }
};

export const isBiometricsEnabled = () => {
    return localStorage.getItem('kore_biometrics_enabled') === 'true' &&
        Boolean(localStorage.getItem('kore_biometrics_cred_id'));
};

/**
 * Registers native device biometrics (Face ID / Fingerprint / Touch ID)
 */
export const registerBiometrics = async (userEmail = 'user@kore.app', userName = 'Kore User') => {
    if (!window.PublicKeyCredential) {
        throw new Error("Web Authentication API is not supported on this browser.");
    }

    const isAvailable = await isBiometricsSupported();
    if (!isAvailable) {
        throw new Error("No hardware biometric sensor (Face ID / Fingerprint) found on this device.");
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userIdBuffer = new TextEncoder().encode(userEmail);

    const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

    const createOptions = {
        publicKey: {
            challenge,
            rp: {
                name: "Kore Financial Intelligence",
                id: hostname
            },
            user: {
                id: userIdBuffer,
                name: userEmail,
                displayName: userName || userEmail
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },  // ES256 (P-256 curve)
                { alg: -257, type: "public-key" } // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Platform sensor (Face ID, Touch ID, Fingerprint)
                userVerification: "required",
                requireResidentKey: false
            },
            timeout: 60000,
            attestation: "none"
        }
    };

    const credential = await navigator.credentials.create(createOptions);

    if (!credential || !credential.rawId) {
        throw new Error("Biometric enrollment was cancelled or failed.");
    }

    // Store credential ID in base64
    const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
    localStorage.setItem('kore_biometrics_cred_id', credIdBase64);
    localStorage.setItem('kore_biometrics_enabled', 'true');

    return { success: true, credentialId: credIdBase64 };
};

/**
 * Authenticates user via Face ID / Fingerprint hardware prompt in < 300ms
 */
export const authenticateWithBiometrics = async () => {
    if (!window.PublicKeyCredential) {
        throw new Error("Biometric authentication not supported in this browser.");
    }

    const credIdBase64 = localStorage.getItem('kore_biometrics_cred_id');
    const isEnabled = localStorage.getItem('kore_biometrics_enabled') === 'true';

    if (!isEnabled || !credIdBase64) {
        throw new Error("Biometric authentication is not enabled on this device.");
    }

    const rawIdBuffer = Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0));
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const getOptions = {
        publicKey: {
            challenge,
            allowCredentials: [{
                id: rawIdBuffer,
                type: 'public-key',
                transports: ['internal']
            }],
            userVerification: 'required',
            timeout: 60000
        }
    };

    const assertion = await navigator.credentials.get(getOptions);

    if (!assertion) {
        throw new Error("Biometric verification failed.");
    }

    return { success: true };
};

/**
 * Disables hardware biometrics
 */
export const disableBiometrics = () => {
    localStorage.removeItem('kore_biometrics_cred_id');
    localStorage.removeItem('kore_biometrics_enabled');
    return { success: true };
};
