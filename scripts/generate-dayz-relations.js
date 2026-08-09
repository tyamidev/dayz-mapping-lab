const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/* =========================================================
   CONFIG
========================================================= */

const DAYZ_WEAPONS_ROOT = path.join(
  process.env.USERPROFILE || "",
  "Documents",
  "DayZ Projects",
  "DZ",
  "weapons"
);

const DAYZ_VEHICLES_ROOT = path.join(
  process.env.USERPROFILE || "",
  "Documents",
  "DayZ Projects",
  "DZ",
  "vehicles"
);

const DAYZ_CHARACTERS_ROOT = path.join(
  process.env.USERPROFILE || "",
  "Documents",
  "DayZ Projects",
  "DZ",
  "characters"
);

const CORE_ITEMS_FILE = path.join(
  ROOT,
  "public",
  "data",
  "dayz-core",
  "items.js"
);

const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "data",
  "dayz-core"
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  "relations.js"
);


/* =========================================================
   BASIC FILE UTILS
========================================================= */

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function findConfigFiles(directory) {
  const result = [];

  if (!fs.existsSync(directory)) {
    return result;
  }

  const entries = fs.readdirSync(
    directory,
    { withFileTypes: true }
  );

  entries.forEach(entry => {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      result.push(
        ...findConfigFiles(fullPath)
      );

      return;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase() === "config.cpp"
    ) {
      result.push(fullPath);
    }
  });

  return result;
}


/* =========================================================
   COMMENTS
========================================================= */

function removeComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}


/* =========================================================
   BRACE MATCHING
========================================================= */

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth++;
    }

    if (char === "}") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}


/* =========================================================
   CLASS PARSER
========================================================= */

function parseClassesFromFile(
  content,
  sourceFile
) {
  const text = removeComments(content);

  const classes = [];

  const classRegex =
    /\bclass\s+([A-Za-z0-9_]+)(?:\s*:\s*([A-Za-z0-9_]+))?\s*\{/g;

  let match;

  while (
    (match = classRegex.exec(text)) !== null
  ) {
    const name = match[1];
    const parent = match[2] || null;

    const openBrace =
      text.indexOf(
        "{",
        match.index
      );

    if (openBrace === -1) {
      continue;
    }

    const closeBrace =
      findMatchingBrace(
        text,
        openBrace
      );

    if (closeBrace === -1) {
      continue;
    }

    const body =
      text.slice(
        openBrace + 1,
        closeBrace
      );

    classes.push({
      name,
      parent,
      body,
      sourceFile
    });
  }

  return classes;
}


/* =========================================================
   TOP LEVEL BODY
========================================================= */

/*
  Important :

  On veut lire uniquement les propriétés directement
  présentes dans la classe.

  Par exemple :

  class M4A1_Base
  {
      magazines[]={...};

      class DamageSystem
      {
          ...
      };
  };

  On ne veut PAS récupérer les propriétés présentes dans
  DamageSystem.
*/

function getTopLevelBody(body) {
  let result = "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = 0;
    i < body.length;
    i++
  ) {
    const char = body[i];

    if (inString) {
      if (depth === 0) {
        result += char;
      } else {
        result += " ";
      }

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;

      result +=
        depth === 0
          ? char
          : " ";

      continue;
    }

    if (char === "{") {
      depth++;

      result += " ";
      continue;
    }

    if (char === "}") {
      depth =
        Math.max(
          0,
          depth - 1
        );

      result += " ";
      continue;
    }

    result +=
      depth === 0
        ? char
        : " ";
  }

  return result;
}


/* =========================================================
   ARRAY PROPERTY PARSER
========================================================= */

function getArrayProperty(body, property) {
  const regex = new RegExp(
    `\\b${property}\\s*\\[\\s*\\]\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*;`,
    "i"
  );

  const match = body.match(regex);

  if (!match) {
    return null;
  }

  const values = [];

  const valueRegex =
    /"([^"]+)"/g;

  let valueMatch;

  while (
    (valueMatch =
      valueRegex.exec(match[1])) !== null
  ) {
    values.push(
      valueMatch[1]
    );
  }

  return values;
}


/* =========================================================
   SIMPLE PROPERTY
========================================================= */

function getNumberProperty(
  body,
  property
) {
  const regex = new RegExp(
    `\\b${property}\\s*=\\s*([0-9.\\-]+)\\s*;`,
    "i"
  );

  const match =
    body.match(regex);

  if (!match) return null;

  const number =
    Number(match[1]);

  return Number.isNaN(number)
    ? null
    : number;
}


/* =========================================================
   LOAD EXISTING DAYZ CORE ITEMS
========================================================= */

function loadCoreItems() {
  const content =
    readFile(CORE_ITEMS_FILE);

  const match = content.match(
    /window\.DAYZ_CORE_ITEMS\s*=\s*([\s\S]*?);\s*$/
  );

  if (!match) {
    throw new Error(
      "Impossible de trouver window.DAYZ_CORE_ITEMS dans items.js."
    );
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(
      `Impossible de parser DAYZ_CORE_ITEMS : ${error.message}`
    );
  }
}

/* =========================================================
   NORMALIZE SLOT
========================================================= */

function normalizeSlot(slot) {
  return String(slot || "")
    .trim()
    .toLowerCase();
}


/* =========================================================
READ CONFIGS
========================================================= */

console.log("");
console.log("===============================");
console.log(" DAYZ CORE RELATIONS");
console.log("===============================");
console.log("");

console.log(
  `Source armes     : ${DAYZ_WEAPONS_ROOT}`
);

console.log(
  `Source véhicules : ${DAYZ_VEHICLES_ROOT}`
);

console.log("");


const weaponConfigFiles =
  findConfigFiles(
    DAYZ_WEAPONS_ROOT
  );

const vehicleConfigFiles =
  findConfigFiles(
    DAYZ_VEHICLES_ROOT
  );

const characterConfigFiles =
  findConfigFiles(
    DAYZ_CHARACTERS_ROOT
  );

const configFiles = [
  ...weaponConfigFiles,
  ...vehicleConfigFiles,
  ...characterConfigFiles
];


console.log(
  `config.cpp armes     : ${weaponConfigFiles.length}`
);

console.log(
  `config.cpp véhicules : ${vehicleConfigFiles.length}`
);

console.log(
  `config.cpp characters : ${characterConfigFiles.length}`
);

console.log(
  `config.cpp total     : ${configFiles.length}`
);


if (!weaponConfigFiles.length) {
  throw new Error(
    "Aucun config.cpp trouvé dans DZ/weapons."
  );
}


if (!vehicleConfigFiles.length) {
  throw new Error(
    "Aucun config.cpp trouvé dans DZ/vehicles."
  );
}

if (!characterConfigFiles.length) {
  throw new Error(
    "Aucun config.cpp trouvé dans DZ/characters."
  );
}

/* =========================================================
   PARSE ALL CLASSES
========================================================= */

const classMap = new Map();

let parsedClassCount = 0;

configFiles.forEach(filePath => {
  const content =
    readFile(filePath);

  const classes =
    parseClassesFromFile(
      content,
      filePath
    );

  classes.forEach(configClass => {
const topBody =
  configClass.body;

const data = {
      name:
        configClass.name,

      parent:
        configClass.parent,

source:
  path.relative(
    path.join(
      process.env.USERPROFILE || "",
      "Documents",
      "DayZ Projects",
      "DZ"
    ),
    filePath
  ),

      scope:
        getNumberProperty(
          topBody,
          "scope"
        ),

      attachments:
        getArrayProperty(
          topBody,
          "attachments"
        ),

      inventorySlots:
        getArrayProperty(
          topBody,
          "inventorySlot"
        ),

      magazines:
        getArrayProperty(
          topBody,
          "magazines"
        ),

      chamberableFrom:
        getArrayProperty(
          topBody,
          "chamberableFrom"
        ),

      ammoItems:
        getArrayProperty(
          topBody,
          "ammoItems"
        )
    };

    /*
      Certaines classes avec le même nom peuvent éventuellement
      être rencontrées plusieurs fois.

      On garde la dernière définition rencontrée.
    */

    classMap.set(
      data.name,
      data
    );

    parsedClassCount++;
  });
});

console.log(
  `Classes analysées : ${parsedClassCount}`
);

console.log(
  `Classes uniques   : ${classMap.size}`
);


/* =========================================================
   RESOLVE INHERITANCE
========================================================= */

const resolvedCache =
  new Map();

function resolveClass(
  classname,
  stack = new Set()
) {
  if (
    resolvedCache.has(classname)
  ) {
    return resolvedCache.get(
      classname
    );
  }

  const current =
    classMap.get(classname);

  if (!current) {
    return null;
  }

  if (stack.has(classname)) {
    console.warn(
      `Héritage circulaire détecté : ${classname}`
    );

    return current;
  }

  const nextStack =
    new Set(stack);

  nextStack.add(classname);

  let parentResolved = null;

  if (current.parent) {
    parentResolved =
      resolveClass(
        current.parent,
        nextStack
      );
  }

  /*
    Comportement choisi :

    si la classe enfant définit la propriété,
    elle remplace celle du parent.

    Sinon elle l'hérite.
  */

  const resolved = {
    name:
      current.name,

    parent:
      current.parent,

    source:
      current.source,

    scope:
      current.scope ??
      parentResolved?.scope ??
      null,

    attachments:
      current.attachments ??
      parentResolved?.attachments ??
      [],

    inventorySlots:
      current.inventorySlots ??
      parentResolved?.inventorySlots ??
      [],

    magazines:
      current.magazines ??
      parentResolved?.magazines ??
      [],

    chamberableFrom:
      current.chamberableFrom ??
      parentResolved?.chamberableFrom ??
      [],

    ammoItems:
      current.ammoItems ??
      parentResolved?.ammoItems ??
      []
  };

  resolvedCache.set(
    classname,
    resolved
  );

  return resolved;
}


/* =========================================================
   CORE ITEM LOOKUPS
========================================================= */

const coreItems =
  loadCoreItems();

const coreItemMap =
  new Map(
    coreItems.map(item => [
      item.classname,
      item
    ])
  );

const coreItemNames =
  new Set(
    coreItems.map(
      item => item.classname
    )
  );

function isUsableDayZClass(classname) {
  if (coreItemNames.has(classname)) {
    return true;
  }

  const resolved = resolveClass(classname);

  return resolved?.scope === 2;
}

const coreWeaponNames =
  new Set(
    coreItems
      .filter(
        item =>
          item.category === "weapons"
      )
      .map(
        item => item.classname
      )
  );


/* =========================================================
   BUILD ATTACHMENT SLOT INDEX
========================================================= */

const slotIndex = new Map();

classMap.forEach(
  (_, classname) => {

    const resolved =
      resolveClass(classname);

    if (!resolved) return;

if (!isUsableDayZClass(classname)) {
  return;
}

    resolved.inventorySlots
      .forEach(slot => {
        const normalized =
          normalizeSlot(slot);

        if (!normalized) return;

        if (
          !slotIndex.has(normalized)
        ) {
          slotIndex.set(
            normalized,
            []
          );
        }

        slotIndex
          .get(normalized)
          .push(classname);
      });
  }
);


/* =========================================================
VEHICLE HELPERS
========================================================= */

function isVehicleClass(classname) {

  const data =
    classMap.get(classname);

  if (!data) {
    return false;
  }

  const source =
    String(data.source || "")
      .replace(/\\/g, "/")
      .toLowerCase();

  return source.startsWith(
    "vehicles/"
  );
}


function isVehicleRootClass(classname) {

  if (!isVehicleClass(classname)) {
    return false;
  }

  const resolved =
    resolveClass(classname);

  if (!resolved) {
    return false;
  }

  /*
    Pour notre database, on considère comme véhicule
    une classe issue de DZ/vehicles qui possède
    des slots d'attachments.
  */

  return (
    Array.isArray(resolved.attachments) &&
    resolved.attachments.length > 0
  );
}

/* =========================================================
EQUIPMENT HELPERS
========================================================= */

function isEquipmentClass(classname) {

  const data =
    classMap.get(classname);

  if (!data) {
    return false;
  }

  const source =
    String(data.source || "")
      .replace(/\\/g, "/")
      .toLowerCase();

  return source.startsWith(
    "characters/"
  );
}


function isEquipmentRootClass(classname) {

  if (!isEquipmentClass(classname)) {
    return false;
  }

  /*
    Exclure les personnages jouables.
    Ils possèdent énormément de slots d'équipement,
    mais ne sont pas des objets utilisables dans
    cfgspawnabletypes.xml comme équipement.
  */

  if (
    classname === "SurvivorBase" ||
    classname === "SurvivorMale_Base" ||
    classname === "SurvivorFemale_Base" ||
    classname.startsWith("SurvivorM_") ||
    classname.startsWith("SurvivorF_")
  ) {
    return false;
  }

    /*
    Exclure les zombies / infectés.
    Ils possèdent des slots de vêtements,
    mais ne sont pas des équipements.
  */

  if (
    classname === "CfgVehicles" ||
    classname === "ZombieBase" ||
    classname === "ZombieMaleBase" ||
    classname === "ZombieFemaleBase" ||

    classname === "LowTierZombieMaleBase" ||
    classname === "LowTierZombieFemaleBase" ||
    classname === "LowTierMaleZombieBase" ||
    classname === "LowTierFemaleZombieBase" ||

    classname.startsWith("ZmbM_") ||
    classname.startsWith("ZmbF_")
  ) {
    return false;
  }

  const resolved =
    resolveClass(classname);

  if (!resolved) {
    return false;
  }

  return (
    Array.isArray(resolved.attachments) &&
    resolved.attachments.length > 0
  );
}

/* =========================================================
   BUILD WEAPON RELATIONS
========================================================= */

const weaponRelations = {};

coreWeaponNames.forEach(
  weaponName => {

    const resolved =
      resolveClass(weaponName);

    if (!resolved) {
      return;
    }


    /* -------------------------
       ATTACHMENTS
    ------------------------- */

    const compatibleAttachments =
      new Set();

    const attachmentsBySlot = {};

    resolved.attachments.forEach(
      slot => {

        const normalizedSlot =
          normalizeSlot(slot);

        const compatible =
          slotIndex.get(
            normalizedSlot
          ) || [];

        attachmentsBySlot[slot] =
          [...compatible]
            .sort();

        compatible.forEach(
          classname => {
            compatibleAttachments.add(
              classname
            );
          }
        );
      }
    );


    /* -------------------------
       MAGAZINES
    ------------------------- */

const magazines =
  resolved.magazines
    .filter(name =>
      isUsableDayZClass(name)
    );


    /* -------------------------
       AMMUNITION
    ------------------------- */

    const ammo =
      new Set(
        resolved.chamberableFrom
      );

    /*
      On récupère aussi les munitions
      déclarées dans chaque chargeur.
    */

    magazines.forEach(
      magazineName => {

        const magazine =
          resolveClass(
            magazineName
          );

        if (!magazine) return;

        magazine.ammoItems
          .forEach(ammoName => {
            ammo.add(ammoName);
          });
      }
    );


    /* -------------------------
       RESULT
    ------------------------- */

    weaponRelations[weaponName] = {
      parent:
        resolved.parent,

      attachmentSlots:
        resolved.attachments,

      attachmentsBySlot,

      compatibleAttachments:
        [...compatibleAttachments]
          .sort(),

      compatibleMagazines:
        [...new Set(magazines)]
          .sort(),

compatibleAmmo:
  [...ammo]
    .filter(name =>
      isUsableDayZClass(name)
    )
    .sort()
    };
  }
);

/* =========================================================
BUILD VEHICLE RELATIONS
========================================================= */

const vehicleRelations = {};

let vehicleRelationCount = 0;


classMap.forEach(
  (_, classname) => {

    /*
      On ne traite ici que les classes
      identifiées comme véhicules.
    */

    if (!isVehicleRootClass(classname)) {
      return;
    }


    const resolved =
      resolveClass(classname);

    if (!resolved) {
      return;
    }


    /* -------------------------
       ATTACHMENTS
    ------------------------- */

    const compatibleAttachments =
      new Set();

    const attachmentsBySlot = {};


    resolved.attachments.forEach(
      slot => {

        const normalizedSlot =
          normalizeSlot(slot);

        if (!normalizedSlot) {
          return;
        }


        const compatible =
          slotIndex.get(
            normalizedSlot
          ) || [];


        /*
          On enlève les classes identifiées
          elles-mêmes comme véhicules.

          On veut ici récupérer les pièces :
          portes, roues, batterie, radiateur,
          bougie, phares, etc.
        */

        const filtered =
          compatible.filter(
            candidate =>
              !isVehicleRootClass(
                candidate
              )
          );


        /*
          Suppression des doublons.
        */

        const unique =
          [...new Set(filtered)]
            .sort();


        attachmentsBySlot[slot] =
          unique;


        unique.forEach(
          attachmentName => {

            compatibleAttachments.add(
              attachmentName
            );

            vehicleRelationCount++;
          }
        );
      }
    );


    /* -------------------------
       RESULT
    ------------------------- */

    vehicleRelations[classname] = {

      parent:
        resolved.parent,

      attachmentSlots:
        resolved.attachments,

      attachmentsBySlot,

      compatibleAttachments:
        [...compatibleAttachments]
          .sort()
    };
  }
);

/* =========================================================
BUILD EQUIPMENT RELATIONS
========================================================= */

const equipmentRelations = {};

let equipmentRelationCount = 0;


classMap.forEach(
  (_, classname) => {

    if (!isEquipmentRootClass(classname)) {
      return;
    }


    const resolved =
      resolveClass(classname);

    if (!resolved) {
      return;
    }


    const compatibleAttachments =
      new Set();

    const attachmentsBySlot = {};


    resolved.attachments.forEach(
      slot => {

        const normalizedSlot =
          normalizeSlot(slot);

        if (!normalizedSlot) {
          return;
        }


        const compatible =
          slotIndex.get(
            normalizedSlot
          ) || [];


        /*
          On ne veut pas proposer
          l'équipement parent lui-même.
        */

        const filtered =
          compatible.filter(
            candidate =>
              candidate !== classname
          );


        const unique =
          [...new Set(filtered)]
            .sort();


        attachmentsBySlot[slot] =
          unique;


        unique.forEach(
          attachmentName => {

            compatibleAttachments.add(
              attachmentName
            );

            equipmentRelationCount++;
          }
        );
      }
    );


    equipmentRelations[classname] = {

      parent:
        resolved.parent,

      attachmentSlots:
        resolved.attachments,

      attachmentsBySlot,

      compatibleAttachments:
        [...compatibleAttachments]
          .sort()
    };
  }
);

/* =========================================================
EQUIPMENT AUDIT
========================================================= */

const equipmentAudit =
  Object.entries(equipmentRelations)
    .map(([name, data]) => ({
      name,
      slots:
        data.attachmentSlots.length,

      relations:
        data.compatibleAttachments.length
    }))
    .sort(
      (a, b) =>
        b.relations - a.relations
    );

console.log("");
console.log("===============================");
console.log(" EQUIPMENT AUDIT");
console.log("===============================");
console.log("");

equipmentAudit
  .slice(0, 30)
  .forEach(item => {

    console.log(
      `${item.name} : ${item.slots} slot(s) / ${item.relations} relation(s)`
    );
  });

/* =========================================================
   STATS
========================================================= */

const weapons =
  Object.keys(
    weaponRelations
  );

let totalAttachments = 0;
let totalMagazines = 0;
let totalAmmo = 0;

weapons.forEach(
  weaponName => {

    const weapon =
      weaponRelations[
        weaponName
      ];

    totalAttachments +=
      weapon
        .compatibleAttachments
        .length;

    totalMagazines +=
      weapon
        .compatibleMagazines
        .length;

    totalAmmo +=
      weapon
        .compatibleAmmo
        .length;
  }
);


/* =========================================================
   VALIDATION / WEAPON AUDIT
========================================================= */


const realWeapons = weapons.filter(weaponName => {
  const cls = resolveClass(weaponName);

  if (!cls) return false;

  const source = String(cls.source || "")
    .replace(/\\/g, "/")
    .toLowerCase();

  return (
    source.startsWith("firearms/") ||
    source.startsWith("pistols/") ||
    source.startsWith("shotguns/") ||
    source.startsWith("launchers/") ||
    source.startsWith("archery/") ||
    source.startsWith("nonlethal/")
  );
});

const weaponsWithoutAttachments = [];
const weaponsWithoutMagazines = [];
const weaponsWithoutAmmo = [];
const weaponsWithoutAnything = [];

realWeapons.forEach(weaponName => {
  const weapon = weaponRelations[weaponName];

  const noAttachments =
    !weapon.compatibleAttachments.length;

  const noMagazines =
    !weapon.compatibleMagazines.length;

  const noAmmo =
    !weapon.compatibleAmmo.length;

  if (noAttachments) {
    weaponsWithoutAttachments.push(weaponName);
  }

  if (noMagazines) {
    weaponsWithoutMagazines.push(weaponName);
  }

  if (noAmmo) {
    weaponsWithoutAmmo.push(weaponName);
  }

  if (
    noAttachments &&
    noMagazines &&
    noAmmo
  ) {
    weaponsWithoutAnything.push(weaponName);
  }
});

/* =========================================================
   OUTPUT
========================================================= */

fs.mkdirSync(
  OUTPUT_DIR,
  {
    recursive: true
  }
);

const output = {
  generatedAt:
    new Date().toISOString(),

  source:
    "Official DayZ extracted config.cpp",

  weapons:
    weaponRelations,

  vehicles:
    vehicleRelations,

  equipment:
    equipmentRelations
};

const fileContent = `
// =========================================================
// DAYZ MAPPING LAB - CORE RELATIONS
// =========================================================
//
// AUTO-GENERATED FILE
//
// Source:
// Official DayZ extracted config.cpp files
//
// Generated with:
// node scripts/generate-dayz-relations.js
//
// Do not edit manually.
//
// =========================================================

window.DAYZ_CORE_RELATIONS = ${JSON.stringify(
  output,
  null,
  2
)};
`;

fs.writeFileSync(
  OUTPUT_FILE,
  fileContent.trim() + "\n",
  "utf8"
);

console.log("");
console.log("===============================");
console.log(" WEAPON AUDIT");
console.log("===============================");
console.log("");

console.log(
  `Sans attachment : ${weaponsWithoutAttachments.length}`
);

console.log(
  `Sans magazine   : ${weaponsWithoutMagazines.length}`
);

console.log(
  `Sans munition   : ${weaponsWithoutAmmo.length}`
);

console.log(
  `Sans aucune relation : ${weaponsWithoutAnything.length}`
);

console.log(`Vraies armes auditées : ${realWeapons.length}`);

console.log("\nArmes sans attachment :");
weaponsWithoutAttachments.forEach(name => {
  console.log(` - ${name}`);
});

console.log("\nArmes sans magazine :");
weaponsWithoutMagazines.forEach(name => {
  console.log(` - ${name}`);
});

if (weaponsWithoutAnything.length) {
  console.log("");
  console.log("Armes sans aucune relation :");

  weaponsWithoutAnything.forEach(name => {
    console.log(`  - ${name}`);
  });
}
/* =========================================================
   TERMINAL REPORT
========================================================= */

console.log("");
console.log("===============================");
console.log(" RELATIONS GENERATED");
console.log("===============================");
console.log("");

console.log(
  `Armes trouvées : ${weapons.length}`
);

console.log(
  `Relations attachments : ${totalAttachments}`
);

console.log(
  `Relations magazines   : ${totalMagazines}`
);

console.log(
  `Relations munitions    : ${totalAmmo}`
);

console.log("");

console.log("");

console.log(
  `Véhicules trouvés : ${Object.keys(vehicleRelations).length}`
);

console.log(
  `Relations pièces véhicule : ${vehicleRelationCount}`
);

console.log("");

console.log(
  `Équipements trouvés : ${Object.keys(equipmentRelations).length}`
);

console.log(
  `Relations équipements : ${equipmentRelationCount}`
);

console.log(
  `Fichier : ${OUTPUT_FILE}`
);

console.log("");

console.log("Terminé !");