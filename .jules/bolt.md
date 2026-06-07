## 2026-06-07 - [Prisma JSON field over-fetching]
**Learning:** Prisma models in this repo (Content, Topic) contain very large JSON fields. Simple `findMany` queries for lists can inadvertently pull massive amounts of JSON data, causing significant memory pressure on the Node server and slow query/network times.
**Action:** Always use Prisma 'select' or 'omit' when querying list endpoints for models with large JSON fields.
