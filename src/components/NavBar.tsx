import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NAV_ACCESS, type Role } from "../auth/roles";
import { Icon } from "./Icon";
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
          aria-label={item.primary ? t(item.labelKey) : undefined}
          className={({ isActive }) =>
            `nav-bar__link${item.primary ? " nav-bar__link--primary" : ""}${isActive ? " nav-bar__link--active" : ""}`
          }
        >
          {item.primary ? (
            <span className="nav-bar__fab">
              <Icon name={item.icon} size={26} />
            </span>
          ) : (
            <>
              <Icon name={item.icon} size={22} className="nav-bar__icon" />
              <span className="nav-bar__label">{t(item.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
