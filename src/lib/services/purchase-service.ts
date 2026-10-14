import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { effectiveCartonPrice, purchaseLineTotal, roundTo } from "../purchase-math";
import { dec, decOrNull, dateStr, isoDate, num } from "./helpers";
import type { Purchase, PurchaseItem, PurchasePayment, Vendor, Product } from "@prisma/client";

type PurchaseWithRelations = Purchase & {
  vendor?: Vendor | null;
  purchaseItems: (PurchaseItem & { product: Product })[];
  purchasePayments: PurchasePayment[];
};

function calcPurchaseItem(item: PurchaseItem & { product: Product }) {
  const ppc = item.product.packetPerCarton ?? 1;
  const unitPrice = num(item.unitPrice);
  const purchased = item.purchasedCarton;
  const cartonPrice = effectiveCartonPrice(
    item.cartonPrice == null ? null : num(item.cartonPrice),
    unitPrice,
    ppc,
  );
  const lineTotal = purchaseLineTotal(cartonPrice, purchased);
  const pieceUnitPrice = ppc ? cartonPrice / ppc : unitPrice;
  const totalUnitPrice = unitPrice * purchased;
  const profitPct = num(item.profitPercentage);
  const salePrice = pieceUnitPrice * (1 + profitPct / 100);
  const totalPrice = salePrice * purchased * ppc;
  const cbm = item.cbm == null ? null : num(item.cbm);
  const cbmTotal = cbm == null ? 0 : roundTo(cbm * purchased, 4);
  return { totalUnitPrice, cartonPrice, lineTotal, salePrice, totalPrice, cbm, cbmTotal };
}

export function purchaseItemsTotal(items: (PurchaseItem & { product: Product })[]) {
  return roundTo(items.reduce((sum, item) => sum + calcPurchaseItem(item).lineTotal, 0), 2);
}

function calcPurchaseTotals(p: PurchaseWithRelations) {
  let totalProductPrice = 0;
  let totalCarton = 0;
  let totalCbm = 0;
  let expectedSales = 0;

  for (const item of p.purchaseItems) {
    const calc = calcPurchaseItem(item);
    totalProductPrice += calc.lineTotal;
    totalCarton += item.purchasedCarton;
    totalCbm += calc.cbmTotal;
    expectedSales += calc.totalPrice;
  }
  totalProductPrice = roundTo(totalProductPrice, 2);
  totalCbm = roundTo(totalCbm, 4);

  const overhead =
    num(p.shippingCost) + num(p.foodQualityControlCost) + num(p.containerClearingCost) +
    num(p.loryShippingCost) + num(p.labourerHandlingCost) + num(p.warehouseRent) +
    num(p.employeeSalary) + num(p.warehouseOtherCost) + num(p.cartonHandlingCost);

  const totalPurchaseCost = totalProductPrice + overhead;
  const payment = p.purchasePayments.reduce((s, pay) => s + num(pay.amount), 0);
  const expectedProfit = expectedSales - totalPurchaseCost;

  return { totalProductPrice, totalPurchaseCost, totalCarton, totalCbm, payment, paymentDue: totalPurchaseCost - payment, expectedSales, expectedProfit };
}

function parseCartonPrice(item: Record<string, unknown>) {
  const raw = parseFloat(String(item.carton_price ?? ""));
  return Number.isFinite(raw) ? roundTo(raw, 8) : null;
}

function parseCbm(item: Record<string, unknown>) {
  const raw = parseFloat(String(item.cbm ?? ""));
  return Number.isFinite(raw) ? roundTo(raw, 4) : null;
}

function purchaseItemData(item: Record<string, unknown>) {
  return {
    productId: parseInt(item.product as string, 10),
    unitPrice: parseFloat((item.unit_price as string) || "0"),
    cartonPrice: parseCartonPrice(item),
    cbm: parseCbm(item),
    purchasedCarton: parseInt((item.purchased_carton as string) || "0", 10),
    receivedCarton: item.received_carton ? parseInt(item.received_carton as string, 10) : null,
    damagedCarton: item.damaged_carton ? parseInt(item.damaged_carton as string, 10) : null,
    profitPercentage: item.profit_percentage ? parseFloat(item.profit_percentage as string) : null,
  };
}

export function serializePurchase(p: PurchaseWithRelations) {
  const t = calcPurchaseTotals(p);
  return {
    id: p.id,
    lot_number: p.lotNumber,
    date: dateStr(p.date),
    receive_date: dateStr(p.receiveDate),
    vendor: p.vendorId,
    vendor_name: p.vendor?.name ?? null,
    total_product_price: dec(t.totalProductPrice),
    total_purchase_cost: dec(t.totalPurchaseCost),
    total_carton: t.totalCarton,
    total_cbm: dec(t.totalCbm),
    payment: dec(t.payment),
    payment_due: dec(t.paymentDue),
    expected_sales: dec(t.expectedSales),
    expected_profit: dec(t.expectedProfit),
  };
}

export function serializePurchaseDetail(p: PurchaseWithRelations) {
  return {
    ...serializePurchase(p),
    vendor_phone: p.vendor?.phoneNumber ?? null,
    vendor_email: p.vendor?.email ?? null,
    vendor_address: p.vendor?.address ?? null,
    shipping_cost: dec(p.shippingCost),
    food_quality_control_cost: dec(p.foodQualityControlCost),
    container_clearing_cost: dec(p.containerClearingCost),
    lory_shipping_cost: dec(p.loryShippingCost),
    labourer_handling_cost: dec(p.labourerHandlingCost),
    warehouse_rent: dec(p.warehouseRent),
    employee_salary: dec(p.employeeSalary),
    warehouse_other_cost: dec(p.warehouseOtherCost),
    profit_margin: decOrNull(p.profitMargin),
    carton_handling_cost: dec(p.cartonHandlingCost),
    lc_information: p.lcInformation,
    bil_information: p.bilInformation,
    container_information: p.containerInformation,
    purchase_items: p.purchaseItems.map((item) => {
      const calc = calcPurchaseItem(item);
      return {
        id: item.id,
        product: item.productId,
        product_name: item.product.name,
        product_weight: Number(item.product.weight),
        product_unit: item.product.unit,
        packet_per_carton: item.product.packetPerCarton ?? 1,
        unit_price: dec(item.unitPrice),
        total_unit_price: dec(calc.totalUnitPrice),
        carton_price: String(roundTo(calc.cartonPrice, 8)),
        carton_total_price: dec(calc.lineTotal),
        line_total: dec(calc.lineTotal),
        cbm: calc.cbm == null ? null : String(calc.cbm),
        cbm_total: dec(calc.cbmTotal),
        purchased_carton: item.purchasedCarton,
        received_carton: item.receivedCarton,
        damaged_carton: item.damagedCarton,
        profit_percentage: decOrNull(item.profitPercentage),
        sale_price: dec(calc.salePrice),
        total_price: dec(calc.totalPrice),
      };
    }),
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

export async function listPurchases(params: { search?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };
  if (params.search) {
    where.OR = [
      { lotNumber: { contains: params.search, mode: "insensitive" } },
      { vendor: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [items, count] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        vendor: true,
        purchaseItems: { include: { product: true } },
        purchasePayments: { where: notDeleted() },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchase.count({ where }),
  ]);

  return { results: items.map(serializePurchase), count };
}

export async function getPurchaseDetail(id: number) {
  return prisma.purchase.findFirst({
    where: { id, ...notDeleted() },
    include: {
      vendor: true,
      purchaseItems: { include: { product: true } },
      purchasePayments: { where: notDeleted() },
    },
  });
}

export async function createPurchase(body: Record<string, unknown>) {
  const items = (body.purchase_items as Record<string, unknown>[]) ?? [];

  return prisma.purchase.create({
    data: {
      lotNumber: (body.lot_number as string) || `LOT-${Date.now()}`,
      date: body.date ? new Date(body.date as string) : null,
      receiveDate: body.receive_date ? new Date(body.receive_date as string) : null,
      vendorId: body.vendor ? parseInt(body.vendor as string, 10) : null,
      shippingCost: parseFloat((body.shipping_cost as string) || "0"),
      foodQualityControlCost: parseFloat((body.food_quality_control_cost as string) || "0"),
      containerClearingCost: parseFloat((body.container_clearing_cost as string) || "0"),
      loryShippingCost: parseFloat((body.lory_shipping_cost as string) || "0"),
      labourerHandlingCost: parseFloat((body.labourer_handling_cost as string) || "0"),
      warehouseRent: parseFloat((body.warehouse_rent as string) || "0"),
      employeeSalary: parseFloat((body.employee_salary as string) || "0"),
      warehouseOtherCost: parseFloat((body.warehouse_other_cost as string) || "0"),
      profitMargin: body.profit_margin ? parseFloat(body.profit_margin as string) : null,
      cartonHandlingCost: parseFloat((body.carton_handling_cost as string) || "0"),
      lcInformation: (body.lc_information as string) || null,
      bilInformation: (body.bil_information as string) || null,
      containerInformation: (body.container_information as string) || null,
      purchaseItems: {
        create: items.map(purchaseItemData),
      },
    },
    include: {
      vendor: true,
      purchaseItems: { include: { product: true } },
      purchasePayments: true,
    },
  });
}

export async function updatePurchase(id: number, body: Record<string, unknown>) {
  const items = body.purchase_items as Record<string, unknown>[] | undefined;
  await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });

  const data: Record<string, unknown> = {};
  const fields: [string, string][] = [
    ["lot_number", "lotNumber"], ["date", "date"], ["receive_date", "receiveDate"],
    ["shipping_cost", "shippingCost"], ["food_quality_control_cost", "foodQualityControlCost"],
    ["container_clearing_cost", "containerClearingCost"], ["lory_shipping_cost", "loryShippingCost"],
    ["labourer_handling_cost", "labourerHandlingCost"], ["warehouse_rent", "warehouseRent"],
    ["employee_salary", "employeeSalary"], ["warehouse_other_cost", "warehouseOtherCost"],
    ["carton_handling_cost", "cartonHandlingCost"],
  ];

  for (const [apiKey, dbKey] of fields) {
    if (body[apiKey] !== undefined) {
      if (apiKey === "date" || apiKey === "receive_date") {
        data[dbKey] = body[apiKey] ? new Date(body[apiKey] as string) : null;
      } else {
        data[dbKey] = parseFloat(body[apiKey] as string);
      }
    }
  }
  if (body.vendor !== undefined) data.vendorId = body.vendor ? parseInt(body.vendor as string, 10) : null;
  if (body.lot_number) data.lotNumber = body.lot_number;
  if (body.profit_margin !== undefined) data.profitMargin = body.profit_margin ? parseFloat(body.profit_margin as string) : null;
  if (body.lc_information !== undefined) data.lcInformation = body.lc_information;
  if (body.bil_information !== undefined) data.bilInformation = body.bil_information;
  if (body.container_information !== undefined) data.containerInformation = body.container_information;

  if (items) {
    data.purchaseItems = {
      create: items.map(purchaseItemData),
    };
  }

  return prisma.purchase.update({
    where: { id },
    data,
    include: {
      vendor: true,
      purchaseItems: { include: { product: true } },
      purchasePayments: { where: notDeleted() },
    },
  });
}
