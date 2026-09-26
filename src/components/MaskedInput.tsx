import { useLayoutEffect, useReducer, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";

/**
 * Digit-only masked input, same mask notation as the ERP's CgMaskedInput:
 * "0" is a digit slot, anything else is a literal the input types for you.
 * The value is the digits alone — literals never reach it — and the field only
 * validates once every slot is filled.
 *
 * Kept local rather than using @cashgear/ui's CgMaskedInput: that pulls the
 * library's JS and CSS into the app shell, which the rest of the app avoids.
 */
interface MaskedInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "maxLength" | "pattern"> {
  mask: string;
  value: string;
  onValueChange: (digits: string) => void;
}

function applyMask(mask: string, digits: string) {
  let out = "";
  let next = 0;
  for (const ch of mask) {
    if (next >= digits.length) break;
    out += ch === "0" ? digits[next++] : ch;
  }
  return out;
}

/** Index in `text` just past its `count`th digit. */
function positionAfterDigits(text: string, count: number) {
  if (count === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === count) return i + 1;
  }
  return text.length;
}

// Only regex syntax characters: the pattern attribute compiles in unicode mode,
// where escaping anything else (a space, a dash) is itself a syntax error.
const escapeLiteral = (ch: string) => ch.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");

export function MaskedInput({ mask, value, onValueChange, ...inputProps }: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Digits left of the caret after the last edit, restored once the reformatted
  // value renders — otherwise every edit would throw the caret to the end.
  const caretDigits = useRef<number | null>(null);
  // An edit that leaves the digits unchanged (a letter, a deleted space) still
  // has to re-render, so the stray text is reverted and the caret put back.
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const slots = [...mask].filter((ch) => ch === "0").length;
  const display = applyMask(mask, value);
  const pattern = [...mask].map((ch) => (ch === "0" ? "\\d" : escapeLiteral(ch))).join("");

  useLayoutEffect(() => {
    const input = inputRef.current;
    const count = caretDigits.current;
    if (!input || count === null) return;
    caretDigits.current = null;
    const position = positionAfterDigits(display, count);
    input.setSelectionRange(position, position);
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const typed = e.target.value;
    let digits = typed.replace(/\D/g, "");
    let before = typed.slice(0, e.target.selectionStart ?? typed.length).replace(/\D/g, "").length;
    // Backspace right after a literal deleted only the literal — take the digit before it too.
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (inputType === "deleteContentBackward" && digits === value && before > 0) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before--;
    }
    digits = digits.slice(0, slots);
    caretDigits.current = Math.min(before, digits.length);
    onValueChange(digits);
    rerender();
  }

  return (
    <input
      {...inputProps}
      ref={inputRef}
      value={display}
      onChange={handleChange}
      type="tel"
      inputMode="numeric"
      dir="ltr"
      pattern={pattern}
    />
  );
}
