# RC-05 — password recovery integration contract

Status: **OPEN. Required before real customer launch.** No production sender or domain has been selected. Pass 1 does not enable a nonfunctional reset UI, implement manual resets, or grant Platform Admin password overrides.

## Installed provider contract

Inspected Better Auth 1.6.27 in `node_modules/better-auth/dist/api/routes/password.mjs`, `node_modules/better-auth/dist/db/internal-adapter.mjs`, and `node_modules/@better-auth/core/dist/types/init-options.d.mts`. Implement against the installed version and rerun the tests below after any provider upgrade.

1. Configure `emailAndPassword.sendResetPassword: async ({ user, url, token }, request) => Promise<void>` in `src/auth/index.ts`. Deliver the provider-generated `url` to `user.email` through the selected transactional sender; the callback must await accepted delivery/queueing and report only a sanitized provider failure category. Never log the callback arguments, URL, token, recipient, request headers or provider request body. Escape any recipient name used in an HTML email. Do not build or store a parallel password token.
2. Set `resetPasswordTokenExpiresIn: 3600` explicitly (the current provider default) and `revokeSessionsOnPasswordReset: true`. Existing production reset sessions must be revoked; tenant/Platform role assignments remain untouched. Keep provider password hashing and configured password limits.
3. Add localized forgot-password forms calling `authClient.requestPasswordReset({ email, redirectTo: <fixed approved-origin localized reset page> })`. Known and unknown email addresses receive the same acknowledgement. Show a localized generic delivery error when the sender is unavailable; do not claim an email was delivered when it was not accepted.
4. The emailed provider callback `/api/auth/reset-password/:token?callbackURL=...` validates the token and trusted redirect origin, then redirects to the reset page with the token. The page calls `authClient.resetPassword({ newPassword, token })`. The provider atomically consumes the verification token and rejects expiration/replay, hashes the password, updates the credential account, and revokes sessions when configured. The page must use `Referrer-Policy: no-referrer`, exclude analytics/third-party assets, avoid persisting the token in localStorage, and remove the token from browser history after use.
5. Keep the provider's origin/CSRF checks and endpoint rate limits. Distributed budgets remain RC-14 work, not a replacement for provider limits. Only the final HTTPS application origin is a production trusted origin; no wildcard preview/localhost production trust.

## Inputs required before implementation can be completed

Approved production HTTPS domain and localized callback paths; transactional email provider and sender address; verified sending domain/DNS and provider credentials in server-only secret storage; provider retention/logging policy; approved SQ/EN email wording and recovery support process. Do not use a vendor's mailbox as Kornizo identity. No messages to real users are authorized by this document.

## Required release proof

Use a real approved test mailbox and production-equivalent sender: request, receive, open, reset, old-password rejection, new-password sign-in, existing-session revocation, replay rejection, expiration rejection, concurrent same-token single consumption, unknown-email indistinguishable acknowledgement, hostile callback rejection, localized accessible errors, sender-outage behavior, and token/PII-free server/provider logs. Validate correct account identity and unchanged memberships/Platform grants. Synthetic delivery-only mocks do not close RC-05.

Recovery remains OPEN until this complete delivery-to-login journey passes. Pass 2 / Milestone 6 preparation must explicitly schedule it before customer launch.
