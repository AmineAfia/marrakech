// Example: Vercel AI SDK Integration
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { PromptBuilder, tool } from "marrakech";
import { z } from "zod";

// Define your prompt with tools
const getUserDetails = tool({
  description: "Get user account information",
  parameters: z.object({
    userId: z.string().describe("User ID to lookup"),
  }),
});

const prompt = new PromptBuilder({ name: "chat-agent" })
  .withPersona("You are a helpful assistant that can look up user information.")
  .withRule("Always be helpful and accurate")
  .withTool(getUserDetails);

// API Route handler (app/api/chat/route.ts)
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Prepare messages with system prompt
    const messagesWithSystem = prompt.prepareMessages(messages);

    // For OpenAI with tools
    const { systemPrompt, tools } = prompt.compile("openai");

    // Use with Vercel AI SDK streaming
    return streamText({
      model: openai("gpt-4"),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: tools,
      toolChoice: "auto",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Alternative: Generic approach (no tools)
export async function POSTGeneric(req: Request) {
  try {
    const { messages } = await req.json();

    // Simple approach - just add system prompt
    const messagesWithSystem = prompt.prepareMessages(messages);

    return streamText({
      model: openai("gpt-4"),
      messages: messagesWithSystem,
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

    // Compile for Anthropic (returns string with XML)
    const systemPrompt = prompt.compile("anthropic");

    return streamText({
      model: anthropic("claude-3-sonnet"),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
