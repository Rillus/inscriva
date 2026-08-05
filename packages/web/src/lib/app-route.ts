export type AppRoute = "welcome" | "download";

export function appRouteFromPathname(pathname: string): AppRoute {
  const normalised = pathname.replace(/\/+$/, "") || "/";
  return normalised === "/download" ? "download" : "welcome";
}

export function pathnameForAppRoute(route: AppRoute): string {
  return route === "download" ? "/download" : "/";
}

export function navigateAppRoute(route: AppRoute): void {
  if (typeof window === "undefined") return;
  const next = pathnameForAppRoute(route);
  if (window.location.pathname !== next) {
    window.history.pushState({}, "", next);
  }
}

export function readAppRoute(): AppRoute {
  if (typeof window === "undefined") return "welcome";
  return appRouteFromPathname(window.location.pathname);
}
