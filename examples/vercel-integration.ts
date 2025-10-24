// Example: Vercel AI SDK Integration with new API
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prompt, tool } from "@marrakesh/core";
import { z } from "zod";

// Define your prompt with tools using new minimal API
const getUserDetails = tool({
  description: "Get user account information",
  parameters: z.object({
    userId: z.string().describe("User ID to lookup"),
  }),
});

const p = prompt(
  "You are a helpful assistant that can look up user information.",
)
  .system("Always be helpful and accurate")
  .tool(getUserDetails);

// API Route handler (app/api/chat/route.ts)
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert to Vercel AI SDK format
    const { messages: messagesWithSystem, tools } = p.toVercelAI(messages);

    // Use with Vercel AI SDK streaming
    return streamText({
      model: openai("gpt-4"),
      messages: messagesWithSystem,
      tools: tools,
      toolChoice: "auto",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Example: Using with different providers
export async function POSTAnthropic(req: Request) {
  try {
    const { messages } = await req.json();

    // Convert to Anthropic format
    const { system, tools } = p.toAnthropic();

    return streamText({
      model: anthropic("claude-3-sonnet"),
      messages: [{ role: "system", content: system }, ...messages],
      tools: tools,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
