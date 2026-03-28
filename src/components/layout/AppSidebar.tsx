import { Clock, TrendingUp, AlertTriangle, MapPin } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const filters = [
  { title: "Recientes", icon: Clock, value: "recent" },
  { title: "Top rendimiento", icon: TrendingUp, value: "top" },
  { title: "Alto riesgo", icon: AlertTriangle, value: "risk" },
  { title: "Por zona", icon: MapPin, value: "zone" },
];

interface AppSidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function AppSidebar({ activeFilter, onFilterChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Filtros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filters.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onFilterChange(activeFilter === item.value ? "" : item.value)}
                    isActive={activeFilter === item.value}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
