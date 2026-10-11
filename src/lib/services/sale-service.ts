import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { dec, decOrNull, dateStr, isoDate, monthDisplay, num, calcDiscount, pct } from "./helpers";
import { Decimal } from "@prisma/client/runtime/library";
import type { Sale, SaleItem, SalePayment, Store, BillingCompany, Product } from "@prisma/client";

type SaleWithRelations = Sale & {
  store: Store;
  billingCompany?: BillingCompany | null;
  saleItems: (SaleItem & { product: Product })[];
  salePayments: SalePayment[];
};

function calcSaleTotals(sale: SaleWithRelations) {
  let subTotal = 0;
  let totalPurchased = 0;

  for (const item of sale.saleItems) {
    const lineTotal = num(item.price) * item.quantity - num(item.discount);
    subTotal += lineTotal;
    totalPurchased += num(item.packetPrice) * item.quantity;
  }

  const discount = num(calcDiscount(
    new Decimal(subTotal),
    sale.discountType,
    sale.discountAmount
  ));
  const total = subTotal - discount + num(sale.shippingCharge);
  const payment = sale.salePayments.reduce((s, p) => s + num(p.amount), 0);
  const profit = total - totalPurchased;

  return { subTotal, discount, total, payment, paymentDue: total - payment, profit };
}

export function serializeSale(sale: SaleWithRelations) {
  const t = calcSaleTotals(sale);
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
    sub_total: dec(t.subTotal),
    discount: dec(t.discount),
    total: dec(t.total),
    payment: dec(t.payment),
    payment_due: dec(t.paymentDue),
    profit: dec(t.profit),
  };
}

export function serializeSaleDetail(sale: SaleWithRelations) {
  const t = calcSaleTotals(sale);
  return {
    ...serializeSale(sale),
    billing_company: sale.billingCompanyId,
    shipping_charge: dec(sale.shippingCharge),
    discount_type: sale.discountType,
    discount_amount: dec(sale.discountAmount),
    created: isoDate(sale.createdAt),
    sale_items: sale.saleItems.map((item) => {
      const lineTotal = num(item.price) * item.quantity - num(item.discount);
      const purchased = num(item.packetPrice) * item.quantity;
      return {
        id: item.id,
        product: item.productId,
        product_name: item.product.name,
        quantity: item.quantity,
        price: dec(item.price),
        packet_price: dec(item.packetPrice),
        discount: dec(item.discount),
        total_price: dec(lineTotal),
        total_purchased_price: dec(purchased),
        profit: dec(lineTotal - purchased),
        lot_information: item.lotInformation,
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

export async function listSales(params: { search?: string; status?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { orderNo: { contains: params.search, mode: "insensitive" } },
      { store: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [items, count] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        store: true,
        billingCompany: true,
        saleItems: { include: { product: true } },
        salePayments: { where: notDeleted() },
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ]);

  return { results: items.map(serializeSale), count };
}

export async function getSaleDetail(id: number) {
  return prisma.sale.findFirst({
    where: { id, ...notDeleted() },
    include: {
      store: true,
      billingCompany: true,
      saleItems: { include: { product: true } },
      salePayments: { where: notDeleted() },
    },
  });
}

export async function createSale(body: Record<string, unknown>) {
  const { generateOrderNo } = await import("../api-utils");
  const saleItems = (body.sale_items as Record<string, unknown>[]) ?? [];

  return prisma.sale.create({
    data: {
      orderNo: generateOrderNo(),
      date: new Date(body.date as string),
      deliveryDate: body.delivery_date ? new Date(body.delivery_date as string) : null,
      status: (body.status as "confirmed") ?? "confirmed",
      storeId: parseInt(body.store as string, 10),
      billingCompanyId: body.billing_company ? parseInt(body.billing_company as string, 10) : null,
      shippingCharge: parseFloat((body.shipping_charge as string) || "0"),
      discountType: (body.discount_type as "flat") ?? "flat",
      discountAmount: parseFloat((body.discount_amount as string) || "0"),
      saleItems: {
        create: saleItems.map((item) => ({
          productId: parseInt(item.product as string, 10),
          quantity: parseInt(item.quantity as string, 10),
          price: parseFloat((item.sale_price as string) || (item.price as string) || "0"),
          packetPrice: parseFloat((item.packet_price as string) || "0"),
          discount: parseFloat((item.discount as string) || "0"),
          lotInformation: (item.lot_information as string) || null,
        })),
      },
    },
    include: {
      store: true,
      billingCompany: true,
      saleItems: { include: { product: true } },
      salePayments: true,
    },
  });
}

export async function updateSale(id: number, body: Record<string, unknown>) {
  const saleItems = body.sale_items as Record<string, unknown>[] | undefined;

  await prisma.saleItem.deleteMany({ where: { saleId: id } });

  const data: Record<string, unknown> = {};
  if (body.date) data.date = new Date(body.date as string);
  if (body.delivery_date !== undefined) data.deliveryDate = body.delivery_date ? new Date(body.delivery_date as string) : null;
  if (body.status) data.status = body.status;
  if (body.store) data.storeId = parseInt(body.store as string, 10);
  if (body.billing_company !== undefined) data.billingCompanyId = body.billing_company ? parseInt(body.billing_company as string, 10) : null;
  if (body.shipping_charge !== undefined) data.shippingCharge = parseFloat(body.shipping_charge as string);
  if (body.discount_type) data.discountType = body.discount_type;
  if (body.discount_amount !== undefined) data.discountAmount = parseFloat(body.discount_amount as string);

  if (saleItems) {
    data.saleItems = {
      create: saleItems.map((item) => ({
        productId: parseInt(item.product as string, 10),
        quantity: parseInt(item.quantity as string, 10),
        price: parseFloat((item.sale_price as string) || (item.price as string) || "0"),
        packetPrice: parseFloat((item.packet_price as string) || "0"),
        discount: parseFloat((item.discount as string) || "0"),
        lotInformation: (item.lot_information as string) || null,
      })),
    };
  }

  return prisma.sale.update({
    where: { id },
    data,
    include: {
      store: true,
      billingCompany: true,
      saleItems: { include: { product: true } },
      salePayments: { where: notDeleted() },
    },
  });
}
