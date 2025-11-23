"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import { NavItem } from "@/types/nav";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

import icon from "public/favicon.png"; // <-- your logo

interface MainNavProps {
  items?: NavItem[];
}

export function MainNav({ items }: MainNavProps) {
  return (
    <div className="flex gap-6 md:gap-10">
      {/* Logo + Brand */}
      <Link href="/trades-list" className="flex items-center space-x-2">
        <Image
          src={icon}
          alt="TradeLens logo"
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="inline-block font-bold">{siteConfig.name}</span>
      </Link>

      {/* Nav Items */}
      {items?.length ? (
        <nav className="flex gap-6">
          {items.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center text-sm font-medium text-muted-foreground",
                    item.disabled && "cursor-not-allowed opacity-80"
                  )}
                >
                  {item.title}
                </Link>
              )
          )}
        </nav>
      ) : null}
    </div>
  );
}
