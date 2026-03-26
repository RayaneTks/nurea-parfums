export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-screen overflow-x-clip bg-[var(--nurea-bg)] text-[var(--nurea-text)] antialiased">
      {children}
    </div>
  );
}
