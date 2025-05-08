// Global type definitions for Next.js App Router
declare namespace JSX {
    interface IntrinsicElements {
      // Add any custom elements if needed
    }
  }
  
  // Define page props for dynamic routes
  interface PageProps {
    params: Record<string, string>;
    searchParams?: Record<string, string | string[] | undefined>;
  }