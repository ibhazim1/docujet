import LoginPageView from "@/components/pages/LoginPage";

/**
 * The staff sign-in screen.
 *
 * A thin route over the real form, which lives in
 * `src/components/pages/LoginPage.tsx` because it is also registered with
 * Plasmic (see `plasmic-init.ts`) so Studio can compose it. It signs in with
 * `supabase.auth.signInWithPassword` through the browser client and then
 * `router.refresh()`es, which is what lets the proxy see the new session
 * cookie on the next request.
 *
 * Deliberately NOT wrapped in `PublicPlasmicPage` like the other public
 * routes: that composition root renders the site navbar and footer around its
 * own `<main>`, and this screen is a standalone full-viewport layout that
 * brings its own. Wrapping it would nest `<main>` inside `<main>` and frame a
 * sign-in box with marketing navigation.
 *
 * Route protection is the other half of this, in `src/proxy.ts`: a visitor
 * without a session is bounced from /admin to here, and one who already has a
 * session is bounced from here to /admin.
 */
export default function LoginRoute() {
  return <LoginPageView />;
}
