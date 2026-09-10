import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";

function request(pathname: string) {
  return new NextRequest(`https://kornizo.test${pathname}`, { method: "GET" });
}

describe("public/protected route proxy", () => {
  it("allows public marketing routes without a session cookie", () => {
    for (const pathname of ["/", "/en", "/request-trial", "/request-demo", "/en/request-trial", "/en/request-demo", "/sign-in", "/sign-up"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("allows the public contact page without a session cookie", () => {
    // /contact is both a public acquisition surface and the support fallback
    // when KORNIZO_SUPPORT_EMAIL is unset, so gating it would dead-end the very
    // people it exists for.
    for (const pathname of ["/contact", "/en/contact"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("keeps the demo request funnel public in both locales", () => {
    for (const pathname of ["/request-demo", "/en/request-demo"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("allows the public legal pages without a session cookie", () => {
    // A visitor deciding whether to sign up has to be able to read the privacy
    // policy and terms, and the public footer links to them.
    for (const pathname of ["/privacy", "/terms", "/en/privacy", "/en/terms"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("still redirects the tenant lifecycle pages without a session cookie", () => {
    // /trial-expired, /suspended and /account-not-ready describe a SIGNED-IN
    // account's state, so they must never be reachable anonymously.
    for (const pathname of ["/trial-expired", "/suspended", "/account-not-ready"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBe("https://kornizo.test/sign-in");
    }
  });

  it("redirects protected tenant and platform routes without a session cookie", () => {
    for (const pathname of ["/dashboard", "/projects", "/platform", "/application-status", "/en/application-status"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBe(`https://kornizo.test/sign-in`);
    }
  });
});
