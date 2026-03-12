import type { ReactElement } from 'react';

/**
 * Sticky app header with logo and title.
 */
export const AppHeader = (): ReactElement => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md lg:px-40">
      <div className="mx-auto flex max-w-240 items-center gap-3">
        <div className="text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
            <path d="M7 2v20" />
            <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
          </svg>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-forest">
          Restaurant Finder
        </h2>
      </div>
    </header>
  );
};
