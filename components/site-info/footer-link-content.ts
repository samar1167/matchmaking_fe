export type FooterInfoSection = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

export type FooterInfoPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  badgeLabel: string;
  badgeValue: string;
  statLabel: string;
  statValue: string;
  sections: FooterInfoSection[];
};

export const footerInfoPages: Record<string, FooterInfoPageContent> = {
  "about-us": {
    eyebrow: "about luster",
    title: "Built for thoughtful matchmaking decisions",
    description:
      "Luster is designed to help people compare compatibility with more clarity, more structure, and more confidence before they invest emotionally.",
    badgeLabel: "Focus",
    badgeValue: "Human-first matching",
    statLabel: "Core promise",
    statValue: "Private, structured, decision-ready insights",
    sections: [
      {
        eyebrow: "What We Believe",
        title: "Compatibility should feel clear, not confusing",
        description:
          "We turn personal relationship questions into a calm workflow that helps users compare, reflect, and move forward with better context.",
        points: [
          "Private profiles stay organized for future checks and side-by-side thinking.",
          "Compatibility views highlight practical signals instead of vague, generic summaries.",
          "The full product direction is centered on reducing guesswork during important choices.",
        ],
      },
      {
        eyebrow: "Why It Matters",
        title: "A quieter, more intentional product experience",
        description:
          "This sample page mirrors the same warm palette and card layout used in the private profile area so the informational pages still feel like part of one system.",
        points: [
          "Soft rose backgrounds keep the visual tone familiar.",
          "Section cards make longer policy or company content easier to scan.",
          "The layout stays readable across desktop and mobile screens.",
        ],
      },
    ],
  },
  "how-it-works": {
    eyebrow: "product flow",
    title: "How Luster guides the compatibility journey",
    description:
      "From profile setup to compatibility review, the product is structured to keep every step understandable and easy to revisit.",
    badgeLabel: "Workflow",
    badgeValue: "Profile → Compare → Review",
    statLabel: "Typical use",
    statValue: "Save favorites and revisit insights anytime",
    sections: [
      {
        eyebrow: "Step One",
        title: "Create and maintain private profiles",
        description:
          "Users can build a private list of people they want to evaluate later, keeping the workspace neat and repeatable.",
        points: [
          "Add accurate birth details for a reliable baseline.",
          "Keep multiple private profiles available in one place.",
          "Return later without rebuilding the same entries.",
        ],
      },
      {
        eyebrow: "Step Two",
        title: "Run compatibility checks with context",
        description:
          "Results are presented as structured compatibility signals so the user can understand both the score and the reason behind it.",
        points: [
          "Scores surface stronger and weaker areas quickly.",
          "Detailed breakdowns support a more informed decision.",
          "Premium parameters can expand the depth when needed.",
        ],
      },
    ],
  },
  "privacy-policy": {
    eyebrow: "privacy sample",
    title: "Privacy policy preview for private profile data",
    description:
      "This sample page outlines the type of privacy messaging that fits the product: clear, direct, and centered on user trust.",
    badgeLabel: "Data stance",
    badgeValue: "Private by default",
    statLabel: "Priority",
    statValue: "Protect profile details and compatibility history",
    sections: [
      {
        eyebrow: "Collection",
        title: "Only the information needed for the experience",
        description:
          "The product collects account, profile, and compatibility-related information required to run matching features and keep user work saved.",
        points: [
          "Profile details are used to generate compatibility checks.",
          "Account information supports login, support, and access control.",
          "Saved history helps users revisit earlier compatibility runs.",
        ],
      },
      {
        eyebrow: "Handling",
        title: "Private profile expectations should be explicit",
        description:
          "Policy copy in this area should reassure users that the product treats saved profiles and relationship comparisons as sensitive information.",
        points: [
          "Private profiles should not be exposed publicly.",
          "Users should understand how saved records are retained and managed.",
          "Any future sharing or export features should require clear consent.",
        ],
      },
    ],
  },
  "terms-of-service": {
    eyebrow: "terms sample",
    title: "Terms of service preview for the platform",
    description:
      "This sample route gives the footer a complete destination while preserving the same warm editorial style used throughout the product.",
    badgeLabel: "Intent",
    badgeValue: "Clear expectations",
    statLabel: "Coverage",
    statValue: "Accounts, usage, and feature access",
    sections: [
      {
        eyebrow: "Use of Service",
        title: "Set expectations without sounding hostile",
        description:
          "Terms content can explain account responsibilities, acceptable usage, and paid feature boundaries in a way that stays approachable.",
        points: [
          "Users are responsible for information they submit.",
          "Paid plan features and credits should be described clearly.",
          "The service can evolve as product capabilities improve.",
        ],
      },
      {
        eyebrow: "Platform Rules",
        title: "Keep important limitations easy to read",
        description:
          "Long legal copy works better when broken into compact sections with strong headings, matching the product’s card-based layout.",
        points: [
          "Billing, cancellation, and refund language can live in dedicated sections.",
          "Service availability and support expectations can be summarized plainly.",
          "Dispute and limitation language should remain easy to locate.",
        ],
      },
    ],
  },
  "contact-us": {
    eyebrow: "contact sample",
    title: "A support page that matches the product voice",
    description:
      "This sample contact page uses the same palette and spacing as the private profile experience so support content feels integrated rather than generic.",
    badgeLabel: "Support",
    badgeValue: "Response-friendly layout",
    statLabel: "Best for",
    statValue: "Billing, access, product questions, and feedback",
    sections: [
      {
        eyebrow: "Reach Out",
        title: "Guide users to the right support path",
        description:
          "Contact pages work best when they set expectations up front and reduce the amount of back-and-forth needed.",
        points: [
          "Direct billing questions to a dedicated support path.",
          "Use product feedback prompts to capture improvement ideas.",
          "Encourage users to include relevant account details for faster help.",
        ],
      },
      {
        eyebrow: "What To Include",
        title: "Make support requests easier to resolve",
        description:
          "Short checklists help users send complete information the first time, especially when the request relates to saved profiles or compatibility results.",
        points: [
          "Mention the account email or username.",
          "Note which page or feature triggered the issue.",
          "Include a concise summary of the expected behavior.",
        ],
      },
    ],
  },
};
