// This file is a placeholder to satisfy the Next.js build process for static exports.
// The actual test logic has been moved to /app/test/page.tsx and uses query parameters.
// This dynamic route is no longer used by the application.

export async function generateStaticParams() {
  // We'll give it one placeholder to build to satisfy the export requirement.
  return [{ testId: 'placeholder-test' }];
}

// A default export is required for all pages.
export default function DeprecatedTestRoute() {
    return null;
}
