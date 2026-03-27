export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell min-h-screen overflow-x-clip bg-[#f8f8f8] text-[#1a1a1a] antialiased dark:bg-[#111] dark:text-[#e5e5e5]">
      {children}
    </div>
  );
}
