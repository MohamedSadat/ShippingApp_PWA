import { Outlet } from "react-router-dom";
import { NavBar } from "../../components/NavBar";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

export function AgentLayout() {
  return (
    <div className="app-shell">
      <main className="app-shell__content">
        <LanguageSwitcher />
        <Outlet />
      </main>
      <NavBar role="agent" />
    </div>
  );
}
