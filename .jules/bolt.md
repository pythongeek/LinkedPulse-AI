## 2024-05-18 - Over-fetching Large JSON Data Fields
**Learning:** List endpoints fetching Prisma models (like `Content`) that contain large unstructured JSON fields (`outline`, `researchData`, etc.) suffer significant memory allocation and network payload overhead when these fields are blindly queried with `findMany` but not consumed on the frontend.
**Action:** Always comprehensively review the frontend consumption of the payload and enforce the `omit` block on `findMany` operations on list endpoints for any non-essential large JSON fields to drastically reduce payload sizes.
