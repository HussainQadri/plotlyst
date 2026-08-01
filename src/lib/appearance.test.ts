import { describe, expect, it } from "vitest";
import { appearanceBootstrapScript, appearanceStorageKey, resolveAppearance } from "./appearance";

describe("resolveAppearance", () => {
  it("honours an explicit stored choice over the system preference", () => {
    expect(resolveAppearance("light", true)).toBe("light");
    expect(resolveAppearance("dark", false)).toBe("dark");
  });

  it("follows the system when nothing is stored", () => {
    expect(resolveAppearance(null, true)).toBe("dark");
    expect(resolveAppearance(null, false)).toBe("light");
  });

  it("ignores unrecognised stored values", () => {
    expect(resolveAppearance("sepia", true)).toBe("dark");
    expect(resolveAppearance("", false)).toBe("light");
  });
});

describe("appearanceBootstrapScript", () => {
  it("reads the same key the runtime writes", () => {
    expect(appearanceBootstrapScript).toContain(appearanceStorageKey);
  });

  it("cannot throw in privacy modes that block storage", () => {
    expect(appearanceBootstrapScript.startsWith("try{")).toBe(true);
    expect(appearanceBootstrapScript).toContain("catch(e)");
  });
});
