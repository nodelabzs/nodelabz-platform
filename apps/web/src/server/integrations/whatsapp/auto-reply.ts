export interface AutoReplyRule {
  id: string;
  keywords: string[];
  response: string;
  businessHoursOnly: boolean;
  enabled: boolean;
}

export function findMatchingRule(
  message: string,
  rules: AutoReplyRule[]
): AutoReplyRule | null {
  const lowerMessage = message.toLowerCase();
  return (
    rules.find(
      (rule) =>
        rule.enabled &&
        rule.keywords.some((kw) => lowerMessage.includes(kw.toLowerCase()))
    ) || null
  );
}

export function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8 && hour < 18; // 8am-6pm
}
