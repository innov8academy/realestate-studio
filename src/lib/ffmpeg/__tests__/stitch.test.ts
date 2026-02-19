import { describe, it, expect } from "vitest";
import { computeEasingLUT } from "../stitch";

describe("computeEasingLUT", () => {
  it("returns empty array for 0 frames", () => {
    expect(computeEasingLUT("linear", 0)).toEqual([]);
  });

  it("returns [0] for 1 frame", () => {
    expect(computeEasingLUT("linear", 1)).toEqual([0]);
  });

  it("produces identity mapping for linear easing", () => {
    const lut = computeEasingLUT("linear", 11);
    // Linear: each output frame maps to itself
    expect(lut).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("produces correct length for all standard presets", () => {
    const presets = [
      "easeInQuad",
      "easeOutQuad",
      "easeInOutSine",
      "easeInOutCubic",
      "easeInOutExpo",
    ];

    for (const preset of presets) {
      const lut = computeEasingLUT(preset, 30);
      expect(lut).toHaveLength(30);
      // First frame should always map to 0
      expect(lut[0]).toBe(0);
      // Last frame should always map to last source frame
      expect(lut[29]).toBe(29);
      // All values should be valid frame indices
      for (const val of lut) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(30);
      }
    }
  });

  it("easeInQuad starts slow (early frames cluster near 0)", () => {
    const lut = computeEasingLUT("easeInQuad", 100);
    // At 10% output progress, source should be less than 10% (starts slow)
    expect(lut[10]).toBeLessThan(10);
    // At 90% output progress, source should be greater than 90% (ends fast)
    expect(lut[90]).toBeGreaterThan(80);
  });

  it("easeOutQuad ends slow (late frames cluster near end)", () => {
    const lut = computeEasingLUT("easeOutQuad", 100);
    // At 10% output progress, source should advance faster than linear
    expect(lut[10]).toBeGreaterThan(10);
  });

  it("falls back to linear for unknown easing", () => {
    const lut = computeEasingLUT("nonexistent", 5);
    expect(lut).toEqual([0, 1, 2, 3, 4]);
  });
});
