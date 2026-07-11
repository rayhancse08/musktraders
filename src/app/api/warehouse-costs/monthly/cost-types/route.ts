import { withAuth, ok } from "@/lib/route-handler";
import { COST_TYPE_LABELS } from "@/lib/services/common-service";

export const GET = withAuth(async () => {
  const results = Object.entries(COST_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  return ok(results);
});
