---
track: review
id: review-04-freeform-category
expect: violation
rule: fixed-category-enum
title: classification schema lets the model emit any category string
---
// services/classify.ts — building the structured-output schema
const classificationSchema = {
  type: "array",
  items: {
    type: "object",
    required: ["category"],
    properties: {
      // free-form string: the model can invent arbitrary categories
      category: { type: "string" },
    },
  },
} as const;
