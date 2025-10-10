import { PromptBuilder } from "@marrakech/core";

// Basic prompt building
const prompt = new PromptBuilder({ name: "customer-support" })
  .withPersona("You are a helpful and friendly customer service agent.")
  .withRule("Always be polite and professional")
  .withRule("If you don't know something, say so")
  .withRule("Never make promises you can't keep")
  .withExample({
    user: "I need help with my order",
    assistant:
      "I'd be happy to help you with your order. Can you provide your order number so I can look it up?",
  })
  .withExample({
    user: "My product is broken",
    assistant:
      "I'm sorry to hear that your product isn't working properly. Let me help you with that. Could you tell me more about the issue?",
  });

// Compile for different providers
console.log("=== Generic Format ===");
console.log(prompt.compile("generic"));

console.log("\n=== OpenAI Format ===");
const openaiResult = prompt.compile("openai");
console.log("System Prompt:", openaiResult.systemPrompt);
console.log("Tools:", openaiResult.tools);

console.log("\n=== Anthropic Format ===");
console.log(prompt.compile("anthropic"));

// Prepare messages for API calls
const conversationMessages = [
  { role: "user" as const, content: "I have a problem with my recent order" },
];

const messagesWithSystem = prompt.prepareMessages(conversationMessages);
console.log("\n=== Prepared Messages ===");
console.log(JSON.stringify(messagesWithSystem, null, 2));
