import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nfdnxysmeeklxodkbqqd.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZG54eXNtZWVrbHhvZGticXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE5OTAxNSwiZXhwIjoyMDk1Nzc1MDE1fQ.Dv5ZpFLx_d022JYDIjYw-2KSIpL6v-nt1V1sWZGoFms";

const COMMONS_REST_SEARCH_URL = "https://commons.wikimedia.org/w/rest.php/v1/search/page";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const REQUEST_DELAY_MS = 250;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3;

const SEARCH_OVERRIDES = {
  食べます: ["eating meal", "person eating food"],
  飲みます: ["drinking water", "person drinking"],
  吸います: ["smoking cigarette", "person inhaling"],
  見ます: ["watching television", "person looking"],
  聞きます: ["listening headphones", "person listening"],
  読みます: ["reading book", "person reading"],
  書きます: ["writing notebook", "person writing"],
  買います: ["shopping", "person buying"],
  撮ります: ["taking photo", "camera photography"],
  ごはん: ["cooked rice", "rice bowl"],
  朝ごはん: ["breakfast meal"],
  昼ごはん: ["lunch meal"],
  晩ごはん: ["dinner meal"],
  パン: ["bread"],
  卵: ["egg"],
  上: ["up arrow"],
  下: ["down arrow"],
  左: ["left arrow"],
  右: ["right arrow"],
  中: ["center symbol", "inside"],
  前: ["front view", "in front"],
  男: ["man"],
  女: ["woman"],
  犬: ["dog"],
  子: ["child"],
  一: ["number one"],
  二: ["number two"],
  三: ["number three"],
  四: ["number four"],
  五: ["number five"],
};

const REMAINING_VOCAB_OVERRIDES = new Map([
  ["そうですか", ["surprised person"]],
  ["見ます、診ます", ["doctor examining patient"]],
  ["片づきます", ["clean room", "tidy room"]],
  ["だれでも", ["crowd of people"]],
  ["よかったら", ["invitation card"]],
  ["いろいろ（な）", ["various objects"]],
  ["しばらくですね", ["old friends meeting"]],
  ["予習します", ["studying textbook"]],
  ["復習します", ["reviewing notes"]],
  ["そのままにします", ["leave as is"]],
  ["人形", ["doll"]],
  ["インフルエンザ", ["influenza virus"]],
  ["逃げます", ["person running away"]],
  ["騒ぎます", ["noisy crowd"]],
  ["下げます", ["down arrow"]],
  ["腐ります", ["rotten fruit"]],
  ["曲", ["music score"]],
  ["毎週", ["weekly calendar"]],
  ["毎月", ["monthly calendar"]],
  ["死にます", ["dead tree"]],
  ["びっくりします", ["surprised face"]],
  ["太ります", ["weight scale"]],
  ["複雑（な）", ["complex machine"]],
  ["大会", ["sports tournament"]],
  ["表", ["table chart"]],
  ["返事", ["reply letter"]],
  ["長さ", ["measuring length"]],
  ["親切にします", ["helping hand"]],
  ["情報", ["information board"]],
  ["幼稚園", ["kindergarten classroom"]],
  ["暖房", ["heater"]],
  ["冷房", ["air conditioner"]],
  ["平和", ["peace dove"]],
  ["目的", ["target goal"]],
  ["論文", ["research paper"]],
  ["楽しみ", ["smiling people"]],
  ["ふろしき", ["furoshiki cloth"]],
  ["そろばん", ["abacus"]],
  ["体温計", ["thermometer"]],
  ["材料", ["cooking ingredients"]],
  ["一生懸命", ["person studying hard"]],
  ["なぜ", ["question mark"]],
  ["濃い", ["dark coffee"]],
  ["薄い", ["thin paper"]],
  ["苦い", ["bitter melon"]],
  ["きつい", ["tight shoes"]],
  ["手伝います", ["helping hands"]],
  ["発表します", ["presentation speaker"]],
  ["実験します", ["science experiment"]],
  ["データ", ["data chart"]],
  ["人口", ["population chart"]],
  ["におい", ["smell aroma"]],
  ["科学", ["science laboratory"]],
  ["医学", ["medical science"]],
  ["文学", ["literature books"]],
  ["～の所", ["location marker"]],
  ["さっき", ["clock recent time"]],
  ["やっと", ["finish line"]],
  ["ついに", ["finish line"],
  ],
  ["もちろん", ["thumbs up"]],
  ["やっぱり", ["thinking person"]],
  ["泣きます", ["crying person"]],
  ["笑います", ["laughing person"]],
  ["乾きます", ["dry clothes"]],
  ["ぬれます", ["wet clothes"]],
  ["滑ります", ["slippery floor"]],
  ["起きます", ["waking up"]],
  ["調節します", ["adjusting knob"]],
  ["安全（な）", ["safety sign"]],
]);

function isUnfinishedImage(url) {
  return !url || !/^https?:\/\//i.test(url) || url.includes("placehold.co");
}

function cleanSearchText(value) {
  return String(value ?? "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[;,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchTerms(item, nameColumn) {
  const itemName = item[nameColumn];
  const terms = [
    ...(REMAINING_VOCAB_OVERRIDES.get(itemName) ?? []),
    ...(SEARCH_OVERRIDES[itemName] ?? []),
    cleanSearchText(item.meaning),
    cleanSearchText(itemName),
    `${cleanSearchText(item.meaning)} object`,
    `${cleanSearchText(item.meaning)} photo`,
  ].filter(Boolean);

  return [...new Set(terms)];
}

function isUsableImage(page) {
  if (!page.thumbnail?.url || !page.thumbnail.mimetype?.startsWith("image/")) {
    return false;
  }
  if (page.thumbnail.mimetype === "image/svg+xml") return false;

  const title = page.title.toLowerCase();
  const blockedWords = ["map", "flag", "logo", "diagram"];
  return !blockedWords.some((word) => title.includes(word));
}

function enlargeThumbnailUrl(url) {
  return url.replace(/\/\d+px-([^/]+)$/i, "/400px-$1");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCommonsJson(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    await sleep(REQUEST_DELAY_MS);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MochiJapaneseLearning/1.0 image lookup",
      },
    });
    const text = await response.text();

    try {
      const result = JSON.parse(text);
      if (!response.ok) {
        throw new Error(result.error?.info || "Wikimedia Commons request failed");
      }
      return result;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          text.startsWith("You are making too many requests")
            ? "Wikimedia rate limit"
            : err.message,
        );
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

async function searchCommonsImage(searchTerm) {
  const params = new URLSearchParams({
    q: searchTerm,
    limit: "10",
  });

  const result = await fetchCommonsJson(`${COMMONS_REST_SEARCH_URL}?${params}`);

  const pages = result.pages ?? [];
  const match = pages.find(isUsableImage);

  if (!match) return null;

  return {
    url: enlargeThumbnailUrl(match.thumbnail.url),
    title: match.title,
  };
}

async function findImageForItem(item, nameColumn) {
  for (const term of buildSearchTerms(item, nameColumn)) {
    const image = await searchCommonsImage(term);
    if (image) {
      return { ...image, searchTerm: term };
    }
  }

  return null;
}

async function processImagesForTable(tableName, nameColumn) {
  console.log(`--- Checking table: ${tableName} ---`);

  const { data: rows, error } = await supabase
    .from(tableName)
    .select(`id, ${nameColumn}, meaning, image_url`);

  if (error) {
    console.log(`Cannot read ${tableName}: ${error.message}`);
    return;
  }

  const items = (rows ?? [])
    .filter((item) => isUnfinishedImage(item.image_url));

  if (items.length === 0) {
    console.log(`${tableName} has no unfinished placeholder images.`);
    return;
  }

  for (const [index, item] of items.entries()) {
    const itemName = item[nameColumn];

    try {
      console.log(
        `[${index + 1}/${items.length}] Searching Wikimedia Commons for: ${itemName}...`,
      );

      const image = await findImageForItem(item, nameColumn);
      if (!image) {
        console.log(`No suitable image found for: ${itemName}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ image_url: image.url })
        .eq("id", item.id);

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log(`Saved ${itemName}: ${image.title} (${image.searchTerm})`);
    } catch (err) {
      console.log(`Failed for ${itemName}: ${err.message}`);
    }
  }
}

async function runAll() {
  console.log("Starting Wikimedia image lookup...");
  await processImagesForTable("vocabulary", "word");
  console.log("Done.");
}

runAll();
