import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "mobile/assets/enforcement.json");
const apiBase = process.env.ENFORCEMENT_API_URL ?? "http://localhost:3000/api/enforcement";

const requiredNorthSources = [
  "警政署全國測速執法設置點",
  "臺北市智慧管理科技執法設備",
  "新北市區間平均速率執法設備",
  "新北市違規停車自動偵測系統",
  "桃園市科技執法設備地點",
  "基隆市科技執法取締地點",
  "基隆市區間平均速率執法",
  "新竹市科技執法點位資訊",
  "新竹縣違規停車自動執法設備",
];

async function loadSnapshot() {
  const url = new URL(apiBase);
  url.searchParams.set("all", "1");
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`執法資料 API 回傳 ${response.status}`);
  return response.json();
}

const snapshot = await loadSnapshot();
const missingNorthSources = requiredNorthSources.filter((label) => {
  const source = snapshot.sources?.find((candidate) => candidate.label === label);
  return !source?.available || source.total < 1;
});
if (missingNorthSources.length) {
  throw new Error(`北部官方資料未完整載入：${missingNorthSources.join("、")}`);
}

const byId = new Map();
for (const point of snapshot.points ?? []) byId.set(point.id, point);

const payload = {
  generatedAt: new Date().toISOString(),
  notice: "政府公開固定設備離線快照；可能延遲或缺漏，請以現場標誌、號誌與速限為準。",
  sources: snapshot.sources ?? [],
  points: [...byId.values()].sort((a, b) => a.city.localeCompare(b.city, "zh-Hant")),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`已寫入 ${payload.points.length} 筆設備：${outputPath}`);
