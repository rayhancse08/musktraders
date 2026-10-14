export function roundTo(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Carton price is the invoiced FOB price per carton. Older rows only have a
 * per-piece unit price, so fall back to unit price × pieces per carton.
 */
export function effectiveCartonPrice(
  cartonPrice: number | null | undefined,
  unitPrice: number,
  piecesPerCarton: number,
) {
  return cartonPrice != null ? cartonPrice : unitPrice * piecesPerCarton;
}

/** Invoice line total, rounded to cents so the invoice grand total matches line by line. */
export function purchaseLineTotal(cartonPrice: number, cartons: number) {
  return roundTo(cartonPrice * cartons, 2);
}

export type PriceFields = {
  packet_per_carton: string;
  unit_price: string;
  carton_price: string;
  line_total: string;
  purchased_carton: string;
};

const parseNum = (v: string | undefined) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : null;
};

/**
 * Keeps unit price, carton price and line total consistent after one of them
 * (or the carton count / pieces per carton) is edited. Carton price is the
 * source of truth because supplier invoices round the per-piece price.
 */
export function syncPriceFields<T extends PriceFields>(item: T, changed: keyof PriceFields): T {
  const next = { ...item };
  const ppc = parseNum(item.packet_per_carton) || null;
  const cartons = parseNum(item.purchased_carton);
  let carton = parseNum(item.carton_price);

  if (changed === "unit_price") {
    const unit = parseNum(item.unit_price);
    if (unit != null && ppc) {
      carton = unit * ppc;
      next.carton_price = String(roundTo(carton, 8));
    }
  } else if (changed === "line_total") {
    const total = parseNum(item.line_total);
    if (total != null && cartons) {
      carton = total / cartons;
      next.carton_price = String(roundTo(carton, 8));
    }
  }

  if (changed !== "unit_price" && carton != null && ppc) {
    next.unit_price = String(roundTo(carton / ppc, 6));
  }
  if (changed !== "line_total" && carton != null && cartons != null) {
    next.line_total = String(purchaseLineTotal(carton, cartons));
  }
  return next;
}

export const PRICE_FIELD_KEYS: (keyof PriceFields)[] = [
  "packet_per_carton",
  "unit_price",
  "carton_price",
  "line_total",
  "purchased_carton",
];
