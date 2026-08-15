type EnforcementType = "speed" | "technology" | "interval";

type EnforcementPoint = {
  id: string;
  type: EnforcementType;
  latitude: number;
  longitude: number;
  city: string;
  title: string;
  detail: string;
  direction: string;
  speedLimit: number | null;
  source: string;
};

type SourceDefinition = {
  id: string;
  label: string;
  datasetUrl: string;
  downloadUrl: string;
  parse: (rows: Record<string, string>[]) => EnforcementPoint[];
};

const SOURCES: SourceDefinition[] = [
  {
    id: "npa-speed",
    label: "警政署全國測速執法設置點",
    datasetUrl: "https://data.gov.tw/dataset/7320",
    downloadUrl:
      "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/EA5E6FCD-B82D-43B7-A5CF-E9893253187E/resource/D55FC0C2-AB33-4FFF-9948-D8FCF70D46E0/download",
    parse: parseNationwideSpeed,
  },
  {
    id: "taipei-technology",
    label: "臺北市智慧管理科技執法設備",
    datasetUrl: "https://data.gov.tw/dataset/135957",
    downloadUrl:
      "https://data.taipei/api/dataset/986fa73e-c470-4ebf-9f35-3a1c9d2a8788/resource/4715904f-6ce1-41c2-8a68-3bc5303f3607/download",
    parse: parseTaipeiTechnology,
  },
  {
    id: "new-taipei-interval",
    label: "新北市區間平均速率執法設備",
    datasetUrl: "https://data.gov.tw/dataset/126156",
    downloadUrl:
      "https://data.ntpc.gov.tw/api/datasets/27b97ad9-9dba-4ca9-b0ed-14b29000ffec/csv/file",
    parse: parseNewTaipeiInterval,
  },
  {
    id: "taichung-technology",
    label: "臺中市科技執法取締地點",
    datasetUrl: "https://data.gov.tw/dataset/170673",
    downloadUrl:
      "https://newdatacenter.taichung.gov.tw/api/v1/no-auth/resource.download?rid=b3f58c63-53b3-4c01-8203-2a7afa08bb13",
    parse: parseTaichungTechnology,
  },
];

function clean(value: string | undefined) {
  return (value ?? "").replace(/^\uFEFF+/, "").trim();
}

function numeric(value: string | undefined) {
  const match = clean(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

function coordinateValues(value: string | undefined) {
  return clean(value)
    .match(/-?\d{2,3}(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) ?? [];
}

function validTaiwanCoordinate(latitude: number, longitude: number) {
  return latitude >= 21 && latitude <= 26.5 && longitude >= 118 && longitude <= 123;
}

function parseNationwideSpeed(rows: Record<string, string>[]) {
  return rows.flatMap((row, index): EnforcementPoint[] => {
    const latitude = numeric(row.Latitude);
    const longitude = numeric(row.Longitude);
    if (!validTaiwanCoordinate(latitude, longitude)) return [];
    return [
      {
        id: `npa-speed-${index}`,
        type: "speed",
        latitude,
        longitude,
        city: clean(row.CityName),
        title: clean(row.Address) || "固定測速照相",
        detail: "固定測速照相",
        direction: clean(row.direct),
        speedLimit: Number.isFinite(numeric(row.limit)) ? numeric(row.limit) : null,
        source: "警政署全國測速執法設置點",
      },
    ];
  });
}

function parseTaipeiTechnology(rows: Record<string, string>[]) {
  return rows.flatMap((row, index): EnforcementPoint[] => {
    const latitude = numeric(row["座標-Y"]);
    const longitude = numeric(row["座標-X"]);
    if (!validTaiwanCoordinate(latitude, longitude)) return [];
    const detail = clean(row["取締項目"]);
    return [
      {
        id: `taipei-technology-${index}`,
        type: clean(row["名稱"]).includes("區間") ? "interval" : "technology",
        latitude,
        longitude,
        city: "臺北市",
        title: clean(row["取締路段"]) || clean(row["名稱"]) || "科技執法",
        detail,
        direction: "",
        speedLimit: /(?:速限|限速)\D*(\d+)/.test(detail) ? Number(RegExp.$1) : null,
        source: "臺北市智慧管理科技執法設備",
      },
    ];
  });
}

function parseNewTaipeiInterval(rows: Record<string, string>[]) {
  return rows.flatMap((row, index): EnforcementPoint[] => {
    const latitudes = coordinateValues(row["start latitude"]);
    const longitudes = coordinateValues(row["start longitude"]);
    const count = Math.min(latitudes.length, longitudes.length, 2);
    const points: EnforcementPoint[] = [];
    for (let pointIndex = 0; pointIndex < count; pointIndex += 1) {
      const latitude = latitudes[pointIndex];
      const longitude = longitudes[pointIndex];
      if (!validTaiwanCoordinate(latitude, longitude)) continue;
      points.push({
        id: `new-taipei-interval-${index}-${pointIndex}`,
        type: "interval",
        latitude,
        longitude,
        city: clean(row.cityname) || "新北市",
        title: clean(row.location) || "區間平均速率執法",
        detail: [clean(row.item), clean(row.length)].filter(Boolean).join(" · "),
        direction: clean(row.direct),
        speedLimit: Number.isFinite(numeric(row.limit)) ? numeric(row.limit) : null,
        source: "新北市區間平均速率執法設備",
      });
    }
    return points;
  });
}

function parseTaichungTechnology(rows: Record<string, string>[]) {
  return rows.flatMap((row, index): EnforcementPoint[] => {
    const latitude = numeric(row["緯度"]);
    const longitude = numeric(row["經度"]);
    if (!validTaiwanCoordinate(latitude, longitude)) return [];
    const kind = clean(row["科技執法種類"]);
    const detail = clean(row["取締項目"]);
    return [
      {
        id: `taichung-technology-${index}`,
        type: kind.includes("區間") ? "interval" : "technology",
        latitude,
        longitude,
        city: "臺中市",
        title: clean(row["設置地點"]) || kind || "科技執法",
        detail: [kind, detail].filter(Boolean).join(" · "),
        direction: "",
        speedLimit: /(?:速限)?\s*(\d+)\s*公里/.test(detail) ? Number(RegExp.$1) : null,
        source: "臺中市科技執法取締地點",
      },
    ];
  });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(clean(cell));
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(clean(cell));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(clean(cell));
  if (row.some(Boolean)) rows.push(row);

  const headers = (rows.shift() ?? []).map(clean);
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, clean(values[index])])),
  );
}

function distanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchSource(source: SourceDefinition) {
  const response = await fetch(source.downloadUrl, {
    headers: { accept: "text/csv,text/plain;q=0.9,*/*;q=0.8" },
  });
  if (!response.ok) throw new Error(`${source.label}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buffer);
  if ((text.match(/�/g)?.length ?? 0) > 4) {
    text = new TextDecoder("big5").decode(buffer);
  }
  return source.parse(parseCsv(text));
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const latitude = Number(query.get("lat") ?? 25.036);
  const longitude = Number(query.get("lng") ?? 121.432);
  const radius = Math.min(Math.max(Number(query.get("radius") ?? 35), 2), 80);

  if (!validTaiwanCoordinate(latitude, longitude)) {
    return Response.json({ error: "定位座標不在臺灣範圍" }, { status: 400 });
  }

  const sourceResults = await Promise.allSettled(SOURCES.map(fetchSource));
  const points = sourceResults
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .map((point) => ({
      ...point,
      distanceKm: distanceKm(latitude, longitude, point.latitude, point.longitude),
    }))
    .filter((point) => point.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 600);

  const sources = SOURCES.map((source, index) => ({
    label: source.label,
    url: source.datasetUrl,
    available: sourceResults[index].status === "fulfilled",
    total:
      sourceResults[index].status === "fulfilled"
        ? sourceResults[index].value.length
        : 0,
  }));

  return Response.json(
    {
      points,
      sources,
      radiusKm: radius,
      generatedAt: new Date().toISOString(),
      notice: "僅包含政府已公開且有可用座標的固定設備，資料可能延遲或缺漏。",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400",
      },
    },
  );
}
