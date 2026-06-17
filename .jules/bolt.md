
## 2024-06-17 - Prevent Prisma Over-fetching with `omit`
**Learning:** In list endpoints, Prisma's `findMany` queries by default over-fetch all columns. This creates significant memory and network bottlenecks when models (like `Content`, `Topic`, `Persona`) contain large JSON or Text fields (e.g., `researchData`, `linkedinOptimization`, `experienceVault`).
**Action:** Always use Prisma's `omit` feature (supported in ^6.2.1) in `findMany` queries for list endpoints to explicitly exclude large JSON or Text fields that are only needed in detailed views.
