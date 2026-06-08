import { Archive, Factory, Package, ShoppingBasket } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import "./AppSidebar.scss";

export function AppSidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>BL</span>
        <div>
          <strong>Blight</strong>
          <small>Inventario</small>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Navegacion principal">
        <SidebarLink icon={<Archive />} label="Stock" to="/Stock" />
        <SidebarLink icon={<Factory />} label="Tickets" to="/Ticket" />
        <SidebarLink icon={<ShoppingBasket />} label="Compras" to="/Buy" />
        <SidebarLink icon={<Package />} label="Market" to="/Market" />
      </nav>
    </aside>
  );
}

function SidebarLink({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <NavLink className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`} to={to}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}
