'use client';

import { getAuth, signOut } from "firebase/auth";

export async function clientLogout() {
    // The auth instance should be retrieved from the context, not re-initialized.
    // However, since this is a utility function outside a component,
    // we'll rely on the singleton nature of getAuth() after it's been initialized by the provider.
    try {
        const auth = getAuth();
        await signOut(auth);
        // After sign-out, the onAuthStateChanged listener will trigger a
        // re-render. We can also force a redirect for a faster UI update.
        window.location.href = '/';
    } catch (error) {
        console.error("Logout failed:", error);
        // Fallback redirect even if signOut fails for some reason
        window.location.href = '/';
    }
}
