import { prisma } from "../prisma";
import { notDeleted, slugify } from "../api-utils";
import { idsSortedByName, inSortedOrder } from "../name-order";
import { dec, decOrNull, dateStr, isoDate } from "./helpers";
import type { Product, Brand, ProductCategory } from "@prisma/client";

type ProductWithRelations = Product & {
  brand?: Brand | null;
  category?: ProductCategory | null;
};

export function serializeProduct(p: ProductWithRelations) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.image,
    thumbnail: p.thumbnail,
    brand: p.brandId,
    brand_name: p.brand?.name ?? null,
    category: p.categoryId,
    category_name: p.category?.name ?? null,
    packet_per_carton: p.packetPerCarton,
    weight: Number(p.weight),
    unit: p.unit,
    stocked_quantity: p.stockedQuantity,
    stocked_packet_quantity: p.stockedPacketQuantity,
    purchase_price: decOrNull(p.purchasePrice),
    sale_price: decOrNull(p.salePrice),
    packet_price: decOrNull(p.packetPrice),
    discount_type: p.discountType,
    discount: decOrNull(p.discount),
    discount_price: p.discountPrice ? Number(p.discountPrice) : null,
  };
}

export function serializeProductDetail(p: ProductWithRelations) {
  return {
    ...serializeProduct(p),
    description: p.description,
    manual_entry: p.manualEntry,
    created: isoDate(p.createdAt),
    updated: isoDate(p.updatedAt),
  };
}

export async function recalculateProduct(productId: number) {
  const items = await prisma.warehouseItem.findMany({
    where: { productId, ...notDeleted() },
  });

  let stockedQty = 0;
  let stockedPackets = 0;
  let totalPurchase = 0;
  let totalSale = 0;
  let totalPackets = 0;

  const product = await prisma.product.findFirst({ where: { id: productId, ...notDeleted() } });
  const ppc = product?.packetPerCarton ?? 1;

  for (const item of items) {
    stockedQty += item.stockedQuantity ?? 0;
    stockedPackets += (item.stockedQuantity ?? 0) * ppc;
    totalPurchase += Number(item.purchasedPrice ?? 0) * (item.stockedQuantity ?? 0);
    totalSale += Number(item.salePrice ?? 0) * (item.stockedQuantity ?? 0);
    totalPackets += (item.stockedQuantity ?? 0) * ppc;
  }

  const purchasePrice = stockedQty > 0 ? totalPurchase / stockedQty : 0;
  const salePrice = stockedQty > 0 ? totalSale / stockedQty : 0;
  const packetPrice = totalPackets > 0 ? totalSale / totalPackets : 0;

  return prisma.product.update({
    where: { id: productId },
    data: {
      stockedQuantity: stockedQty,
      stockedPacketQuantity: stockedPackets,
      purchasePrice,
      salePrice,
      packetPrice,
    },
    include: { brand: true, category: true },
  });
}

export async function listProducts(params: { search?: string; category?: string; page?: number }) {
  const page = params.page ?? 1;
  const pageSize = 20;
  const where: Record<string, unknown> = { ...notDeleted() };

  if (params.search) {
    where.name = { contains: params.search, mode: "insensitive" };
  }
  if (params.category) {
    where.categoryId = parseInt(params.category, 10);
  }

  const categoryId = params.category ? parseInt(params.category, 10) : undefined;
  const skip = (page - 1) * pageSize;
  const [ids, count] = await Promise.all([
    idsSortedByName("products", {
      search: params.search,
      categoryId: categoryId != null && !Number.isNaN(categoryId) ? categoryId : undefined,
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  const items = ids.length
    ? await prisma.product.findMany({
        where: { id: { in: ids } },
        include: { brand: true, category: true },
      })
    : [];

  return { results: inSortedOrder(ids, items).map(serializeProduct), count };
}

export async function autocompleteProducts(q: string) {
  const ids = await idsSortedByName("products", { search: q, take: 20 });
  const items = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } } })
    : [];
  return inSortedOrder(ids, items).map((p) => ({
    id: p.id,
    name: p.name,
    stocked_quantity: p.stockedQuantity ?? 0,
    packet_price: decOrNull(p.packetPrice),
    sale_price: decOrNull(p.salePrice),
    packet_per_carton: p.packetPerCarton ?? 1,
  }));
}

export function serializeCategory(c: ProductCategory & { _count?: { products: number } }) {
  return {
    id: c.id,
    name: c.name,
    image: c.image,
    is_featured: c.isFeatured,
    slug: c.slug,
    product_count: c._count?.products,
  };
}

export async function listCategories() {
  const ids = await idsSortedByName("product_categories");
  const items = ids.length
    ? await prisma.productCategory.findMany({
        where: { id: { in: ids } },
        include: { _count: { select: { products: { where: notDeleted() } } } },
      })
    : [];
  return inSortedOrder(ids, items).map(serializeCategory);
}

export async function createProductFromForm(fd: FormData) {
  const name = fd.get("name") as string;
  const brandId = fd.get("brand") ? parseInt(fd.get("brand") as string, 10) : null;
  const categoryId = fd.get("category") ? parseInt(fd.get("category") as string, 10) : null;

  return prisma.product.create({
    data: {
      name,
      slug: slugify(name),
      brandId,
      categoryId,
      description: (fd.get("description") as string) || null,
      packetPerCarton: fd.get("packet_per_carton") ? parseInt(fd.get("packet_per_carton") as string, 10) : null,
      weight: parseFloat((fd.get("weight") as string) || "0"),
      unit: (fd.get("unit") as "pcs") || "pcs",
      discountType: (fd.get("discount_type") as "percentage") || "percentage",
      discount: parseFloat((fd.get("discount") as string) || "0"),
      manualEntry: fd.get("manual_entry") === "true",
    },
    include: { brand: true, category: true },
  });
}

export async function updateProductFromForm(id: number, fd: FormData) {
  const data: Record<string, unknown> = {};
  if (fd.has("name")) {
    const name = fd.get("name") as string;
    data.name = name;
    data.slug = slugify(name);
  }
  if (fd.has("brand")) data.brandId = fd.get("brand") ? parseInt(fd.get("brand") as string, 10) : null;
  if (fd.has("category")) data.categoryId = fd.get("category") ? parseInt(fd.get("category") as string, 10) : null;
  if (fd.has("description")) data.description = (fd.get("description") as string) || null;
  if (fd.has("packet_per_carton")) data.packetPerCarton = parseInt(fd.get("packet_per_carton") as string, 10);
  if (fd.has("weight")) data.weight = parseFloat(fd.get("weight") as string);
  if (fd.has("unit")) data.unit = fd.get("unit");
  if (fd.has("discount_type")) data.discountType = fd.get("discount_type");
  if (fd.has("discount")) data.discount = parseFloat(fd.get("discount") as string);
  if (fd.has("manual_entry")) data.manualEntry = fd.get("manual_entry") === "true";

  return prisma.product.update({
    where: { id },
    data,
    include: { brand: true, category: true },
  });
}
