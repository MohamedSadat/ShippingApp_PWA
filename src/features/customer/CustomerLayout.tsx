import { Outlet } from "react-router-dom";
import { NavBar } from "../../components/NavBar";

export function CustomerLayout() {
  return (
    <div className="app-shell">
      <main className="app-shell__content">
        <Outlet />
      </main>
      <NavBar role="customer" />
    </div>
  );
}
