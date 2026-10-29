// Invoice amounts are decimal strings ("1234.50"). Summing them as JS numbers
// drifts (0.1 + 0.2), so they are converted to integers at a fixed scale.

const SCALE = 6n;
const ONE = 10n ** SCALE;

/** Parses a decimal string into an integer number of millionths. */
export function toUnits(value: string): bigint {
  const match = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(value.trim());
  if (!match || (match[2] === "" && !match[3])) {
    throw new Error(`Montant illisible : « ${value} »`);
  }
  const [, sign, intPart, fracPart = ""] = match;
  const frac = fracPart.slice(0, Number(SCALE)).padEnd(Number(SCALE), "0");
  const units = BigInt(intPart || "0") * ONE + BigInt(frac);
  return sign === "-" ? -units : units;
}

// BigInt division truncates toward zero; rounding needs floor.
function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
}

/** Rounds to cents, ties toward +infinity, like XPath round() in the EN 16931 Schematron. */
export function toCents(units: bigint): bigint {
  const perCent = ONE / 100n;
  return floorDiv(units + perCent / 2n, perCent);
}

export function sumCents(values: string[]): bigint {
  return toCents(values.reduce((total, v) => total + toUnits(v), 0n));
}

export function centsOf(value: string): bigint {
  return toCents(toUnits(value));
}

export function formatCents(cents: bigint): string {
  const abs = cents < 0n ? -cents : cents;
  const text = `${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
  return cents < 0n ? `-${text}` : text;
}
