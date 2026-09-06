# Tidyline Ghana — React + Supabase + Vercel

New Ghana-base React/Vite project. It is intentionally separate from the older PHP build.

## Start in VS Code
1. Extract/open this folder.
2. Run `npm install`.
3. Create `.env.local` from `.env.example` and enter your new Supabase URL + anon/publishable key.
4. In Supabase SQL Editor, paste the CONTENTS of `supabase/schema.sql` and run it. Do not paste the filename.
5. Run `npm run dev`.
6. Push to GitHub and import into Vercel. Add the same environment variables in Vercel.

## Design
Soft blue/white gradient, mobile-first responsive layout, Ghana service areas, GHS pricing, WhatsApp support, public booking and booking lookup.

## Images
The landing page and service cards include Black cleaning professionals and Black workplace/cleaning imagery. The current images are hosted image URLs to keep the starter ZIP small. For production, replace them with licensed/local assets in `public/images`.

## Next expansion
Admin authentication, complete operations dashboard, clients, staff, availability, transport costs, profit, payroll, reports, invoices, audit trail, secure RLS and WhatsApp schedule generation.
