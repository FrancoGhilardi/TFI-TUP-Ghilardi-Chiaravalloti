"use client";

import { useSessionUser } from "@/modules/auth";

import { HomeShortcuts } from "./HomeShortcuts";
import { HomeStats } from "./HomeStats";
import { HomeWelcome } from "./HomeWelcome";
import { LowStockProducts } from "./LowStockProducts";
import { RecentProducts } from "./RecentProducts";

/** The panel's landing screen: a greeting, the numbers of the catalog and what needs attention. */
export const HomePage = () => {
  const user = useSessionUser();
  if (!user) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6">
      <HomeWelcome name={user.name} />
      <HomeStats />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <RecentProducts />
        <div className="flex flex-col gap-5">
          <LowStockProducts />
          <HomeShortcuts role={user.role} />
        </div>
      </div>
    </div>
  );
};
