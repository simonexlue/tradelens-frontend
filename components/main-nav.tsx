"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChartCandlestick,
  Menu,
  Plus,
  Settings as SettingsIcon,
  X,
} from "lucide-react"
import icon from "public/favicon.png"

import type { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import LogoutButton from "@/components/LogOut"

interface MainNavProps {
  items?: NavItem[]
}

type NormalizedNavItem = {
  key: string
  href: string
  title: string
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  active: boolean
  disabled?: boolean
}

export function MainNav({ items }: MainNavProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()

  const toggle = () => setIsOpen((prev) => !prev)
  const close = () => setIsOpen(false)

  const pageTitle = React.useMemo(() => {
    if (pathname === "/" || pathname.startsWith("/trades-list"))
      return "My Trades"
    if (pathname.startsWith("/trades-new")) return "New Trade"
    if (pathname.startsWith("/trade-detail")) return "Trade Details"
    return "My Trades"
  }, [pathname])

  const isRouteActive = (href: string) => {
    if (href === "/trades-list") {
      return pathname === "/" || pathname.startsWith("/trades-list")
    }
    if (href === "/trades-new") {
      return pathname.startsWith("/trades-new")
    }
    return pathname === href
  }

  const iconForHref = (href: string) => {
    if (href === "/trades-new") return Plus
    return ChartCandlestick
  }

  const navItems: NormalizedNavItem[] =
    items
      ?.filter((item): item is NavItem & { href: string } => !!item.href)
      .map((item, index) => ({
        key: `${item.href}-${index}`,
        href: item.href!,
        title: item.title,
        Icon: iconForHref(item.href!),
        active: isRouteActive(item.href!),
        disabled: item.disabled,
      })) ?? []

  return (
    <>
      {/* HEADER LEFT: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-900 transition-colors"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5 text-slate-200" aria-hidden="true" />
        </button>

        <span className="text-xl font-semibold tracking-tight text-slate-50">
          {pageTitle}
        </span>
      </div>

      {/* SIDE RAIL */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-background border-r border-slate-800",
          "transition-[width] duration-200 ease-out",
          isOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div className="flex h-16 w-full items-center px-3">
            {!isOpen ? (
              <Image
                src={icon}
                alt="App logo"
                width={32} 
                height={32}
                className="rounded-full pl-[2px]"
              />
            ) : (
              <>
                <Image
                  src={icon}
                  alt="TradeLens logo"
                  width={32}
                  height={32}
                  className="rounded-full pl-[2px]"
                />
                <span className="ml-2 text-lg font-semibold tracking-tight text-slate-50">
                  {siteConfig.name}
                </span>

                <button
                  type="button"
                  onClick={toggle}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* Nav list */}
          <div className="flex-1 w-full overflow-y-auto">
            {!isOpen ? (
              // COLLAPSED: icon-only rows
              <div className="mt-4 flex flex-col gap-2 px-2">
                {navItems.map((item) => (
                  <NavRow
                    key={item.key}
                    item={item}
                    collapsed
                    onClick={undefined}
                  />
                ))}
              </div>
            ) : (
              // EXPANDED: icon + label rows
              <div className="mt-4 px-2 pb-4">
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <NavRow
                      key={item.key}
                      item={item}
                      collapsed={false}
                      onClick={close}
                    />
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Logout only when expanded */}
          {isOpen && (
            <div className="w-full px-2 pb-4">
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

type NavRowProps = {
  item: NormalizedNavItem
  collapsed: boolean
  onClick?: () => void
}

function NavRow({ item, collapsed, onClick }: NavRowProps) {
  const { href, title, Icon, active, disabled } = item

  if (collapsed) {
    return (
      <Link
        href={href}
        className={cn(
          "flex h-12 w-full items-center rounded-md px-3",
          active
            ? "bg-slate-800 text-slate-50"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center rounded-md px-3 text-base font-medium transition-colors",
        active
          ? "bg-slate-800 text-slate-50"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
      <span>{title}</span>
    </Link>
  )
}
