"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#070908",
          color: "#f0f4e8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>
            Actiontree failed to start
          </h1>
          <p style={{ color: "#8e978a", margin: "0 0 1.5rem" }}>
            Reload to try again, or go back and open the site from a fresh tab.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              border: 0,
              borderRadius: 8,
              background: "#dfff00",
              color: "#070908",
              padding: "0.65rem 1.1rem",
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
