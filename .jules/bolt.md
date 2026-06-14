## 2024-06-14 - Prisma omit feature optimization
**Learning:** Prisma models in this repository (e.g., Content, Topic, Persona) contain large JSON fields (like researchData, linkedinOptimization). Using findMany without omit or select causes over-fetching. Prisma ^6.2.1 natively supports the 'omit' feature in queries to easily prevent over-fetching.
**Action:** Use `omit` when making list API queries to avoid fetching heavy JSON fields that aren't needed.
