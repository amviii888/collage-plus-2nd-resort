import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getHiddenStaffIdentifiers } from '@/lib/server-security';
import { REGISTERED_PROFESSORS } from '@/lib/professors-registry';

export interface PublicTeacherCatalogItem {
  id: string;
  teacherCode: string;
  name: string;
  title?: string;
  subject?: string;
  specialty?: string;
  university?: string;
  avatarUrl?: string;
  appIconPath?: string;
  themeColor?: string;
  gradesTaught?: string[];
  averageRating?: number;
  coursesCount: number;
  studentsCount: number;
}

/**
 * Public sanitized teacher & course catalog.
 * Exposes ONLY public display metadata and aggregate counts.
 * Explicitly strips email, phoneNumber, password, assistantCode, and all PII,
 * and excludes special staff (Admin & Librarian) accounts.
 */
export async function GET() {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      const fallback: PublicTeacherCatalogItem[] = REGISTERED_PROFESSORS.map((p) => ({
        id: p.firebaseUid || p.id,
        teacherCode: p.code,
        name: p.name,
        title: p.title,
        subject: p.subject,
        specialty: p.specialty,
        university: p.university,
        avatarUrl: p.avatar,
        coursesCount: 0,
        studentsCount: 0,
      }));
      return NextResponse.json({ teachers: fallback }, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      });
    }

    const db = adminApp.db();
    const [teachersSnap, hiddenStaff] = await Promise.all([
      db.collection('teachers').limit(200).get(),
      getHiddenStaffIdentifiers(),
    ]);

    const hiddenEmails = new Set(hiddenStaff.emails.map((e) => e.toLowerCase()));
    const hiddenUids = new Set(hiddenStaff.uids);

    const visibleDocs = teachersSnap.docs.filter((docSnap) => {
      const d = docSnap.data();
      const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
      const role = typeof d.role === 'string' ? d.role.trim().toLowerCase() : '';
      if (hiddenUids.has(docSnap.id)) return false;
      if (email && hiddenEmails.has(email)) return false;
      if (role === 'admin' || role === 's admin' || role === 'super admin' || role === 'librarian') return false;
      return true;
    });

    const items: PublicTeacherCatalogItem[] = await Promise.all(
      visibleDocs.map(async (docSnap) => {
        const d = docSnap.data();
        let coursesCount = typeof d.coursesCount === 'number' ? d.coursesCount : 0;

        if (!coursesCount) {
          try {
            const countSnap = await docSnap.ref.collection('courses').count().get();
            coursesCount = countSnap.data().count;
          } catch {
            coursesCount = 0;
          }
        }

        const studentsCount =
          typeof d.studentsCount === 'number'
            ? d.studentsCount
            : typeof d.studentCount === 'number'
              ? d.studentCount
              : 0;

        return {
          id: docSnap.id,
          teacherCode: String(d.teacherCode || d.code || '').trim(),
          name: String(d.name || d.displayName || '').trim(),
          title: typeof d.title === 'string' ? d.title : undefined,
          subject: typeof d.subject === 'string' ? d.subject : undefined,
          specialty: typeof d.specialty === 'string' ? d.specialty : undefined,
          university: typeof d.university === 'string' ? d.university : undefined,
          avatarUrl: typeof d.avatarUrl === 'string' ? d.avatarUrl : undefined,
          appIconPath: typeof d.appIconPath === 'string' ? d.appIconPath : undefined,
          themeColor: typeof d.themeColor === 'string' ? d.themeColor : undefined,
          gradesTaught: Array.isArray(d.gradesTaught) ? d.gradesTaught.map(String) : undefined,
          averageRating: typeof d.averageRating === 'number' ? d.averageRating : undefined,
          coursesCount,
          studentsCount,
        };
      })
    );

    return NextResponse.json(
      { teachers: items },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('Public catalog fetch error:', error);
    return NextResponse.json({ teachers: [] }, { status: 200 });
  }
}
