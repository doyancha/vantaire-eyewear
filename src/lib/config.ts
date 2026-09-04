/**
 * VANTAIRE EYEWEAR - Central Business Configuration
 * 
 * IMPORTANT PRODUCTION RELEASE NOTE:
 * All values marked [DEMO CONFIGURATION] are defaults designed for testing.
 * The store owner MUST replace them with verified operational details prior
 * to connecting production advertising or commercial distribution.
 */

export const siteConfig = {
  brandName: "VANTAIRE EYEWEAR",
  brandShort: "VANTAIRE",
  tagline: "Shade Your Presence.",
  subTagline: "Architectural eyewear engineered with modern contours and precision optics.",
  
  // DOMAIN & CANONICAL BASE URL
  // Populated with production Vercel URL or fallback
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://vantaire-eyewear.vercel.app",
  
  // WHATSAPP ORDERING CONFIGURATION
  // [DEMO NUMBER] Required digits-only format so wa.me links remain structurally valid.
  whatsapp: {
    number: "8801700000000",
    displayNumber: "+880 1700-000000",
    isDemo: true,
    defaultGreeting: "Hello VANTAIRE EYEWEAR, I would like to inquire about ordering sunglasses from your collection.",
  },
  
  // CUSTOMER CONCIERGE & SUPPORT
  contact: {
    phone: "+880 1700-000000",
    email: "contact@vantaireeyewear.com",
    hours: "Saturday – Thursday: 10:00 AM – 8:00 PM BST",
    fridayHours: "Friday: Closed / Limited WhatsApp Support",
    location: "Dhaka, Bangladesh",
    serviceArea: "Nationwide Bangladesh",
  },
  
  // DELIVERY POLICIES
  delivery: {
    insideDhakaTime: "Approximately 2 days",
    outsideDhakaTime: "Approximately 4 days",
    feeInsideDhaka: 70,
    feeOutsideDhaka: 120,
    currencySymbol: "৳",
    currencyCode: "BDT",
    cashOnDelivery: true,
    advancePaymentNote: "Cash on Delivery available. Advance payment may be requested for selected orders only.",
    packaging: "Signature protective hard case, microfiber cleaning cloth, and travel pouch included.",
  },

  // SOCIAL CHANNELS
  // Kept empty by default until verified brand profiles exist
  social: {
    instagram: "",
    facebook: "",
  },
};