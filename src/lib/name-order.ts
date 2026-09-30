import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TABLES = {
  stores: Prisma.raw("stores"),
  brands: Prisma.raw("brands"),
  vendors: Prisma.raw("vendors"),
  products: Prisma.raw("products"),
  product_categories: Prisma.raw("product_categories"),
} as const;

const NAME_SORT = Prisma.raw(`btrim(translate(regexp_replace(
  name,
  '^[' || chr(9) || chr(10) || chr(13) || chr(32) || chr(160) || chr(8203) || chr(8206) || chr(8207) || chr(65279) || ']+',
  ''
), chr(1040)||chr(1072)||chr(1042)||chr(1045)||chr(1077)||chr(1050)||chr(1082)||chr(1052)||chr(1053)||chr(1054)||chr(1078)||chr(1056)||chr(1088)||chr(1057)||chr(1089)||chr(1058)||chr(1061)||chr(1093),
'AaBEeKkMHOoPpCcTXx')) COLLATE "en-US-x-icu"`);

export type NameSortedTable = keyof typeof TABLES;

/**
 * Dictionary order (a, b, c … z). The database default collation is C.UTF-8,
 * which sorts uppercase letters before lowercase, so "al Markaz" falls after "Desi".
 */
export async function idsSortedByName(
  table: NameSortedTable,
  opts: { search?: string; categoryId?: number; skip?: number; take?: number } = {},
): Promise<number[]> {
  const search = opts.search?.trim();
  const skip = opts.skip ?? 0;

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM ${TABLES[table]}
    WHERE deleted_at IS NULL
      ${search ? Prisma.sql`AND name ILIKE ${"%" + search + "%"}` : Prisma.empty}
      ${opts.categoryId != null ? Prisma.sql`AND category_id = ${opts.categoryId}` : Prisma.empty}
    ORDER BY ${NAME_SORT} ASC NULLS LAST, id ASC
    ${opts.take != null ? Prisma.sql`LIMIT ${opts.take} OFFSET ${skip}` : Prisma.empty}
  `;

  return rows.map((row) => Number(row.id));
}

export function inSortedOrder<T extends { id: number }>(ids: number[], rows: T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
