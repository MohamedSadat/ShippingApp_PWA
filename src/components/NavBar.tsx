import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAV_ACCESS, type Role } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import "./NavBar.css";

export function NavBar({ role }: { role: Role }) {
  const { signOut } = useAuth();
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
      <button type="button" className="nav-bar__link nav-bar__signout" onClick={signOut}>
        {t("nav.signOut")}
      </button>
    </nav>
  );
}
