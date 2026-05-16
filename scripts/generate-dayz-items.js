const fs = require("fs");
const https = require("https");
const path = require("path");

const TYPES_URL =
  "https://raw.githubusercontent.com/BohemiaInteractive/DayZ-Central-Economy/master/dayzOffline.chernarusplus/db/types.xml";

function simplifyName(name) {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function guessSlot(name) {
  const n = name.toLowerCase();

  if (n.includes("jacket") || n.includes("shirt") || n.includes("hoodie") || n.includes("coat")) return "Body";
  if (n.includes("pants") || n.includes("jeans")) return "Legs";
  if (n.includes("shoes") || n.includes("boots")) return "Feet";
  if (n.includes("helmet") || n.includes("cap") || n.includes("hat") || n.includes("beanie")) return "Headgear";
  if (n.includes("gloves")) return "Gloves";
  if (n.includes("mask") || n.includes("balaclava")) return "Mask";
  if (n.includes("backpack") || n.includes("bag")) return "Back";
  if (n.includes("belt") || n.includes("holster")) return "Hips";
  if (n.includes("vest") || n.includes("platecarrier")) return "Vest";

  return "inventory";
}

https.get(TYPES_URL, res => {
  let xml = "";

  res.on("data", chunk => xml += chunk);
  res.on("end", () => {
    const matches = [...xml.matchAll(/<type name="([^"]+)">([\s\S]*?)<\/type>/g)];

    const items = matches.map(match => {
      const classname = match[1];
      const body = match[2];

      const categoryMatch = body.match(/<category name="([^"]+)"/);
      const category = categoryMatch ? categoryMatch[1] : "misc";

      return {
        label: simplifyName(classname),
        classname,
        category,
        slot: guessSlot(classname)
      };
    });

    const output = `// Auto-generated from BohemiaInteractive DayZ Central Economy
// Source: ${TYPES_URL}
// Do not edit manually.

window.DAYZ_ITEMS = ${JSON.stringify(items, null, 2)};
`;

    const outputPath = path.join(__dirname, "../public/data/dayz-items.js");

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, "utf8");

    console.log(`✅ ${items.length} items générés dans public/data/dayz-items.js`);
  });
});