# Kraken V12.8 Profile and Membership Preparation

## Install

1. Run `database/v12-8-profile.sql` in Supabase SQL Editor.
2. Upload:
   - `profile-setup.html`
   - `profile-setup.js`
   - `profile.html`
   - `profile.js`
   - `profile.css`
3. Add a link to `profile.html` from the learner dashboard/menu.
4. After a successful signup, redirect new users to:
   `profile-setup.html`
5. Redeploy Cloudflare and clear the browser cache.

## Certificate name

Your current certificate code already checks `profiles.display_name`.
Once the learner saves this profile, that name will appear on newly issued certificates.

## Password changes

Password changes use Supabase Auth's secure `updateUser()` method.

## Delete button

A browser client must not contain the Supabase service-role key, so the button does not permanently delete the Auth user directly.

It:
- creates an `account_deletion_requests` row,
- marks the profile as deleted,
- signs the member out.

An administrator can then permanently delete the Auth account from Supabase Authentication, or a secure Edge Function can automate that later.

## Signup redirect example

After your existing signup succeeds, use:

```javascript
location.href = "profile-setup.html";
```
