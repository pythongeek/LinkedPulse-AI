## 2024-07-08 - Prisma Over-fetching in List Endpoints
**Learning:** The `Content` Prisma model in this codebase contains numerous large JSON fields (e.g., `outline`, `researchData`, `linkedinOptimization`, etc.). Fetching all these fields by default in list endpoints (`findMany`) causes unnecessary database load, memory bloat, and larger network payloads.
**Action:** Always use Prisma's `omit` feature (available in Prisma ^6.2.1) to explicitly exclude large JSON payload fields in `findMany` queries for list views, ensuring only essential metadata is fetched.
