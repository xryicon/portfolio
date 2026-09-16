# ryndendesign portfolio

A responsive portfolio for ryndendesign, featuring [InsurancePro](https://www.insurancepro.es/) and [Blackwater Mafia](https://mafia.xryicon.workers.dev/).

## Local preview

```sh
npm install
npm run dev
```

The portfolio is a Cloudflare Worker with static assets in `public/` and a contact endpoint in `src/index.js`.

## Contact form setup

The form is disabled in the page until the private contact flow is connected. The intended flow is:

1. Apply `supabase/migrations/20260916000000_contact_enquiries.sql` to the selected Supabase project.
2. Set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as Cloudflare Worker secrets. Never put the secret key in this repository or browser code.
3. Enable the form script in `public/index.html` and test a submission.

The database table has row level security enabled and grants no access to anonymous or authenticated browser clients. The Worker validates requests, limits submissions, and writes to Supabase with a server-side secret. The inbox recipient is not stored in the site.

Supabase stores enquiries but does not send arbitrary contact-form email through its built-in Auth mail service. Email notifications require a separate connection, such as authorized Gmail API access.

## Deployment

```sh
npm run deploy
```

The Cloudflare configuration is in `wrangler.jsonc`. The site currently needs the contact flow connected before it should be used to accept enquiries.
