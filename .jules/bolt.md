## 2025-06-29 - [Omit Large Fields in Prisma `findMany`]
**Learning:** [Prisma models in this repository (e.g., Content, Topic, Persona) contain large JSON fields (like researchData, linkedinOptimization). Using `findMany` without explicitly omitting these fields causes severe over-fetching, leading to memory and network bottlenecks.]
**Action:** [Always use `select` or `omit` (natively supported in Prisma ^6.2.1) in `findMany` queries for list endpoints to prevent over-fetching, ensuring only necessary fields are returned.]
