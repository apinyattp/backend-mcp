export interface KnowledgeEntry {
  id: string;
  topic: string;
  category: "company" | "faq" | "docs" | "facts";
  title: string;
  content: string;
  tags: string[];
  ownerId?: string;
  groupId?: string;
}

export const knowledgeBase: KnowledgeEntry[] = [
  // --- Company Info ---
  {
    id: "company-about",
    topic: "about",
    category: "company",
    title: "About Our Company",
    content:
      "Acme Corp was founded in 2020. We specialize in AI-powered developer tools. Our headquarters are in San Francisco, CA. We have 150 employees across 12 countries.",
    tags: ["company", "about", "overview", "history"],
  },
  {
    id: "company-mission",
    topic: "mission",
    category: "company",
    title: "Company Mission",
    content:
      "Our mission is to make software development 10x more productive through intelligent automation and AI assistance.",
    tags: ["company", "mission", "values"],
  },
  {
    id: "company-products",
    topic: "products",
    category: "company",
    title: "Products & Services",
    content:
      "We offer three main products: CodeAssist (AI pair programmer), TestGen (automated test generation), and DocFlow (intelligent documentation). All products integrate with VS Code, JetBrains, and Neovim.",
    tags: ["company", "products", "services", "codeassist", "testgen", "docflow"],
  },

  // --- FAQs ---
  {
    id: "faq-pricing",
    topic: "pricing",
    category: "faq",
    title: "How much does it cost?",
    content:
      "We offer a free tier for individual developers (up to 100 completions/day). Pro plan is $20/month with unlimited completions. Team plan is $15/user/month with admin controls and SSO. Enterprise pricing is custom.",
    tags: ["faq", "pricing", "plans", "cost", "free"],
  },
  {
    id: "faq-getting-started",
    topic: "getting-started",
    category: "faq",
    title: "How do I get started?",
    content:
      "Install the extension from your IDE marketplace, sign up at acme.dev/signup, and authenticate. The extension will auto-detect your project and start providing suggestions immediately.",
    tags: ["faq", "getting-started", "setup", "install"],
  },
  {
    id: "faq-supported-languages",
    topic: "languages",
    category: "faq",
    title: "What programming languages are supported?",
    content:
      "CodeAssist supports TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, and Kotlin. TestGen supports TypeScript, Python, and Java. DocFlow supports all languages.",
    tags: ["faq", "languages", "support", "typescript", "python", "java"],
  },

  // --- Documentation ---
  {
    id: "docs-api-auth",
    topic: "api-authentication",
    category: "docs",
    title: "API Authentication",
    content:
      "All API requests require a Bearer token in the Authorization header. Tokens are generated from the dashboard at acme.dev/settings/api-keys. Tokens expire after 90 days. Use the /auth/refresh endpoint to renew.",
    tags: ["docs", "api", "authentication", "bearer", "token"],
  },
  {
    id: "docs-webhooks",
    topic: "webhooks",
    category: "docs",
    title: "Webhook Configuration",
    content:
      "Webhooks can be configured at acme.dev/settings/webhooks. Supported events: completion.created, test.generated, doc.updated. Payloads are signed with HMAC-SHA256 using your webhook secret.",
    tags: ["docs", "webhooks", "events", "integration"],
  },

  // --- Custom Facts ---
  {
    id: "facts-uptime",
    topic: "uptime",
    category: "facts",
    title: "Service Uptime",
    content:
      "Our platform maintains 99.95% uptime SLA. Current status is always available at status.acme.dev. We use multi-region deployment across AWS us-east-1, eu-west-1, and ap-southeast-1.",
    tags: ["facts", "uptime", "sla", "reliability", "status"],
  },
  {
    id: "facts-security",
    topic: "security",
    category: "facts",
    title: "Security & Compliance",
    content:
      "We are SOC 2 Type II certified, GDPR compliant, and HIPAA ready. Code is never stored on our servers -- all processing happens in ephemeral containers. We use AES-256 encryption at rest and TLS 1.3 in transit.",
    tags: ["facts", "security", "compliance", "soc2", "gdpr", "encryption"],
  },
];
