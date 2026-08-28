import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EssayStudio } from "./EssayStudio";

describe("EssayStudio", () => {
  it("uses a real free-text essay brief and explicitly refuses to fabricate a draft when Gemini is unavailable", () => {
    const markup = renderToStaticMarkup(<EssayStudio language="en" available={false} isGenerating={false} onGenerate={async () => ({ title: "", body: "", wordCount: 0, category: "", reviewNote: "" })} />);
    expect(markup).toContain("Paste the exact essay prompt");
    expect(markup).toContain("Nightfall will not fabricate a draft.");
    expect(markup).toContain("It never submits anything.");
    expect(markup).toContain("disabled");
  });
});
