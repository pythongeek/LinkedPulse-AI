## 2026-06-04 - [Select Projection for Large JSON Fields]
**Learning:** [Prisma models in this repository (e.g., Content) contain large JSON blobs like researchData and linkedinOptimization. The default findMany behavior fetches all these fields indiscriminately, which creates significant memory and network overhead for list endpoints.]
**Action:** [Always use select projections in findMany queries for list endpoints to explicitly restrict the returned payload to only the scalar fields required for rendering.]
