import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { statusTone, TONE_COLOR, TONE_ICON } from "../lib/statusTone";

/** A shipment status as a coloured chip with an icon and the server's own wording. */
export function StatusChip({ status }: { status: string | null | undefined }) {
  if (!status) return null;
  const tone = statusTone(status);
  return (
    <span className="status-chip" style={{ "--tone": TONE_COLOR[tone] } as CSSProperties}>
      <Icon name={TONE_ICON[tone]} size={14} />
      {status}
    </span>
  );
}
