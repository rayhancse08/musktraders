import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);
  const existingOld = await prisma.user.findUnique({ where: { email: "admin@kdelight.com" } });
  if (existingOld) {
    await prisma.user.update({
      where: { id: existingOld.id },
      data: { email: "admin@nextera.com", passwordHash },
    });
  }
  const admin = await prisma.user.upsert({
    where: { email: "admin@nextera.com" },
    update: { passwordHash },
    create: {
      username: "admin",
      email: "admin@nextera.com",
      passwordHash,
    },
  });
  console.log("Created admin user:", admin.email);

  const brands = await Promise.all([
    prisma.brand.upsert({ where: { id: 1 }, update: {}, create: { name: "Premium Foods" } }),
    prisma.brand.upsert({ where: { id: 2 }, update: {}, create: { name: "Fresh Harvest" } }),
    prisma.brand.upsert({ where: { id: 3 }, update: {}, create: { name: "Golden Spice" } }),
  ]);

  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { slug: "snacks" },
      update: {},
      create: { name: "Snacks", slug: "snacks", isFeatured: true },
    }),
    prisma.productCategory.upsert({
      where: { slug: "beverages" },
      update: {},
      create: { name: "Beverages", slug: "beverages", isFeatured: false },
    }),
    prisma.productCategory.upsert({
      where: { slug: "spices" },
      update: {},
      create: { name: "Spices", slug: "spices", isFeatured: true },
    }),
  ]);

  const billingCompany = await prisma.billingCompany.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "KDelight Trading Co." },
  });

  const vendor = await prisma.vendor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Global Import Ltd.",
      phoneNumber: "+880-1711-000000",
      email: "orders@globalimport.com",
      address: "Dhaka, Bangladesh",
    },
  });

  const store = await prisma.store.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "City Mart",
      city: "Dhaka",
      phoneNumber: "+880-1811-000000",
      email: "citymart@store.com",
      address: "Gulshan, Dhaka",
      discountType: "percentage",
      discount: 5,
    },
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: "premium-biscuits" },
      update: {},
      create: {
        name: "Premium Biscuits",
        slug: "premium-biscuits",
        brandId: brands[0].id,
        categoryId: categories[0].id,
        packetPerCarton: 24,
        weight: 500,
        unit: "gm",
        purchasePrice: 120.0,
        salePrice: 150.0,
        packetPrice: 6.25,
        stockedQuantity: 100,
        stockedPacketQuantity: 2400,
        discountType: "percentage",
        discount: 0,
      },
    }),
    prisma.product.upsert({
      where: { slug: "green-tea" },
      update: {},
      create: {
        name: "Green Tea",
        slug: "green-tea",
        brandId: brands[1].id,
        categoryId: categories[1].id,
        packetPerCarton: 48,
        weight: 250,
        unit: "gm",
        purchasePrice: 80.0,
        salePrice: 110.0,
        packetPrice: 2.29,
        stockedQuantity: 200,
        stockedPacketQuantity: 9600,
        discountType: "percentage",
        discount: 0,
      },
    }),
    prisma.product.upsert({
      where: { slug: "turmeric-powder" },
      update: {},
      create: {
        name: "Turmeric Powder",
        slug: "turmeric-powder",
        brandId: brands[2].id,
        categoryId: categories[2].id,
        packetPerCarton: 36,
        weight: 1,
        unit: "kg",
        purchasePrice: 200.0,
        salePrice: 280.0,
        packetPrice: 7.78,
        stockedQuantity: 50,
        stockedPacketQuantity: 1800,
        discountType: "percentage",
        discount: 0,
      },
    }),
  ]);

  await prisma.warehouseItem.upsert({
    where: { id: 1 },
    update: {},
    create: {
      productId: products[0].id,
      lotNumber: "LOT-2026-001",
      productPrice: 120,
      purchasedPrice: 120,
      profitPercentage: 25,
      salePrice: 150,
      stockedQuantity: 100,
      remainingQuantity: 100,
      remainingPacketQuantity: 2400,
    },
  });

  const taxCategories = await Promise.all([
    prisma.taxCategory.upsert({ where: { id: 1 }, update: {}, create: { name: "VAT" } }),
    prisma.taxCategory.upsert({ where: { id: 2 }, update: {}, create: { name: "Income Tax" } }),
  ]);

  const taxCompany = await prisma.taxCompany.upsert({
    where: { id: 1 },
    update: {},
    create: { name: "KDelight Trading Co." },
  });

  const cashInCategories = await Promise.all([
    prisma.cashInCategory.upsert({ where: { id: 1 }, update: {}, create: { name: "Sales Revenue" } }),
    prisma.cashInCategory.upsert({ where: { id: 2 }, update: {}, create: { name: "Other Income" } }),
  ]);

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  await prisma.monthlyPlan.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: { year, month, salesTarget: 500000, budget: 100000 },
  });

  await prisma.yearlyPlan.upsert({
    where: { year },
    update: {},
    create: { year, salesTarget: 6000000, budget: 1200000 },
  });

  console.log("Seed completed successfully!");
  console.log("Login: admin@nextera.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
