---
track: review
id: review-03-client-fetch-claude
expect: violation
rule: A1
title: client component calls the Anthropic API directly with a leaked key
---
"use client";

export async function classifyOnClient(txs: unknown) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-6", messages: txs }),
  });
  return res.json();
}
