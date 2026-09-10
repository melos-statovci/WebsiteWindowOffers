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

  it("redirects protected tenant and platform routes without a session cookie", () => {
    for (const pathname of ["/dashboard", "/projects", "/platform", "/application-status", "/en/application-status"]) {
      const response = proxy(request(pathname));
      expect(response.headers.get("location")).toBe(`https://kornizo.test/sign-in`);
    }
  });
});
