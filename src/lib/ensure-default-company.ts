import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/api-utils";
import { DEFAULT_COMPANY_NAME } from "@/lib/default-company";

export async function ensureBillingCompany() {
  const existing = await prisma.billingCompany.findFirst({
    where: {
      ...notDeleted(),
      name: { equals: DEFAULT_COMPANY_NAME, mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return prisma.billingCompany.create({ data: { name: DEFAULT_COMPANY_NAME } });
}

export async function ensureTaxCompany() {
  const existing = await prisma.taxCompany.findFirst({
    where: {
      ...notDeleted(),
      name: { equals: DEFAULT_COMPANY_NAME, mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return prisma.taxCompany.create({ data: { name: DEFAULT_COMPANY_NAME } });
}
