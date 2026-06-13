## 2024-05-19 - Prevent over-fetching on large Prisma models
**Learning:** Prisma models in this repository (e.g., `Content`, `Topic`, `Persona`) contain large JSON and text fields (like `researchData`, `linkedinOptimization`, `trendData`, `experienceVault`, etc). Fetching these large fields in list endpoints (`findMany`) causes memory and network bottlenecks.
**Action:** Always use `select` or `omit` (which is natively supported by Prisma ^6.2.1 used here) in `findMany` queries for list endpoints to prevent over-fetching of these large JSON/Text fields.
