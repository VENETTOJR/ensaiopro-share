import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumb visual — sempre mostrar pro user saber onde está.
 * Uso: <Breadcrumb items={[{label:'Ensaios', href:'/ensaios'}, {label:'Aniversário'}]} />
 */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  home = "/dashboard",
}: {
  items: BreadcrumbItem[];
  home?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-[var(--muted)] flex-wrap"
    >
      <Link
        href={home}
        className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="sr-only">Início</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 opacity-60" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-[var(--foreground)] transition"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--foreground)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
