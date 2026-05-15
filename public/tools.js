let currentJsonFileName = "validated.json";
let currentXmlFileName = "validated.xml";

function updateFileName(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);

  if (!input || !label) return;

  label.textContent = input.files[0]
    ? input.files[0].name
    : "Aucun fichier sélectionné";
}

function getLineColumnFromPosition(text, position) {
  const before = text.slice(0, position);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function selectErrorInTextarea(textarea, position) {
  if (position < 0) return;

  textarea.focus();

  const start = Math.max(0, position - 20);
  const end = Math.min(textarea.value.length, position + 20);

  textarea.setSelectionRange(start, end);
}
function selectLineInTextarea(textarea, lineNumber) {
  const lines = textarea.value.split("\n");

  if (!lineNumber || lineNumber < 1 || lineNumber > lines.length) return;

  let start = 0;

  for (let i = 0; i < lineNumber - 1; i++) {
    start += lines[i].length + 1;
  }

  const end = start + lines[lineNumber - 1].length;

  textarea.focus();
  textarea.setSelectionRange(start, end);
}
function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function readFileToTextarea(fileInput, textarea) {
  const file = fileInput.files[0];
  if (!file) return;

  textarea.value = "";

  const reader = new FileReader();

  reader.onload = () => {
    textarea.value = reader.result;
  };

  reader.readAsText(file);
}

document.querySelectorAll(".tool-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".tool-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");

    document.querySelectorAll(".tool-panel").forEach(panel => panel.classList.add("hidden"));
    document.getElementById(card.dataset.tool).classList.remove("hidden");
  });
});

/* JSON TOOL */

const jsonFile = document.getElementById("jsonFile");
const jsonInput = document.getElementById("jsonInput");
const jsonStatus = document.getElementById("jsonStatus");

jsonFile.addEventListener("change", () => {
  readFileToTextarea(jsonFile, jsonInput);
  updateFileName("jsonFile", "jsonFileName");

  if (jsonFile.files[0]) {
    currentJsonFileName = jsonFile.files[0].name;
  }
});

document.getElementById("formatJsonBtn").addEventListener("click", () => {
  jsonStatus.className = "status";

  try {
    JSON.parse(jsonInput.value);

    jsonStatus.innerHTML = "✅ JSON valide.";
  } catch (e) {
    jsonStatus.classList.add("error");

    const match = e.message.match(/position (\d+)/);
    const position = match ? Number(match[1]) : -1;

    if (position >= 0) {
      const location = getLineColumnFromPosition(jsonInput.value, position);
      selectErrorInTextarea(jsonInput, position);

      jsonStatus.innerHTML = `
        ❌ Erreur JSON détectée<br><br>
        <strong>Détail :</strong> ${e.message}<br>
        <strong>Ligne :</strong> ${location.line}<br>
        <strong>Colonne :</strong> ${location.column}<br><br>
        La zone proche de l’erreur a été sélectionnée dans le fichier.
      `;
    } else {
      jsonStatus.innerHTML = `
        ❌ Erreur JSON détectée<br><br>
        <strong>Détail :</strong> ${e.message}
      `;
    }
  }
});

document.getElementById("downloadJsonBtn").addEventListener("click", () => {
  downloadFile(currentJsonFileName, jsonInput.value, "application/json");
});

document.getElementById("clearJsonBtn").addEventListener("click", () => {
  jsonInput.value = "";
  jsonStatus.textContent = "";
  jsonFile.value = "";
  currentJsonFileName = "validated.json";
  updateFileName("jsonFile", "jsonFileName");
});

/* XML TOOL */

const xmlFile = document.getElementById("xmlFile");
const xmlInput = document.getElementById("xmlInput");
const xmlStatus = document.getElementById("xmlStatus");

xmlFile.addEventListener("change", () => {
  readFileToTextarea(xmlFile, xmlInput);
  updateFileName("xmlFile", "xmlFileName");

  if (xmlFile.files[0]) {
    currentXmlFileName = xmlFile.files[0].name;
  }
});

function formatXml(xml) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(xml, "application/xml");

  const error = parsed.querySelector("parsererror");

  if (error) {
    throw new Error("XML invalide.");
  }

  let formatted = "";
  const reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, "$1\n$2$3");

  let pad = 0;

  xml.split("\n").forEach((node) => {
    let indent = 0;

    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
      indent = 1;
    }

    formatted += "  ".repeat(pad) + node + "\n";
    pad += indent;
  });

  return formatted.trim();
}

document.getElementById("formatXmlBtn").addEventListener("click", () => {
  xmlStatus.className = "status";

  try {
    const parser = new DOMParser();

    const xmlDoc = parser.parseFromString(
      xmlInput.value,
      "application/xml"
    );

    const errorNode = xmlDoc.querySelector("parsererror");

    if (errorNode) {
      throw new Error(errorNode.textContent.trim());
    }

    xmlStatus.innerHTML = "✅ XML valide.";
  } catch (e) {
    xmlStatus.classList.add("error");

    const lineMatch = e.message.match(/line\s+(\d+)/i);
    const columnMatch = e.message.match(/column\s+(\d+)/i);

    const line = lineMatch ? Number(lineMatch[1]) : null;
    const column = columnMatch ? Number(columnMatch[1]) : null;

    if (line) {
      const lines = xmlInput.value.split("\n");
      let position = 0;

      for (let i = 0; i < line - 1; i++) {
        position += lines[i].length + 1;
      }

      if (column) {
        position += column - 1;
      }

      selectLineInTextarea(xmlInput, line);
    }

    xmlStatus.innerHTML = `
      ❌ Erreur XML détectée<br><br>
      <strong>Détail :</strong><br>
      <span class="error-detail">${String(e.message).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span><br><br>
      ${line ? `<strong>Ligne :</strong> ${line}<br>` : ""}
      ${column ? `<strong>Colonne :</strong> ${column}<br>` : ""}
      ${line ? "<br>La zone proche de l’erreur a été sélectionnée dans le fichier." : ""}
    `;
  }
});

document.getElementById("downloadXmlBtn").addEventListener("click", () => {
  downloadFile(currentXmlFileName, xmlInput.value, "application/xml");
});

document.getElementById("clearXmlBtn").addEventListener("click", () => {
  xmlInput.value = "";
  xmlStatus.textContent = "";
  xmlFile.value = "";
  currentXmlFileName = "validated.xml";
  updateFileName("xmlFile", "xmlFileName");
});

/* DAY/NIGHT CALCULATOR */

document.getElementById("calculateDayNightBtn").addEventListener("click", () => {
  const day = Number(document.getElementById("dayMinutes").value);
  const night = Number(document.getElementById("nightMinutes").value);
  const result = document.getElementById("dayNightResult");

  if (!day || !night) {
    result.classList.remove("hidden");
    result.innerHTML = "<p class='status'>Indiquez une durée de jour et de nuit.</p>";
    return;
  }

  const fullCycle = day + night;

  const serverTimeAcceleration = Math.max(1, Math.round(1440 / fullCycle));
  const serverNightTimeAcceleration = Math.max(1, Math.round(day / night));

  result.classList.remove("hidden");
  result.innerHTML = `
    <h3>Valeurs conseillées</h3>

    <p>Durée totale souhaitée : <strong>${fullCycle} minutes</strong></p>

    <code>serverTimeAcceleration=${serverTimeAcceleration}</code>
    <code>serverNightTimeAcceleration=${serverNightTimeAcceleration}</code>

    <p class="muted">
      Ces valeurs sont une base de test. Ajustez selon le ressenti en jeu.
    </p>
  `;
});

/* WEATHER MANAGER */

const weatherOutput = document.getElementById("weatherOutput");
const weatherStatus = document.getElementById("weatherStatus");

function getWeatherValue(id) {
  return Number(document.getElementById(id).value || 0).toFixed(2);
}

function getWeatherInt(id) {
  return Number(document.getElementById(id).value || 0);
}

document.getElementById("generateWeatherBtn").addEventListener("click", () => {
  const overcastMin = getWeatherValue("weatherOvercastMin");
  const overcastMax = getWeatherValue("weatherOvercastMax");

  const rainMin = getWeatherValue("weatherRainMin");
  const rainMax = getWeatherValue("weatherRainMax");

  const fogMin = getWeatherValue("weatherFogMin");
  const fogMax = getWeatherValue("weatherFogMax");

  const windMin = getWeatherValue("weatherWindMin");
  const windMax = getWeatherValue("weatherWindMax");

  const snowMin = getWeatherValue("weatherSnowMin");
  const snowMax = getWeatherValue("weatherSnowMax");

  const stormDensity = getWeatherValue("weatherStormDensity");
  const stormThreshold = getWeatherValue("weatherStormThreshold");

  const duration = getWeatherInt("weatherDuration");
  const timeMin = getWeatherInt("weatherTimeMin");
  const timeMax = getWeatherInt("weatherTimeMax");
  const stormTimeout = getWeatherInt("weatherStormTimeout");

  weatherOutput.value = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<weather reset="0" enable="1">
    <overcast>
        <current actual="${overcastMin}" time="120" duration="${duration}" />
        <limits min="${overcastMin}" max="${overcastMax}" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="0.00" max="1.00" />
    </overcast>

    <fog>
        <current actual="${fogMin}" time="120" duration="${duration}" />
        <limits min="${fogMin}" max="${fogMax}" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="0.00" max="0.30" />
    </fog>

    <rain>
        <current actual="${rainMin}" time="120" duration="${duration}" />
        <limits min="${rainMin}" max="${rainMax}" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="0.00" max="0.60" />
        <thresholds min="0.60" max="1.00" end="120" />
    </rain>

    <windMagnitude>
        <current actual="${windMin}" time="120" duration="${duration}" />
        <limits min="${windMin}" max="${windMax}" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="0.00" max="0.40" />
    </windMagnitude>

    <windDirection>
        <current actual="0.00" time="120" duration="${duration}" />
        <limits min="-3.14" max="3.14" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="-1.00" max="1.00" />
    </windDirection>

    <snowfall>
        <current actual="${snowMin}" time="120" duration="${duration}" />
        <limits min="${snowMin}" max="${snowMax}" />
        <timelimits min="${timeMin}" max="${timeMax}" />
        <changelimits min="0.00" max="0.30" />
        <thresholds min="0.80" max="1.00" end="120" />
    </snowfall>

    <storm density="${stormDensity}" threshold="${stormThreshold}" timeout="${stormTimeout}" />
</weather>`;

  weatherStatus.textContent = "cfgweather.xml généré.";
});

document.getElementById("downloadWeatherBtn").addEventListener("click", () => {
  if (!weatherOutput.value.trim()) {
    weatherStatus.textContent = "Générez d’abord le fichier météo.";
    return;
  }

  downloadFile("cfgweather.xml", weatherOutput.value, "application/xml");
});

/* TYPES ORGANIZER */

let currentTypesOrganizerFileName = "types.xml";

const typesOrganizerFile = document.getElementById("typesOrganizerFile");
const typesOrganizerInput = document.getElementById("typesOrganizerInput");
const typesOrganizerStatus = document.getElementById("typesOrganizerStatus");

typesOrganizerFile.addEventListener("change", () => {
  readFileToTextarea(typesOrganizerFile, typesOrganizerInput);
  updateFileName("typesOrganizerFile", "typesOrganizerFileName");

  if (typesOrganizerFile.files[0]) {
    currentTypesOrganizerFileName = typesOrganizerFile.files[0].name;
  }
});

function extractTypeCategory(typeBlock) {
  const match = typeBlock.match(/<category\s+name="([^"]+)"/i);
  return match ? match[1] : "sans-categorie";
}

function extractTypeName(typeBlock) {
  const match = typeBlock.match(/<type\s+name="([^"]+)"/i);
  return match ? match[1] : "";
}

document.getElementById("organizeTypesBtn").addEventListener("click", () => {
  typesOrganizerStatus.className = "status";

  try {
    const originalXml = typesOrganizerInput.value.trim();

    if (!originalXml) {
      throw new Error("Importez ou collez d’abord un fichier types.xml.");
    }

    const typeBlocks = originalXml.match(/<type\b[\s\S]*?<\/type>/gi);

    if (!typeBlocks || !typeBlocks.length) {
      throw new Error("Aucun bloc <type> trouvé dans ce fichier.");
    }

    const headerMatch = originalXml.match(/^[\s\S]*?<types[^>]*>/i);
    const footerMatch = originalXml.match(/<\/types>[\s\S]*$/i);

    const header = headerMatch
      ? headerMatch[0]
      : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<types>';

    const footer = footerMatch
      ? footerMatch[0]
      : "</types>";

    typeBlocks.sort((a, b) => {
      const catA = extractTypeCategory(a).toLowerCase();
      const catB = extractTypeCategory(b).toLowerCase();

      const nameA = extractTypeName(a).toLowerCase();
      const nameB = extractTypeName(b).toLowerCase();

      if (catA !== catB) {
        return catA.localeCompare(catB);
      }

      return nameA.localeCompare(nameB);
    });

    typesOrganizerInput.value =
      header +
      "\n\n" +
      typeBlocks.join("\n\n") +
      "\n\n" +
      footer;

    typesOrganizerStatus.textContent =
      `types.xml organisé avec succès (${typeBlocks.length} items).`;
  } catch (e) {
    typesOrganizerStatus.classList.add("error");
    typesOrganizerStatus.textContent = e.message;
  }
});

document.getElementById("downloadTypesOrganizerBtn").addEventListener("click", () => {
  if (!typesOrganizerInput.value.trim()) {
    typesOrganizerStatus.textContent = "Importez ou collez d’abord un fichier types.xml.";
    return;
  }

  downloadFile(currentTypesOrganizerFileName, typesOrganizerInput.value, "application/xml");
});

document.getElementById("clearTypesOrganizerBtn").addEventListener("click", () => {
  typesOrganizerInput.value = "";
  typesOrganizerStatus.textContent = "";
  typesOrganizerFile.value = "";
  currentTypesOrganizerFileName = "types.xml";

  const fileName = document.getElementById("typesOrganizerFileName");

  if (fileName) {
    fileName.textContent = "Aucun fichier sélectionné";
  }
});

/* XML LOOT EDITOR */

let currentLootEditorFileName = "types.xml";
let currentLootXml = "";
let lootItems = [];

const lootCategories = [
  "",
  "weapons",
  "clothes",
  "containers",
  "food",
  "tools",
  "vehiclesparts",
  "books",
  "explosives"
];

const lootUsages = [
  "",
  "Military",
  "Police",
  "Medic",
  "Firefighter",
  "Industrial",
  "Farm",
  "Village",
  "Town",
  "Coast",
  "Hunting",
  "Office",
  "School",
  "Prison"
];

const lootTiers = [
  "",
  "Tier1",
  "Tier2",
  "Tier3",
  "Tier4"
];

const lootEditorFile = document.getElementById("lootEditorFile");
const lootEditorStatus = document.getElementById("lootEditorStatus");
const lootTableBody = document.getElementById("lootTableBody");
const lootSearch = document.getElementById("lootSearch");

const lootCategoryFilter =
  document.getElementById("lootCategoryFilter");

const bulkField = document.getElementById("bulkField");
const bulkTarget = document.getElementById("bulkTarget");
const bulkMode = document.getElementById("bulkMode");
const bulkValue = document.getElementById("bulkValue");
const applyBulkBtn = document.getElementById("applyBulkBtn");
const bulkSlider = document.getElementById("bulkSlider");
const bulkSliderValue = document.getElementById("bulkSliderValue");

lootEditorFile.addEventListener("change", () => {
  const file = lootEditorFile.files[0];

  if (!file) return;

  currentLootEditorFileName = file.name;

  // Reset complet avant import
  lootItems = [];
  currentLootXml = "";
  lootTableBody.innerHTML = "";
  lootEditorStatus.textContent = "";

  lootSearch.value = "";
  lootCategoryFilter.value = "all";

  bulkField.value = "nominal";
  bulkTarget.value = "all";
  bulkMode.value = "percent";
  bulkValue.value = "";

  updateFileName("lootEditorFile", "lootEditorFileName");

  const reader = new FileReader();

  reader.onload = () => {
    currentLootXml = String(reader.result || "");

    parseLootXml(currentLootXml);

    updateLootStats();

    filterLootItems();

    // Important pour pouvoir réimporter le même fichier
    lootEditorFile.value = "";
  };

  reader.readAsText(file);
});

function getTagValue(block, tag) {
  const regex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "i");
  const match = block.match(regex);

  return match ? match[1] : "0";
}

function getAttributeValue(block, tag, attribute) {

  const regex = new RegExp(
    `<${tag}[^>]*${attribute}="([^"]+)"`,
    "i"
  );

  const match = block.match(regex);

  return match ? match[1] : "";
}

function buildSelectOptions(options, selectedValue) {
  return options.map(option => `
    <option
      value="${option}"
      ${option === selectedValue ? "selected" : ""}
    >
      ${option || "-"}
    </option>
  `).join("");
}

function populateCategoryFilter() {
  const defaultCategories = [
    "weapons",
    "clothes",
    "containers",
    "food",
    "tools",
    "vehiclesparts",
    "books",
    "explosives"
  ];

  const fileCategories = lootItems
    .map(item => item.category)
    .filter(Boolean);

  const categories = [
    ...new Set([...defaultCategories, ...fileCategories])
  ].sort();

  lootCategoryFilter.innerHTML = `
    <option value="all">Toutes catégories</option>
  `;

  bulkTarget.innerHTML = `
    <option value="all">Tous les items</option>
  `;

  categories.forEach(category => {
    lootCategoryFilter.innerHTML += `
      <option value="${category}">${category}</option>
    `;

    bulkTarget.innerHTML += `
      <option value="${category}">${category}</option>
    `;
  });
}

applyBulkBtn.addEventListener("click", () => {
  if (!lootItems.length) {
    lootEditorStatus.textContent = "Importez d’abord un fichier types.xml.";
    return;
  }

  const field = bulkField.value;
  const target = bulkTarget.value;
  const mode = bulkMode.value;
  const value = Number(bulkValue.value);

  if (Number.isNaN(value)) {
    lootEditorStatus.textContent = "Indiquez une valeur valide.";
    return;
  }

  let count = 0;

  lootItems.forEach(item => {
    if (target !== "all" && item.category !== target) return;

    const oldValue = Number(item[field] || 0);

    if (mode === "percent") {
      item[field] = Math.max(
        0,
        Math.round(oldValue + oldValue * (value / 100))
      );
    }

    if (mode === "set") {
      item[field] = Math.max(
        0,
        Math.round(value)
      );
    }

    count++;
  });

  filterLootItems();
  updateLootStats();

  lootEditorStatus.textContent =
    `${count} items modifiés sur ${field}.`;
});

bulkSlider.addEventListener("input", () => {
  const value = Number(bulkSlider.value);

  bulkSliderValue.textContent =
    value > 0 ? `+${value}%` : `${value}%`;

  bulkMode.value = "percent";
  bulkValue.value = value;
});

document.querySelectorAll("[data-preset]").forEach(button => {
  button.addEventListener("click", () => {
    if (!lootItems.length) {
      lootEditorStatus.textContent = "Importez d’abord un fichier types.xml.";
      return;
    }

    const preset = button.dataset.preset;

    if (preset === "hardcore") {
      bulkField.value = "nominal";
      bulkTarget.value = "all";
      bulkMode.value = "percent";
      bulkValue.value = -40;
    }

    if (preset === "military") {
      bulkField.value = "nominal";
      bulkTarget.value = "weapons";
      bulkMode.value = "percent";
      bulkValue.value = 50;
    }

    if (preset === "food") {
      bulkField.value = "nominal";
      bulkTarget.value = "food";
      bulkMode.value = "percent";
      bulkValue.value = -60;
    }

    if (preset === "pvp") {
      bulkField.value = "nominal";
      bulkTarget.value = "weapons";
      bulkMode.value = "percent";
      bulkValue.value = 75;
    }

    if (preset === "reset") {
      parseLootXml(currentLootXml);
      updateLootStats();
      filterLootItems();
      lootEditorStatus.textContent = "Fichier réinitialisé avec les valeurs d’origine.";
      return;
    }

    applyBulkBtn.click();

    bulkSlider.value = bulkValue.value;
    bulkSliderValue.textContent =
      Number(bulkValue.value) > 0
        ? `+${bulkValue.value}%`
        : `${bulkValue.value}%`;
  });
});

function filterLootItems() {

  const search =
    lootSearch.value.toLowerCase();

  const category =
    lootCategoryFilter.value;

  const filtered = lootItems.filter(item => {

    const matchesSearch =
      item.name.toLowerCase()
      .includes(search);

    const matchesCategory =
      category === "all" ||
      item.category === category;

    return matchesSearch &&
      matchesCategory;
  });

  renderLootItems(filtered);
}

function parseLootXml(xml) {

  lootItems = [];

  const typeBlocks = xml.match(/<type\b[\s\S]*?<\/type>/gi);

  if (!typeBlocks) {
    populateCategoryFilter();
    lootEditorStatus.textContent = "Aucun item trouvé.";
    return;
  }

  typeBlocks.forEach(block => {

    const nameMatch = block.match(/<type\s+name="([^"]+)"/i);

    if (!nameMatch) return;

    lootItems.push({
      id: lootItems.length,
      original: block,
      name: nameMatch[1],

      category: getAttributeValue(
      block,
      "category",
      "name"
),

      usage: getAttributeValue(
      block,
      "usage",
      "name"
),

      tier: getAttributeValue(
      block,
      "value",
      "name"
),

      nominal: getTagValue(block, "nominal"),
      min: getTagValue(block, "min"),
      lifetime: getTagValue(block, "lifetime"),
      restock: getTagValue(block, "restock"),
      quantmin: getTagValue(block, "quantmin"),
      quantmax: getTagValue(block, "quantmax")
    });
  });
  populateCategoryFilter();
  renderLootItems(lootItems);

  lootEditorStatus.textContent =
    `${lootItems.length} items chargés.`;
}

function renderLootItems(items) {
  lootTableBody.innerHTML = items.map((item) => `
    <article class="loot-card">

      <div class="loot-card-main">
          <div>
            <h3>${item.name}</h3>

            <span class="loot-category-label">
              ${item.category || "-"}
            </span>
        </div>

        <label>
          Usage
          <select
            class="loot-select"
            oninput="updateLootValue(${item.id}, 'usage', this.value)"
          >
            ${buildSelectOptions(lootUsages, item.usage)}
          </select>
        </label>

        <label>
          Tier
          <select
            class="loot-select small"
            oninput="updateLootValue(${item.id}, 'tier', this.value)"
          >
            ${buildSelectOptions(lootTiers, item.tier)}
          </select>
        </label>

        <label>
          Nominal
          <input
            type="number"
            value="${item.nominal}"
            oninput="updateLootValue(${item.id}, 'nominal', this.value)"
          >
        </label>

        <label>
          Min
          <input
            type="number"
            value="${item.min}"
            oninput="updateLootValue(${item.id}, 'min', this.value)"
          >
        </label>

        <button
          type="button"
          class="mini-btn"
          onclick="toggleLootDetails(${item.id})"
        >
          Détails
        </button>

      </div>

      <div
        id="loot-details-${item.id}"
        class="loot-details-grid hidden"
      >

        <label>
          Lifetime
          <input
            type="number"
            value="${item.lifetime}"
            oninput="updateLootValue(${item.id}, 'lifetime', this.value)"
          >
        </label>

        <label>
          Restock
          <input
            type="number"
            value="${item.restock}"
            oninput="updateLootValue(${item.id}, 'restock', this.value)"
          >
        </label>

        <label>
          Quant Min
          <input
            type="number"
            value="${item.quantmin}"
            oninput="updateLootValue(${item.id}, 'quantmin', this.value)"
          >
        </label>

        <label>
          Quant Max
          <input
            type="number"
            value="${item.quantmax}"
            oninput="updateLootValue(${item.id}, 'quantmax', this.value)"
          >
        </label>

      </div>

    </article>
  `).join("");
}

window.updateLootValue = function(id, field, value) {
  const item = lootItems.find(i => i.id === id);

  if (!item) return;

  item[field] = value;

  updateLootStats();
};

window.toggleLootDetails = function(id) {
  const row = document.getElementById("loot-details-" + id);

  if (!row) return;

  row.classList.toggle("hidden");
};

lootSearch.addEventListener(
  "input",
  filterLootItems
);

lootCategoryFilter.addEventListener(
  "change",
  filterLootItems
);

function replaceOrInsertAttributeTag(block, tag, value) {
  const tagRegex = new RegExp(`<${tag}\\s+name="[^"]+"\\s*/>`, "i");

  if (!value) {
    return block.replace(tagRegex, "");
  }

  if (tagRegex.test(block)) {
    return block.replace(tagRegex, `<${tag} name="${value}"/>`);
  }

  return block.replace(
    /<\/type>/i,
    `    <${tag} name="${value}"/>\n</type>`
  );
}

function replaceOrInsertValueTag(block, value) {
  const valueRegex = /<value\s+name="[^"]+"\s*\/>/i;

  if (!value) {
    return block.replace(valueRegex, "");
  }

  if (valueRegex.test(block)) {
    return block.replace(valueRegex, `<value name="${value}"/>`);
  }

  return block.replace(
    /<\/type>/i,
    `    <value name="${value}"/>\n</type>`
  );
}

function rebuildLootXml() {
  let xml = currentLootXml;

  lootItems.forEach(item => {
    let updated = item.original;

    updated = updated.replace(
      /<nominal>.*?<\/nominal>/i,
      `<nominal>${item.nominal}</nominal>`
    );

    updated = updated.replace(
      /<min>.*?<\/min>/i,
      `<min>${item.min}</min>`
    );

    updated = updated.replace(
      /<lifetime>.*?<\/lifetime>/i,
      `<lifetime>${item.lifetime}</lifetime>`
    );

    updated = updated.replace(
      /<restock>.*?<\/restock>/i,
      `<restock>${item.restock}</restock>`
    );

    updated = updated.replace(
      /<quantmin>.*?<\/quantmin>/i,
      `<quantmin>${item.quantmin}</quantmin>`
    );

    updated = updated.replace(
      /<quantmax>.*?<\/quantmax>/i,
      `<quantmax>${item.quantmax}</quantmax>`
    );

    updated = replaceOrInsertAttributeTag(
      updated,
      "category",
      item.category
    );

    updated = replaceOrInsertAttributeTag(
      updated,
      "usage",
      item.usage
    );

    updated = replaceOrInsertValueTag(
      updated,
      item.tier
    );

    xml = xml.replace(item.original, updated);
  });

  return xml;
}

document.getElementById("downloadLootEditorBtn")
.addEventListener("click", () => {

  if (!lootItems.length) {
    lootEditorStatus.textContent =
      "Importez un fichier types.xml.";
    return;
  }

  const finalXml = rebuildLootXml();

  downloadFile(
    currentLootEditorFileName,
    finalXml,
    "application/xml"
  );
});

document.getElementById("clearLootEditorBtn")
.addEventListener("click", () => {

  lootItems = [];
  currentLootXml = "";

  lootTableBody.innerHTML = "";

  lootEditorStatus.textContent = "";

  lootEditorFile.value = "";

  lootSearch.value = "";

  lootCategoryFilter.value = "all";

  bulkField.value = "nominal";
  bulkTarget.value = "all";
  bulkMode.value = "percent";
  bulkValue.value = "";

  bulkSlider.value = 0;
  bulkSliderValue.textContent = "0%";

  updateFileName(
    "lootEditorFile",
    "lootEditorFileName"
  );
});

function updateLootStats() {
  const totalItemsEl = document.getElementById("statsTotalItems");
  const totalNominalEl = document.getElementById("statsTotalNominal");
  const averageNominalEl = document.getElementById("statsAverageNominal");
  const topCategoryEl = document.getElementById("statsTopCategory");

  if (!totalItemsEl || !totalNominalEl || !averageNominalEl || !topCategoryEl) {
    return;
  }

  const totalItems = lootItems.length;
  let totalNominal = 0;
  const categories = {};

  lootItems.forEach(item => {
    totalNominal += Number(item.nominal || 0);

    const category = item.category || "unknown";
    categories[category] = (categories[category] || 0) + 1;
  });

  const averageNominal = totalItems
    ? Math.round(totalNominal / totalItems)
    : 0;

  let topCategory = "-";
  let topCount = 0;

  Object.entries(categories).forEach(([category, count]) => {
    if (count > topCount) {
      topCategory = category;
      topCount = count;
    }
  });

  totalItemsEl.textContent = totalItems;
  totalNominalEl.textContent = totalNominal;
  averageNominalEl.textContent = averageNominal;
  topCategoryEl.textContent = topCategory;
}

/* XML EVENT SPAWN EDITOR */

let currentEventEditorFileName = "events.xml";
let currentEventsXml = "";
let eventItems = [];

let currentEventSpawnsFileName = "cfgeventspawns.xml";
let currentEventSpawnsXml = "";
let eventSpawnItems = [];

const eventEditorFile =
  document.getElementById("eventEditorFile");

const eventSpawnsFile =
  document.getElementById("eventSpawnsFile");

const eventEditorStatus =
  document.getElementById("eventEditorStatus");

const eventSearch =
  document.getElementById("eventSearch");

const eventUnifiedList =
  document.getElementById("eventUnifiedList");

/* CREATE NEW EVENT */

document.getElementById("createEventBtn")
.addEventListener("click", () => {

  const type =
    document.getElementById("newEventType").value;

  const customName =
    document.getElementById("newEventName").value.trim();

  if (!customName) {
    eventEditorStatus.textContent =
      "Indiquez un nom d’event.";
    return;
  }

  let prefix = "";

  if (type === "Vehicle") prefix = "Vehicle";
  if (type === "Item") prefix = "Item";
  if (type === "Animal") prefix = "Animal";
  if (type === "Static") prefix = "Static";
  if (type === "Dynamic") prefix = "Dynamic";

  const finalName =
    type === "Custom"
      ? customName
      : prefix + customName;

  const alreadyExists =
    eventItems.some(
      e => e.name.toLowerCase() === finalName.toLowerCase()
    );

  if (alreadyExists) {
    eventEditorStatus.textContent =
      "Cet event existe déjà.";
    return;
  }

  /* CREATE EVENT */

  const newEvent = {

    id: Date.now(),

    original: "",

    name: finalName,

    nominal:
      document.getElementById("newEventNominal").value || "1",

    min:
      document.getElementById("newEventMin").value || "1",

    max:
      document.getElementById("newEventMax").value || "1",

    lifetime:
      document.getElementById("newEventLifetime").value || "3600",

    restock:
      document.getElementById("newEventRestock").value || "0",

    saferadius:
      document.getElementById("newEventSafeRadius").value || "100",

    distanceradius:
      document.getElementById("newEventDistanceRadius").value || "100",

    cleanupradius:
      document.getElementById("newEventCleanupRadius").value || "100"
  };

  eventItems.push(newEvent);

  /* CREATE FIRST POSITION */

  const x =
    document.getElementById("newEventX").value;

  const z =
    document.getElementById("newEventZ").value;

  if (x && z) {

    eventSpawnItems.push({

      id: Date.now() + Math.random(),

      originalEventBlock: "",
      originalPosBlock: "",

      eventName: finalName,

      x,

      z,

      a:
        document.getElementById("newEventA").value || "0",

      group: ""
    });
  }

  renderUnifiedEvents();

  eventEditorStatus.textContent =
    `Event ${finalName} créé avec succès.`;
});

/* IMPORT EVENTS.XML */

eventEditorFile.addEventListener("change", () => {

  const file = eventEditorFile.files[0];

  if (!file) return;

  currentEventEditorFileName = file.name;

  currentEventsXml = "";
  eventItems = [];

  eventEditorStatus.textContent = "";
  eventSearch.value = "";

  updateFileName(
    "eventEditorFile",
    "eventEditorFileName"
  );

  const reader = new FileReader();

  reader.onload = () => {

    currentEventsXml = String(reader.result || "");

    parseEventsXml(currentEventsXml);

    renderUnifiedEvents();

    eventEditorFile.value = "";
  };

  reader.readAsText(file);
});

/* IMPORT CFGEVENTSPAWNS.XML */

eventSpawnsFile.addEventListener("change", () => {

  const file = eventSpawnsFile.files[0];

  if (!file) return;

  currentEventSpawnsFileName = file.name;

  currentEventSpawnsXml = "";
  eventSpawnItems = [];

  updateFileName(
    "eventSpawnsFile",
    "eventSpawnsFileName"
  );

  const reader = new FileReader();

  reader.onload = () => {

    currentEventSpawnsXml = String(reader.result || "");

    parseEventSpawnsXml(currentEventSpawnsXml);

    renderUnifiedEvents();

    eventSpawnsFile.value = "";
  };

  reader.readAsText(file);
});

/* PARSE EVENTS.XML */

function getEventTagValue(block, tag) {

  const regex =
    new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "i");

  const match = block.match(regex);

  return match ? match[1] : "0";
}

function parseEventsXml(xml) {

  eventItems = [];

  const eventBlocks =
    xml.match(/<event\b[\s\S]*?<\/event>/gi);

  if (!eventBlocks) return;

  eventBlocks.forEach(block => {

    const nameMatch =
      block.match(/<event\s+name="([^"]+)"/i);

    if (!nameMatch) return;

    eventItems.push({

      id: eventItems.length,
      original: block,

      name: nameMatch[1],

      nominal: getEventTagValue(block, "nominal"),
      min: getEventTagValue(block, "min"),
      max: getEventTagValue(block, "max"),

      lifetime: getEventTagValue(block, "lifetime"),
      restock: getEventTagValue(block, "restock"),

      saferadius: getEventTagValue(block, "saferadius"),
      distanceradius: getEventTagValue(block, "distanceradius"),
      cleanupradius: getEventTagValue(block, "cleanupradius")
    });
  });
}

/* PARSE CFGEVENTSPAWNS.XML */

function getXmlAttr(block, attr) {

  const match =
    block.match(new RegExp(`${attr}="([^"]*)"`, "i"));

  return match ? match[1] : "";
}

function parseEventSpawnsXml(xml) {

  eventSpawnItems = [];

  const eventBlocks =
    xml.match(/<event\b[\s\S]*?<\/event>/gi);

  if (!eventBlocks) return;

  eventBlocks.forEach(eventBlock => {

    const eventNameMatch =
      eventBlock.match(/<event\s+name="([^"]+)"/i);

    if (!eventNameMatch) return;

    const eventName = eventNameMatch[1];

    const posBlocks =
      eventBlock.match(/<pos\b[^>]*\/>/gi) || [];

    posBlocks.forEach(posBlock => {

      eventSpawnItems.push({

        id: Date.now() + Math.random(),

        originalEventBlock: eventBlock,
        originalPosBlock: posBlock,

        eventName,

        x: getXmlAttr(posBlock, "x"),
        z: getXmlAttr(posBlock, "z"),
        a: getXmlAttr(posBlock, "a"),
        group: getXmlAttr(posBlock, "group")
      });
    });
  });
}

/* RENDER */

function renderUnifiedEvents() {

  const search =
    eventSearch.value.toLowerCase();

  const filteredEvents =
    eventItems.filter(event =>
      event.name.toLowerCase().includes(search)
    );

  eventUnifiedList.innerHTML =
    filteredEvents.map(event => {

      const positions =
        eventSpawnItems.filter(
          spawn => spawn.eventName === event.name
        );

      return `

        <article class="loot-card">

          <div class="event-spawn-header">

            <div>

              <h3>${event.name}</h3>

              <span class="loot-category-label">
                ${positions.length} positions
              </span>

            </div>

            <button
              class="mini-btn"
              onclick="toggleEventPositions('${event.name}')"
            >
              Positions
            </button>

          </div>

          <div class="loot-card-main">

            <label>
              Nominal
              <input
                type="number"
                value="${event.nominal}"
                oninput="updateEventValue(${event.id}, 'nominal', this.value)"
              >
            </label>

            <label>
              Min
              <input
                type="number"
                value="${event.min}"
                oninput="updateEventValue(${event.id}, 'min', this.value)"
              >
            </label>

            <label>
              Max
              <input
                type="number"
                value="${event.max}"
                oninput="updateEventValue(${event.id}, 'max', this.value)"
              >
            </label>

            <label>
              Lifetime
              <input
                type="number"
                value="${event.lifetime}"
                oninput="updateEventValue(${event.id}, 'lifetime', this.value)"
              >
            </label>

            <label>
              Restock
              <input
                type="number"
                value="${event.restock}"
                oninput="updateEventValue(${event.id}, 'restock', this.value)"
              >
            </label>

          </div>

          <div
            id="event-positions-${event.name}"
            class="event-position-list hidden"
          >

            ${positions.map(position => `

              <div class="event-position-row">

                <label>
                  X
                  <input
                    type="number"
                    value="${position.x}"
                    oninput="updateEventSpawnValue(${position.id}, 'x', this.value)"
                  >
                </label>

                <label>
                  Z
                  <input
                    type="number"
                    value="${position.z}"
                    oninput="updateEventSpawnValue(${position.id}, 'z', this.value)"
                  >
                </label>

                <label>
                  Rotation
                  <input
                    type="number"
                    value="${position.a}"
                    oninput="updateEventSpawnValue(${position.id}, 'a', this.value)"
                  >
                </label>

                <button
                  class="mini-btn danger"
                  onclick="removeEventPosition(${position.id})"
                >
                  Supprimer
                </button>

              </div>

            `).join("")}

            <button
              class="mini-btn"
              onclick="addEventPosition('${event.name}')"
            >
              + Ajouter position
            </button>

          </div>

        </article>

      `;
    }).join("");

  eventEditorStatus.textContent =
    `${eventItems.length} events chargés.`;
}

/* UPDATE VALUES */

window.updateEventValue = function(id, field, value) {

  const event =
    eventItems.find(e => e.id === id);

  if (!event) return;

  event[field] = value;
};

window.updateEventSpawnValue = function(id, field, value) {

  const spawn =
    eventSpawnItems.find(s => s.id === id);

  if (!spawn) return;

  spawn[field] = value;
};

/* TOGGLE POSITIONS */

window.toggleEventPositions = function(eventName) {

  const block =
    document.getElementById(
      "event-positions-" + eventName
    );

  if (!block) return;

  block.classList.toggle("hidden");
};

/* ADD POSITION */

window.addEventPosition = function(eventName) {

  eventSpawnItems.push({

    id: Date.now() + Math.random(),

    originalEventBlock: "",
    originalPosBlock: "",

    eventName,

    x: "0",
    z: "0",
    a: "0",
    group: ""
  });

  renderUnifiedEvents();

  const block = document.getElementById(
    "event-positions-" + eventName
  );

  if (block) {
    block.classList.remove("hidden");
  }
};

/* REMOVE POSITION */

window.removeEventPosition = function(id) {

  eventSpawnItems =
    eventSpawnItems.filter(
      item => item.id !== id
    );

  renderUnifiedEvents();
};

/* SEARCH */

eventSearch.addEventListener(
  "input",
  renderUnifiedEvents
);

/* REBUILD EVENTS.XML */

function rebuildEventsXml() {
  let xml = currentEventsXml;

  eventItems.forEach(event => {
    let updated = event.original;

    [
      "nominal",
      "min",
      "max",
      "lifetime",
      "restock",
      "saferadius",
      "distanceradius",
      "cleanupradius"
    ].forEach(tag => {
      updated = updated.replace(
        new RegExp(`<${tag}>.*?<\\/${tag}>`, "i"),
        `<${tag}>${event[tag]}</${tag}>`
      );
    });

    xml = xml.replace(event.original, updated);
  });

  return xml;
}

/* REBUILD CFGEVENTSPAWNS.XML */

function rebuildEventSpawnsXml() {
  const grouped = {};

  eventSpawnItems.forEach(item => {
    if (!grouped[item.eventName]) {
      grouped[item.eventName] = [];
    }

    grouped[item.eventName].push(item);
  });

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<eventposdef>\n`;

  Object.entries(grouped).forEach(([eventName, positions]) => {
    xml += `  <event name="${eventName}">\n`;

    positions.forEach(pos => {
      xml += `    <pos x="${pos.x}" z="${pos.z}" a="${pos.a}"`;

      if (pos.group) {
        xml += ` group="${pos.group}"`;
      }

      xml += ` />\n`;
    });

    xml += `  </event>\n`;
  });

  xml += `</eventposdef>\n`;

  return xml;
}

/* DOWNLOAD EVENTS.XML */

document.getElementById("downloadEventEditorBtn")
.addEventListener("click", () => {
  if (!eventItems.length) {
    eventEditorStatus.textContent = "Importez un fichier events.xml.";
    return;
  }

  downloadFile(
    currentEventEditorFileName,
    rebuildEventsXml(),
    "application/xml"
  );
});

/* DOWNLOAD CFGEVENTSPAWNS.XML */

document.getElementById("downloadEventSpawnsBtn")
.addEventListener("click", () => {
  if (!eventSpawnItems.length) {
    eventEditorStatus.textContent = "Importez un fichier cfgeventspawns.xml.";
    return;
  }

  downloadFile(
    currentEventSpawnsFileName,
    rebuildEventSpawnsXml(),
    "application/xml"
  );
});