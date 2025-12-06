export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "TradeLens",
  description:
    "AI Trading Journal to level up your edge.",
  mainNav: [
    {
      title: "Trades List",
      href: "/trades-list",
    },
    {
      title: "New Trade",
      href: "/trades-new",
    },
  ],
  links: {
    twitter: "https://twitter.com/shadcn",
    github: "https://github.com/shadcn/ui",
    docs: "https://ui.shadcn.com",
  },
}
