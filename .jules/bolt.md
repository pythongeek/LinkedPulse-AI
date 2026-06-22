## 2024-01-28 - Prevent Prisma Over-fetching with Omit
**Learning:** In list endpoints like `/api/content`, `/api/trends/opportunities`, and `/api/persona`, Prisma's `findMany` over-fetches large fields like `researchData` or `experienceVault` by default, leading to network and memory bottlenecks.
**Action:** Always use Prisma's native `omit` feature (supported in >= 6.2.1) in list endpoints to drop large JSON or text fields that are not used by the frontend listing views.
