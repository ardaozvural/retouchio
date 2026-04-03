require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { resolveBatchOutputWriteDir } = require("./prompt_system/compiler/batchOutputPaths");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Kullanım:
// node batch_poll_download.js batches/xxx
const BATCH_JOB_NAME = process.argv[2];

if (!BATCH_JOB_NAME) {
  console.error("❌ Kullanım: node batch_poll_download.js <BATCH_JOB_NAME>");
  process.exit(1);
}

async function saveFileByName(fileName, targetPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY eksik.");

  const url = `https://generativelanguage.googleapis.com/download/v1beta/${fileName}:download?alt=media`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
}

async function main() {
  const outputTarget = resolveBatchOutputWriteDir(__dirname, BATCH_JOB_NAME);
  if (!fs.existsSync(outputTarget.outputRoot)) {
    fs.mkdirSync(outputTarget.outputRoot, { recursive: true });
  }
  const outputDir = outputTarget.outputDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const job = await ai.batches.get({ name: BATCH_JOB_NAME });

  console.log("BATCH_JOB_NAME =", job.name);
  console.log("STATE =", job.state);

  if (job.error) {
    console.error("❌ Batch error:", JSON.stringify(job.error, null, 2));
    process.exit(1);
  }

  if (job.state !== "JOB_STATE_SUCCEEDED") {
    console.log("⏳ Henüz bitmedi. Biraz sonra tekrar çalıştır.");
    return;
  }

  const dest = job.dest;
  if (!dest) {
    throw new Error("Batch tamamlandı ama dest bilgisi yok.");
  }

  const jsonlName =
    dest.fileName ||
    dest.outputFile ||
    dest.outputUri ||
    dest.name;

  if (!jsonlName) {
    throw new Error("Output file adı bulunamadı.");
  }

  const localJsonl = path.join(outputDir, "batch_result.jsonl");
  await saveFileByName(jsonlName, localJsonl);

  console.log("✅ JSONL indirildi:", localJsonl);

  const lines = fs
    .readFileSync(localJsonl, "utf8")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  let savedCount = 0;

  for (const line of lines) {
    const row = JSON.parse(line);
    const key = row.key || `item_${savedCount + 1}`;

    const parts =
      row.response?.candidates?.[0]?.content?.parts ||
      row.response?.content?.parts ||
      [];

    const imgPart = parts.find((p) => p.inlineData?.data);

    if (!imgPart) {
      console.log(`⚠️ Görsel yok: ${key}`);
      continue;
    }

    const outPath = path.join(outputDir, `${key}.png`);
    fs.writeFileSync(outPath, Buffer.from(imgPart.inlineData.data, "base64"));
    console.log(`✅ Kaydedildi: ${outPath}`);
    savedCount++;
  }

  const relativeOutDir = path.relative(__dirname, outputDir) || "batch_output";
  console.log(`🎉 Tamamlandı. Toplam ${savedCount} görsel ${relativeOutDir}/ içine yazıldı.`);
}

main().catch((err) => {
  console.error("❌ POLL/DOWNLOAD ERROR:", err?.message || err);
  process.exit(1);
});
