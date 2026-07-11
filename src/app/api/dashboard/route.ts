import { NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/route-handler";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const GET = withAuth(async () => {
  const data = await getDashboardData();
  return ok(data);
});
