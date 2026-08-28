import { describe, expect, it } from "vitest";
import { NATURAL_EARTH_GLOBE_PATH, NATURAL_EARTH_LAND_GEOMETRY } from "@/lib/naturalEarthLand";
import { earthHeroPresentation } from "./DottedEarthHero";

describe("DottedEarthHero presentation contract", () => {
  it("uses a deliberately distinct RTL anchor and route direction", () => {
    expect(earthHeroPresentation("rtl", "desktop")).toMatchObject({ anchorClass: expect.stringContaining("left"), routeClass: "-scale-x-100" });
    expect(earthHeroPresentation("ltr", "desktop")).toMatchObject({ anchorClass: expect.stringContaining("right"), routeClass: "" });
  });

  it("reduces sampled density and scale for mobile", () => {
    const desktop = earthHeroPresentation("ltr", "desktop");
    const mobile = earthHeroPresentation("ltr", "mobile");
    expect(mobile.dotLimit).toBeLessThan(desktop.dotLimit);
    expect(mobile.sizeClass).toContain("320px");
  });

  it("ships a compact orthographic land surface rather than a runtime map request", () => {
    expect(NATURAL_EARTH_GLOBE_PATH).toMatch(/^M/);
    expect(NATURAL_EARTH_GLOBE_PATH.length).toBeGreaterThan(10_000);
    expect(NATURAL_EARTH_GLOBE_PATH.match(/M/g)?.length).toBeGreaterThan(20);
    expect(NATURAL_EARTH_LAND_GEOMETRY.type).toBe("FeatureCollection");
    expect(NATURAL_EARTH_LAND_GEOMETRY.features[0]?.geometry.type).toBe("MultiPolygon");
  });
});
