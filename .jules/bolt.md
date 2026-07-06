## 2024-07-06 - Prisma JSON Omit in Content List
**Learning:** Found that `GET /api/content` returned multiple heavy JSON fields like `researchData`, `linkedinOptimization`, and `competitiveAnalysis` even though the frontend components like `ContentHistory.tsx` and `Dashboard.tsx` only use basic properties (title, type, status, prediction) from list payloads.
**Action:** Use Prisma native `omit` for list queries that fetch records with large JSON fields in this codebase to save memory and network payload.
