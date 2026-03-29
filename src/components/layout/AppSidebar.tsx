import { AlertTriangle, Clock, ListFilter, MapPin, TrendingUp } from "lucide-react";

import { MenuContainer, MenuItem } from "@/components/ui/fluid-menu";

const filters = [
  { title: "Recientes", icon: Clock, value: "recent" },
  { title: "Top rendimiento", icon: TrendingUp, value: "top" },
  { title: "Riesgo climatico > 75", icon: AlertTriangle, value: "risk" },
  { title: "Por zona", icon: MapPin, value: "zone" },
];

interface AppSidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function AppSidebar({ activeFilter, onFilterChange }: AppSidebarProps) {
  return (
    <div className="fixed left-4 top-20 z-40">
      <MenuContainer>
        <MenuItem
          icon={<ListFilter className="h-5 w-5" />}
          isActive={Boolean(activeFilter)}
          label={activeFilter ? "Filtro activo" : "Abrir filtros"}
        />

        {filters.map((item) => (
          <MenuItem
            key={item.value}
            onClick={() => onFilterChange(activeFilter === item.value ? "" : item.value)}
            isActive={activeFilter === item.value}
            icon={<item.icon className="h-5 w-5" />}
            label={item.title}
          />
        ))}
      </MenuContainer>
    </div>
  );
}
