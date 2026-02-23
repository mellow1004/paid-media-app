import { NavLink } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumbs({
  items,
  onBack,
}: {
  items: BreadcrumbItem[];
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted/30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, idx) => {
          const last = idx === items.length - 1;
          const content = item.to ? (
            <NavLink
              to={item.to}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </NavLink>
          ) : (
            <span className={last ? 'text-foreground font-medium' : ''}>
              {item.label}
            </span>
          );

          return (
            <div key={`${item.label}-${idx}`} className="flex items-center gap-2">
              {content}
              {!last && <ChevronRight className="w-4 h-4 opacity-60" />}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

