import { useMemo, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CgGrid, type CgGridColumnDescriptor } from "@cashgear/ui";
// Imported here, not in main.tsx: this component is lazy-loaded, so the
// library's JS and CSS stay out of the app shell every agent downloads.
import "@cashgear/ui/styles.css";
import type { ShipOrderDto } from "../../../lib/unifiedApi";
import { formatDate } from "../../../lib/formatDate";

// The app themes off prefers-color-scheme (index.css); @cashgear/ui only goes
// dark under a data-cg-theme="dark" ancestor, so mirror the media query onto it.
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
function subscribeToTheme(onChange: () => void) {
  darkQuery.addEventListener("change", onChange);
  return () => darkQuery.removeEventListener("change", onChange);
}

interface ShipmentGridProps {
  orders: ShipOrderDto[];
  /** The server page size — the grid shows one whole server page, unpaged. */
  pageSize: number;
  onSelectionChange: (selected: ShipOrderDto[]) => void;
  ariaLabel: string;
}

export default function ShipmentGrid({ orders, pageSize, onSelectionChange, ariaLabel }: ShipmentGridProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dark = useSyncExternalStore(subscribeToTheme, () => darkQuery.matches);

  const columns = useMemo<CgGridColumnDescriptor<ShipOrderDto>[]>(
    () => [
      { type: "selection", fieldId: "selection", width: 44 },
      {
        type: "text",
        fieldId: "orderId",
        title: t("myShipment.orderId"),
        accessor: (order) => order.orderId,
        width: 130,
        renderCell: ({ item }) => <Link to={`/customer/shipments/${item.orderId}`}>{item.orderId}</Link>,
      },
      { type: "text", fieldId: "orderDate", title: t("myShipment.date"), accessor: (order) => formatDate(order.orderDate), width: 110 },
      { type: "text", fieldId: "orderStatus", title: t("myShipment.status"), accessor: (order) => order.orderStatus, width: 110 },
      { type: "text", fieldId: "contactName", title: t("myShipment.recipient"), accessor: (order) => order.contactName, width: 150 },
      {
        type: "number",
        fieldId: "codAmount",
        title: t("myShipment.cod"),
        accessor: (order) => order.codAmount,
        format: (value) => (value ?? 0).toFixed(2),
        alignment: "end",
        width: 100,
      },
      { type: "text", fieldId: "description", title: t("myShipment.description"), accessor: (order) => order.description, width: 180 },
    ],
    [t],
  );

  // No search, filter row or sorting: they would only act on the one server page
  // loaded, and a search that hid a selected row would drop it from the print.
  return (
    <div data-cg-theme={dark ? "dark" : "light"}>
      <CgGrid<ShipOrderDto>
        data={orders}
        columns={columns}
        keySelector={(order) => order.orderId}
        selectionMode="checkbox"
        onSelectionChange={({ visibleSelectedItems }) => onSelectionChange([...visibleSelectedItems])}
        onRowActivate={(order) => navigate(`/customer/shipments/${order.orderId}`)}
        defaultState={{ pageSize }}
        showPager={false}
        showSearch={false}
        showFilterRow={false}
        allowSorting={false}
        allowGrouping={false}
        stripedRows
        direction={i18n.dir()}
        aria-label={ariaLabel}
      />
    </div>
  );
}
