"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageCircle, Ghost, Menu, Home } from "lucide-react";
import { CONTACT } from "@/lib/data";

interface BottomNavProps {
  onMenuClick: () => void;
}

export const BottomNav: FC<BottomNavProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isMarque = pathname === "/marque";

  const navItems = [
    {
      label: "Accueil",
      icon: Home,
      href: "/",
      active: isHome,
    },
    {
      label: "Catalogue",
      icon: LayoutGrid,
      href: isHome ? "#collection" : "/#collection",
      active: false,
      onClick: (e: React.MouseEvent) => {
        if (isHome) {
          e.preventDefault();
          const el = document.getElementById("collection");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    {
      label: "Snapchat",
      icon: Ghost,
      href: CONTACT.snapchat,
      external: true,
    },
    {
      label: "Contact",
      icon: MessageCircle,
      href: "/contact",
      active: isContact,
    },
    {
      label: "Menu",
      icon: Menu,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onMenuClick();
      },
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] h-[calc(64px+env(safe-area-inset-bottom,0px))] bg-[var(--nurea-bg)]/80 border-t border-[var(--nurea-border)] backdrop-blur-xl md:hidden px-2 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          const content = (
            <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? "text-[var(--nurea-accent)]" : "text-[var(--nurea-text-muted)]"}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? "bg-[var(--nurea-accent-subtle)]" : "active:bg-[var(--nurea-surface)]"}`}>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
                {item.label}
              </span>
            </div>
          );

          if (item.onClick) {
            return (
              <button key={item.label} onClick={item.onClick} className="flex-1 touch-manipulation active:scale-90 transition-transform">
                {content}
              </button>
            );
          }

          return (
            <Link 
              key={item.label} 
              href={item.href || "/"} 
              onClick={item.onClick}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="flex-1 touch-manipulation active:scale-90 transition-transform"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
