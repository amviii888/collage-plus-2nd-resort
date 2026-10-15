'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Root Error Boundary caught error:", error);
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

  const errorMessage = error?.message || String(error) || 'Unknown runtime error occurred';
  const errorStack = error?.stack || '';

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-6">
      <Card className="w-full max-w-xl p-6 bg-red-950/40 border border-red-500/50 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Runtime Error Encountered</h2>
          <p className="text-xs font-mono text-red-300 bg-red-900/40 p-3 rounded-xl border border-red-500/30 break-all text-left max-h-40 overflow-y-auto">
            {errorMessage}
          </p>
          {errorStack && (
            <details className="text-[11px] font-mono text-zinc-400 text-left bg-zinc-900/80 p-2 rounded-xl">
              <summary className="cursor-pointer text-zinc-300 font-bold">Stack Trace</summary>
              <pre className="mt-2 whitespace-pre-wrap overflow-x-auto text-[10px] text-zinc-400">{errorStack}</pre>
            </details>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button 
            onClick={() => reset()}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold"
          >
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
