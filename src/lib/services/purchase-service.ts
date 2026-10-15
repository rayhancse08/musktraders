import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { ApiError } from "../route-handler";
import {
  PROFIT_PERCENTAGE, PURCHASE_COST_FIELDS, PurchaseCostKey, PurchaseItemInput, calcPurchase, calcPurchaseItem,
  roundTo,
} from "../purchase-math";
import { dec, decOrNull, dateStr, isoDate, num } from "./helpers";
import {
  Body, dateRangeFilter, optionalDate, optionalInt, optionalNumber, requiredInt, requiredNumber, str,
} from "./form-parse";
import { recalculateProduct } from "./product-service";
import type { Prisma, Purchase, PurchaseItem, PurchasePayment, Vendor, Product } from "@prisma/client";

type PurchaseWithRelations = Purchase & {
  vendor?: Vendor | null;
  purchaseItems: (PurchaseItem & { product: Product })[];
  purchasePayments: PurchasePayment[];
};

const PURCHASE_INCLUDE = {
  vendor: true,
  purchaseItems: { include: { product: true }, orderBy: { id: "asc" } },
  purchasePayments: { where: notDeleted(), orderBy: { date: "asc" } },
} satisfies Prisma.PurchaseInclude;

const COST_DB_KEYS: Record<PurchaseCostKey, keyof Purchase> = {
  shipping_cost: "shippingCost",
  food_quality_control_cost: "foodQualityControlCost",
  container_clearing_cost: "containerClearingCost",
  lory_shipping_cost: "loryShippingCost",
  labourer_handling_cost: "labourerHandlingCost",
  warehouse_rent: "warehouseRent",
  employee_salary: "employeeSalary",
  warehouse_other_cost: "warehouseOtherCost",
};

function itemInput(item: PurchaseItem & { product: Product }): PurchaseItemInput {
  return {
    unitPrice: num(item.unitPrice),
    packetPerCarton: item.product.packetPerCarton ?? 1,
    purchasedCarton: item.purchasedCarton,
    profitPercentage: item.profitPercentage == null ? null : num(item.profitPercentage),
  };
}

export function purchaseItemsTotal(items: (PurchaseItem & { product: Product })[]) {
  return calcPurchase({ items: items.map(itemInput), costs: [], payments: [], expectedSales: 0 })
    .totalProductPrice;
}

function calcTotals(p: PurchaseWithRelations, expectedSales: number) {
  return calcPurchase({
    items: p.purchaseItems.map(itemInput),
    costs: PURCHASE_COST_FIELDS.map(({ key }) => num(p[COST_DB_KEYS[key]] as Prisma.Decimal)),
    payments: p.purchasePayments.map((pay) => num(pay.amount)),
    expectedSales,
  });
}

/** Expected sales per lot = Σ warehouse item sale price × stocked quantity for that lot. */
async function expectedSalesByLot(lots: string[]) {
  const result = new Map<string, number>();
  if (!lots.length) return result;
  const rows = await prisma.warehouseItem.findMany({
    where: { lotNumber: { in: lots }, ...notDeleted() },
    select: { lotNumber: true, salePrice: true, stockedQuantity: true },
  });
  for (const row of rows) {
    const lot = row.lotNumber!;
    result.set(lot, (result.get(lot) ?? 0) + num(row.salePrice) * (row.stockedQuantity ?? 0));
  }
  return result;
}

export function serializePurchase(p: PurchaseWithRelations, expectedSales = 0) {
  const t = calcTotals(p, expectedSales);
  return {
    id: p.id,
    lot_number: p.lotNumber,
    date: dateStr(p.date),
    receive_date: dateStr(p.receiveDate),
    vendor: p.vendorId,
    vendor_name: p.vendor?.name ?? null,
    total_product_price: dec(t.totalProductPrice),
    shipping_cost: dec(p.shippingCost),
    food_quality_control_cost: dec(p.foodQualityControlCost),
    container_clearing_cost: dec(p.containerClearingCost),
    lory_shipping_cost: dec(p.loryShippingCost),
    labourer_handling_cost: dec(p.labourerHandlingCost),
    warehouse_rent: dec(p.warehouseRent),
    employee_salary: dec(p.employeeSalary),
    warehouse_other_cost: dec(p.warehouseOtherCost),
    additional_cost: dec(t.additionalCost),
    total_purchase_cost: dec(t.totalPurchaseCost),
    total_carton: t.totalCarton,
    carton_handling_cost: dec(t.cartonHandlingCost),
    payment: dec(t.payment),
    payment_due: dec(t.paymentDue),
    expected_sales: dec(t.expectedSales),
    expected_profit: dec(t.expectedProfit),
  };
}

export function serializePurchaseDetail(p: PurchaseWithRelations, expectedSales = 0) {
  const base = serializePurchase(p, expectedSales);
  const handling = num(base.carton_handling_cost);
  let totalCbm = 0;

  const purchaseItems = p.purchaseItems.map((item) => {
    const calc = calcPurchaseItem(itemInput(item), handling);
    const cbm = item.cbm == null ? null : num(item.cbm);
    const cbmTotal = cbm == null ? 0 : roundTo(cbm * item.purchasedCarton, 4);
    totalCbm += cbmTotal;
    return {
      id: item.id,
      product: item.productId,
      product_name: item.product.name,
      product_weight: Number(item.product.weight),
      product_unit: item.product.unit,
      packet_per_carton: item.product.packetPerCarton ?? 1,
      unit_price: dec(item.unitPrice),
      total_unit_price: dec(calc.totalUnitPrice),
      purchased_carton: item.purchasedCarton,
      received_carton: item.receivedCarton,
      damaged_carton: item.damagedCarton,
      profit_percentage: decOrNull(item.profitPercentage),
      carton_price: dec(calc.cartonPrice),
      carton_total_price: dec(calc.cartonTotalPrice),
      sale_price: dec(calc.salePrice),
      total_price: dec(calc.totalPrice),
      cbm: cbm == null ? null : String(cbm),
      cbm_total: dec(cbmTotal),
    };
  });

  return {
    ...base,
    vendor_phone: p.vendor?.phoneNumber ?? null,
    vendor_email: p.vendor?.email ?? null,
    vendor_address: p.vendor?.address ?? null,
    total_cbm: dec(totalCbm),
    lc_information: p.lcInformation,
    bil_information: p.bilInformation,
    container_information: p.containerInformation,
    purchase_items: purchaseItems,
    purchase_payments: p.purchasePayments.map((pay) => ({
      id: pay.id,
      amount: dec(pay.amount),
      date: dateStr(pay.date)!,
      account_information: pay.accountInformation,
      note: pay.note,
    })),
    created: isoDate(p.createdAt),
    updated: isoDate(p.updatedAt),
  };
}

// ── Listing ──────────────────────────────────────────────────────────────────

export async function listPurchases(params: {
  search?: string;
  page?: number;
  vendor?: number;
  dateRange?: string;
}) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Prisma.PurchaseWhereInput = { ...notDeleted() };
  if (params.search) {
    where.OR = [
      { lotNumber: { contains: params.search, mode: "insensitive" } },
      { vendor: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  if (params.vendor) where.vendorId = params.vendor;
  const date = dateRangeFilter(params.dateRange);
  if (date) where.date = date;

  const all = await prisma.purchase.findMany({
    where,
    include: PURCHASE_INCLUDE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const expected = await expectedSalesByLot(all.map((p) => p.lotNumber));
  const serialized = all.map((p) => serializePurchase(p, expected.get(p.lotNumber) ?? 0));

  const summary = serialized.reduce(
    (acc, p) => ({
      total_product_price: acc.total_product_price + num(p.total_product_price),
      total_purchase_cost: acc.total_purchase_cost + num(p.total_purchase_cost),
      payment: acc.payment + num(p.payment),
      payment_due: acc.payment_due + num(p.payment_due),
      total_carton: acc.total_carton + p.total_carton,
    }),
    { total_product_price: 0, total_purchase_cost: 0, payment: 0, payment_due: 0, total_carton: 0 },
  );

  return {
    results: serialized.slice((page - 1) * pageSize, page * pageSize),
    count: serialized.length,
    summary: {
      total_product_price: dec(summary.total_product_price),
      total_purchase_cost: dec(summary.total_purchase_cost),
      payment: dec(summary.payment),
      payment_due: dec(summary.payment_due),
      total_carton: summary.total_carton,
    },
  };
}

export async function getPurchaseDetail(id: number) {
  const purchase = await prisma.purchase.findFirst({
    where: { id, ...notDeleted() },
    include: PURCHASE_INCLUDE,
  });
  if (!purchase) return null;
  const expected = await expectedSalesByLot([purchase.lotNumber]);
  return serializePurchaseDetail(purchase, expected.get(purchase.lotNumber) ?? 0);
}

// ── Validation ───────────────────────────────────────────────────────────────

type ParsedItem = {
  id: number | null;
  productId: number;
  unitPrice: number;
  cbm: number | null;
  purchasedCarton: number;
  receivedCarton: number | null;
  damagedCarton: number | null;
  profitPercentage: number | null;
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
    const id = optionalInt(item.id, `${row} id`);
    return {
      id,
      productId,
      unitPrice: requiredNumber(item.unit_price, `${row} unit price`),
      cbm: optionalNumber(item.cbm, `${row} CBM`),
      purchasedCarton: requiredInt(item.purchased_carton, `${row} purchased carton`),
      receivedCarton: optionalInt(item.received_carton, `${row} received carton`),
      damagedCarton: optionalInt(item.damaged_carton, `${row} damaged carton`),
      profitPercentage: optionalNumber(item.profit_percentage, `${row} profit percentage`),
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

async function validatePurchase(body: Body, items: ParsedItem[], purchaseId?: number) {
  const vendorId = optionalInt(body.vendor, "Vendor");
  if (vendorId == null) throw new ApiError("Vendor: this field is required.");
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, ...notDeleted() } });
  if (!vendor) throw new ApiError("Vendor: select a valid vendor.");

  const lotNumber = str(body.lot_number);
  if (!lotNumber) throw new ApiError("Lot number: this field is required.");
  if (lotNumber.length > 100) throw new ApiError("Lot number: at most 100 characters.");
  const clash = await prisma.purchase.findFirst({
    where: { lotNumber, ...(purchaseId ? { NOT: { id: purchaseId } } : {}) },
    select: { deletedAt: true },
  });
  if (clash) {
    throw new ApiError(
      `Purchase with lot number "${lotNumber}" already exists${clash.deletedAt ? " (in a deleted purchase)" : ""}.`,
    );
  }

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, ...notDeleted() },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) throw new ApiError("A selected product no longer exists.");
    if (seen.has(item.productId)) throw new ApiError(`Duplicate entry for product ${product.name}`);
    seen.add(item.productId);
  }

  const fields = purchaseFields(body);
  const derived = calcPurchase({
    items: items.map((item) => ({
      unitPrice: item.unitPrice,
      packetPerCarton: byId.get(item.productId)!.packetPerCarton ?? 1,
      purchasedCarton: item.purchasedCarton,
      profitPercentage: item.profitPercentage,
    })),
    costs: PURCHASE_COST_FIELDS.map(({ key }) => fields[COST_DB_KEYS[key]] as number),
    payments: [],
    expectedSales: 0,
  });

  return {
    data: { ...fields, vendorId, lotNumber, cartonHandlingCost: derived.cartonHandlingCost },
    lotNumber,
    itemData: (item: ParsedItem) => ({
      productId: item.productId,
      unitPrice: item.unitPrice,
      // Stored like Django does; serializers always recompute from unit price.
      cartonPrice: item.unitPrice * (byId.get(item.productId)!.packetPerCarton ?? 1),
      cbm: item.cbm,
      purchasedCarton: item.purchasedCarton,
      receivedCarton: item.receivedCarton,
      damagedCarton: item.damagedCarton,
      profitPercentage: item.profitPercentage,
    }),
  };
}

function purchaseFields(body: Body) {
  const data: Record<string, unknown> = {
    date: optionalDate(body.date, "Date"),
    receiveDate: optionalDate(body.receive_date, "Receive date"),
    lcInformation: str(body.lc_information) || null,
    bilInformation: str(body.bil_information) || null,
    containerInformation: str(body.container_information) || null,
  };
  for (const { key, label } of PURCHASE_COST_FIELDS) {
    data[COST_DB_KEYS[key]] = optionalNumber(body[key], label) ?? 0;
  }
  return data;
}

function paymentData(pay: ParsedPayment) {
  return {
    date: pay.date,
    amount: pay.amount,
    accountInformation: pay.accountInformation,
    note: pay.note,
  };
}

// ── Warehouse sync ───────────────────────────────────────────────────────────

/**
 * Keeps one warehouse item per purchase item (product + lot) in step with the
 * purchase: prices from the purchase calculations, stock from received cartons
 * (falling back to purchased). Sale / return / manual quantities are preserved.
 */
export async function syncPurchaseWarehouse(purchaseId: number) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, ...notDeleted() },
    include: PURCHASE_INCLUDE,
  });
  if (!purchase) return;

  const handling = calcTotals(purchase, 0).cartonHandlingCost;
  const existing = await prisma.warehouseItem.findMany({
    where: {
      lotNumber: purchase.lotNumber,
      productId: { in: purchase.purchaseItems.map((i) => i.productId) },
      ...notDeleted(),
    },
    orderBy: { id: "asc" },
  });
  const byProduct = new Map<number, (typeof existing)[number]>();
  for (const row of existing) if (!byProduct.has(row.productId)) byProduct.set(row.productId, row);

  await prisma.$transaction(
    purchase.purchaseItems.map((item) => {
      const calc = calcPurchaseItem(itemInput(item), handling);
      const row = byProduct.get(item.productId);
      const stocked = item.receivedCarton ?? item.purchasedCarton;
      const damaged = item.damagedCarton ?? 0;
      const remaining =
        row?.manualRemainingQuantity ??
        stocked - damaged - (row?.saleQuantity ?? 0) + (row?.returnQuantity ?? 0);
      const data = {
        productPrice: calc.cartonPrice,
        cartonHandlingCost: handling,
        purchasedPrice: calc.cartonTotalPrice,
        profitPercentage: num(item.profitPercentage) || PROFIT_PERCENTAGE,
        salePrice: calc.salePrice,
        stockedQuantity: stocked,
        damagedQuantity: damaged,
        remainingQuantity: remaining,
      };
      return row
        ? prisma.warehouseItem.update({ where: { id: row.id }, data })
        : prisma.warehouseItem.create({
            data: { ...data, productId: item.productId, lotNumber: purchase.lotNumber },
          });
    }),
  );

  for (const productId of new Set(purchase.purchaseItems.map((i) => i.productId))) {
    await recalculateProduct(productId);
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createPurchase(body: Body) {
  const items = parseItems(body.purchase_items);
  const payments = parsePayments(body.purchase_payments);
  const { data, itemData } = await validatePurchase(body, items);

  const purchase = await prisma.purchase.create({
    data: {
      ...(data as Prisma.PurchaseUncheckedCreateInput),
      purchaseItems: { create: items.map(itemData) },
      purchasePayments: { create: payments.map(paymentData) },
    },
  });

  await syncPurchaseWarehouse(purchase.id);
  return (await getPurchaseDetail(purchase.id))!;
}

export async function updatePurchase(id: number, body: Body) {
  const existing = await prisma.purchase.findFirst({
    where: { id, ...notDeleted() },
    include: PURCHASE_INCLUDE,
  });
  if (!existing) throw new ApiError("Purchase not found.", 404);

  const items = parseItems(body.purchase_items);
  const payments = parsePayments(body.purchase_payments);
  const { data, itemData, lotNumber } = await validatePurchase(body, items, id);

  const keptItemIds = new Set(items.flatMap((i) => (i.id ? [i.id] : [])));
  const removedItems = existing.purchaseItems.filter((i) => !keptItemIds.has(i.id));
  const newProductIds = new Set(items.map((i) => i.productId));
  const droppedProductIds = [
    ...new Set(existing.purchaseItems.map((i) => i.productId).filter((pid) => !newProductIds.has(pid))),
  ];
  const keptPaymentIds = new Set(payments.flatMap((p) => (p.id ? [p.id] : [])));
  const removedPaymentIds = existing.purchasePayments
    .filter((p) => !keptPaymentIds.has(p.id))
    .map((p) => p.id);
  const existingItemIds = new Set(existing.purchaseItems.map((i) => i.id));
  const existingPaymentIds = new Set(existing.purchasePayments.map((p) => p.id));
  const now = new Date();

  await prisma.$transaction([
    prisma.purchase.update({ where: { id }, data: data as Prisma.PurchaseUncheckedUpdateInput }),
    prisma.purchaseItem.deleteMany({ where: { id: { in: removedItems.map((i) => i.id) } } }),
    // A product taken off the purchase retires its warehouse stock for this lot.
    prisma.warehouseItem.updateMany({
      where: { productId: { in: droppedProductIds }, lotNumber: existing.lotNumber, ...notDeleted() },
      data: { deletedAt: now },
    }),
    ...(lotNumber !== existing.lotNumber
      ? [
          prisma.warehouseItem.updateMany({
            where: { lotNumber: existing.lotNumber, ...notDeleted() },
            data: { lotNumber },
          }),
        ]
      : []),
    ...items.map((item) =>
      item.id && existingItemIds.has(item.id)
        ? prisma.purchaseItem.update({ where: { id: item.id }, data: itemData(item) })
        : prisma.purchaseItem.create({ data: { ...itemData(item), purchaseId: id } }),
    ),
    prisma.purchasePayment.updateMany({ where: { id: { in: removedPaymentIds } }, data: { deletedAt: now } }),
    ...payments.map((pay) =>
      pay.id && existingPaymentIds.has(pay.id)
        ? prisma.purchasePayment.update({ where: { id: pay.id }, data: paymentData(pay) })
        : prisma.purchasePayment.create({ data: { ...paymentData(pay), purchaseId: id } }),
    ),
  ]);

  await syncPurchaseWarehouse(id);
  for (const productId of droppedProductIds) {
    await recalculateProduct(productId);
  }

  return (await getPurchaseDetail(id))!;
}

export async function deletePurchase(id: number) {
  const purchase = await prisma.purchase.findFirst({ where: { id, ...notDeleted() } });
  if (!purchase) throw new ApiError("Purchase not found.", 404);

  const lotItems = await prisma.warehouseItem.findMany({
    where: { lotNumber: purchase.lotNumber },
    select: { productId: true },
  });

  await prisma.$transaction([
    prisma.purchase.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.warehouseItem.updateMany({
      where: { lotNumber: purchase.lotNumber, ...notDeleted() },
      data: { deletedAt: new Date() },
    }),
  ]);

  for (const productId of new Set(lotItems.map((i) => i.productId))) {
    await recalculateProduct(productId);
  }
}
