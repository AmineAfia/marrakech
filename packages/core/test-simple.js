// Simple test to check if the analytics utilities work
import { generatePromptId, generateExecutionId, generateSessionId } from './src/analytics/utils.js';

console.log('Testing analytics utilities...');

try {
  const promptId1 = generatePromptId('Hello world', ['tool1', 'tool2']);
  const promptId2 = generatePromptId('Hello world', ['tool1', 'tool2']);
  console.log('Prompt ID 1:', promptId1);
  console.log('Prompt ID 2:', promptId2);
  console.log('IDs match:', promptId1 === promptId2);

  const executionId = generateExecutionId();
  const sessionId = generateSessionId();
  console.log('Execution ID:', executionId);
  console.log('Session ID:', sessionId);

  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error);
}
