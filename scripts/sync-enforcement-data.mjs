import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "mobile/assets/enforcement.json");
const apiBase = process.env.ENFORCEMENT_API_URL ?? "http://localhost:3000/api/enforcement";

const centers = [
  { name: "北北基桃", latitude: 25.05, longitude: 121.49 },
  { name: "新竹苗栗", latitude: 24.71, longitude: 120.98 },
  { name: "臺中彰化南投", latitude: 24.15, longitude: 120.68 },
  { name: "雲林嘉義", latitude: 23.56, longitude: 120.43 },
  { name: "臺南高雄", latitude: 22.78, longitude: 120.28 },
  { name: "屏東", latitude: 22.55, longitude: 120.55 },
  { name: "宜蘭花蓮", latitude: 24.11, longitude: 121.51 },
  { name: "臺東", latitude: 22.76, longitude: 121.14 },
];

async function loadArea(center) {
  const url = new URL(apiBase);
  url.searchParams.set("lat", String(center.latitude));
  url.searchParams.set("lng", String(center.longitude));
  url.searchParams.set("radius", "80");
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${center.name}：API 回傳 ${response.status}`);
  return response.json();
}

const snapshots = await Promise.all(centers.map(loadArea));
const byId = new Map();
for (const snapshot of snapshots) {
  for (const point of snapshot.points ?? []) byId.set(point.id, point);
}

const sources = [...new Map(
  snapshots.flatMap((snapshot) => snapshot.sources ?? []).map((source) => [source.label, source]),
).values()];

const payload = {
  generatedAt: new Date().toISOString(),
  notice: "政府公開固定設備離線快照；可能延遲或缺漏，請以現場標誌、號誌與速限為準。",
  sources,
  points: [...byId.values()].sort((a, b) => a.city.localeCompare(b.city, "zh-Hant")),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`已寫入 ${payload.points.length} 筆設備：${outputPath}`);
