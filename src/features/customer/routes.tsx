import { Route } from "react-router-dom";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { CustomerLayout } from "./CustomerLayout";
import { Dashboard } from "./pages/Dashboard";
import { MyShipment } from "./pages/MyShipment";
import { OrderPage } from "./pages/OrderPage";
import { AddShipment } from "./pages/AddShipment";
import { MyAccount } from "./pages/MyAccount";
import { Settings } from "./pages/Settings";
import { Notifications } from "./pages/Notifications";

export function customerRoutes() {
  return (
    <Route element={<ProtectedRoute role="customer" />}>
      <Route element={<CustomerLayout />}>
        <Route path="/customer" element={<Dashboard />} />
        <Route path="/customer/shipments" element={<MyShipment />} />
        <Route path="/customer/shipments/new" element={<AddShipment />} />
        <Route path="/customer/shipments/:orderId" element={<OrderPage />} />
        <Route path="/customer/account" element={<MyAccount />} />
        <Route path="/customer/settings" element={<Settings />} />
        <Route path="/customer/settings/notifications" element={<Notifications />} />
      </Route>
    </Route>
  );
}
