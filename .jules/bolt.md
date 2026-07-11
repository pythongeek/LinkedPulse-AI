## 2025-02-13 - [React Query Default Stale Time]
**Learning:** React Query defaults to a 0ms stale time, which causes unnecessary background refetches on window focus or component remount. This was wasting network requests and database queries on the Content History page.
**Action:** Always evaluate if a `staleTime` parameter should be added to `useQuery` hooks, especially for data that rarely changes without user action.
