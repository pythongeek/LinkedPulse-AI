## 2025-02-17 - Optimize Content Fetching with Prisma Omit
**Learning:** Prisma models (e.g., Content, Topic, Persona) in this codebase contain several large JSON fields (like `researchData`, `linkedinOptimization`, etc.). Fetching these in list endpoints (`findMany`) can cause significant memory and network overhead.
**Action:** Always use the `omit` feature in Prisma's `findMany` queries for list endpoints to prevent over-fetching these large JSON fields, ensuring fast response times and lower memory usage.
