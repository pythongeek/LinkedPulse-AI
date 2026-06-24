
## 2024-06-24 - Omit large JSON fields in Prisma list queries
**Learning:** Prisma models with large JSON fields (e.g. `researchData`, `linkedinOptimization`, `systemPrompt`) cause significant over-fetching and memory/network bottlenecks when retrieving list views via `findMany`.
**Action:** Always comprehensively trace the frontend usage of a list endpoint's payload, and then use Prisma's `omit` feature in `findMany` queries to explicitly exclude large text/JSON fields that are not rendered in the list UI.
