# Authentication Technical Overview

This document provides a high-level technical overview of how authentication is currently implemented in the **PowerForecast** application.

## 1. Core Technologies
The authentication system is built using three primary layers:
- **Supabase Auth**: Serves as the backend identity provider and session manager. It handles user creation, password hashing, JWT token generation, and email verification.
- **Refine (`@refinedev/core`)**: The frontend framework that wraps authentication logic via an `AuthProvider` interface, providing easy-to-use hooks like `useLogin`, `useRegister`, `useLogout`, and routing protection.
- **Custom `authProvider.ts`**: The glue code (located at `src/providers/authProvider.ts`) that maps Refine's authentication hooks to the underlying Supabase Client API calls.

## 2. The Authentication Flow

### Registration (`useRegister` -> `authProvider.register`)
1. The user fills out the form in `SignupPage.tsx` (Email, Password, Name, Household Type).
2. The form calls the `register` function.
3. In `authProvider.ts`, `supabaseClient.auth.signUp()` is invoked. The user's email, password, and additional metadata are sent to the Supabase backend.
4. **Important**: By default, if "Email Confirmation" is OFF in Supabase, the backend instantly creates a session. We configure this flow so users confirm their email via a verification link.

### Login (`useLogin` -> `authProvider.login`)
1. The user enters their credentials in `LoginPage.tsx`.
2. The `login` function triggers `supabaseClient.auth.signInWithPassword()`.
3. If successful, Supabase returns a session object containing a JWT and the user's data.
4. The `authProvider` queries the `accounts` table in the database to fetch additional profile details.
5. A combined `activeUser` object is saved to `localStorage` (`powerforecast_active_user`), and Refine redirects the user to the `/dashboard`.

### Session Management (`authProvider.check` & `authProvider.getIdentity`)
- Refine automatically calls `check()` on protected routes to ensure the user is logged in. It does this by checking `supabaseClient.auth.getSession()`. If no valid session exists, the user is booted to `/login`.
- `getIdentity()` retrieves the active user's details to display in the UI (like their avatar and name in the header).

## 3. Supabase Database Schema Setup

If you need the database structure, the schema (tables, row level security policies, triggers, and functions) is included in the codebase.

To set up a fresh Supabase project:
1. Open the file `powerforecast_supabase_setup.sql` in the root of this project.
2. Go to your Supabase Project Dashboard.
3. On the left sidebar, click on **SQL Editor**.
4. Click **New Query**.
5. Copy the entire contents of `powerforecast_supabase_setup.sql` and paste it into the SQL Editor.
6. Click **Run**.
7. Once finished, your database will have all the necessary tables (`accounts`, `user_appliances`, etc.) configured.

## 4. How to Enable Real Email Verification in Supabase

To ensure users click a real verification link in their email before gaining access:
1. Go to your Supabase Project Dashboard (https://supabase.com/dashboard).
2. On the left sidebar, click on **Authentication**.
3. Under the Authentication menu, click on **Providers**.
4. Click on **Email** in the list of providers.
5. Toggle **Confirm email** to the **ON** position.
6. Click **Save**.

**Important: URL Redirect Configuration**
For the verification email link to correctly redirect back to the app (to the `/#/verified` success page):
1. In the Supabase Dashboard under **Authentication**, click on **URL Configuration**.
2. Under **Site URL**, make sure your base domain is set (e.g., `https://your-domain.com`).
3. Under **Redirect URLs**, click **Add URL** and add your specific return paths or wildcard (e.g. `https://your-domain.com/*`).
