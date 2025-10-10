import { PromptBuilder, tool } from "marrakech";
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

// Build prompt with tools
const prompt = new PromptBuilder({ name: "support-agent-with-tools" })
  .withPersona(
    "You are a helpful customer service agent with access to user accounts, support tickets, and order information.",
  )
  .withRule("Always verify user identity before accessing account information")
  .withRule("Use the appropriate tool for each request")
  .withRule("If you cannot help with a request, create a support ticket")
  .withTool(getUserDetails)
  .withTool(createSupportTicket)
  .withTool(checkOrderStatus);

// Compile for OpenAI (includes tools separately)
const { systemPrompt, tools } = prompt.compile("openai");

console.log("=== System Prompt ===");
console.log(systemPrompt);

console.log("\n=== Available Tools ===");
console.log(JSON.stringify(tools, null, 2));

// Example of how this would be used with OpenAI API
console.log("\n=== OpenAI API Usage ===");
console.log("const response = await openai.chat.completions.create({");
console.log('  model: "gpt-4",');
console.log("  messages: messagesWithSystem,");
console.log("  tools: tools, // The tools array from compile()");
console.log('  tool_choice: "auto"');
console.log("});");
