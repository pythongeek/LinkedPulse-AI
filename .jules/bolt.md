## 2025-02-17 - Prisma Schema Introspection
**Learning:** When inspecting large schemas like `backend/prisma/schema.prisma`, output truncation easily happens even with `grep -A 50`. We must use more targeted slice scripts or complete reads to ensure all fields are grounded when suggesting optimisations (like omit constraints)
**Action:** Use inline node scripts or complete `cat` combined with exact matching to verify field presence before adding to omission lists.
