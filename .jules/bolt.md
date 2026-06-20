## 2024-05-24 - Prisma findMany omit functionality
**Learning:** Using Prisma `omit` to exclude large JSON fields from `findMany` on list endpoints is a safe and effective performance optimization. The omitted fields must not be referenced by the frontend code that consumes the list endpoint payload, otherwise it causes a regression.
**Action:** Always comprehensively trace the usage of the endpoint payload in the codebase before assuming it is safe to omit fields.
