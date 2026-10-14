export const DEFAULT_COMPANY_NAME = "Musk Traders";

export function defaultCompanyId(companies: { id: number; name: string }[]) {
  const match = companies.find(
    (company) => company.name.trim().toLowerCase() === DEFAULT_COMPANY_NAME.toLowerCase(),
  );
  return match ? String(match.id) : "";
}
