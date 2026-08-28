import { useEffect, useMemo, useState } from "react";
import { geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { NATURAL_EARTH_GLOBE_PATH, NATURAL_EARTH_LAND_GEOMETRY } from "@/lib/naturalEarthLand";
export type EarthDirection = "ltr" | "rtl";
export type EarthMotion = "full" | "reduced";
export type EarthDensity = "desktop" | "mobile";

export type EarthHeroPresentation = {
  anchorClass: string;
  sizeClass: string;
  routeClass: string;
  dotLimit: number;
};

export function earthHeroPresentation(direction: EarthDirection, density: EarthDensity): EarthHeroPresentation {
  const mobile = density === "mobile";
  return {
    anchorClass: direction === "rtl" ? "left-[-18%] sm:left-[3%]" : "right-[-18%] sm:right-[3%]",
    sizeClass: mobile ? "h-[320px] w-[320px]" : "h-[520px] w-[520px]",
    routeClass: direction === "rtl" ? "-scale-x-100" : "",
    dotLimit: mobile ? 34 : 58,
  };
}

const naturalEarthLand = NATURAL_EARTH_LAND_GEOMETRY as unknown as GeoPermissibleObjects;
const initialLongitude = -8;
// 56 seconds ÷ 1.10: the requested ten-percent faster turn, without changing projection geometry.
const fullTurnMs = 50_909;

function useEarthLongitude(active: boolean) {
  const [longitude, setLongitude] = useState(initialLongitude);

  useEffect(() => {
    if (!active) {
      setLongitude(initialLongitude);
      return;
    }

    let frame = 0;
    let lastCommit = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      if (now - lastCommit >= 96) {
        setLongitude(initialLongitude - (((now - startedAt) / fullTurnMs) * 360));
        lastCommit = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return longitude;
}

function ContinentalSurface({ longitude, patternId }: { longitude: number; patternId: string }) {
  const landPath = useMemo(() => {
    const projection = geoOrthographic()
      .rotate([longitude, -15])
      .translate([120, 120])
      .scale(92)
      .precision(.2)
      .clipAngle(90);
    return geoPath(projection).digits(2)(naturalEarthLand) ?? NATURAL_EARTH_GLOBE_PATH;
  }, [longitude]);

  return <g><path d={landPath} fill={`url(#${patternId})`} stroke="rgba(241, 241, 241,.22)" strokeWidth=".45" opacity=".9" /></g>;
}

export function DottedEarthHero({ direction, motion, density, active }: { direction: EarthDirection; motion: EarthMotion; density: EarthDensity; active: boolean }) {
  const presentation = earthHeroPresentation(direction, density);
  const allowMotion = motion === "full" && active;
  const longitude = useEarthLongitude(allowMotion);
  return <div aria-hidden className={`pointer-events-none absolute z-0 ${presentation.anchorClass} top-[5.5rem] sm:top-[7rem] ${presentation.sizeClass}`}>
    <svg viewBox="0 0 240 240" className={`h-full w-full overflow-visible ${presentation.routeClass}`} fill="none">
      <defs>
        <clipPath id={`earth-mask-${direction}-${density}`}><circle cx="120" cy="120" r="92" /></clipPath>
        <pattern id={`earth-points-${direction}-${density}`} width={density === "mobile" ? 5.6 : 4.2} height={density === "mobile" ? 5.6 : 4.2} patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.4" r={density === "mobile" ? ".75" : ".62"} fill="#f1f1f1" /><circle cx="4.5" cy="3.8" r={density === "mobile" ? ".36" : ".28"} fill="#f1f1f1" opacity=".66" /></pattern>
        <radialGradient id={`earth-base-${direction}-${density}`} cx="35%" cy="27%" r="74%"><stop stopColor="#555555" stopOpacity=".48" /><stop offset=".45" stopColor="#1d1d1d" stopOpacity=".95" /><stop offset="1" stopColor="#090909" /></radialGradient>
        <radialGradient id={`earth-light-${direction}-${density}`} cx="38%" cy="30%" r="50%"><stop stopColor="#f1f1f1" stopOpacity=".36" /><stop offset=".5" stopColor="#e0e0e0" stopOpacity=".08" /><stop offset="1" stopColor="#f1f1f1" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="120" cy="120" rx="113" ry="99" stroke="rgba(241, 241, 241,.18)" strokeWidth=".55" />
      <ellipse cx="120" cy="120" rx="106" ry="92" stroke="rgba(241, 241, 241,.10)" strokeWidth=".45" strokeDasharray="2 4" />
      <g clipPath={`url(#earth-mask-${direction}-${density})`}>
        <circle cx="120" cy="120" r="92" fill={`url(#earth-base-${direction}-${density})`} />
        <ContinentalSurface patternId={`earth-points-${direction}-${density}`} longitude={longitude} />
        <g opacity=".12"><ellipse cx="120" cy="120" rx="58" ry="92" stroke="#f1f1f1" strokeWidth=".45" /><ellipse cx="120" cy="120" rx="78" ry="92" stroke="#f1f1f1" strokeWidth=".35" /><path d="M30 84c51 18 99 18 180 0M28 121c54 12 107 12 184 0M34 158c47-17 101-17 172 0" stroke="#f1f1f1" strokeWidth=".35" /></g>
        <circle cx="120" cy="120" r="92" fill={`url(#earth-light-${direction}-${density})`} />
      </g>
      <circle cx="120" cy="120" r="92" stroke="rgba(241, 241, 241,.36)" strokeWidth=".65" />
      <g opacity=".42"><path d="M-5 157C47 115 91 91 140 97c41 5 67 29 105 8" stroke="rgba(241, 241, 241,.46)" strokeWidth=".55" /><path d="M0 55c62 27 105 20 144 2 43-20 66-12 99 23" stroke="rgba(241, 241, 241,.30)" strokeWidth=".45" strokeDasharray="1.5 4" /></g>
      {allowMotion && <><circle className="nf-earth-route-dot" cx="148" cy="103" r="1.35" fill="#f1f1f1" /><circle className="nf-earth-route-dot" cx="126" cy="67" r="1.05" fill="#f1f1f1" /></>}
    </svg>
  </div>;
}
