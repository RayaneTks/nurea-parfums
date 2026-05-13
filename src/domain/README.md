# Domain layer

Pure types and business logic. No I/O, no React, no Prisma.

- `money.ts` — Money type + arithmetic. Never use `number` for currency.
- `ids.ts` — Branded ID types. Use parsers at boundaries.
- `order-status.ts` — OrderStatus state machine. Exhaustive switch.
- `payment.ts` — Payment types + balance calculation (added in P6).
- `kpi.ts` — KPI value objects (added in P8).

Rules:
- Pure functions only.
- All exports typed.
- Tested in Vitest (`__tests__/`).
- Import zero from `@/db`, `@/server`, `@/ui`. Domain depends on nothing.
