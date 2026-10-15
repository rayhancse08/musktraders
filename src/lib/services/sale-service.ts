import { prisma } from "../prisma";
import { ensureBillingCompany } from "../ensure-default-company";
import { notDeleted } from "../api-utils";
import { ApiError } from "../route-handler";
import {
  SALE_STATUSES, SaleStatus, calcSale, calcSaleItem, cartonPrice, fifoAllocate, resolveItemDiscount,
} from "../sale-math";
import { dec, decOrNull, dateStr, isoDate, num } from "./helpers";
import {
  Body, dateRangeFilter, optionalDate, optionalInt, optionalNumber, requiredInt, requiredNumber, str,
} from "./form-parse";
import { recalculateProduct } from "./product-service";
import { recalculateWarehouseItems, remainingOf } from "./warehouse-service";
import type { Prisma, Product, SaleItemLot, WarehouseItem } from "@prisma/client";

export const SALE_INCLUDE = {
  store: true,
  billingCompany: true,
  saleItems: {
    include: { product: true, productLots: { orderBy: { id: "asc" } } },
    orderBy: { id: "asc" },
  },
  salePayments: { where: notDeleted(), orderBy: { date: "asc" } },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof SALE_INCLUDE }>;
type SaleItemWithRelations = SaleWithRelations["saleItems"][number];

function itemCalc(item: SaleItemWithRelations) {
  return calcSaleItem({
    price: num(item.price),
    quantity: item.quantity,
    discount: num(item.discount),
    lots: item.productLots.map((lot) => ({ quantity: lot.saleQuantity, purchasePrice: num(lot.purchasePrice) })),
  });
}

function calcTotals(sale: SaleWithRelations) {
  return calcSale({
    items: sale.saleItems.map((item) => ({ ...itemCalc(item), quantity: item.quantity })),
    shippingCharge: num(sale.shippingCharge),
    discountType: sale.discountType,
    discountAmount: num(sale.discountAmount),
    payments: sale.salePayments.map((p) => num(p.amount)),
  });
}

function lotSummary(lots: Pick<SaleItemLot, "lotNumber" | "saleQuantity">[]) {
  return lots.map((lot) => `${lot.lotNumber || "No lot"}: ${lot.saleQuantity} ctn`).join(", ");
}

export function serializeSale(sale: SaleWithRelations) {
  const t = calcTotals(sale);
  return {
    id: sale.id,
    order_no: sale.orderNo,
    date: dateStr(sale.date)!,
    delivery_date: dateStr(sale.deliveryDate),
    status: sale.status,
    store: sale.storeId,
    store_name: sale.store.name,
    store_city: sale.store.city,
    store_address: sale.store.address,
    store_phone: sale.store.phoneNumber,
    store_email: sale.store.email,
    billing_company_name: sale.billingCompany?.name ?? null,
    total_carton: t.totalCarton,
    sub_total: dec(t.subTotal),
    discount: dec(t.discount),
    total: dec(t.total),
    payment: dec(t.payment),
    payment_due: dec(t.paymentDue),
    profit: dec(t.profit),
  };
}

export function serializeSaleDetail(sale: SaleWithRelations) {
  return {
    ...serializeSale(sale),
    billing_company: sale.billingCompanyId,
    shipping_charge: dec(sale.shippingCharge),
    discount_type: sale.discountType,
    discount_amount: dec(sale.discountAmount),
    created: isoDate(sale.createdAt),
    updated: isoDate(sale.updatedAt),
    sale_items: sale.saleItems.map((item) => {
      const calc = itemCalc(item);
      return {
        id: item.id,
        product: item.productId,
        product_name: item.product.name,
        packet_per_carton: item.product.packetPerCarton ?? 1,
        product_discount_type: item.product.discountType,
        product_discount: decOrNull(item.product.discount),
        quantity: item.quantity,
        price: dec(item.price),
        packet_price: dec(item.packetPrice),
        discount: dec(item.discount),
        total_price: dec(calc.totalPrice),
        total_purchased_price: dec(calc.totalPurchasedPrice),
        profit: dec(calc.profit),
        lot_information: item.lotInformation ?? lotSummary(item.productLots),
        lots: item.productLots.map((lot) => ({
          id: lot.id,
          warehouse_item: lot.warehouseItemId,
          lot_number: lot.lotNumber,
          sale_quantity: lot.saleQuantity,
          purchase_price: dec(lot.purchasePrice),
        })),
      };
    }),
    sale_payments: sale.salePayments.map((p) => ({
      id: p.id,
      amount: dec(p.amount),
      date: dateStr(p.date)!,
      account_information: p.accountInformation,
      note: p.note,
    })),
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listSales(params: {
  search?: string;
  status?: string;
  store?: number;
  dateRange?: string;
  page?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Prisma.SaleWhereInput = { ...notDeleted() };
  if (params.status) where.status = params.status as SaleStatus;
  if (params.store) where.storeId = params.store;
  if (params.search) {
    where.OR = [
      { orderNo: { contains: params.search, mode: "insensitive" } },
      { store: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  const date = dateRangeFilter(params.dateRange);
  if (date) where.date = date;

  const all = await prisma.sale.findMany({
    where,
    include: SALE_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const serialized = all.map(serializeSale);
  const summary = serialized.reduce(
    (acc, s) => ({
      total: acc.total + num(s.total),
      profit: acc.profit + num(s.profit),
      payment: acc.payment + num(s.payment),
      payment_due: acc.payment_due + num(s.payment_due),
      total_carton: acc.total_carton + s.total_carton,
    }),
    { total: 0, profit: 0, payment: 0, payment_due: 0, total_carton: 0 },
  );

  return {
    results: serialized.slice((page - 1) * pageSize, page * pageSize),
    count: serialized.length,
    summary: {
      total: dec(summary.total),
      profit: dec(summary.profit),
      payment: dec(summary.payment),
      payment_due: dec(summary.payment_due),
      total_carton: summary.total_carton,
    },
  };
}

export async function getSaleDetail(id: number) {
  const sale = await prisma.sale.findFirst({ where: { id, ...notDeleted() }, include: SALE_INCLUDE });
  return sale ? serializeSaleDetail(sale) : null;
}

type StockRow = WarehouseItem & { saleLots: { saleQuantity: number }[] };

/** Warehouse rows for the products, oldest first, with cartons this sale may still take. */
async function stockRows(productIds: number[], saleId?: number | null) {
  const rows: StockRow[] = await prisma.warehouseItem.findMany({
    where: { productId: { in: productIds }, ...notDeleted() },
    include: { saleLots: { where: { saleItem: { saleId: saleId ?? -1 } }, select: { saleQuantity: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => {
    const own = row.saleLots.reduce((sum, lot) => sum + lot.saleQuantity, 0);
    return { row, own, available: Math.max(0, row.remainingQuantity ?? remainingOf(row)) + own };
  });
}

/** Lots a sale item can draw from (FIFO order); includes this sale's current allocation when editing. */
export async function availableLots(productId: number, saleId?: number | null) {
  const rows = await stockRows([productId], saleId);
  return rows
    .filter((r) => r.available > 0 || r.own > 0)
    .map(({ row, own, available }) => ({
      warehouse_item: row.id,
      lot_number: row.lotNumber,
      available,
      own_quantity: own,
      purchased_price: dec(row.purchasedPrice),
      sale_price: decOrNull(row.salePrice),
      created: isoDate(row.createdAt),
    }));
}

// ── Validation ───────────────────────────────────────────────────────────────

type ParsedItem = {
  id: number | null;
  productId: number;
  quantity: number;
  packetPrice: number;
  discount: number | null;
  lots: { warehouseItemId: number; quantity: number }[] | null;
};

type ParsedPayment = {
  id: number | null;
  date: Date;
  amount: number;
  accountInformation: string | null;
  note: string | null;
};

function parseItems(raw: unknown): ParsedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Body, i) => {
    const row = `Item ${i + 1}`;
    const productId = optionalInt(item.product, `${row} product`);
    if (productId == null) throw new ApiError(`${row}: select a product.`);
    const quantity = requiredInt(item.quantity, `${row} quantity`);
    if (quantity <= 0) throw new ApiError(`${row} quantity: must be at least 1.`);
    const packetPrice = requiredNumber(item.packet_price, `${row} packet price`);
    if (packetPrice < 0) throw new ApiError(`${row} packet price: cannot be negative.`);

    let lots: ParsedItem["lots"] = null;
    if (Array.isArray(item.lots) && item.lots.length) {
      const merged = new Map<number, number>();
      (item.lots as Body[]).forEach((lot, j) => {
        const warehouseItemId = requiredInt(lot.warehouse_item, `${row} lot ${j + 1}`);
        const qty = optionalInt(lot.quantity, `${row} lot ${j + 1} quantity`) ?? 0;
        if (qty < 0) throw new ApiError(`${row} lot ${j + 1} quantity: cannot be negative.`);
        if (qty > 0) merged.set(warehouseItemId, (merged.get(warehouseItemId) ?? 0) + qty);
      });
      lots = [...merged].map(([warehouseItemId, qty]) => ({ warehouseItemId, quantity: qty }));
    }

    return {
      id: optionalInt(item.id, `${row} id`),
      productId,
      quantity,
      packetPrice,
      discount: optionalNumber(item.discount, `${row} discount`),
      lots,
    };
  });
}

function parsePayments(raw: unknown): ParsedPayment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((pay: Body, i) => {
    const row = `Payment ${i + 1}`;
    const date = optionalDate(pay.date, `${row} date`);
    if (!date) throw new ApiError(`${row} date: this field is required.`);
    const note = str(pay.note);
    if (note.length > 100) throw new ApiError(`${row} note: at most 100 characters.`);
    return {
      id: optionalInt(pay.id, `${row} id`),
      date,
      amount: requiredNumber(pay.amount, `${row} amount`),
      accountInformation: str(pay.account_information) || null,
      note: note || null,
    };
  });
}

const STATUS_KEYS = SALE_STATUSES.map((s) => s.key) as string[];

function parseStatus(v: unknown) {
  const status = str(v) || "confirmed";
  if (!STATUS_KEYS.includes(status)) throw new ApiError(`Status: "${status}" is not a valid choice.`);
  return status as SaleStatus;
}

async function validateSale(body: Body, items: ParsedItem[], saleId?: number) {
  const storeId = optionalInt(body.store, "Store");
  if (storeId == null) throw new ApiError("Store: this field is required.");
  if (!(await prisma.store.findFirst({ where: { id: storeId, ...notDeleted() }, select: { id: true } }))) {
    throw new ApiError("Store: select a valid store.");
  }

  let billingCompanyId = optionalInt(body.billing_company, "Billing company");
  if (billingCompanyId == null) {
    billingCompanyId = (await ensureBillingCompany()).id;
  } else if (
    !(await prisma.billingCompany.findFirst({ where: { id: billingCompanyId, ...notDeleted() }, select: { id: true } }))
  ) {
    throw new ApiError("Billing company: select a valid company.");
  }

  const date = optionalDate(body.date, "Date");
  if (!date) throw new ApiError("Date: this field is required.");
  const discountType = str(body.discount_type) || "percentage";
  if (discountType !== "percentage" && discountType !== "flat") {
    throw new ApiError("Discount type: choose percent or flat.");
  }

  const data = {
    date,
    deliveryDate: optionalDate(body.delivery_date, "Delivery date"),
    status: parseStatus(body.status),
    storeId,
    billingCompanyId,
    shippingCharge: optionalNumber(body.shipping_charge, "Shipping charge") ?? 0,
    discountType: discountType as "percentage" | "flat",
    discountAmount: optionalNumber(body.discount_amount, "Discount") ?? 0,
  };

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, ...notDeleted() },
  });
  const productById = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) throw new ApiError("A selected product no longer exists.");
    if (seen.has(item.productId)) throw new ApiError(`Duplicate entry for product ${product.name}`);
    seen.add(item.productId);
  }

  const stock = await stockRows(items.map((i) => i.productId), saleId);
  const stockById = new Map(stock.map((s) => [s.row.id, s]));
  const allocations = new Map<ParsedItem, Prisma.SaleItemLotUncheckedCreateWithoutSaleItemInput[]>();

  for (const item of items) {
    const product = productById.get(item.productId)!;
    const lotData = (s: (typeof stock)[number], qty: number) => ({
      warehouseItemId: s.row.id,
      lotNumber: s.row.lotNumber,
      saleQuantity: qty,
      purchasePrice: num(s.row.purchasedPrice),
    });

    if (item.lots) {
      let picked = 0;
      const rows = item.lots.map(({ warehouseItemId, quantity }) => {
        const s = stockById.get(warehouseItemId);
        if (!s || s.row.productId !== item.productId) {
          throw new ApiError(`${product.name}: a selected lot is no longer in the warehouse.`);
        }
        if (quantity > s.available) {
          throw new ApiError(
            `${product.name}: lot ${s.row.lotNumber || "without number"} has only ${s.available} carton(s) available.`,
          );
        }
        picked += quantity;
        return lotData(s, quantity);
      });
      if (picked !== item.quantity) {
        throw new ApiError(`${product.name}: lots add up to ${picked} carton(s) but the quantity is ${item.quantity}.`);
      }
      allocations.set(item, rows);
    } else {
      const candidates = stock.filter((s) => s.row.productId === item.productId);
      const picked = fifoAllocate(candidates, item.quantity);
      const covered = picked.reduce((sum, p) => sum + p.quantity, 0);
      if (covered < item.quantity) {
        throw new ApiError(`${product.name}: only ${covered} carton(s) available in the warehouse.`);
      }
      allocations.set(item, picked.map((p) => lotData(p.lot, p.quantity)));
    }
  }

  const itemData = (item: ParsedItem) => {
    const product: Product = productById.get(item.productId)!;
    const price = cartonPrice(item.packetPrice, product.packetPerCarton ?? 1);
    const lots = allocations.get(item)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      packetPrice: item.packetPrice,
      price,
      discount: resolveItemDiscount(item.discount, price, {
        discountType: product.discountType,
        discount: product.discount == null ? null : num(product.discount),
      }),
      lotInformation: lotSummary(lots.map((l) => ({ lotNumber: l.lotNumber ?? null, saleQuantity: l.saleQuantity }))),
      productLots: { create: lots },
    };
  };

  const warehouseIds = [...allocations.values()].flat().map((l) => l.warehouseItemId);
  return { data, itemData, warehouseIds };
}

function paymentData(pay: ParsedPayment) {
  return {
    date: pay.date,
    amount: pay.amount,
    accountInformation: pay.accountInformation,
    note: pay.note,
  };
}

async function recalculateStock(warehouseIds: Iterable<number>, productIds: Iterable<number>) {
  await recalculateWarehouseItems(warehouseIds);
  for (const productId of new Set(productIds)) {
    await recalculateProduct(productId);
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

const ORDER_PREFIX = "MT-";

async function nextOrderNo() {
  const [row] = await prisma.$queryRaw<{ last: number | null }[]>`
    SELECT MAX(CAST(substring(order_no FROM 4) AS INTEGER)) AS last
    FROM sales
    WHERE order_no ~ '^MT-[0-9]+$'
  `;
  return `${ORDER_PREFIX}${String((row?.last ?? 0) + 1).padStart(5, "0")}`;
}

function isOrderNoTaken(err: unknown) {
  const e = err as { code?: string; meta?: { target?: unknown } };
  return e?.code === "P2002" && /order_?no/i.test(String(e.meta?.target ?? ""));
}

export async function createSale(body: Body) {
  const items = parseItems(body.sale_items);
  const payments = parsePayments(body.sale_payments);
  const { data, itemData, warehouseIds } = await validateSale(body, items);

  let saleId: number | null = null;
  for (let attempt = 0; saleId == null; attempt++) {
    try {
      const sale = await prisma.sale.create({
        data: {
          ...data,
          orderNo: await nextOrderNo(),
          saleItems: { create: items.map(itemData) },
          salePayments: { create: payments.map(paymentData) },
        },
        select: { id: true },
      });
      saleId = sale.id;
    } catch (err) {
      if (!isOrderNoTaken(err) || attempt >= 4) throw err;
    }
  }

  await recalculateStock(warehouseIds, items.map((i) => i.productId));
  return (await getSaleDetail(saleId))!;
}

export async function updateSale(id: number, body: Body) {
  const existing = await prisma.sale.findFirst({ where: { id, ...notDeleted() }, include: SALE_INCLUDE });
  if (!existing) throw new ApiError("Sale not found.", 404);

  const items = parseItems(body.sale_items);
  const payments = parsePayments(body.sale_payments);
  const { data, itemData, warehouseIds } = await validateSale(body, items, id);

  const existingItemIds = new Set(existing.saleItems.map((i) => i.id));
  const keptItemIds = new Set(items.flatMap((i) => (i.id && existingItemIds.has(i.id) ? [i.id] : [])));
  const removedItemIds = existing.saleItems.filter((i) => !keptItemIds.has(i.id)).map((i) => i.id);
  const existingPaymentIds = new Set(existing.salePayments.map((p) => p.id));
  const keptPaymentIds = new Set(payments.flatMap((p) => (p.id ? [p.id] : [])));
  const removedPaymentIds = existing.salePayments.filter((p) => !keptPaymentIds.has(p.id)).map((p) => p.id);
  const previousWarehouseIds = existing.saleItems.flatMap((i) => i.productLots.map((l) => l.warehouseItemId));
  const previousProductIds = existing.saleItems.map((i) => i.productId);

  await prisma.$transaction([
    prisma.sale.update({ where: { id }, data }),
    prisma.saleItemLot.deleteMany({ where: { saleItem: { saleId: id } } }),
    prisma.saleItem.deleteMany({ where: { id: { in: removedItemIds } } }),
    ...items.map((item) =>
      item.id && keptItemIds.has(item.id)
        ? prisma.saleItem.update({ where: { id: item.id }, data: itemData(item) })
        : prisma.saleItem.create({ data: { ...itemData(item), saleId: id } }),
    ),
    prisma.salePayment.updateMany({ where: { id: { in: removedPaymentIds } }, data: { deletedAt: new Date() } }),
    ...payments.map((pay) =>
      pay.id && existingPaymentIds.has(pay.id)
        ? prisma.salePayment.update({ where: { id: pay.id }, data: paymentData(pay) })
        : prisma.salePayment.create({ data: { ...paymentData(pay), saleId: id } }),
    ),
  ]);

  await recalculateStock(
    [...previousWarehouseIds, ...warehouseIds],
    [...previousProductIds, ...items.map((i) => i.productId)],
  );
  return (await getSaleDetail(id))!;
}

export async function setSaleStatus(id: number, status: unknown) {
  const sale = await prisma.sale.findFirst({ where: { id, ...notDeleted() }, select: { id: true } });
  if (!sale) throw new ApiError("Sale not found.", 404);
  await prisma.sale.update({ where: { id }, data: { status: parseStatus(status) } });
  return (await getSaleDetail(id))!;
}

/** Soft-deletes the sale and releases its lot allocations back to the warehouse. */
export async function deleteSale(id: number) {
  const sale = await prisma.sale.findFirst({ where: { id, ...notDeleted() }, include: SALE_INCLUDE });
  if (!sale) throw new ApiError("Sale not found.", 404);

  await prisma.$transaction([
    prisma.sale.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.saleItemLot.deleteMany({ where: { saleItem: { saleId: id } } }),
  ]);

  await recalculateStock(
    sale.saleItems.flatMap((i) => i.productLots.map((l) => l.warehouseItemId)),
    sale.saleItems.map((i) => i.productId),
  );
}
