# Task Completion Checklist

After completing a coding task, run these checks:

1. **Type check**: `npm run check` - Ensure no TypeScript errors
2. **Lint**: `npm run lint` - Ensure no ESLint errors or warnings (--max-warnings=0)
3. **Test**: `npm test` - Ensure all tests pass
4. **Codegen** (if exports changed): `npm run codegen` - Regenerate index files for Effect packages

## Notes
- Lint is strict: zero warnings allowed
- Tests run concurrently by default (vitest sequence.concurrent: true)
- Tests are in `test/` directories within each package, matching `test/**/*.test.ts`
- If you modified domain models or API schemas, check both server and webui for breaking changes
