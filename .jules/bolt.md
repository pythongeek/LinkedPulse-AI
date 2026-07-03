## 2024-05-24 - Prisma Omit Optimization
**Learning:** Prisma 6.2.1 natively supports `omit` in queries, making it easy to exclude large JSON fields from list endpoints without writing custom select statements for every other field.
**Action:** Use `omit` when making list endpoints faster to exclude specific large fields like `researchData` or `outline` from large payloads.
