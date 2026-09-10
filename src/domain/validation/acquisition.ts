import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COMPANY_SIZES = ["1-5", "6-15", "16-50", "51+"] as const;
export const TRIAL_APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export const DEMO_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;

const optionalText = (max: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().max(max).optional());

const honeypotFields = {
  website: z.string().max(0).optional().default(""),
  formStartedAt: z.number().int().optional(),
};

export const trialApplicationSubmitSchema = z.object({
  companyName: z.string().trim().min(2, "Shkruani emrin e kompanisë.").max(160),
  phone: z.string().trim().min(6, "Shkruani telefonin.").max(40),
  country: z.string().trim().min(2, "Shkruani shtetin.").max(80),
  companySize: z.enum(COMPANY_SIZES),
  // The key is genuinely optional: a server action drops `undefined` values, so
  // this preprocess must treat a MISSING key the same as "" / null. Coercing an
  // absent value with Number() yields NaN, which slipped past the optional inner
  // schema and reached the integer column as "NaN".
  offersPerMonth: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().int().min(0).max(100000).optional(),
  ),
  message: optionalText(1000),
  ...honeypotFields,
});
export type TrialApplicationSubmitInput = z.infer<typeof trialApplicationSubmitSchema>;

export const demoRequestSubmitSchema = z.object({
  name: z.string().trim().min(2, "Shkruani emrin tuaj.").max(120),
  companyName: z.string().trim().min(2, "Shkruani emrin e kompanisë.").max(160),
  email: z.string().trim().email("Shkruani një email të vlefshëm.").max(180),
  phone: z.string().trim().min(6, "Shkruani telefonin.").max(40),
  country: z.string().trim().min(2, "Shkruani shtetin.").max(80),
  message: optionalText(1000),
  ...honeypotFields,
});
export type DemoRequestSubmitInput = z.infer<typeof demoRequestSubmitSchema>;

export const reviewTrialApplicationSchema = z.object({
  id: z.string().regex(UUID_RE, "Kërkesë e pavlefshme."),
  decision: z.enum(["approved", "rejected"]),
  internalReviewNote: z.string().trim().max(2000).optional().default(""),
});
export type ReviewTrialApplicationInput = z.infer<typeof reviewTrialApplicationSchema>;

export const retryTrialApplicationProvisioningSchema = z.object({
  id: z.string().regex(UUID_RE, "Kërkesë e pavlefshme."),
});
export type RetryTrialApplicationProvisioningInput = z.infer<typeof retryTrialApplicationProvisioningSchema>;

export const setDemoRequestStatusSchema = z.object({
  id: z.string().regex(UUID_RE, "Demo e pavlefshme."),
  status: z.enum(DEMO_REQUEST_STATUSES),
});
export type SetDemoRequestStatusInput = z.infer<typeof setDemoRequestStatusSchema>;
