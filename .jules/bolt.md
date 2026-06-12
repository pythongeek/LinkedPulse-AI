## 2025-06-12 - Prisma Omit Feature for List Views
**Learning:** This codebase contains Prisma models (like `Content`) with very large JSON fields (`researchData`, `linkedinOptimization`, etc) that are fetched by default in `findMany` queries for list views, causing severe memory overhead and payload bloat. The backend uses Prisma ^6.2.1 which supports `omit`.
**Action:** When implementing list endpoints using Prisma in this repo, always use `omit` (or `select`) to exclude large JSON/Text fields that aren't rendered in the list view.
