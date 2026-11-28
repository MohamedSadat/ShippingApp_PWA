import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "./Icon";
import { telHref, whatsappHref } from "../lib/contact";

// Inside a tappable card the buttons must not also open the card.
const stop = (e: MouseEvent) => e.stopPropagation();

/** Call / WhatsApp / Navigate as 44px buttons; each hides when there's nothing to act on. */
export function ContactActions({ phone, mapsUrl }: { phone?: string | null; mapsUrl?: string | null }) {
  const { t } = useTranslation();
  const tel = telHref(phone);
  const wa = whatsappHref(phone);
  if (!tel && !wa && !mapsUrl) return null;
  return (
    <div className="contact-actions">
      {tel && (
        <a className="contact-actions__btn" href={tel} onClick={stop}>
          <Icon name="phone" size={18} />
          {t("contact.call")}
        </a>
      )}
      {wa && (
        <a className="contact-actions__btn" href={wa} target="_blank" rel="noreferrer" onClick={stop}>
          <Icon name="whatsapp" size={18} />
          {t("contact.whatsapp")}
        </a>
      )}
      {mapsUrl && (
        <a className="contact-actions__btn" href={mapsUrl} target="_blank" rel="noreferrer" onClick={stop}>
          <Icon name="navigate" size={18} />
          {t("contact.navigate")}
        </a>
      )}
    </div>
  );
}
