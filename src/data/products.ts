import { Product, CollectionMeta } from "@/types/catalog";

/**
 * VANTAIRE EYEWEAR - Demonstration Catalog
 * 
 * SPECIFICATION INTEGRITY NOTICE:
 * Fictional demonstration products paired with real eyewear photography.
 * Frame and lens properties represent merchandising design aesthetics.
 * Physical manufacturing specifications should be confirmed with the supplier/concierge.
 */

export const PRODUCTS: Product[] = [
  {
    id: "vnt-01",
    slug: "noir-sovereign-aviator",
    name: "Noir Sovereign Aviator",
    shortName: "Noir Sovereign",
    category: "Sunglasses",
    collection: ["aviator", "polarized"],
    gender: "Unisex",
    price: 3450,
    compareAtPrice: 4200,
    currency: "BDT",
    currencySymbol: "৳",
    description: "An architectural reimagining of the iconic flight silhouette. Features a dark metal-look frame in matte obsidian with dark charcoal sun lenses designed for confident presence and glare reduction.",
    shortDescription: "Architectural aviator silhouette with matte obsidian styling.",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Aviator",
    frameLook: "Dark Metal-Look Alloy",
    frameColor: "Matte Obsidian Black",
    lensColor: "Deep Charcoal Tint",
    lensType: "Polarized-Style Tint",
    styleCategory: "Architectural",
    fit: "Universal",
    features: [
      "Classic dual-bar aviator brow profile",
      "Matte obsidian dark finish",
      "Charcoal-tinted sun lens appearance",
      "Adjustable-style cushioned nose pads"
    ],
    badge: "Bestseller",
    featured: true,
    bestSeller: true,
    newArrival: false,
    inStock: true,
    seoTitle: "Noir Sovereign Aviator Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Explore the Noir Sovereign Aviator sunglasses by VANTAIRE. Matte obsidian styling with nationwide delivery across Bangladesh."
  },
  {
    id: "vnt-02",
    slug: "monaco-sculpted-square",
    name: "Monaco Sculpted Square",
    shortName: "Monaco Square",
    category: "Sunglasses",
    collection: ["square"],
    gender: "Unisex",
    price: 3250,
    compareAtPrice: 3900,
    currency: "BDT",
    currencySymbol: "৳",
    description: "Bold geometric authority meets European resort sophistication. Features a structured tortoise-pattern frame with beveled outer contours and warm amber gradient-look lenses.",
    shortDescription: "Chunky beveled tortoise-pattern frame with warm amber gradient lenses.",
    images: [
      "https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Square",
    frameLook: "Tortoise Acetate-Look",
    frameColor: "Rich Tortoise Havana",
    lensColor: "Warm Amber Gradient",
    lensType: "Gradient Tint",
    styleCategory: "Contemporary",
    fit: "Medium",
    features: [
      "Beveled square rim geometry",
      "Rich tortoise pattern finish",
      "Warm amber gradient lens appearance",
      "Comfort-curved temple arms"
    ],
    badge: "Signature Edit",
    featured: true,
    bestSeller: true,
    newArrival: false,
    inStock: true,
    seoTitle: "Monaco Sculpted Square Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Tortoise-pattern square sunglasses with amber gradient lenses. Order via WhatsApp."
  },
  {
    id: "vnt-03",
    slug: "vesper-pantoscopic-round",
    name: "Vesper Pantoscopic Round",
    shortName: "Vesper Round",
    category: "Sunglasses",
    collection: ["round", "polarized"],
    gender: "Unisex",
    price: 2950,
    currency: "BDT",
    currencySymbol: "৳",
    description: "An intellectual, minimalist circular silhouette. Slim wire-look rim in brushed antique gold tone with forest green-tinted lenses for refined vintage-inspired character.",
    shortDescription: "Minimalist circular wire profile with forest green-tinted lenses.",
    images: [
      "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Round",
    frameLook: "Gold-Tone Metal-Look",
    frameColor: "Brushed Antique Gold",
    lensColor: "Forest Green Tint",
    lensType: "Polarized-Style Tint",
    styleCategory: "Retro",
    fit: "Narrow",
    features: [
      "Slim round wire perimeter design",
      "Antique gold metallic appearance",
      "Forest green sun-tinted lenses",
      "Smooth temple tip sleeves"
    ],
    badge: "New Arrival",
    featured: true,
    bestSeller: false,
    newArrival: true,
    inStock: true,
    seoTitle: "Vesper Round Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Antique gold wireframe round sunglasses with green-tinted lenses by VANTAIRE."
  },
  {
    id: "vnt-04",
    slug: "verona-architectural-cat-eye",
    name: "Verona Architectural Cat-Eye",
    shortName: "Verona Cat-Eye",
    category: "Sunglasses",
    collection: ["cat-eye"],
    gender: "Women",
    price: 3350,
    compareAtPrice: 3800,
    currency: "BDT",
    currencySymbol: "৳",
    description: "A sharp, high-attitude uplift sculpted with dramatic brow lines. Tailored for elevated presence from everyday city wear to weekend occasions.",
    shortDescription: "Sculpted cat-eye in high-gloss jet black with smoke gradient lenses.",
    images: [
      "https://images.unsplash.com/photo-1509695503492-413ff566a383?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Cat-Eye",
    frameLook: "Jet Black Acetate-Look",
    frameColor: "High Gloss Jet Black",
    lensColor: "Smoke Obsidian Gradient",
    lensType: "Gradient Tint",
    styleCategory: "Contemporary",
    fit: "Medium",
    features: [
      "Dramatic upturned browline contour",
      "High-gloss jet black frame surface",
      "Smokey gradient lens transition",
      "Flattering feminine silhouette"
    ],
    badge: "Bestseller",
    featured: true,
    bestSeller: true,
    newArrival: false,
    inStock: true,
    seoTitle: "Verona Cat-Eye Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Sculpted jet-black cat-eye sunglasses with gradient lenses. Order via WhatsApp with nationwide shipping."
  },
  {
    id: "vnt-05",
    slug: "atlas-polarized-wayfarer",
    name: "Atlas Polarized Wayfarer",
    shortName: "Atlas Wayfarer",
    category: "Sunglasses",
    collection: ["square", "polarized"],
    gender: "Unisex",
    price: 2850,
    currency: "BDT",
    currencySymbol: "৳",
    description: "The definitive everyday silhouette built for city life, driving, and tropical sunlight. Balanced proportions designed for versatile wear.",
    shortDescription: "Essential modern wayfarer in matte slate with dark neutral sun lenses.",
    images: [
      "https://images.unsplash.com/photo-1577803645773-f96470509666?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Square",
    frameLook: "Matte Slate Finish",
    frameColor: "Matte Slate Gray",
    lensColor: "Dark Smoke Tint",
    lensType: "Polarized-Style Tint",
    styleCategory: "Classic",
    fit: "Universal",
    features: [
      "Timeless wayfarer profile",
      "Matte finish slate chassis",
      "Neutral dark smoke lens appearance",
      "Contoured bridge for comfort"
    ],
    badge: "Bestseller",
    featured: false,
    bestSeller: true,
    newArrival: false,
    inStock: true,
    seoTitle: "Atlas Wayfarer Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Matte slate wayfarer sunglasses with dark smoke lenses designed for everyday wear across Bangladesh."
  },
  {
    id: "vnt-06",
    slug: "solstice-geometric-octagon",
    name: "Solstice Geometric Octagon",
    shortName: "Solstice Octagon",
    category: "Sunglasses",
    collection: ["square", "round"],
    gender: "Unisex",
    price: 3600,
    compareAtPrice: 4500,
    currency: "BDT",
    currencySymbol: "৳",
    description: "An adventurous polygonal silhouette featuring multi-faceted beveled styling with a warm champagne gold-tone finish and bronze gradient lenses.",
    shortDescription: "Multi-faceted octagon frame in brushed champagne gold tone with bronze tint.",
    images: [
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Geometric",
    frameLook: "Gold-Tone Metal-Look",
    frameColor: "Brushed Champagne Gold Tone",
    lensColor: "Cognac Amber Gradient",
    lensType: "Gradient Tint",
    styleCategory: "Architectural",
    fit: "Medium",
    features: [
      "Polygonal 8-sided geometric styling",
      "Champagne gold metallic tone",
      "Warm cognac amber gradient tint",
      "Lightweight visual design"
    ],
    badge: "Limited Edition",
    featured: true,
    bestSeller: false,
    newArrival: true,
    inStock: true,
    seoTitle: "Solstice Octagonal Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Polygonal gold-tone sunglasses with cognac gradient lenses. Available in Bangladesh."
  },
  {
    id: "vnt-07",
    slug: "velocity-aerodynamic-sport",
    name: "Velocity Aerodynamic Sport",
    shortName: "Velocity Sport",
    category: "Sunglasses",
    collection: ["sport", "polarized"],
    gender: "Unisex",
    price: 3100,
    currency: "BDT",
    currencySymbol: "৳",
    description: "Engineered for speed, motion, and active outdoor sunlight. Curved panoramic frame featuring an ice-blue mirrored shield aesthetic.",
    shortDescription: "Curved aerodynamic sport sunglasses with ice-blue mirrored shield.",
    images: [
      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Sport",
    frameLook: "Graphite Sport-Look",
    frameColor: "Stealth Graphite Gray",
    lensColor: "Cobalt Ice-Blue Mirror",
    lensType: "Mirrored Finish",
    styleCategory: "Sport",
    fit: "Universal",
    features: [
      "Curved wrap-around shield silhouette",
      "High-visibility ice-blue mirror appearance",
      "Contoured temples for active movement",
      "Lightweight athletic styling"
    ],
    badge: "Signature Edit",
    featured: false,
    bestSeller: false,
    newArrival: true,
    inStock: true,
    seoTitle: "Velocity Sport Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Sport wrap sunglasses with ice-blue mirrored lenses for cycling, running, and active wear."
  },
  {
    id: "vnt-08",
    slug: "arden-crystal-clear-square",
    name: "Arden Crystal Clear Square",
    shortName: "Arden Clear",
    category: "Sunglasses",
    collection: ["square"],
    gender: "Unisex",
    price: 3150,
    compareAtPrice: 3600,
    currency: "BDT",
    currencySymbol: "৳",
    description: "Modern translucency perfected. Formed from transparent crystal-look frame material with visible internal core wire aesthetic, paired with silver-mirror lenses.",
    shortDescription: "Transparent crystal-look frame with silver mirrored lenses.",
    images: [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Square",
    frameLook: "Translucent Crystal Finish",
    frameColor: "Ice Crystal Clear",
    lensColor: "Chrome Silver Mirror",
    lensType: "Mirrored Finish",
    styleCategory: "Contemporary",
    fit: "Medium",
    features: [
      "Transparent translucent frame body",
      "Subtle visible internal wire aesthetic",
      "Reflective chrome silver mirror lens",
      "Clean architectural square lines"
    ],
    badge: "New Arrival",
    featured: false,
    bestSeller: false,
    newArrival: true,
    inStock: true,
    seoTitle: "Arden Crystal Clear Square Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Clear frame sunglasses with silver mirrored lenses by VANTAIRE."
  },
  {
    id: "vnt-09",
    slug: "riviera-rimless-titanium",
    name: "Riviera Rimless Minimalist",
    shortName: "Riviera Rimless",
    category: "Sunglasses",
    collection: ["aviator", "polarized"],
    gender: "Unisex",
    price: 3850,
    compareAtPrice: 4600,
    currency: "BDT",
    currencySymbol: "৳",
    description: "Minimalist optical architecture featuring beveled-edge lenses mounted directly to silver-tone metal temples for an unobstructed field of vision.",
    shortDescription: "Weightless-look rimless sunglasses with beveled edge lenses.",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Aviator",
    frameLook: "Dark Metal-Look Alloy",
    frameColor: "Polished Silver Tone",
    lensColor: "Smokey Rose Gradient",
    lensType: "Gradient Tint",
    styleCategory: "Architectural",
    fit: "Universal",
    features: [
      "Clean rimless perimeter aesthetic",
      "Beveled-edge lens detailing",
      "Polished silver-tone metal temples",
      "Unobstructed peripheral viewing"
    ],
    badge: "Limited Edition",
    featured: true,
    bestSeller: false,
    newArrival: false,
    inStock: true,
    seoTitle: "Riviera Rimless Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Minimalist rimless sunglasses with beveled edges and silver-tone temples. Order via WhatsApp."
  },
  {
    id: "vnt-10",
    slug: "sienna-vintage-gradient-round",
    name: "Sienna Vintage Gradient Round",
    shortName: "Sienna Round",
    category: "Sunglasses",
    collection: ["round"],
    gender: "Women",
    price: 2950,
    currency: "BDT",
    currencySymbol: "৳",
    description: "A soft, 1970s European cinematic expression. Warm amber honey-look frames enclosing sunset sienna gradient lenses for unforgettable golden-hour radiance.",
    shortDescription: "Cinematic honey-look frame with warm sienna sunset gradient lenses.",
    images: [
      "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Round",
    frameLook: "Tortoise Acetate-Look",
    frameColor: "Warm Honey Amber",
    lensColor: "Sienna Sunset Gradient",
    lensType: "Gradient Tint",
    styleCategory: "Retro",
    fit: "Medium",
    features: [
      "Warm translucent honey amber tone",
      "Soft sunset sienna gradient tint",
      "Keyhole-style bridge detailing",
      "Comfort-rounded frame edges"
    ],
    badge: "Signature Edit",
    featured: false,
    bestSeller: false,
    newArrival: false,
    inStock: true,
    seoTitle: "Sienna Vintage Gradient Round Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Honey amber round sunglasses with sunset gradient lenses. Fast delivery nationwide across Bangladesh."
  },
  {
    id: "vnt-11",
    slug: "obsidian-edge-oversized-square",
    name: "Obsidian Edge Oversized",
    shortName: "Obsidian Edge",
    category: "Sunglasses",
    collection: ["square"],
    gender: "Unisex",
    price: 3500,
    compareAtPrice: 4200,
    currency: "BDT",
    currencySymbol: "৳",
    description: "Maximum coverage, uncompromising aura. The Obsidian Edge features wide temples and a flat-top browline designed to command any room or boulevard.",
    shortDescription: "Commanding flat-top oversized black frame with dark noir lenses.",
    images: [
      "https://images.unsplash.com/photo-1509695503492-413ff566a383?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Oversized",
    frameLook: "Jet Black Acetate-Look",
    frameColor: "Deep Midnight Pitch",
    lensColor: "Solid Jet Black",
    lensType: "Dark Sun Tint",
    styleCategory: "Architectural",
    fit: "Wide",
    features: [
      "Bold flat-top browline silhouette",
      "Wide temple arms for substantial profile",
      "Deep black dark sun tint appearance",
      "Substantial visual presence"
    ],
    badge: "Bestseller",
    featured: true,
    bestSeller: true,
    newArrival: false,
    inStock: true,
    seoTitle: "Obsidian Edge Oversized Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Architectural flat-top black sunglasses with wide temples and dark sun lenses."
  },
  {
    id: "vnt-12",
    slug: "corsica-pilot-double-bridge",
    name: "Corsica Pilot Double-Bridge",
    shortName: "Corsica Pilot",
    category: "Sunglasses",
    collection: ["aviator", "polarized"],
    gender: "Unisex",
    price: 3300,
    currency: "BDT",
    currencySymbol: "৳",
    description: "A structured pilot frame with a straight top bar. Finished in dark gunmetal tone with dark slate green sun lenses.",
    shortDescription: "Structured pilot silhouette with industrial brow bar and dark slate green lenses.",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop"
    ],
    frameShape: "Aviator",
    frameLook: "Dark Metal-Look Alloy",
    frameColor: "Brushed Gunmetal Tone",
    lensColor: "Slate Green Sun Tint",
    lensType: "Polarized-Style Tint",
    styleCategory: "Classic",
    fit: "Universal",
    features: [
      "Dual straight brow bar structure",
      "Gunmetal metallic appearance",
      "Deep slate green lens tint",
      "Comfort-fitting temple design"
    ],
    badge: "Signature Edit",
    featured: false,
    bestSeller: false,
    newArrival: true,
    inStock: true,
    seoTitle: "Corsica Double-Bridge Pilot Sunglasses | VANTAIRE EYEWEAR",
    seoDescription: "Gunmetal-tone double-bridge pilot sunglasses with green lenses. Direct WhatsApp ordering."
  }
];

export const COLLECTIONS_META: CollectionMeta[] = [
  {
    slug: "aviator",
    name: "The Aviator Edit",
    tagline: "Timeless Flight Silhouettes",
    description: "Classic dual-bridge and pilot silhouettes featuring sleek metallic styling and tinted sun optics.",
    coverImage: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1000&auto=format&fit=crop"
  },
  {
    slug: "square",
    name: "The Sculpted Square",
    tagline: "Geometric Structure & Presence",
    description: "Substantial beveled profiles engineered for modern definition, architectural character, and decisive style.",
    coverImage: "https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=1000&auto=format&fit=crop"
  },
  {
    slug: "round",
    name: "The Pantoscopic Round",
    tagline: "Intellectual Modernism",
    description: "Clean circular wire rims and warm amber hues celebrating vintage-inspired design and effortless sophistication.",
    coverImage: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=1000&auto=format&fit=crop"
  },
  {
    slug: "cat-eye",
    name: "The Verona Cat-Eye",
    tagline: "High-Attitude Contours",
    description: "Sharp, upturned brow silhouettes sculpted in lustrous black and tortoise tones for dramatic elegance.",
    coverImage: "https://images.unsplash.com/photo-1509695503492-413ff566a383?q=80&w=1000&auto=format&fit=crop"
  },
  {
    slug: "polarized",
    name: "The Polarized Series",
    tagline: "High-Clarity Sun Protection",
    description: "Glare-reducing sun lens presentations tailored for open roads, coastal travel, and tropical sunlight.",
    coverImage: "https://images.unsplash.com/photo-1577803645773-f96470509666?q=80&w=1000&auto=format&fit=crop"
  },
  {
    slug: "sport",
    name: "Velocity & Motion",
    tagline: "Aerodynamic Performance",
    description: "Wrap-around aerodynamic shield silhouettes designed for dynamic outdoor movement and endurance.",
    coverImage: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=1000&auto=format&fit=crop"
  }
];