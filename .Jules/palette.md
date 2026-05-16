## 2024-05-30 - Initial entry\n**Learning:** Started tracking UX/a11y learnings.\n**Action:** Add entries for specific component patterns.
## 2026-05-12 - Adding Tooltips to Icon-Only Buttons
**Learning:** Found out that Shadcn icon-only buttons (`<Button size="icon">`) are not automatically accessible. Wrapping them in `<TooltipTrigger asChild>` within a `<Tooltip>` and explicitly adding `aria-label` ensures they have accessible names and visual hover feedback.
**Action:** Always verify icon-only buttons include `aria-label` and wrap them in a Tooltip context for better UX/a11y.
