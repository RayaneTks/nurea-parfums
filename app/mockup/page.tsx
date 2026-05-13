import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mockup — Directions de design",
  robots: { index: false, follow: false },
};

export default function MockupPage() {
  return (
    <iframe
      title="Mockup interne"
      src="/mockup/palettes.html"
      style={{ width: "100vw", height: "100vh", border: "none" }}
    />
  );
}
