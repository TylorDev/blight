import { describe, expect, it } from "vitest";
import {
  calculateAverageCost,
  calculateQuantity,
  calculateTotal,
  formatThousands,
  normalizeThousandsInput,
  parseThousands
} from "../../src/number-format";

describe("number-format", () => {
  it.each([
    ["10000", "10.000"],
    ["254000", "254.000"],
    ["4500100", "4.500.100"]
  ])("formats %s as %s", (input, output) => {
    expect(formatThousands(input)).toBe(output);
  });

  it("parses formatted values back to numbers", () => {
    expect(parseThousands("10.000")).toBe(10000);
  });

  it("allows empty input while typing", () => {
    expect(formatThousands("")).toBe("");
    expect(parseThousands("")).toBe(0);
  });

  it("removes non-numeric characters before formatting", () => {
    expect(normalizeThousandsInput("abc4.500,100xyz")).toBe("4.500.100");
  });

  it("removes leading zeroes before formatting", () => {
    expect(formatThousands("0001234")).toBe("1.234");
  });

  it("normalizes and parses mixed currency text", () => {
    expect(normalizeThousandsInput("$1.200abc")).toBe("1.200");
    expect(parseThousands("$1.200abc")).toBe(1200);
  });

  it("calculates average cost from quantity and total", () => {
    expect(calculateAverageCost(10, 5000)).toBe(500);
    expect(calculateAverageCost(0, 5000)).toBe(0);
  });

  it("calculates total from quantity and average cost", () => {
    expect(calculateTotal(10, 500)).toBe(5000);
    expect(calculateTotal(10, 0)).toBe(0);
  });

  it("calculates quantity from total and average cost", () => {
    expect(calculateQuantity(5000, 500)).toBe(10);
    expect(calculateQuantity(5000, 0)).toBe(0);
  });
});
