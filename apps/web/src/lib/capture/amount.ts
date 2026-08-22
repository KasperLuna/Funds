export type AmountState = { input: string; decimals: number };

export const emptyAmount = (decimals: number): AmountState => ({
  input: "",
  decimals,
});

function parts(input: string): { int: string; frac: string; hasDot: boolean } {
  const dot = input.indexOf(".");
  if (dot === -1) return { int: input, frac: "", hasDot: false };
  return { int: input.slice(0, dot), frac: input.slice(dot + 1), hasDot: true };
}

const MAX_INT_DIGITS = 9;

export function digit(
  state: AmountState,
  key: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | ".",
): AmountState {
  if (key === ".") {
    if (state.decimals === 0 || state.input.includes(".")) return state;
    return { ...state, input: state.input + "." };
  }
  const chars = key === "00" ? ["0", "0"] : [key];
  let next = state.input;
  for (const ch of chars) {
    const p = parts(next);
    if (p.hasDot) {
      if (p.frac.length >= state.decimals) break;
      next += ch;
    } else {
      if (p.int.length >= MAX_INT_DIGITS) break;
      next += ch;
    }
  }
  return { ...state, input: next };
}

export function backspace(state: AmountState): AmountState {
  return { ...state, input: state.input.slice(0, -1) };
}

export function clearAmount(state: AmountState): AmountState {
  return { ...state, input: "" };
}

export function amountToMinor(state: AmountState): bigint {
  const { int, frac } = parts(state.input);
  const scale = 10n ** BigInt(state.decimals);
  const intPart = int ? BigInt(int) : 0n;
  const fracPadded = frac.padEnd(state.decimals, "0").slice(0, state.decimals);
  const fracPart = fracPadded ? BigInt(fracPadded) : 0n;
  return intPart * scale + fracPart;
}