## 2024-05-30 - Memoization of heavy string processing in React

**Learning:** Component rendering in `ContentStudio` can cause frequent re-renders of child components like `ContentHealthScore` and `PrePublishChecklist`. These components perform expensive regular expression matches, array mapping, and string manipulation for algorithm validation. Running these on every render, even when the content string is unchanged, is a significant React performance anti-pattern.
**Action:** When creating text-validation or analysis components that rely on heavy regex or looping string methods, wrap the results in `useMemo` dependent on the input text so that parent state updates (like tab switching or polling) do not trigger expensive string operations.
