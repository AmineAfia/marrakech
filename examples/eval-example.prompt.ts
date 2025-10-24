/**
 * Example: Testing prompts with Marrakesh SDK
 */

import { prompt, tool } from "@marrakesh/core";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

// Define a simple weather tool
const getWeather = tool({
  description: "Get the current weather for a city",
  parameters: z.object({
    city: z.string().describe("The city name"),
  }),
  execute: async ({ city }) => {
    // Simulate API call
    return {
      city,
      temperature: 72,
      conditions: "Sunny",
    };
  },
});

// Create a weather agent with test cases
export const weatherAgent = prompt("You are a helpful weather assistant")
  .tool(getWeather)
  .test({
    cases: [
      {
        input: "What's the weather in Paris?",
        expect: { city: "Paris" },
        name: "Should extract Paris as city",
      },
      {
        input: "Is it raining in Tokyo?",
        expect: { city: "Tokyo" },
        name: "Should extract Tokyo as city",
      },
      {
        input: "Tell me the temperature in New York",
        expect: { city: "New York" },
        name: "Should handle multi-word city names",
      },
    ],
    executors: [
      {
        model: openai("gpt-4"),
        maxSteps: 3,
      },
    ],
  });

// Run tests directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await weatherAgent.run();

  console.log(`\nTests: ${results.passed}/${results.total} passed`);
  console.log(`Duration: ${results.duration}ms\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Example: Single evaluation
export async function runSingleEval() {
  const result = await prompt("Translate to French").eval("Hello", {
    executor: {
      model: openai("gpt-4-turbo"),
    },
    expect: "Bonjour",
  });

  console.log("Eval result:", result);
  return result;
}
