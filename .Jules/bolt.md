## 2024-05-24 - Prisma FindMany/Count Concurrent Execution
**Learning:** Sequential \`prisma.findMany()\` and \`prisma.count()\` queries in pagination endpoints present a common performance bottleneck.
**Action:** Always combine them into a concurrent execution block using \`Promise.all\` when extracting the \`where\` clause to run them simultaneously and reduce endpoint latency.
