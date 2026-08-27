"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="actiontree-main">
      <section className="resolver-shell">
        <div className="search-intro">
          <h1>
            Something went wrong.
            <br />
            <em>Try again.</em>
          </h1>
          <p className="intro-copy">
            The page hit an unexpected error. Reload and the latest version
            should come back.
          </p>
          <button type="button" className="demo-shortcut" onClick={reset}>
            <span>Reload this page</span>
            <strong>Try again</strong>
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </section>
    </main>
  );
}
