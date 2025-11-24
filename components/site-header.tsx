"use client";

import Link from "next/link"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { MainNav } from "@/components/main-nav"
import { usePathname } from "next/navigation"
import LogoutButton from "./LogOut";

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/auth-login") return null;

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="page-shell flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <LogoutButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
