import type { ReactNode } from "react";
import { Link, useLocation } from "@micro-router/react";
import { HomePath, DocumentsPath, ArchivedDocumentsPath } from "../paths";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-brand">
          <Link to={HomePath}>micro-router</Link>
        </div>
        <nav className="header-nav">
          <Link to={DocumentsPath} className="nav-link">
            Documents
          </Link>
          <Link to={ArchivedDocumentsPath} className="nav-link">
            Archive
          </Link>
        </nav>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <div className="location-display">
          <span className="location-label">Current path:</span>
          <code className="location-path">{location.pathname}</code>
        </div>
      </footer>
    </div>
  );
}
