import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", ...(init.headers ?? {}) },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("returns an immediate Shortcut decision from cropped OCR text", async () => {
  const response = await render("/api/quick-decision", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      text: "包裹 $795 4.95 包含基本報酬加成 $136.00 總計 1 小時 3 分鐘 (29.8 公里)",
    }),
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.signal, "yellow");
  assert.equal(result.action, "看情況");
  assert.equal(result.amount, 795);
  assert.equal(result.distance, 29.8);
  assert.equal(result.minutes, 63);
  assert.equal(result.returnMode, "full");
  assert.equal(result.returnRisk, true);
  assert.equal(result.effectiveDistance, 59.6);
  assert.equal(result.effectiveMinutes, 126);
  assert.match(result.message, /^看情況｜淨時薪 \$293｜每公里 \$13\.3$/);
});

test("server-renders the mobile-first product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>接單雷達｜手機外送判單工具<\/title>/i);
  assert.match(html, /接單雷達/);
  assert.match(html, /跑單不靠猜/);
  assert.match(html, /每張單先看懂/);
  assert.match(html, /iPhone 測試版/);
  assert.match(html, /Android 測試版/);
  assert.match(html, /導航與執法提醒/);
  assert.match(html, /免安裝備用工具/);
  assert.match(html, /只放在手機 App/);
  assert.match(html, /Expo Go 封閉測試中/);
  assert.match(html, /當地續跑/);
  assert.match(html, /回附近熱區/);
  assert.match(html, /原路空返/);
  assert.doesNotMatch(html, /Apple 地圖導航|Google 地圖導航|開啟完整地圖/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("publishes App Store privacy, terms, and support pages", async () => {
  const [privacyResponse, termsResponse, supportResponse] = await Promise.all([
    render("/privacy"),
    render("/terms"),
    render("/support"),
  ]);
  const [privacy, terms, support] = await Promise.all([
    privacyResponse.text(),
    termsResponse.text(),
    supportResponse.text(),
  ]);

  assert.equal(privacyResponse.status, 200);
  assert.equal(termsResponse.status, 200);
  assert.equal(supportResponse.status, 200);
  assert.match(privacy, /座標在手機本機與離線設備資料比對/);
  assert.match(terms, /不是緊急救援/);
  assert.match(support, /資料與帳號/);
});

test("uses official fixed-enforcement datasets and publishes their coverage", async () => {
  const source = await readFile(new URL("../app/api/enforcement/route.ts", import.meta.url), "utf8");

  assert.match(source, /data\.gov\.tw\/dataset\/7320/);
  assert.match(source, /data\.gov\.tw\/dataset\/135957/);
  assert.match(source, /data\.gov\.tw\/dataset\/126156/);
  assert.match(source, /data\.gov\.tw\/dataset\/124139/);
  assert.match(source, /data\.gov\.tw\/dataset\/178144/);
  assert.match(source, /data\.gov\.tw\/dataset\/178159/);
  assert.match(source, /data\.gov\.tw\/dataset\/178168/);
  assert.match(source, /data\.gov\.tw\/dataset\/173210/);
  assert.match(source, /data\.gov\.tw\/dataset\/170673/);
  assert.match(source, /query\.get\("all"\) === "1"/);
  assert.match(source, /max-age=1800/);
});

test("shares one decision engine between the website and mobile app", async () => {
  const [manifestText, source] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../shared/order-engine.ts", import.meta.url), "utf8"),
  ]);
  const [landing, mobileEngine, quickDecision] = await Promise.all([
    readFile(new URL("../app/ProductLanding.tsx", import.meta.url), "utf8"),
    readFile(new URL("../mobile/src/order-engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/quick-decision/route.ts", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.name, "接單雷達");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.match(source, /fuelPrice:\s*30\.5/);
  assert.match(source, /fuelEconomy:\s*44\.8/);
  assert.match(source, /cashCostPerKm:\s*1\.6/);
  assert.match(source, /fullCostPerKm:\s*3/);
  assert.match(source, /greenHourly:\s*250/);
  assert.match(source, /yellowHourly:\s*200/);
  assert.match(landing, /\.\.\/shared\/order-engine/);
  assert.match(mobileEngine, /\.\.\/\.\.\/shared\/order-engine/);
  assert.match(quickDecision, /\.\.\/\.\.\/\.\.\/shared\/order-engine/);
});

test("configures signed-in cloud records and beta feedback storage", async () => {
  const [hostingText, migration] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_tidy_sabretooth.sql", import.meta.url), "utf8"),
  ]);
  const hosting = JSON.parse(hostingText);

  assert.equal(hosting.d1, "DB");
  assert.match(migration, /CREATE TABLE `profiles`/);
  assert.match(migration, /CREATE TABLE `orders`/);
  assert.match(migration, /CREATE TABLE `feedback`/);
  assert.match(migration, /idx_orders_user_created/);
});

test("ships an opt-in anonymous market data pipeline", async () => {
  const [schema, route, onboarding] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/data-program/contributions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../mobile/src/screens/OnboardingScreen.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /market_contributions/);
  assert.match(schema, /idx_market_area_hour/);
  assert.match(route, /CONSENT_VERSION = "2026-08-15-v1"/);
  assert.match(route, /payload\.areaLat === null/);
  assert.match(onboarding, /暫不加入，資料只留手機/);
  assert.match(onboarding, /約 2 公里的區域/);
});
