import { describe, expect, it } from "vitest";
import { isApplePlatform, shortcutLabel } from "./shortcuts";

describe("shortcut labels", () => {
  it("uses Command glyphs on Apple platforms and Ctrl elsewhere", () => {
    expect(shortcutLabel({ key: "Z", mod: true, shift: true }, true)).toBe("⇧⌘Z");
    expect(shortcutLabel({ key: "Z", mod: true, shift: true }, false)).toBe("Ctrl+Shift+Z");
    expect(shortcutLabel({ key: "K", mod: true }, false)).toBe("Ctrl+K");
  });

  it("recognises Apple platforms", () => {
    expect(isApplePlatform("MacIntel")).toBe(true);
    expect(isApplePlatform("iPhone")).toBe(true);
    expect(isApplePlatform("Linux x86_64")).toBe(false);
    expect(isApplePlatform("Win32")).toBe(false);
  });
});
