## 2024-06-08 - [Prisma JSON Omit]
**Learning:** Prisma models with large JSON fields (like Content, Topic, Persona) can cause over-fetching and memory/network bottlenecks when used in list endpoints.
**Action:** Always use `omit` in `findMany` queries for list endpoints to prevent over-fetching.
