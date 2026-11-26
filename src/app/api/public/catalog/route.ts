import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
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
 * Explicitly strips email, phoneNumber, password, assistantCode, and all PII.
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
    const teachersSnap = await db.collection('teachers').limit(200).get();

    const items: PublicTeacherCatalogItem[] = await Promise.all(
      teachersSnap.docs.map(async (docSnap) => {
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
