import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAILS = ["admin@nextera.com", "admin@kdelight.com"];

async function main() {
  console.log("Resetting all data except admin user...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      sale_payments,
      sale_items,
      sales,
      purchase_payments,
      purchase_items,
      purchases,
      warehouse_items,
      return_products,
      damage_products,
      tax_items,
      monthly_tax_files,
      cash_in_items,
      monthly_cash_in_files,
      warehouse_cost_items,
      monthly_warehouse_costs,
      products,
      brands,
      product_categories,
      stores,
      vendors,
      billing_companies,
      tax_categories,
      tax_companies,
      cash_in_categories,
      monthly_plans,
      yearly_plans,
      monthly_reports,
      yearly_reports
    RESTART IDENTITY CASCADE
  `);

  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { notIn: ADMIN_EMAILS } },
  });

  const adminUsers = await prisma.user.findMany({
    where: { email: { in: ADMIN_EMAILS } },
    select: { id: true, email: true, username: true },
  });

  console.log(`Deleted ${deletedUsers.count} non-admin user(s).`);
  console.log(
    adminUsers.length
      ? `Kept admin: ${adminUsers.map((u) => u.email).join(", ")}`
      : "Warning: no admin user found. Run npm run db:seed to create one.",
  );
  console.log("Database reset complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
