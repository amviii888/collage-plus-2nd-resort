'use client';

import { getAuth, signOut } from "firebase/auth";

export function clearAllLocalAuthSessions() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('viewingStudentId');
        localStorage.removeItem('parentForStudentBarcode');
        localStorage.removeItem('parentPhoneNumber');
        localStorage.removeItem('assistantForTeacherId');
        localStorage.removeItem('assistantTeacherName');
        localStorage.removeItem('admin-session');
        localStorage.removeItem('offline_student_id');
        localStorage.removeItem('app_student_auth_session');
        localStorage.removeItem('student_barcode');
        sessionStorage.clear();
    } catch (e) {
        console.error("Storage clear error:", e);
    }
}

export async function clientLogout() {
    try {
        const auth = getAuth();
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
    }
    clearAllLocalAuthSessions();
    window.location.href = '/signup-options';
}
