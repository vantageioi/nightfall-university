import { readFile, writeFile } from "node:fs/promises";
import { geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const sourcePath = "/home/ubuntu/nightfall-geo-tmp/land-110m.json";
const outputPath = "/home/ubuntu/modular-ai-secretary/client/src/lib/naturalEarthLand.ts";
const topology = JSON.parse(await readFile(sourcePath, "utf8"));
const decoded = feature(topology, topology.objects.land);
const geometry = decoded.type === "Feature" ? decoded.geometry : decoded;
const projection = geoOrthographic()
  .rotate([-8, -15])
  .translate([120, 120])
  .scale(92)
  .precision(0.2)
  .clipAngle(90);
const path = geoPath(projection).digits(2)(decoded);
if (!path) throw new Error("Natural Earth land geometry did not produce an orthographic SVG path.");

await writeFile(outputPath, `// Derived from Natural Earth 1:110m land geometry via world-atlas. Public domain.\n// Source: https://www.naturalearthdata.com/\n// Static source geometry only: the browser reprojects this locally for the hero's orthographic surface turn.\nexport const NATURAL_EARTH_LAND_GEOMETRY = ${JSON.stringify(geometry)} as const;\n\n// Initial Europe/Africa view, retained for fallback and regression checks.\nexport const NATURAL_EARTH_GLOBE_PATH = ${JSON.stringify(path)} as const;\n`);
console.log(`Wrote ${outputPath} (${path.length} SVG path characters).`);
