import { describe, it, expect } from "vitest";
import {
  parseLocalDate,
  mondayOf,
  addDays,
  toLocalDateString,
  sameDate,
} from "./dateUtils";

describe("parseLocalDate", () => {
  it("returns a date in local time, not UTC", () => {
    const d = parseLocalDate("2026-04-17");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April — zero-indexed
    expect(d.getDate()).toBe(17);
    // Hours should be 0 in local time
    expect(d.getHours()).toBe(0);
  });

  it("round-trips with toLocalDateString", () => {
    const iso = "2026-12-31";
    expect(toLocalDateString(parseLocalDate(iso))).toBe(iso);
  });
});

describe("mondayOf", () => {
  it("returns the Monday of the given week when called on a Wednesday", () => {
    const wed = new Date(2026, 3, 15); // Wed Apr 15, 2026
    const mon = mondayOf(wed);
    expect(mon.getDate()).toBe(13);
    expect(mon.getDay()).toBe(1); // Monday
  });

  it("returns the same Monday when called on a Monday", () => {
    const mon = new Date(2026, 3, 13); // Mon Apr 13, 2026
    const result = mondayOf(mon);
    expect(result.getDate()).toBe(13);
  });

  it("returns the previous Monday when called on a Sunday", () => {
    const sun = new Date(2026, 3, 19); // Sun Apr 19, 2026
    const result = mondayOf(sun);
    expect(result.getDate()).toBe(13);
    expect(result.getDay()).toBe(1);
  });

  it("zeroes out the time portion", () => {
    const someday = new Date(2026, 3, 15, 14, 30, 45);
    const mon = mondayOf(someday);
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
    expect(mon.getSeconds()).toBe(0);
    expect(mon.getMilliseconds()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const base = new Date(2026, 3, 15);
    expect(addDays(base, 7).getDate()).toBe(22);
  });

  it("handles month rollover", () => {
    const base = new Date(2026, 3, 28); // Apr 28
    const result = addDays(base, 5); // May 3
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(3);
  });

  it("handles negative days", () => {
    const base = new Date(2026, 3, 3);
    const result = addDays(base, -5); // Mar 29
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(29);
  });

  it("does not mutate the input", () => {
    const base = new Date(2026, 3, 15);
    const original = base.getDate();
    addDays(base, 7);
    expect(base.getDate()).toBe(original);
  });
});

describe("toLocalDateString", () => {
  it("pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5); // Jan 5, 2026
    expect(toLocalDateString(d)).toBe("2026-01-05");
  });

  it("uses local date even when UTC would shift it", () => {
    // 11:30 PM local on Apr 17 — UTC might be Apr 18 in some zones
    const d = new Date(2026, 3, 17, 23, 30);
    expect(toLocalDateString(d)).toBe("2026-04-17");
  });
});

describe("sameDate", () => {
  it("returns true for two different Date objects on the same day", () => {
    const a = new Date(2026, 3, 17, 8);
    const b = new Date(2026, 3, 17, 22);
    expect(sameDate(a, b)).toBe(true);
  });

  it("returns false for adjacent days", () => {
    const a = new Date(2026, 3, 17);
    const b = new Date(2026, 3, 18);
    expect(sameDate(a, b)).toBe(false);
  });
});
