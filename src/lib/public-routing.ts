export type PublicLocale = "sq" | "en";

export const defaultPublicLocale: PublicLocale = "sq";
export const supportedPublicLocales: PublicLocale[] = ["sq", "en"];

export function localizedPath(locale: PublicLocale, pathname: string): string {
  const cleanPath = pathname === "/en" ? "/" : pathname.replace(/^\/en(?=\/)/, "");
  if (locale === "sq") return cleanPath || "/";
  if (cleanPath === "/") return "/en";
  return `/en${cleanPath}`;
}

export function alternateLocale(locale: PublicLocale): PublicLocale {
  return locale === "sq" ? "en" : "sq";
}
