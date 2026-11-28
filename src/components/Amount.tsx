import { useTranslation } from "react-i18next";
import { formatMoney } from "../lib/money";

/** A money value, isolated left to right so "-65.00" never renders as "65.00-" in RTL. */
export function Amount({
  value,
  currency = true,
  className,
}: {
  value: number;
  currency?: boolean;
  className?: string;
}) {
  const { i18n } = useTranslation();
  return (
    <bdi dir="ltr" className={`amount${className ? ` ${className}` : ""}`}>
      {formatMoney(value, i18n.language, { currency })}
    </bdi>
  );
}

/**
 * A balance shown without a sign: the size, plus who owes whom as a لك / عليك chip.
 * `positiveMeans` says which way a positive `value` points in the caller's data.
 */
export function DirectedAmount({
  value,
  positiveMeans,
  className,
  currency = true,
}: {
  value: number;
  positiveMeans: "youOwe" | "owedToYou";
  className?: string;
  currency?: boolean;
}) {
  const { t } = useTranslation();
  const rounded = Math.round(value * 100) / 100;
  const direction =
    rounded === 0 ? null : (rounded > 0) === (positiveMeans === "owedToYou") ? "owedToYou" : "youOwe";
  return (
    <span className={`directed-amount${className ? ` ${className}` : ""}`}>
      <Amount value={Math.abs(rounded)} currency={currency} />
      {direction && (
        <span className={`direction-chip direction-chip--${direction === "owedToYou" ? "in" : "out"}`}>
          {t(`money.${direction}`)}
        </span>
      )}
    </span>
  );
}
