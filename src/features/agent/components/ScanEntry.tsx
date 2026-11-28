import { useEffect, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../../../components/Icon";
import { primeScanFeedback } from "../../../lib/scanFeedback";

interface ScanEntryProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (code: string) => void;
  onCamera: () => void;
  submitLabel: string;
  busy?: boolean;
}

/**
 * The camera as the hero action; the typed / hardware-scanner entry below it.
 * The input keeps focus so a Bluetooth or ring scanner (which types the code and
 * presses Enter) works without touching the screen.
 */
export function ScanEntry({ value, onChange, onSubmit, onCamera, submitLabel, busy = false }: ScanEntryProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) inputRef.current?.focus({ preventScroll: true });
  }, [busy]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = value.trim();
    if (!code || busy) return;
    primeScanFeedback();
    onSubmit(code);
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="scan-entry">
      <button
        type="button"
        className="scan-entry__camera"
        onClick={() => {
          primeScanFeedback();
          onCamera();
        }}
      >
        <Icon name="camera" size={26} />
        {t("barcodeScanner.scanButton")}
      </button>

      <form onSubmit={handleSubmit} className="scan-entry__manual">
        <label htmlFor="waybillId">{t("scan.manualLabel")}</label>
        <div className="scan-entry__row">
          <input
            ref={inputRef}
            id="waybillId"
            name="waybillId"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("scan.manualPlaceholder")}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="submit" disabled={!value.trim() || busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
