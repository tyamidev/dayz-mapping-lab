const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const MAPS = {
  chernarusplus: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.chernarusplus",
    "cfgrandompresets.xml"
  ),

  enoch: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.enoch",
    "cfgrandompresets.xml"
  ),

  sakhal: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.sakhal",
    "cfgrandompresets.xml"
  )
};

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function getAttr(block, attr) {
  const match = block.match(
    new RegExp(`${attr}="([^"]*)"`, "i")
  );

  return match ? match[1] : "";
}

function getNumberAttr(block, attr) {
  const value = getAttr(block, attr);

  if (value === "") return null;

  const number = Number(value);

  return Number.isNaN(number)
    ? value
    : number;
}

function parsePresets(xml) {

  const presets = [];

  /* =========================
     CARGO PRESETS
  ========================= */

  const cargoBlocks =
    xml.match(/<cargo\b[\s\S]*?<\/cargo>/gi) || [];

  cargoBlocks.forEach(block => {

    const name = getAttr(block, "name");

    if (!name) return;

    const items =
      (block.match(/<item\b[^>]*\/>/gi) || [])
      .map(itemBlock => ({
        name: getAttr(itemBlock, "name"),
        chance: getNumberAttr(itemBlock, "chance")
      }));

    presets.push({
      name,
      type: "cargo",
      chance: getNumberAttr(block, "chance"),
      items
    });
  });


  /* =========================
     ATTACHMENT PRESETS
  ========================= */

  const attachmentBlocks =
    xml.match(
      /<attachments\b[\s\S]*?<\/attachments>/gi
    ) || [];

  attachmentBlocks.forEach(block => {

    const name = getAttr(block, "name");

    if (!name) return;

    const items =
      (block.match(/<item\b[^>]*\/>/gi) || [])
      .map(itemBlock => ({
        name: getAttr(itemBlock, "name"),
        chance: getNumberAttr(itemBlock, "chance")
      }));

    presets.push({
      name,
      type: "attachments",
      chance: getNumberAttr(block, "chance"),
      items
    });
  });


  return presets;
}

const merged = new Map();

Object.entries(MAPS).forEach(
  ([mapId, filePath]) => {

    console.log(`Lecture ${mapId}...`);

    const xml = readFile(filePath);

    const presets = parsePresets(xml);

    console.log(
      `  → ${presets.length} presets`
    );

    presets.forEach(preset => {

      if (!merged.has(preset.name)) {
        merged.set(
          preset.name,
          {
            name: preset.name,

            maps: {
              chernarusplus: false,
              enoch: false,
              sakhal: false
            },

            variants: {}
          }
        );
      }

      const target =
        merged.get(preset.name);

      target.maps[mapId] = true;
      target.variants[mapId] = preset;
    });
  }
);

const result =
  [...merged.values()]
  .sort((a, b) =>
    a.name.localeCompare(b.name)
  );

const outputDir = path.join(
  ROOT,
  "public",
  "data",
  "dayz-core"
);

fs.mkdirSync(
  outputDir,
  { recursive: true }
);

const outputFile = path.join(
  outputDir,
  "presets.js"
);

const content = `
// =========================================================
// DAYZ MAPPING LAB - RANDOM PRESETS
// =========================================================
//
// AUTO-GENERATED
//
// Sources:
// - Chernarus+ cfgrandompresets.xml
// - Livonia cfgrandompresets.xml
// - Sakhal cfgrandompresets.xml
//
// Do not edit manually.
//
// Regenerate with:
// node scripts/generate-dayz-presets.js
//
// =========================================================

window.DAYZ_CORE_PRESETS = ${JSON.stringify(
  result,
  null,
  2
)};
`;

fs.writeFileSync(
  outputFile,
  content.trim() + "\n",
  "utf8"
);

console.log("");
console.log("==============================");
console.log(" RANDOM PRESETS GENERATED");
console.log("==============================");
console.log("");

console.log(
  `Presets uniques : ${result.length}`
);

console.log("");
console.log(`Fichier : ${outputFile}`);
console.log("");
console.log("Terminé !");