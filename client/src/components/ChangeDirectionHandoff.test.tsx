import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChangeDirectionHandoff } from "./ChangeDirectionHandoff";

describe("ChangeDirectionHandoff", () => {
  it("opens with free-text recovery rather than a programme menu", () => {
    const markup = renderToStaticMarkup(<ChangeDirectionHandoff language="en" onContinue={() => {}} onBack={() => {}} />);
    expect(markup).toContain("Tell me what changed.");
    expect(markup).toContain("Biotech");
    expect(markup).toContain("I got rejected");
    expect(markup).toContain("Continue the conversation");
    expect(markup).not.toContain("Show me more options");
  });
});
