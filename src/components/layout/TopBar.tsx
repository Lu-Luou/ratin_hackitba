import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageCircle, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-display font-bold text-primary tracking-tight">The Precision Estate</h1>
      </div>

      <nav className="flex items-center gap-1">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            pathname === "/" && "bg-accent text-foreground",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/assistant"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            pathname === "/assistant" && "bg-accent text-foreground",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Assistant
        </Link>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Configuración</DropdownMenuItem>
          <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
