export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100 antialiased">
      {children}
    </div>
  );
}
