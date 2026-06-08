import type { ReactNode } from "react";
import "./PageShell.scss";

interface PageShellProps {
  actions?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  title: string;
}

export function PageShell({ actions, children, title }: PageShellProps) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
