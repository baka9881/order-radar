import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
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

test("server-renders the order calculator", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>接單雷達｜外送訂單試算<\/title>/i);
  assert.match(html, /接單雷達/);
  assert.match(html, /勁戰七代 125 ABS/);
  assert.match(html, /輸入派單資訊/);
  assert.match(html, /貼上 OCR 文字/);
  assert.match(html, /你真正留下多少/);
  assert.match(html, /核心免費，進階分析才收費/);
  assert.match(html, /哪個功能值得你付費/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("ships installable metadata and the current calculator defaults", async () => {
  const [manifestText, source] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../app/OrderCalculator.tsx", import.meta.url), "utf8"),
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
