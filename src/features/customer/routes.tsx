import { Route } from "react-router-dom";
import { ProtectedRoute } from "../../auth/ProtectedRoute";
import { CustomerLayout } from "./CustomerLayout";
import { TrackShipment } from "./pages/TrackShipment";
import { MyOrders } from "./pages/MyOrders";
import { Notifications } from "./pages/Notifications";

export function customerRoutes() {
  return (
    <Route element={<ProtectedRoute role="customer" />}>
      <Route element={<CustomerLayout />}>
        <Route path="/customer" element={<TrackShipment />} />
        <Route path="/customer/orders" element={<MyOrders />} />
        <Route path="/customer/notifications" element={<Notifications />} />
      </Route>
    </Route>
  );
}
