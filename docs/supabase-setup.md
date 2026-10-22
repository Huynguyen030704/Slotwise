# Supabase setup

One-time setup for accounts and sync (Milestone 2). Project ref: `jqagldnizixhiwdgofdf`.

## 1. App configuration

Create `apps/mobile/.env.local` (never commit it) with the **origin only**, no path:

```
EXPO_PUBLIC_SUPABASE_URL=https://jqagldnizixhiwdgofdf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Project Settings > API Keys>
```

The app strips a trailing `/rest/v1/` if you paste the REST endpoint, but keep the file clean. The publishable key is safe in the app because RLS protects the data. Never put the `service_role` or secret key in the app.

## 2. Apply the schema and deploy the function (Supabase CLI)

```bash
npx supabase login
npx supabase link --project-ref jqagldnizixhiwdgofdf
npx supabase db push
npx supabase functions deploy delete-account
```

`db push` applies `supabase/migrations/*.sql`. `delete-account` uses the secret keys Supabase injects into Edge Functions automatically.

## 3. Google sign-in

1. In Google Cloud Console, create an OAuth client of type **Web application**. Add this authorized redirect URI: `https://jqagldnizixhiwdgofdf.supabase.co/auth/v1/callback`.
2. In the Supabase dashboard open Authentication > Providers > Google, enable it, and paste the client ID and secret.
3. In Authentication > URL Configuration add these redirect URLs:
   - `slotwise://auth/callback` (phone app)
   - `http://localhost:8081` and `http://localhost:8081/**` (web in development)
   - your production web origin, when you have one
4. Keep Site URL set to your real web origin (or `http://localhost:8081` while developing).

## 4. Before launch

- Turn on **Confirm email** in Authentication > Providers > Email.
- Review the rate limits in Authentication > Rate Limits.
