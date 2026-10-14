import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, created } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { isoDate } from "@/lib/services/helpers";
import { ensureTaxCompany } from "@/lib/ensure-default-company";

export const GET = withAuth(async () => {
  await ensureTaxCompany();
  const items = await prisma.taxCompany.findMany({ where: notDeleted(), orderBy: { name: "asc" } });
  return ok(items.map((c) => ({
    id: c.id, name: c.name, created: isoDate(c.createdAt), updated: isoDate(c.updatedAt),
  })));
});

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseJson<{ name?: string }>(req);
  const company = await prisma.taxCompany.create({ data: { name: body.name ?? "" } });
  return created({ id: company.id, name: company.name, created: isoDate(company.createdAt), updated: isoDate(company.updatedAt) });
});
