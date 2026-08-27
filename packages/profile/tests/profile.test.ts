import { describe, expect, it } from "vitest";
import { isEnsName, shortAddress } from "../src";

describe("profile primitives", () => {
  it("recognizes a basic ENS name", () => {
    expect(isEnsName("nightshift.eth")).toBe(true);
    expect(isEnsName("not-a-name")).toBe(false);
  });

  it("shortens long addresses", () => {
    expect(shortAddress("1234567890", 2)).toBe("12…90");
  });
});
