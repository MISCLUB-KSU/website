# Database schema

These migrations are the **source of truth** for the database. They were
exported from the live Supabase project on 14 Aug 2026 and verified byte-for-byte
against `supabase_migrations.schema_migrations` (md5 match on all seven).

Comments inside the SQL are in Arabic, like the rest of the codebase.

## What they build

| Migration | What it does |
|---|---|
| `20260808001950_applications_and_staff` | The two tables, their indexes, and the email-normalizing trigger |
| `20260808002029_rls_scope_isolation` | Turns on RLS and adds the scope policies — **the real security boundary** |
| `20260808002048_cv_private_bucket` | The private `cv` storage bucket, deliberately with no read policies |
| `20260808002142_harden_helper_functions` | Moves the `security definer` helpers out of `public` (they were reachable over PostgREST) and rebuilds the policies on them |
| `20260808215417_direct_links_source_and_dedupe` | `source` column and the two partial unique indexes that stop duplicate applications |
| `20260810121328_status_referred_to_second_choice` | Adds the `referred` status |
| `20260810170911_add_club_experience_to_applications` | Club-experience question, with a consistency constraint |

## Applying them to a fresh project

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Then seed at least one row in `staff` so someone can enter `/admin`:

```sql
insert into public.staff (email, role, label)
values ('someone@ksu.edu.sa', 'admin', 'رئاسة النادي');
```

## Keeping this in sync

Migrations applied through the Supabase dashboard **do not appear here on their
own.** After any schema change, export it back into this folder — otherwise the
repository drifts from the database and this file starts lying.

```bash
npx supabase db diff -f <name>
```

## Two things worth knowing before you change anything

**RLS is the security boundary, not the UI.** The `/admin` guard in
`src/middleware.ts` only saves someone an empty page. If you weaken these
policies, every leader can read every applicant's national ID and phone number.

**The `cv` bucket has no read policies on purpose.** Downloads are authorized in
`src/app/admin/cv/[id]/route.ts` using the caller's own session, and only then
signed with a one-minute URL. Adding a "read for authenticated users" policy
would hand every leader every CV.
