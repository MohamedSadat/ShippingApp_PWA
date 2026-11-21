# Customer dashboard statistics endpoint

The customer Dashboard (`src/features/customer/pages/Dashboard.tsx`, `src/features/customer/components/DashboardStats.tsx`)
shows how many of the customer's shipments are in each status bucket over a period. UnifiedAPI
has no such endpoint yet. This is the contract the app is built against
(`getPartnerDashboard` in `src/lib/unifiedApi.ts`). The React Native app (ShippingApp_ReactNative) uses the same contract.

Until the endpoint is deployed, it answers 404, and the app shows "—" in every card with
a "Statistics aren't available yet" note. The app never estimates the counts itself.

## Request

```
GET /api/ship/ShipOrder/GetPartnerDashboard?days=30
X-Api-Key: <partner API key>
```

- **Auth:** the partner is resolved from the API key's own claims, as in
  `GetPartnerPendingOrder` / `GetPartnerCompletedOrder`. A customer gets counts of their own
  shipments. 401 when the key is dead.
- **`days`:** an integer from 1 to 365. The period is the last `days` days up to and including today,
  in the company's time zone. The app sends 7, 30 or 90. Answer 400 when it is out of range.

## Response — 200

```json
{
  "from": "2026-10-23",
  "to": "2026-11-21",
  "counts": {
    "awaiting": 9,
    "inWarehouse": 3,
    "outForDelivery": 8,
    "delivered": 73,
    "redelivery": 0,
    "failed": 18
  }
}
```

- `from` / `to` are `yyyy-mm-dd`, both included.
- Every count is a non-negative integer, and every key is always present (0 when there are none).
- A shipment is counted once, in the bucket of its **current** status, when its order date falls in
  the period. Canceled shipments are not counted.

## Buckets

The server owns the mapping from its status codes (StatusProfile) to the buckets. The app shows
only the bucket names:

| Key              | Arabic label  | Meaning                                                 |
| ---------------- | ------------- | ------------------------------------------------------- |
| `awaiting`       | إنتظار الشحن  | Created (draft) and not yet picked up from the merchant |
| `inWarehouse`    | في المخزن     | Picked up and held at a branch or warehouse             |
| `outForDelivery` | قيد التوصيل   | With a courier on the way to the receiver               |
| `delivered`      | تم التسليم    | Delivered, in full or in part, or exchanged             |
| `redelivery`     | إعادة التوصيل | Rescheduled for another delivery attempt                |
| `failed`         | تعذر التسليم  | Delivery failed, or being returned to the merchant      |

A user type the endpoint doesn't handle (for example, an agent key) may answer 200 with an empty
body. The app treats that the same as 404.
