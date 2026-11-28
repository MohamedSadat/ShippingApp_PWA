import { Route } from "react-router-dom";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { AgentLayout } from "./AgentLayout";
import { Manifest } from "./pages/Manifest";
import { LegacyScanRedirect, Scan } from "./pages/Scan";
import { CodCollection } from "./pages/CodCollection";
import { Settings } from "../shared/pages/Settings";
import { Notifications } from "../shared/pages/Notifications";
import { ChangePassword } from "../shared/pages/ChangePassword";

export function agentRoutes() {
  return (
    <Route element={<ProtectedRoute role="agent" />}>
      <Route element={<AgentLayout />}>
        <Route path="/agent" element={<Manifest />} />
        <Route path="/agent/scan" element={<Scan />} />
        <Route path="/agent/scan/pickup" element={<LegacyScanRedirect mode="pickup" />} />
        <Route path="/agent/scan/delivery" element={<LegacyScanRedirect mode="delivery" />} />
        <Route path="/agent/cod" element={<CodCollection />} />
        <Route path="/agent/settings" element={<Settings />} />
        <Route path="/agent/settings/notifications" element={<Notifications />} />
        <Route path="/agent/settings/password" element={<ChangePassword />} />
      </Route>
    </Route>
  );
}
