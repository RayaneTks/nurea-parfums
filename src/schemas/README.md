# Schemas (Zod)

Single source of truth for runtime validation. Used by:
- Server actions and API routes (input validation)
- Forms (react-hook-form resolver or manual parse)
- API response shapes (parse before trusting)

Inferred TS types via `z.infer<typeof Schema>`. Don't duplicate types — derive them.
