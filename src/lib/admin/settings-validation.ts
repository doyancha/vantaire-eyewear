import { z } from "zod";

const WHATSAPP_NUMBER_REGEX = /^[1-9][0-9]{7,14}$/;
const INSTAGRAM_URL_REGEX = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.-]+\/?.*$/;
const FACEBOOK_URL_REGEX = /^https:\/\/(www\.|m\.)?facebook\.com\/[A-Za-z0-9_.-]+\/?.*$/;
const KNOWN_DEMO_WHATSAPP = "8801700000000";

export const siteSettingsSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .min(1, "Concurrency token (expectedUpdatedAt) is required"),

    // WhatsApp Section
    whatsappNumber: z
      .string()
      .trim()
      .regex(
        WHATSAPP_NUMBER_REGEX,
        "WhatsApp number must contain only digits (8 to 15 digits) without symbols or leading zeros"
      ),
    whatsappDisplayNumber: z
      .string()
      .trim()
      .min(1, "WhatsApp display number is required"),
    whatsappIsDemo: z.boolean(),
    whatsappDefaultGreeting: z
      .string()
      .trim()
      .min(1, "Default WhatsApp greeting is required")
      .max(500, "Default greeting cannot exceed 500 characters"),
    confirmedLiveNumber: z.boolean().optional(),

    // Contact Section
    contactPhone: z
      .string()
      .trim()
      .min(1, "Contact phone is required")
      .max(50, "Phone cannot exceed 50 characters"),
    contactEmail: z
      .string()
      .trim()
      .email("A valid contact email address is required")
      .max(100, "Email cannot exceed 100 characters"),
    contactHours: z
      .string()
      .trim()
      .min(1, "Business hours are required")
      .max(100, "Business hours cannot exceed 100 characters"),
    contactFridayHours: z
      .string()
      .trim()
      .min(1, "Friday hours are required")
      .max(100, "Friday hours cannot exceed 100 characters"),
    contactLocation: z
      .string()
      .trim()
      .min(1, "Business location is required")
      .max(100, "Location cannot exceed 100 characters"),
    contactServiceArea: z
      .string()
      .trim()
      .min(1, "Service area is required")
      .max(100, "Service area cannot exceed 100 characters"),

    // Delivery Section
    deliveryInsideDhakaTime: z
      .string()
      .trim()
      .min(1, "Inside Dhaka delivery estimate is required")
      .max(100, "Delivery time cannot exceed 100 characters"),
    deliveryOutsideDhakaTime: z
      .string()
      .trim()
      .min(1, "Outside Dhaka delivery estimate is required")
      .max(100, "Delivery time cannot exceed 100 characters"),
    deliveryFeeInsideDhaka: z
      .number({ message: "Inside Dhaka fee must be a number" })
      .int("Fee must be a whole integer")
      .min(0, "Fee cannot be negative")
      .max(10000, "Fee cannot exceed ৳10,000"),
    deliveryFeeOutsideDhaka: z
      .number({ message: "Outside Dhaka fee must be a number" })
      .int("Fee must be a whole integer")
      .min(0, "Fee cannot be negative")
      .max(10000, "Fee cannot exceed ৳10,000"),
    deliveryCashOnDelivery: z.boolean(),
    deliveryAdvancePaymentNote: z
      .string()
      .trim()
      .min(1, "Advance payment note is required")
      .max(300, "Note cannot exceed 300 characters"),
    deliveryPackaging: z
      .string()
      .trim()
      .min(1, "Packaging description is required")
      .max(300, "Packaging cannot exceed 300 characters"),

    // Social Section (optional, HTTPS Meta URLs only if provided)
    socialInstagram: z
      .string()
      .trim()
      .transform((val) => (val === "" ? "" : val))
      .refine(
        (val) => val === "" || INSTAGRAM_URL_REGEX.test(val),
        "Instagram link must be a valid HTTPS URL (e.g. https://instagram.com/yourhandle)"
      ),
    socialFacebook: z
      .string()
      .trim()
      .transform((val) => (val === "" ? "" : val))
      .refine(
        (val) => val === "" || FACEBOOK_URL_REGEX.test(val),
        "Facebook link must be a valid HTTPS URL (e.g. https://facebook.com/yourpage)"
      ),
  })
  .superRefine((data, ctx) => {
    // 1. WhatsApp display number must match stored machine digits
    const normalizedDisplay = data.whatsappDisplayNumber.replace(/[^0-9]/g, "");
    if (normalizedDisplay !== data.whatsappNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappDisplayNumber"],
        message:
          "Display number digits must match the machine WhatsApp number exactly.",
      });
    }

    // 2. Demo Truthfulness: If demo mode is false, cannot use the known placeholder number
    if (!data.whatsappIsDemo && data.whatsappNumber === KNOWN_DEMO_WHATSAPP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappNumber"],
        message:
          "Cannot mark configuration as Live while still using the demo placeholder WhatsApp number (8801700000000).",
      });
    }

    // 3. Demo -> Live Confirmation: When isDemo is false, require explicit confirmation
    if (!data.whatsappIsDemo && !data.confirmedLiveNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmedLiveNumber"],
        message:
          "Explicit owner confirmation is required to activate a live business WhatsApp number.",
      });
    }
  });

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;
