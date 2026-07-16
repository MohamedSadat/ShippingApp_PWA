import { Route } from "react-router-dom";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { AgentLayout } from "./AgentLayout";
import { Manifest } from "./pages/Manifest";
import { ScanPickup } from "./pages/ScanPickup";
import { ScanDelivery } from "./pages/ScanDelivery";
import { CodCollection } from "./pages/CodCollection";
import { Settings } from "../shared/pages/Settings";

export function agentRoutes() {
  return (
    <Route element={<ProtectedRoute role="agent" />}>
      <Route element={<AgentLayout />}>
        <Route path="/agent" element={<Manifest />} />
        <Route path="/agent/scan/pickup" element={<ScanPickup />} />
        <Route path="/agent/scan/delivery" element={<ScanDelivery />} />
        <Route path="/agent/cod" element={<CodCollection />} />
        <Route path="/agent/settings" element={<Settings />} />
      </Route>
    </Route>
  );
}
