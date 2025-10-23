import { prompt } from "@marrakesh/core";

// Basic prompt building with new minimal API
const p = prompt("You are a helpful customer service agent")
  .system("Always be polite and professional")
  .system("If you don't know something, say so");

// Compile for different providers
console.log("=== Generic Format ===");
console.log(p.systemPrompt);

console.log("\n=== OpenAI Format ===");
const openaiResult = p.toOpenAI();
console.log("Messages:", openaiResult.messages);
console.log("Tools:", openaiResult.tools);

console.log("\n=== Anthropic Format ===");
const anthropicResult = p.toAnthropic();
console.log("System:", anthropicResult.system);
console.log("Tools:", anthropicResult.tools);

// Prepare messages for API calls
const conversationMessages = [
  { role: "user" as const, content: "I have a problem with my recent order" },
];

const messagesWithSystem = p.toVercelAI(conversationMessages);
console.log("\n=== Prepared Messages ===");
console.log(JSON.stringify(messagesWithSystem, null, 2));
