import { describe, expect, it } from "vitest";
import { buildLabelLines, defaultChartSettings, formatValue, normalizeChartSettings } from "./labels";
import type { NumberFormatSettings } from "./types";

const moneyFormat: NumberFormatSettings = {
  decimals: 1,
  scale: "millions",
  prefix: "$",
  suffix: "",
  showPlus: true,
  negativeStyle: "parentheses"
};

describe("label formatting", () => {
  it("formats scaled values with plus signs and parentheses", () => {
    expect(formatValue(1250000, moneyFormat, { valueSign: "auto" })).toBe("+$1.3m");
    expect(formatValue(-1250000, moneyFormat, { valueSign: "auto" })).toBe("($1.3m)");
    expect(formatValue(1250000, moneyFormat, { valueSign: "plain" })).toBe("$1.3m");
  });

  it("builds multiline labels from selected content fields", () => {
    const settings = defaultChartSettings("pie");
    settings.labelContent = {
      ...settings.labelContent,
      fields: ["label", "value", "percent"],
      separator: "newline",
      percentDecimals: 1
    };

    expect(buildLabelLines({ label: "Enterprise", value: 42, percentage: 0.42, settings })).toEqual([
      "Enterprise",
      "42",
      "42.0%"
    ]);
  });

  it("normalizes legacy showValues projects into label fields", () => {
    const hiddenValues = normalizeChartSettings({ showTitle: false, showLegend: true, showValues: false }, "waterfall");
    const visibleValues = normalizeChartSettings({ showValues: true }, "waterfall");

    expect(hiddenValues.showTitle).toBe(false);
    expect(hiddenValues.labelContent.fields).toEqual(["label"]);
    expect(visibleValues.labelContent.fields).toEqual(["label", "value"]);
    expect(visibleValues.labelContent.valueFormat.showPlus).toBe(true);
  });
});
