import { apiFetch } from "@/lib/apiFetch";
import { getApiBase } from "@/lib/api-config";

export async function getTopProducts() {
  try {
    const data = await apiFetch(`${getApiBase()}/products/`);
    return data.results ?? data;
  } catch (error) {
    console.error("Error fetching top products:", error);
    return [];
  }
}
