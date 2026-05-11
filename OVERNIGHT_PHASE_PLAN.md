# Overnight Build Plan: Job Search OS

Goal: Continue from fixed Phase 14 and implement Phases 15-21 safely.

Rules:
- Work one phase at a time.
- Before coding, inspect the current codebase.
- Do not delete major files.
- Do not change auth, OAuth scopes, or production env behavior without explaining why.
- After each phase, run lint/typecheck/build if available.
- Commit after each successful phase.
- If tests fail and cannot be fixed quickly, stop and write a summary.
- Prioritize clean UI, stable MVP behavior, and simple reliable logic over overengineering.

Phases:
15. MVP Stability Pass
16. Gmail Sync Reliability
17. Email Classification
18. Job Application Tracker
19. Dashboard Command Center
20. Follow-Up System
21. AI Email Extraction

UI Goal:
Make the product feel like a polished modern productivity dashboard:
- clean sidebar/top nav
- soft cards
- strong empty states
- status badges
- clean spacing
- dashboard metrics
- loading/error/success states
- mobile responsive where reasonable
