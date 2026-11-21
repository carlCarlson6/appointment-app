"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const tabs = [
    { label: "Overview", href: `/dashboard/b/${businessId}` },
    { label: "Calendar", href: `/dashboard/b/${businessId}/calendar` },
    { label: "Schedule", href: `/dashboard/b/${businessId}/schedule` },
    { label: "Services", href: `/dashboard/b/${businessId}/services` },
  ];

  return (
    <nav className="flex gap-1 border-b border-zinc-200">
      {tabs.map((tab) => {
        const active =
          tab.href === pathname ||
          (tab.href !== `/dashboard/b/${businessId}` &&
            pathname.startsWith(tab.href + "/"));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
