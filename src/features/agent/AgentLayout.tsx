import { Outlet } from "react-router-dom";
import { NavBar } from "../../components/NavBar";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { ThemeSwitcher } from "../../components/ThemeSwitcher";

export function AgentLayout() {
  return (
    <div className="app-shell">
      <main className="app-shell__content">
        <div className="top-controls">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <Outlet />
      </main>
      <NavBar role="agent" />
    </div>
  );
}
