import express from "express";
import fs from "node:fs";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

function readJSONFiles(dir) {
  let records = [];

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === ".git" || item.name === "node_modules") continue;

    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      records.push(...readJSONFiles(fullPath));
    } else if (item.isFile() && item.name.toLowerCase().endsWith(".json")) {
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        records.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      } catch {
        console.log(`Skipped invalid JSON: ${item.name}`);
      }
    }
  }

  return records;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let database = [];

function loadDatabase() {
  database = readJSONFiles(ROOT).filter(
    item =>
      item &&
      typeof item === "object" &&
      typeof (item.answer ?? item.eko) === "string"
  );

  console.log(`Loaded ${database.length} answers.`);
}

app.get("/", (req, res) => {
  res.send("Ekosan is alive! 💗");
});

app.get("/ask", (req, res) => {
  const query = normalize(req.query.q);

  if (!query || query.length > 500) {
    return res.status(400).json({
      found: false,
      answer: "Please provide a valid question."
    });
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const item of database) {
    const question = item.question ?? item.user ?? "";
    const answer = item.answer ?? item.eko;
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];
    const keywords = Array.isArray(item.keywords) ? item.keywords : [];

    const candidates = [question, ...aliases]
      .map(normalize)
      .filter(Boolean);

    let score = 0;

    for (const candidate of candidates) {
      if (candidate === query) {
        score = Math.max(score, 100);
      } else if (
        candidate.length >= 4 &&
        (query.includes(candidate) || candidate.includes(query))
      ) {
        score = Math.max(score, 75);
      }
    }

    const matchingKeywords = keywords
      .map(normalize)
      .filter(keyword => keyword && query.includes(keyword));

    if (matchingKeywords.length > 0) {
      score = Math.max(score, 50 + Math.min(20, matchingKeywords.length * 5));
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = answer;
    }
  }

  if (!bestMatch || bestScore < 50) {
    return res.json({
      found: false,
      answer: "🤔 I don't know the answer to that yet!"
    });
  }

  return res.json({
    found: true,
    answer: bestMatch
  });
});

loadDatabase();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ekosan listening on port ${PORT}`);
});
