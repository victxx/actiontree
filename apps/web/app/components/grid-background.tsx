"use client";

export function GridBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 42% 34% at 28% 48%, rgba(153,69,255,0.10) 0%, transparent 72%)",
            "radial-gradient(ellipse 42% 34% at 72% 48%, rgba(20,241,149,0.08) 0%, transparent 72%)",
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(182,202,188,0.14) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(182,202,188,0.14) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />
    </div>
  );
}
