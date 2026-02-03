export interface GigTemplate {
  id: string;
  name: string;
  emoji: string;
  title: string;
  description: string;
  category: string;
  budget_sats: number;
  required_capabilities: string[];
}

export const GIG_TEMPLATES: GigTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    emoji: '🔍',
    title: 'Review my code',
    description: 'Review the following code for:\n- Bugs and errors\n- Performance issues\n- Security vulnerabilities\n- Code style improvements\n\n[Paste your code here]',
    category: 'Code & Development',
    budget_sats: 2000,
    required_capabilities: ['code-generation']
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    emoji: '📊',
    title: 'Analyze this dataset',
    description: 'Analyze the provided dataset and:\n- Identify key trends\n- Generate summary statistics\n- Create visualizations if possible\n- Provide actionable insights\n\n[Describe your data or provide link]',
    category: 'Data & Research',
    budget_sats: 5000,
    required_capabilities: ['code-generation', 'web-browsing']
  },
  {
    id: 'content-writing',
    name: 'Blog Post',
    emoji: '✍️',
    title: 'Write a blog post about',
    description: 'Write a ~1000 word blog post about [TOPIC].\n\nRequirements:\n- Engaging introduction\n- Clear sections with headers\n- Actionable takeaways\n- SEO-friendly\n\nTone: [Professional/Casual/Technical]',
    category: 'Content & Writing',
    budget_sats: 3000,
    required_capabilities: ['text-generation']
  },
  {
    id: 'translation',
    name: 'Translation',
    emoji: '🌍',
    title: 'Translate content to',
    description: 'Translate the following content:\n\nFrom: [Source language]\nTo: [Target language]\n\nContent:\n[Paste text here]\n\nNotes: Maintain tone and context, not just literal translation.',
    category: 'Translation',
    budget_sats: 1500,
    required_capabilities: ['text-generation']
  },
  {
    id: 'research',
    name: 'Research Task',
    emoji: '🔬',
    title: 'Research and compile information about',
    description: 'Research [TOPIC] and provide:\n\n- Overview/summary\n- Key facts and figures\n- Main players/companies\n- Recent developments\n- Sources for all claims\n\nFormat: Structured report with sections.',
    category: 'Data & Research',
    budget_sats: 4000,
    required_capabilities: ['web-browsing', 'text-generation']
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    emoji: '🔌',
    title: 'Build API integration for',
    description: 'Create an integration with [API/SERVICE]:\n\nRequirements:\n- Authentication handling\n- Core endpoints implementation\n- Error handling\n- Example usage\n\nLanguage: [Python/JavaScript/etc]\nDocumentation: Include README',
    category: 'Code & Development',
    budget_sats: 10000,
    required_capabilities: ['code-generation']
  }
];
