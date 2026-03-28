"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface MenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  showChevron?: boolean;
}

export function Menu({ trigger, children, align = "left", showChevron = true }: MenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex cursor-pointer items-center"
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
        {showChevron && <ChevronDown className="-mr-1 ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-56 rounded-md bg-card shadow-lg ring-1 ring-black/10 focus:outline-none",
            align === "right" ? "right-0" : "left-0",
          )}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  label?: string;
}

export function MenuItem({ onClick, disabled = false, icon, isActive = false, label }: MenuItemProps) {
  return (
    <button
      className={cn(
        "group relative block h-16 w-16 rounded-full text-center transition-colors",
        "border border-sidebar-border bg-sidebar text-sidebar-foreground",
        disabled && "cursor-not-allowed text-muted-foreground opacity-70",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
      )}
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      type="button"
      title={label}
    >
      <span className="flex h-full items-center justify-center">{icon}</span>
      {label && (
        <span
          className={cn(
            "pointer-events-none absolute left-[4.75rem] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md",
            "border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-sm",
            "opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}

interface MenuContainerProps {
  children: React.ReactNode;
  className?: string;
  spacing?: number;
}

export function MenuContainer({ children, className, spacing = 52 }: MenuContainerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const childrenArray = React.Children.toArray(children);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={cn("relative w-16", className)} data-expanded={isExpanded}>
      <div className="relative">
        <div className="relative z-50 h-16 w-16 cursor-pointer will-change-transform" onClick={handleToggle}>
          {childrenArray[0]}
        </div>

        {childrenArray.slice(1).map((child, index) => (
          <div
            key={index}
            className="absolute left-0 top-0 h-16 w-16 will-change-transform"
            style={{
              transform: `translateY(${isExpanded ? (index + 1) * spacing : 0}px)`,
              opacity: isExpanded ? 1 : 0,
              zIndex: 40 - index,
              pointerEvents: isExpanded ? "auto" : "none",
              transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms",
              backfaceVisibility: "hidden",
              perspective: 1000,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}