import CollectionClient from './client';
import { Suspense } from 'react';

// This tells Next.js to pre-build ONE placeholder page to satisfy the static export.
// All other collection pages will be rendered on the client side.
export async function generateStaticParams() {
  return [{ slug: ['placeholder-teacher', 'placeholder-collection'] }];
}

// This page now only acts as a wrapper. All data fetching is done on the client.
export default async function CourseCollectionPage({ params }: { params: Promise<{ slug: string[] }> | { slug: string[] } }) {
  const resolvedParams = await params;
  const [teacherId, collectionId] = resolvedParams?.slug || [];

  return (
    <Suspense fallback={<div className='h-screen w-full flex items-center justify-center'><p>Loading...</p></div>}>
      <CollectionClient teacherId={teacherId} collectionId={collectionId} />
    </Suspense>
  );
}
