import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  children: (filter: string) => ReactNode;
  showFilters?: boolean;
}

export function AppLayout({ children, showFilters = true }: AppLayoutProps) {
  const [activeFilter, setActiveFilter] = useState("");

  return (
    <div className="min-h-screen flex w-full flex-col">
      <TopBar />
      <main className="relative flex-1 overflow-auto">
        {showFilters && <AppSidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />}
        <div>{children(activeFilter)}</div>
      </main>
    </div>
  );
}
