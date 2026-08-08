const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const MAPS = {
  chernarusplus: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.chernarusplus",
    "cfgspawnabletypes.xml"
  ),

  enoch: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.enoch",
    "cfgspawnabletypes.xml"
  ),

  sakhal: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.sakhal",
    "cfgspawnabletypes.xml"
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

function extractItemsFromSection(sectionBlock) {
  const itemBlocks =
    sectionBlock.match(/<item\b[^>]*\/>/gi) || [];

  return itemBlocks.map(block => ({
    name: getAttr(block, "name"),
    chance: getNumberAttr(block, "chance")
  }));
}

function extractPresetsFromSection(sectionBlock) {
  const presetBlocks =
    sectionBlock.match(/<preset\b[^>]*\/>/gi) || [];

  return presetBlocks.map(block => ({
    name: getAttr(block, "name"),
    chance: getNumberAttr(block, "chance")
  }));
}

function parseSpawnableTypes(xml) {
  const blocks =
    xml.match(/<type\b[\s\S]*?<\/type>/gi) || [];

  return blocks.map(block => {
    const nameMatch =
      block.match(/<type\s+name="([^"]+)"/i);

    if (!nameMatch) return null;

    const classname = nameMatch[1];

    const hoarder =
      getAttr(block, "hoarder");

    const damageMatch =
      block.match(/<damage\b[^>]*\/>/i);

    let damage = null;

    if (damageMatch) {
      damage = {
        min: getNumberAttr(
          damageMatch[0],
          "min"
        ),

        max: getNumberAttr(
          damageMatch[0],
          "max"
        )
      };
    }

    const attachmentsMatch =
      block.match(
        /<attachments\b[^>]*>[\s\S]*?<\/attachments>/i
      );

    const cargoMatch =
      block.match(
        /<cargo\b[^>]*>[\s\S]*?<\/cargo>/i
      );

    const attachments = {
      chance: null,
      items: [],
      presets: []
    };

    if (attachmentsMatch) {
      attachments.chance =
        getNumberAttr(
          attachmentsMatch[0],
          "chance"
        );

      attachments.items =
        extractItemsFromSection(
          attachmentsMatch[0]
        );

      attachments.presets =
        extractPresetsFromSection(
          attachmentsMatch[0]
        );
    }

    const cargo = {
      chance: null,
      items: [],
      presets: []
    };

    if (cargoMatch) {
      cargo.chance =
        getNumberAttr(
          cargoMatch[0],
          "chance"
        );

      cargo.items =
        extractItemsFromSection(
          cargoMatch[0]
        );

      cargo.presets =
        extractPresetsFromSection(
          cargoMatch[0]
        );
    }

    return {
      classname,
      hoarder:
        hoarder === ""
          ? null
          : Number(hoarder),

      damage,

      attachments,
      cargo
    };
  })
  .filter(Boolean);
}

const merged = new Map();

Object.entries(MAPS).forEach(
  ([mapId, filePath]) => {

    console.log(
      `Lecture ${mapId}...`
    );

    const xml =
      readFile(filePath);

    const entries =
      parseSpawnableTypes(xml);

    console.log(
      `  → ${entries.length} types`
    );

    entries.forEach(entry => {

      if (!merged.has(entry.classname)) {

        merged.set(
          entry.classname,
          {
            classname:
              entry.classname,

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
        merged.get(entry.classname);

      target.maps[mapId] = true;

      target.variants[mapId] =
        entry;
    });
  }
);

const result =
  [...merged.values()]
    .sort((a, b) =>
      a.classname.localeCompare(
        b.classname
      )
    );

const outputDir =
  path.join(
    ROOT,
    "public",
    "data",
    "dayz-core"
  );

fs.mkdirSync(
  outputDir,
  {
    recursive: true
  }
);

const outputFile =
  path.join(
    outputDir,
    "spawnable-types.js"
  );

const content = `
// =========================================================
// DAYZ MAPPING LAB - SPAWNABLE TYPES
// =========================================================
//
// AUTO-GENERATED
//
// Sources:
// - Chernarus+ cfgspawnabletypes.xml
// - Livonia cfgspawnabletypes.xml
// - Sakhal cfgspawnabletypes.xml
//
// Do not edit manually.
//
// Regenerate with:
// node scripts/generate-dayz-spawnable-types.js
//
// =========================================================

window.DAYZ_CORE_SPAWNABLE_TYPES = ${JSON.stringify(
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
console.log(
  "================================="
);

console.log(
  " SPAWNABLE TYPES GENERATED"
);

console.log(
  "================================="
);

console.log("");

console.log(
  `Classnames uniques : ${result.length}`
);

console.log("");

console.log(
  `Fichier : ${outputFile}`
);

console.log("");
console.log("Terminé !");