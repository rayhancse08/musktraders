import { prisma } from "../prisma";
import { notDeleted } from "../api-utils";
import { dec, decOrNull, dateStr, isoDate, num } from "./helpers";
import type { WarehouseItem, Product } from "@prisma/client";

type WarehouseWithProduct = WarehouseItem & { product: Product };

export function serializeWarehouseItem(w: WarehouseWithProduct) {
  const ppc = w.product.packetPerCarton ?? 1;
  const stocked = w.stockedQuantity ?? 0;
  const totalPurchased = num(w.purchasedPrice) * stocked;
  const expectedSale = num(w.salePrice) * stocked;
  const totalSale = num(w.salePrice) * (w.saleQuantity ?? 0);

  return {
    id: w.id,
    product: w.productId,
    product_name: w.product.name,
    packet_per_carton: ppc,
    lot_number: w.lotNumber,
    sale_price: decOrNull(w.salePrice),
    purchased_price: decOrNull(w.purchasedPrice),
    stocked_quantity: w.stockedQuantity,
    damaged_quantity: w.damagedQuantity,
    sale_quantity: w.saleQuantity,
    sale_packet_quantity: w.salePacketQuantity,
    remaining_quantity: w.remainingQuantity,
    remaining_packet_quantity: w.remainingPacketQuantity,
    return_quantity: w.returnQuantity,
    product_price: decOrNull(w.productPrice),
    carton_handling_cost: decOrNull(w.cartonHandlingCost),
    profit_percentage: decOrNull(w.profitPercentage),
    manual_remaining_quantity: w.manualRemainingQuantity,
    total_purchased_price: dec(totalPurchased),
    expected_total_sale_price: dec(expectedSale),
    total_sale_price: dec(totalSale),
    created: isoDate(w.createdAt),
    updated: isoDate(w.updatedAt),
  };
}

export async function listWarehouse(params: { search?: string; lot?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };
  if (params.lot) where.lotNumber = { contains: params.lot, mode: "insensitive" };
  if (params.search) {
    where.product = { name: { contains: params.search, mode: "insensitive" } };
  }

  const [items, count] = await Promise.all([
    prisma.warehouseItem.findMany({
      where,
      include: { product: true },
      orderBy: { id: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.warehouseItem.count({ where }),
  ]);

  return { results: items.map(serializeWarehouseItem), count };
}

export async function createWarehouseItem(body: Record<string, unknown>) {
  const stocked = parseInt((body.stocked_quantity as string) || "0", 10);
  const damaged = parseInt((body.damaged_quantity as string) || "0", 10);
  const manualRemaining = body.manual_remaining_quantity
    ? parseInt(body.manual_remaining_quantity as string, 10)
    : null;

  return prisma.warehouseItem.create({
    data: {
      productId: parseInt(body.product as string, 10),
      lotNumber: (body.lot_number as string) || null,
      productPrice: parseFloat((body.product_price as string) || "0"),
      cartonHandlingCost: parseFloat((body.carton_handling_cost as string) || "0"),
      purchasedPrice: parseFloat((body.purchased_price as string) || "0"),
      profitPercentage: body.profit_percentage ? parseFloat(body.profit_percentage as string) : null,
      salePrice: body.sale_price ? parseFloat(body.sale_price as string) : null,
      stockedQuantity: stocked,
      damagedQuantity: damaged,
      remainingQuantity: manualRemaining ?? stocked - damaged,
      manualRemainingQuantity: manualRemaining,
    },
    include: { product: true },
  });
}

export async function updateWarehouseItem(id: number, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (body.product) data.productId = parseInt(body.product as string, 10);
  if (body.lot_number !== undefined) data.lotNumber = body.lot_number;
  if (body.product_price !== undefined) data.productPrice = parseFloat(body.product_price as string);
  if (body.carton_handling_cost !== undefined) data.cartonHandlingCost = parseFloat(body.carton_handling_cost as string);
  if (body.purchased_price !== undefined) data.purchasedPrice = parseFloat(body.purchased_price as string);
  if (body.profit_percentage !== undefined) data.profitPercentage = body.profit_percentage ? parseFloat(body.profit_percentage as string) : null;
  if (body.stocked_quantity !== undefined) data.stockedQuantity = parseInt(body.stocked_quantity as string, 10);
  if (body.damaged_quantity !== undefined) data.damagedQuantity = parseInt(body.damaged_quantity as string, 10);
  if (body.manual_remaining_quantity !== undefined) {
    data.manualRemainingQuantity = parseInt(body.manual_remaining_quantity as string, 10);
    data.remainingQuantity = parseInt(body.manual_remaining_quantity as string, 10);
  }

  return prisma.warehouseItem.update({
    where: { id },
    data,
    include: { product: true },
  });
}
