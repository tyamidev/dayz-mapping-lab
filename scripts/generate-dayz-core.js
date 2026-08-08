const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const MAPS = {
  chernarusplus: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.chernarusplus",
    "db",
    "types.xml"
  ),

  enoch: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.enoch",
    "db",
    "types.xml"
  ),

  sakhal: path.join(
    ROOT,
    "dayz-source",
    "dayzOffline.sakhal",
    "db",
    "types.xml"
  )
};


/* =========================================================
   FILE UTILS
========================================================= */

function readXml(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}


/* =========================================================
   XML PARSER
========================================================= */

function extractTypes(xml) {
  const blocks =
    xml.match(/<type\b[\s\S]*?<\/type>/gi) || [];

  return blocks.map(block => {

    const nameMatch =
      block.match(/<type\s+name="([^"]+)"/i);

    if (!nameMatch) return null;

    const categoryMatch =
      block.match(/<category\s+name="([^"]+)"/i);

    return {
      classname: nameMatch[1],

      officialCategory:
        categoryMatch
          ? categoryMatch[1].toLowerCase()
          : ""
    };

  }).filter(Boolean);
}


/* =========================================================
   CATEGORY DETECTION
========================================================= */

function detectCategory(classname, officialCategory = "") {

  const name = classname.toLowerCase();


  /* -------------------------
     INFECTED / ZOMBIES
  ------------------------- */

  if (
    name.startsWith("zmbm_") ||
    name.startsWith("zmbf_")
  ) {
    return "infected";
  }


  /* -------------------------
     ANIMALS
  ------------------------- */

  if (name.startsWith("animal_")) {
    return "animals";
  }


  /* -------------------------
     VEHICLES
  ------------------------- */

  const vehiclePrefixes = [
    "offroadhatchback",
    "civilianSedan".toLowerCase(),
    "sedan_02",
    "hatchback_02",
    "truck_01",
    "m1025",
    "boat_01"
  ];

  if (
    vehiclePrefixes.some(prefix =>
      name.startsWith(prefix)
    )
  ) {
    return "vehicles";
  }


  /* -------------------------
     VEHICLE PARTS
  ------------------------- */

  const vehiclePartPatterns = [
    "carbattery",
    "truckbattery",
    "carradiator",
    "sparkplug",
    "glowplug",

    "offroadhatchbackwheel",
    "civiliansedanswheel",
    "sedan_02_wheel",
    "hatchback_02_wheel",
    "truck_01_wheel",
    "m1025wheel",

    "hood",
    "trunk",
    "door_1_1",
    "door_1_2",
    "door_2_1",
    "door_2_2"
  ];

  if (
    vehiclePartPatterns.some(part =>
      name.includes(part)
    )
  ) {
    return "vehicle_parts";
  }


  /* -------------------------
     AMMUNITION
  ------------------------- */

  if (
    name.startsWith("ammo_") ||
    name.startsWith("ammobox_")
  ) {
    return "ammo";
  }


  /* -------------------------
     MAGAZINES
  ------------------------- */

  if (
    name.startsWith("mag_") ||
    name.includes("magazine")
  ) {
    return "magazines";
  }


  /* -------------------------
     EXPLOSIVES
  ------------------------- */

  const explosivePatterns = [
    "grenade",
    "landmine",
    "claymore",
    "plastic_explosive",
    "improvisedexplosive",
    "ied",
    "detonator"
  ];

  if (
    explosivePatterns.some(pattern =>
      name.includes(pattern)
    )
  ) {
    return "explosives";
  }


  /* -------------------------
     MEDICAL
  ------------------------- */

  const medicalPatterns = [
    "bandage",
    "saline",
    "bloodbag",
    "bloodtest",
    "startkitiv",
    "morphine",
    "epinephrine",
    "tetracycline",
    "charcoaltablets",
    "vitaminbottle",
    "painkillertablets",
    "disinfectant",
    "iodinetincture",
    "thermometer",
    "anticheminjector"
  ];

  if (
    medicalPatterns.some(pattern =>
      name.includes(pattern)
    )
  ) {
    return "medical";
  }


  /* -------------------------
     OFFICIAL TYPES.XML CATEGORY
  ------------------------- */

  if (officialCategory === "weapons") {
    return "weapons";
  }

  if (officialCategory === "clothes") {
    return "clothes";
  }

  if (officialCategory === "containers") {
    return "containers";
  }

  if (officialCategory === "food") {
    return "food";
  }

  if (officialCategory === "tools") {
    return "tools";
  }

  if (officialCategory === "explosives") {
    return "explosives";
  }


/* -------------------------
   WORLD / STATIC OBJECTS
------------------------- */

if (
  name.startsWith("land_") ||
  name.startsWith("staticobj_") ||
  name.startsWith("static_") ||
  name.startsWith("misc_tirepile_") ||
  name.startsWith("wreck_") ||
  name === "contaminatedarea_dynamic"
) {
  return "world_objects";
}


/* -------------------------
   MORE VEHICLE PARTS
------------------------- */

if (
  name.startsWith("civsedandoors_") ||
  name.startsWith("hatchbackdoors_") ||
  name === "civsedanwheel" ||
  name === "civsedanwheel_ruined" ||
  name === "hatchbackwheel" ||
  name === "hatchbackwheel_ruined" ||
  name === "offroad_02_wheel"
) {
  return "vehicle_parts";
}


/* -------------------------
   EXTRA VEHICLES
------------------------- */

if (
  name === "offroad_02"
) {
  return "vehicles";
}


/* -------------------------
   EXTRA FOOD
------------------------- */

const extraFood = [
  "craterellusmushroom",
  "foxsteakmeat",
  "redcaviar",
  "reindeersteakmeat",
  "steelheadtrout",
  "steelheadtroutfilletmeat",
  "walleyepollock",
  "walleyepollockfilletmeat",
  "waterbottle"
];

if (extraFood.includes(name)) {
  return "food";
}


/* -------------------------
   MATERIALS
------------------------- */

const materialItems = [
  "foxpelt",
  "reindeerpelt"
];

if (materialItems.includes(name)) {
  return "materials";
}


/* -------------------------
   EXTRA CLOTHING
------------------------- */

const extraClothes = [
  "ghillieatt_winter",
  "platecarrierholster_winter",
  "witchhat",
  "crookednose"
];

if (extraClothes.includes(name)) {
  return "clothes";
}


/* -------------------------
   EXTRA CONTAINERS
------------------------- */

const extraContainers = [
  "cauldron",
  "scientificbriefcase",
  "undergroundstashsnow"
];

if (extraContainers.includes(name)) {
  return "containers";
}


/* -------------------------
   EXTRA TOOLS / ITEMS
------------------------- */

const extraTools = [
  "broom_birch",
  "worm"
];

if (extraTools.includes(name)) {
  return "tools";
}


/* -------------------------
   SPECIAL / EVENT ITEMS
------------------------- */

const specialItems = [
  "bonfire",
  "christmastree",
  "christmastree_green",
  "easteregg",
  "fireplacefirebarrel",
  "deadfox"
];

if (specialItems.includes(name)) {
  return "event_objects";
}

  /* -------------------------
     FALLBACK
  ------------------------- */

  return "misc";
}


/* =========================================================
   FRIENDLY LABEL
========================================================= */

function createLabel(classname) {

  return classname
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   BUILD DATABASE
========================================================= */

const items = new Map();

Object.entries(MAPS).forEach(([mapId, filePath]) => {

  console.log(`Lecture ${mapId}...`);

  const xml = readXml(filePath);

  const mapItems = extractTypes(xml);

  console.log(
    `  → ${mapItems.length} entrées`
  );


  mapItems.forEach(sourceItem => {

    const classname =
      sourceItem.classname;

    if (!items.has(classname)) {

      items.set(classname, {

        classname,

        label:
          createLabel(classname),

        category: "misc",

        vanillaMaps: {
          chernarusplus: false,
          enoch: false,
          sakhal: false
        },

        officialCategories: {
          chernarusplus: "",
          enoch: "",
          sakhal: ""
        }
      });
    }


    const item =
      items.get(classname);


    item.vanillaMaps[mapId] = true;

    item.officialCategories[mapId] =
      sourceItem.officialCategory;


    /*
      On recalcule la catégorie.

      Si plusieurs maps ont une catégorie officielle,
      on utilise la première catégorie connue.
    */

    const knownOfficialCategory =
      Object.values(
        item.officialCategories
      ).find(Boolean) || "";


    item.category =
      detectCategory(
        classname,
        knownOfficialCategory
      );
  });
});


/* =========================================================
   SORT
========================================================= */

const result =
  [...items.values()]
    .sort((a, b) =>
      a.classname.localeCompare(
        b.classname
      )
    );


/* =========================================================
   CATEGORY STATS
========================================================= */

const categoryStats = {};

result.forEach(item => {

  if (!categoryStats[item.category]) {
    categoryStats[item.category] = 0;
  }

  categoryStats[item.category]++;
});


/* =========================================================
   MAP STATS
========================================================= */

const mapStats = {
  chernarusplus: 0,
  enoch: 0,
  sakhal: 0
};

result.forEach(item => {

  Object.keys(mapStats).forEach(mapId => {

    if (item.vanillaMaps[mapId]) {
      mapStats[mapId]++;
    }

  });
});


/* =========================================================
   OUTPUT
========================================================= */

const outputDir = path.join(
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


const outputFile = path.join(
  outputDir,
  "items.js"
);


const content = `
// =========================================================
// DAYZ MAPPING LAB - DAYZ CORE ITEMS
// =========================================================
//
// AUTO-GENERATED FILE
//
// Sources:
// - Chernarus+ types.xml
// - Livonia types.xml
// - Sakhal types.xml
//
// Do not edit manually.
// Regenerate with:
// node scripts/generate-dayz-core.js
//
// =========================================================

window.DAYZ_CORE_ITEMS = ${JSON.stringify(result, null, 2)};
`;


fs.writeFileSync(
  outputFile,
  content.trim() + "\n",
  "utf8"
);


/* =========================================================
   TERMINAL REPORT
========================================================= */

console.log("");
console.log("=================================");
console.log(" DAYZ CORE GENERATED");
console.log("=================================");
console.log("");

console.log(
  `Classnames uniques : ${result.length}`
);

console.log("");

console.log("Présence vanilla par map:");

Object.entries(mapStats)
.forEach(([map, count]) => {

  console.log(
    `  ${map.padEnd(16)} ${count}`
  );

});

console.log("");

console.log("Catégories:");

Object.entries(categoryStats)
  .sort((a, b) =>
    b[1] - a[1]
  )
  .forEach(([category, count]) => {

    console.log(
      `  ${category.padEnd(18)} ${count}`
    );

  });


console.log("");
console.log("Items encore classés en misc :");

result
  .filter(item => item.category === "misc")
  .forEach(item => {
    console.log(`  ${item.classname}`);
  });

console.log("");
console.log(
  `Fichier : ${outputFile}`
);

console.log("");
console.log("Terminé !");