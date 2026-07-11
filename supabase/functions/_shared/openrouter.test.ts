import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { CLAUDE_HAIKU_MODEL, DEEPSEEK_MODEL, estimateOpenRouterReservationEur, normalizeChatMessages, selectModel } from './openrouter.ts';

Deno.test('selectModel uses deterministic automatic routing and downgrades expensive AI-tier calls when budget is low', () => {
  assertEquals(selectModel({ taskType: 'ocr_cleanup', userChoice: 'auto', tier: 'ai', remainingBudgetEur: 1 }).model, DEEPSEEK_MODEL);
  assertEquals(selectModel({ taskType: 'summarize', inputLength: 4000, userChoice: 'auto', tier: 'family_pro', remainingBudgetEur: 1 }).model, CLAUDE_HAIKU_MODEL);

  const downgraded = selectModel({ taskType: 'rewrite', userChoice: 'auto', tier: 'ai', remainingBudgetEur: 0.01 });
  assertEquals(downgraded.model, DEEPSEEK_MODEL);
  assertEquals(downgraded.downgraded, true);
});

Deno.test('selectModel bypasses automatic routing for explicit user choice', () => {
  const selected = selectModel({ taskType: 'rewrite', userChoice: 'deepseek/deepseek-v3.2', tier: 'ai', remainingBudgetEur: 0 });
  assertEquals(selected.model, DEEPSEEK_MODEL);
  assertEquals(selected.reason, 'user_choice');
});

Deno.test('normalizeChatMessages accepts bounded OpenAI-compatible messages', () => {
  assertEquals(normalizeChatMessages([{ role: 'USER', content: 'Bonjour' }]), [{ role: 'user', content: 'Bonjour' }]);
});

Deno.test('normalizeChatMessages rejects malformed or oversized payloads', () => {
  assertThrows(() => normalizeChatMessages([]), Error, 'messages must contain between 1 and 32 items');
  assertThrows(() => normalizeChatMessages([{ role: 'admin', content: 'x' }]), Error, 'Invalid message role');
  assertThrows(() => normalizeChatMessages([{ role: 'user', content: 'x'.repeat(20_001) }]), Error, 'Invalid message content');
});

Deno.test('estimateOpenRouterReservationEur reserves a bounded worst-case amount before provider calls', () => {
  const short = estimateOpenRouterReservationEur({
    messages: [{ role: 'user', content: 'Bonjour' }],
    maxTokens: 800,
  });
  const long = estimateOpenRouterReservationEur({
    messages: [{ role: 'user', content: 'x'.repeat(12_000) }],
    maxTokens: 2_000,
  });

  assertEquals(short > 0, true);
  assertEquals(long > short, true);
  assertEquals(long <= 0.05, true);
});
