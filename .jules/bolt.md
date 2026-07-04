## 2025-02-27 - [Initialization]
**Learning:** Initializing bolt journal.
**Action:** Ready to log optimizations.

## 2025-02-27 - [Prisma Omit Optimization]
**Learning:** Prisma models (like Content) may contain large JSON fields (e.g., researchData, linkedinOptimization) which are often not needed in list views. In Prisma ^6.2.1, the omit feature effectively prevents over-fetching these large blobs.
**Action:** Always consider using omit or select in findMany queries that return lists of rows with large JSON fields to reduce DB load and network payload size.
