# ryndendesign portfolio

A responsive portfolio for ryndendesign, featuring [InsurancePro](https://www.insurancepro.es/).

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

## Search visibility

The site includes a descriptive page title and meta description, canonical URL, social sharing image, WebSite structured data, robots.txt and a single-page sitemap. These currently use the Cloudflare Workers address. Update all canonical, sitemap and social URLs when a custom domain is connected.

## Private enquiry inbox

Open `/admin` on the live site and sign in with the admin password supplied privately to the site owner. The Worker stores only a SHA-256 hash of this high-entropy password as a Cloudflare secret, and signs an eight-hour, HttpOnly, Secure, SameSite=Strict session cookie with a separate secret. Login attempts are rate-limited. The inbox lists the latest 50 enquiries per page from Supabase and supports searching the current page, refreshing, replying by email, and signing out. The admin page and API responses are marked not to be indexed or cached.

The credentials are `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` in Cloudflare Worker secrets. To rotate access, create a new strong random password, hash it with SHA-256, and replace `ADMIN_PASSWORD_HASH` through Wrangler secret input. Rotate `ADMIN_SESSION_SECRET` to invalidate existing sessions. Do not commit either secret or the plain password.
