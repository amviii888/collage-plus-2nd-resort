import CoursePlayerClient from './client';
import { Suspense } from 'react';

// This tells Next.js to pre-build ONE placeholder page to satisfy the static export.
// All other course pages will be rendered on the client side.
export async function generateStaticParams() {
  return [{ slug: ['placeholder-teacher', 'placeholder-course'] }];
}

// This page now only acts as a wrapper. All data fetching is done on the client.
export default async function CoursePlayerPage({ params }: { params: Promise<{ slug: string[] }> | { slug: string[] } }) {
  const resolvedParams = await params;
  const [teacherId, courseId] = resolvedParams?.slug || [];

  return (
    <Suspense fallback={<div className='h-screen w-full flex items-center justify-center'><p>Loading...</p></div>}>
      <CoursePlayerClient teacherId={teacherId} courseId={courseId} />
    </Suspense>
  );
}
