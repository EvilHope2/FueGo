import { describe, expect, it } from "vitest";
import { isTimeInRange } from "./pricing";

function at(hour: number, minute: number) {
  return new Date(2026, 1, 22, hour, minute, 0, 0);
}

describe("isTimeInRange", () => {
  it("excluye 21:00 para regla 22:00-06:00", () => {
    expect(isTimeInRange(at(21, 0), "22:00", "06:00")).toBe(false);
  });

  it("incluye 23:00 para regla 22:00-06:00", () => {
    expect(isTimeInRange(at(23, 0), "22:00", "06:00")).toBe(true);
  });

  it("incluye 05:30 para regla 22:00-06:00", () => {
    expect(isTimeInRange(at(5, 30), "22:00", "06:00")).toBe(true);
  });

  it("excluye 07:00 para regla 22:00-06:00", () => {
    expect(isTimeInRange(at(7, 0), "22:00", "06:00")).toBe(false);
  });
});
