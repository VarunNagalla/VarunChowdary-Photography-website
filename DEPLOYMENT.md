# VC Photography Deployment

## Supabase

Create a new Supabase project, then run the SQL files in `supabase/migrations` in filename order.

Create the only admin user in Supabase Auth:

- Email: `varunchowdary3345@gmail.com`
- Password: choose a strong password in the Supabase dashboard

Disable public signups in Supabase Auth settings. The website also removes signup UI, and database policies only allow this email to edit content.

## GitHub Secrets

Add these repository secrets before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Publish

Push to `main`. GitHub Actions builds `.output/public`, adds the Pages fallback, and publishes:

`https://varunnagalla.github.io/VarunChowdary-Photography-website/`

Admin sign-in:

`https://varunnagalla.github.io/VarunChowdary-Photography-website/auth`
