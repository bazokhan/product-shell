import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BranchProvider, useBranchQuery } from "./branch-context";

function Probe() {
  return createElement("span", null, JSON.stringify(useBranchQuery()));
}

describe("branch filter", () => {
  it("starts on all branches (no branchId sent)", () => {
    expect(renderToStaticMarkup(createElement(BranchProvider, null, createElement(Probe)))).toBe("<span>{}</span>");
  });
});
