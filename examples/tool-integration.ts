import { prompt, tool } from "@marrakesh/core";
import { z } from "zod";

// Define tools with AI SDK pattern
const getUserDetails = tool({
  description: "Fetch user account information from the database",
  parameters: z.object({
    userId: z.string().describe("The user ID to lookup"),
  }),
  execute: async ({ userId }) => {
    // In a real app, this would query your database
    return { id: userId, name: "John Doe", email: "john@example.com" };
  },
});

const createSupportTicket = tool({
  description: "Create a new support ticket for the user",
  parameters: z.object({
    title: z.string().describe("The ticket title"),
    description: z.string().describe("Detailed description of the issue"),
    priority: z
      .enum(["low", "medium", "high"])
      .describe("Ticket priority level"),
  }),
  execute: async ({ title, description, priority }) => {
    // In a real app, this would create a ticket in your system
    return { ticketId: "TICKET-123", status: "open", priority };
  },
});

const checkOrderStatus = tool({
  description: "Check the status of a customer order",
  parameters: z.object({
    orderNumber: z.string().describe("The order number to check"),
  }),
  execute: async ({ orderNumber }) => {
    // In a real app, this would query your order system
    return { orderNumber, status: "shipped", trackingNumber: "TRK-456" };
  },
});

// Build prompt with tools using new API
const p = prompt(
  "You are a helpful customer service agent with access to user accounts, support tickets, and order information.",
)
  .system("Always verify user identity before accessing account information")
  .system("Use the appropriate tool for each request")
  .system("If you cannot help with a request, create a support ticket")
  .tool(getUserDetails, createSupportTicket, checkOrderStatus);

// Convert to different formats
console.log("=== OpenAI Format ===");
const openaiResult = p.toOpenAI();
console.log("System Prompt:", openaiResult.messages[0].content);
console.log("Available Tools:", JSON.stringify(openaiResult.tools, null, 2));

console.log("\n=== Anthropic Format ===");
const anthropicResult = p.toAnthropic();
console.log("System:", anthropicResult.system);
console.log("Tools:", JSON.stringify(anthropicResult.tools, null, 2));

// Example of how this would be used with OpenAI API
console.log("\n=== OpenAI API Usage ===");
console.log("const response = await openai.chat.completions.create({");
console.log('  model: "gpt-4",');
console.log("  messages: openaiResult.messages,");
console.log("  tools: openaiResult.tools,");
console.log('  tool_choice: "auto"');
console.log("});");