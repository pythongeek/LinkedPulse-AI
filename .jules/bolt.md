## 2025-02-18 - Optimized Prisma findMany queries
**Learning:** Over-fetching large JSON fields (like `researchData` or `linkedinData`) without explicit limits causes huge memory/network hits in APIs using Prisma. `findMany` queries must use `omit` for known large fields.
**Action:** Always check `schema.prisma` for JSON fields and use `omit` in `findMany` endpoints for list views to prevent performance bottlenecks.
