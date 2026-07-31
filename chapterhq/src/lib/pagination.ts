import { z } from "zod";

// ─── Shared Zod schema ───────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  sortBy: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// ─── Parsed params passed to repositories ────────────────────────────────────

export interface PaginationParams {
  search?: string;
  skip: number;
  take: number;
  sortBy?: string;
  order: "asc" | "desc";
}

// ─── Response envelope ───────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: T[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a validated PaginationQuery into PaginationParams for repositories. */
export function buildPaginationParams(query: PaginationQuery): PaginationParams {
  return {
    search: query.search,
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    sortBy: query.sortBy,
    order: query.order,
  };
}

/** Wrap raw repository results into a standard paginated envelope. */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  query: PaginationQuery
): PaginatedResult<T> {
  return {
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
    items,
  };
}

/** Build a Prisma-safe orderBy clause from optional sortBy / order params.
 *  Falls back to `fallbackField` when sortBy is not provided. */
export function buildOrderBy(
  sortBy: string | undefined,
  order: "asc" | "desc",
  fallbackField: string
): Record<string, "asc" | "desc"> {
  return { [sortBy ?? fallbackField]: order };
}

/** Parse and return pagination query params from a URL search params object. */
export function parsePaginationQuery(
  searchParams: URLSearchParams
): PaginationQuery {
  const raw = Object.fromEntries(searchParams.entries());
  return paginationQuerySchema.parse(raw);
}
