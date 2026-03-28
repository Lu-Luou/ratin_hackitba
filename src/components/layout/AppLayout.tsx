import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface AppLayoutProps {
  children: (filter: string) => ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [activeFilter, setActiveFilter] = useState("");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto">{children(activeFilter)}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
