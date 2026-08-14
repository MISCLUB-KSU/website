# MIS Club — King Saud University

The official website of the Management Information Systems Club: information
pages, a three-step membership application, and a review dashboard behind a
login.

**Production:** <https://misclubksu.com>

> This file is the entry point for whoever maintains this site next. The code
> itself is heavily documented **in Arabic** — every non-obvious decision has
> its reasoning written directly above it. So if a line looks strange, read the
> comment above it before changing it: most of them were written after a bug we
> actually hit.

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind v4 + design tokens in `src/app/globals.css` |
| Data & auth | Supabase (Postgres + Auth + Storage) |
| Email | Resend |
| Validation | Zod — **one** schema shared by browser and server |
| Motion | Motion, plus three.js in a single place |

---

## Running locally

Requires **Node 20 or newer** (tested on 24).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

The public site runs with no environment variables at all. What needs them:
`/join` (saving applications) and `/admin` (login and review).

### Environment variables

| Variable | Why | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project endpoint | No application is saved, `/admin` won't open |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public key | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — uploads attachments and signs their URLs | CV uploads fail |
| `RESEND_API_KEY` | Application-received and result emails | **Nothing breaks** — a warning is logged, no mail is sent |
| `RESEND_FROM` | Sender, on a domain verified in Resend | Sending is rejected |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses every security policy. Never put it in
> a `NEXT_PUBLIC_` variable and never commit it. `.env.local` is gitignored.

---

## Where everything lives

```
src/
├── app/            Routes (App Router)
│   ├── join/       Application form — three steps in a single <form>
│   ├── admin/      Review dashboard, behind login, with its own visual system
│   └── globals.css Design tokens and global classes
├── components/     ui/ primitives · site/ page sections · leadership/ org-chart scene
├── content/        ⬅ ALL site content, as TypeScript files
├── lib/            Validation · Supabase · email · bidirectional-text isolation
└── middleware.ts   Refreshes the admin session, guards /admin
```

### Routes

| Public | Protected |
|---|---|
| `/` · `/about` · `/about/structure` · `/about/partnerships` | `/admin` — review dashboard |
| `/committees` · `/committees/[slug]` | `/admin/login` — request a login link |
| `/projects` · `/projects/[slug]` | |
| `/achievements` · `/posts` · `/posts/[slug]` | |
| `/faq` · `/contact` | |
| `/join` · `/join/[...to]` — apply directly to one team | |

---

## Editing content — the most common task

**There is no CMS.** Content lives as TypeScript files in `src/content/`, and
pages read from them. Changing a sentence or adding a committee means editing a
file and committing it.

| To change | Edit |
|---|---|
| Committees, their units, and their leaders' questions | `committees.ts` |
| Projects and initiatives | `projects.ts` |
| Org chart | `leadership.ts` · `people.ts` |
| FAQ | `faq.ts` |
| Achievements · alumni · announcements | `achievements.ts` · `alumni.ts` · `announcements.ts` |
| Navigation and footer | `navigation.ts` |
| Contact email and social accounts | `contact.ts` |
| Application options and their order | `preferences.ts` |

**Opening and closing applications** is the `isOpen` flag on a committee, unit,
or project in its own file. The UI derives the state from it — it is not written
anywhere else.

---

## Database and the review dashboard

**Two tables in Supabase:**

| Table | Holds |
|---|---|
| `applications` | Student applications, including `cv_path` pointing at the attachment |
| `staff` | Who may enter the dashboard, their email, and **what scope they can see** |

**Storage bucket:** `cv` — **private**, with no read policies. Downloading a CV
goes through a route that first authorizes using the user's own session, then
signs a URL that expires after one minute.

**Login is a magic link, no password:** the dashboard shows student national IDs
and phone numbers, and one shared password spreads through WhatsApp with no way
to tell who used it. Revoking access is deleting a row from `staff`.

> ⚠️ **The `/admin` guard in the middleware is convenience, not security.** The
> real boundary is Supabase RLS: anyone reaching it without permission gets an
> empty page because the query returns nothing. **So do not weaken RLS assuming
> the middleware is enough.**

---

## Conventions that will bite you

**1. Direction (RTL) — the single most frequent bug here.**
Pages are `dir="rtl" lang="ar"`. Every Latin string, number, or code identifier
must be wrapped in `dir="ltr" lang="en"` or passed through `isolateLatin` from
`@/lib/bidi` — otherwise it renders reversed, or its digits turn Arabic-Indic.

⚠️ A subtle trap: logical properties (`ms-*`, `border-s-*`) follow **their own
element's** direction, not the page's. On an element marked `dir="ltr"` they land
on the opposite side, silently.

**2. Colors are tokens that flip with the theme.** Never write a `#hex` in a
component. And testing in one theme **lies** — many bugs here passed in light
mode by accident and failed in dark. Measure contrast in both.

**3. The slant is a signature, not a background.** Use it in only a few places
per screen.

**4. Before blaming a visual bug on the design, check the class exists at all:**

```bash
grep -E "^\.<name>[[:space:],:{>]" src/app/globals.css
```

A repository restore dropped some classes while components still document them
as present.

**5. Mobile first.** The site was built for desktop and then re-done for mobile.
It has its own motion layer in `components/site/mobile-motion.tsx` behind
`useIsMobile` — and desktop must not shift by a hair because of it.

---

## Before any commit

```bash
npx tsc --noEmit && npm run lint
```

Both must come out clean.

---

## Known gaps — for whoever comes next

| Gap | Impact |
|---|---|
| **The database schema is not in the repository** | No `.sql`, no migrations. Tables and policies exist only in the Supabase dashboard, so anyone setting up a fresh environment **cannot recreate it from here**. Export it into `supabase/migrations/` at the first opportunity. |
| **No tests** | Neither unit nor E2E. Verification is manual, in the browser. |
| **No CI** | `tsc` and `eslint` are run by hand. |
| **Deployment is undocumented** | The domain `misclubksu.com` works; where it is hosted and which variables are set there are not written down here. |
| **Safe areas untested** | `viewport-fit=cover` is enabled and the classes are in place, but it has never been checked on a real notched device. |

---

## About names

**No personal names appear in anything this project produces** — not in pages,
not in documents, and not in their metadata. Use the role, not the person: "the
technical team", "club management".

The reason is not secrecy: the club outlives the members who serve in it, and
material tied to a person gets tied down with them.
