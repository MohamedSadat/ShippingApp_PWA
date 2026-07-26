import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAV_ACCESS, type Role } from "../auth/roles";
import "./NavBar.css";

export function NavBar({ role }: { role: Role }) {
  const { t } = useTranslation();
  const items = NAV_ACCESS[role];

  return (
    <nav className="nav-bar">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }) => `nav-bar__link${isActive ? " nav-bar__link--active" : ""}`}
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
