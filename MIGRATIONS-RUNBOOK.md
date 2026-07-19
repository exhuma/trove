# Migrations bootstrap runbook (throwaway — delete when done)

One-time steps to adopt the new Supabase migrations against the **existing live
project**. The repo has `supabase/config.toml` and the baseline migration
`supabase/migrations/20260718215432_initial_schema.sql`. There is no local Docker
stack — migrations apply straight to the live project. Delete this file once the
checklist is green; the durable docs live in [`supabase/README.md`](./supabase/README.md).

## Prerequisites
- `SUPABASE_ACCESS_TOKEN` in your shell (Account → Access Tokens).
- Your project ref (Project Settings → General → Reference ID).
- The DB password (you'll be prompted on `link` / `push`).

## 1. Link the CLI to the live project
```sh
npx supabase link --project-ref <ref>
```

## 2. Mark the baseline as already applied (do NOT re-run it)
The live DB already contains this schema, so record the baseline as applied in the
remote migration history instead of executing it:
```sh
npx supabase migration repair --status applied 20260718215432
```

## 3. Confirm history is in sync
```sh
task db:status      # npx supabase migration list --linked
```
Both Local and Remote columns should show `20260718215432`, and `task db:push`
should report nothing pending. If push wants to apply the baseline, step 2 didn't
take — re-run it.

## From here on
- New schema change: `task db:new -- <name>` → write the SQL → `task db:push`.
- `task deploy` still never touches the DB.

## ✅ Done?
- [ ] `task db:status` shows the baseline applied on both local and remote
- [ ] `task db:push` reports nothing pending
- [ ] Delete this file.
