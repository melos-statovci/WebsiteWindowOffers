import { z } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COMPANY_SIZES = ["1-5", "6-15", "16-50", "51+"] as const;
export const TRIAL_APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;

// One lifecycle for every inbound contact request, whatever its intent.
export const CONTACT_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;

// 'demo'    — the visitor wants Kornizo demonstrated before committing.
// 'general' — the visitor has a question or needs support.
// Lower-case to match the stored `status` values on the same table.
export const CONTACT_REQUEST_INTENTS = ["demo", "general"] as const;

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

// A DEMO request. Unchanged from the proven Milestone 3 demo form: the sales
// conversation genuinely needs the company, a phone number and a country, and
// the database enforces the same shape via contact_requests_demo_shape_chk.
export const demoContactRequestSchema = z.object({
  name: z.string().trim().min(2, "Shkruani emrin tuaj.").max(120),
  companyName: z.string().trim().min(2, "Shkruani emrin e kompanisë.").max(160),
  email: z.string().trim().email("Shkruani një email të vlefshëm.").max(180),
  phone: z.string().trim().min(6, "Shkruani telefonin.").max(40),
  country: z.string().trim().min(2, "Shkruani shtetin.").max(80),
  message: optionalText(1000),
  ...honeypotFields,
});
export type DemoContactRequestInput = z.infer<typeof demoContactRequestSchema>;

// A GENERAL question. Asks for the least that still lets Kornizo reply: who you
// are, where to reach you, and what you are asking. Company and phone are
// genuinely optional; a message is REQUIRED, because a general contact with no
// question is not actionable (also enforced by
// contact_requests_general_shape_chk).
export const generalContactRequestSchema = z.object({
  name: z.string().trim().min(2, "Shkruani emrin tuaj.").max(120),
  companyName: optionalText(160),
  email: z.string().trim().email("Shkruani një email të vlefshëm.").max(180),
  phone: optionalText(40),
  message: z.string().trim().min(10, "Shkruani pyetjen tuaj.").max(2000),
  ...honeypotFields,
});
export type GeneralContactRequestInput = z.infer<typeof generalContactRequestSchema>;

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

export const setContactRequestStatusSchema = z.object({
  id: z.string().regex(UUID_RE, "Kërkesë e pavlefshme."),
  status: z.enum(CONTACT_REQUEST_STATUSES),
});
export type SetContactRequestStatusInput = z.infer<typeof setContactRequestStatusSchema>;
