# ryndendesign portfolio

A responsive portfolio for ryndendesign, featuring [InsurancePro](https://www.insurancepro.es/) and a Hole in the Wall Mexican restaurant website concept.

## Local preview

```sh
npm install
npm run dev
```

The portfolio is a Cloudflare Worker with static assets in `public/` and a contact endpoint in `src/index.js`.

## Contact form setup

The form sends enquiries to the Cloudflare Worker, which stores them in the linked Supabase project. Setup completed:

1. Apply the contact table and service grant migrations in `supabase/migrations/` to the selected Supabase project.
2. Set `SUPABASE_URL` in Cloudflare Worker configuration and `SUPABASE_SECRET_KEY` as a Cloudflare Worker secret. Never put the secret key in this repository or browser code.
3. Enable the form script in `public/index.html` and verify a submission returns 201.

The database table has row level security enabled and grants no access to anonymous or authenticated browser clients. The Worker validates requests, limits submissions, and writes to Supabase with a server-side secret. The inbox recipient is not stored in the site.

Supabase stores enquiries but does not send arbitrary contact-form email through its built-in Auth mail service. Email notifications require a separate connection, such as authorized Gmail API access.

## Deployment

```sh
npm run deploy
```

The Cloudflare configuration is in `wrangler.jsonc`. The contact form is active and stores enquiries privately.
