import { Route } from "react-router-dom";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { CustomerLayout } from "./CustomerLayout";
import { Dashboard } from "./pages/Dashboard";
import { MyShipment } from "./pages/MyShipment";
import { OrderPage } from "./pages/OrderPage";
import { OrderHistoryPage } from "./pages/OrderHistoryPage";
import { AddShipment } from "./pages/AddShipment";
import { MyAccount } from "./pages/MyAccount";
import { TrackShipment } from "./pages/TrackShipment";
import { Settings } from "../shared/pages/Settings";
import { Notifications } from "../shared/pages/Notifications";
import { ChangePassword } from "../shared/pages/ChangePassword";

export function customerRoutes() {
  return (
    <Route element={<ProtectedRoute role="customer" />}>
      <Route element={<CustomerLayout />}>
        <Route path="/customer" element={<Dashboard />} />
        <Route path="/customer/shipments" element={<MyShipment />} />
        <Route path="/customer/shipments/new" element={<AddShipment />} />
        <Route path="/customer/shipments/:orderId" element={<OrderPage />} />
        <Route path="/customer/shipments/:orderId/history" element={<OrderHistoryPage />} />
        <Route path="/customer/track" element={<TrackShipment />} />
        <Route path="/customer/account" element={<MyAccount />} />
        <Route path="/customer/settings" element={<Settings />} />
        <Route path="/customer/settings/notifications" element={<Notifications />} />
        <Route path="/customer/settings/password" element={<ChangePassword />} />
      </Route>
    </Route>
  );
}
