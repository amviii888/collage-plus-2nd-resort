'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check if the error is related to ChunkLoadError
    if (
      error?.message?.includes('ChunkLoadError') ||
      error?.name?.includes('ChunkLoadError') ||
      error?.stack?.includes('ChunkLoadError') ||
      String(error)?.includes('ChunkLoadError')
    ) {
      console.warn('ChunkLoadError detected, forcing page reload to retrieve latest assets...');
      window.location.reload();
    }
  }, [error]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <button 
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
