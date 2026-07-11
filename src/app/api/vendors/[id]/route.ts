import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, ok, noContent } from "@/lib/route-handler";
import { notDeleted, parseJson } from "@/lib/api-utils";
import { serializeVendor } from "@/lib/services/common-service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const vendor = await prisma.vendor.findFirst({ where: { id: parseInt(id, 10), ...notDeleted() } });
  if (!vendor) return NextResponse.json({ detail: "Not found." }, { status: 404 });
  return ok(serializeVendor(vendor));
});

export const PATCH = withAuth(async (req: NextRequest, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  const body = await parseJson<Record<string, string>>(req);
  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.phone_number !== undefined) data.phoneNumber = body.phone_number || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.address !== undefined) data.address = body.address || null;
  const vendor = await prisma.vendor.update({ where: { id: parseInt(id, 10) }, data });
  return ok(serializeVendor(vendor));
});

export const DELETE = withAuth(async (_req, ctx?: Ctx) => {
  const { id } = await ctx!.params;
  await prisma.vendor.update({ where: { id: parseInt(id, 10) }, data: { deletedAt: new Date() } });
  return noContent();
});
