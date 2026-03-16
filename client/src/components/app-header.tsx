import type { ReactElement } from 'react';

/**
 * Sticky app header with logo and title.
 */
export const AppHeader = (): ReactElement => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-6 py-4 backdrop-blur-md lg:px-40">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <img
          src="/logo.svg"
          alt="Restaurant Finder logo"
          className="-mt-px h-7 w-7"
        />

        <h2 className="text-xl leading-none font-bold tracking-tight text-forest">
          Restaurant Finder
        </h2>
      </div>
    </header>
  );
};
