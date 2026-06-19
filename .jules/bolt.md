## 2024-06-19 - Content List Endpoint Over-fetching
**Learning:** The `Content` model in Prisma has exceptionally large nested JSON fields (`researchData`, `linkedinOptimization`, etc.) that were being fully fetched by default in list views like `GET /api/content`. This creates a silent memory bottleneck and inflates network payloads significantly.
**Action:** Always check `schema.prisma` for models with large `Json` fields and use Prisma's `omit` feature (available in Prisma 6+) for all list/`findMany` endpoints querying those models to prevent systemic over-fetching.
