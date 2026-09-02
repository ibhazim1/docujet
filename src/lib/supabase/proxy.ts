import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminRoute = pathname.startsWith("/superadmin");
  const isLoginRoute = pathname === "/login";

  const cookiesToSet: CookieToSet[] = [];
  const projectUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Let public pages, including /login, render when the environment is not
  // configured. Protected pages are redirected below instead of crashing the
  // entire request in createServerClient.
  if (!projectUrl || !publishableKey) {
    if (isAdminRoute || isSuperadminRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  const supabase = createServerClient(
    projectUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          cookiesToSet.push(...nextCookies);
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims) && !error;

  if ((isAdminRoute || isSuperadminRoute) && !isAuthenticated) {
    return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
  }

  if (isAuthenticated && (isAdminRoute || isSuperadminRoute || isLoginRoute)) {
    const userId = data?.claims?.sub;
    if (!userId) {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if ((isAdminRoute || isSuperadminRoute) && (!profile || !profile.is_active)) {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    if (isSuperadminRoute && profile?.role !== "superadmin") {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), cookiesToSet);
    }

    if (isAdminRoute && profile?.role !== "admin" && profile?.role !== "superadmin") {
      return applyCookies(NextResponse.redirect(new URL("/login", request.url)), cookiesToSet);
    }

    if (isLoginRoute && profile?.is_active && (profile.role === "admin" || profile.role === "superadmin")) {
      return applyCookies(NextResponse.redirect(new URL("/admin", request.url)), cookiesToSet);
    }
  }

  return applyCookies(NextResponse.next({ request }), cookiesToSet);
}
