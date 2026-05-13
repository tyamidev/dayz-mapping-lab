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

function getTypeCategory(typeNode) {
  const category = typeNode.querySelector("category");

  if (!category) {
    return "sans-categorie";
  }

  return category.getAttribute("name") || "sans-categorie";
}

function serializeXmlDocument(xmlDoc) {
  const serializer = new XMLSerializer();
  let xml = serializer.serializeToString(xmlDoc);

  xml = xml.replace(/></g, ">\n<");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml.replace(/^<\?xml.*?\?>\s*/i, "")}`;
}

document.getElementById("organizeTypesBtn").addEventListener("click", () => {
  typesOrganizerStatus.className = "status";

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(typesOrganizerInput.value, "application/xml");

    const errorNode = xmlDoc.querySelector("parsererror");

    if (errorNode) {
      throw new Error("Le fichier XML est invalide.");
    }

    const root = xmlDoc.querySelector("types");

    if (!root) {
      throw new Error("Impossible de trouver la balise <types>.");
    }

    const types = Array.from(root.querySelectorAll(":scope > type"));

    if (!types.length) {
      throw new Error("Aucun item <type> trouvé dans le fichier.");
    }

    types.sort((a, b) => {
      const categoryA = getTypeCategory(a).toLowerCase();
      const categoryB = getTypeCategory(b).toLowerCase();

      const nameA = a.getAttribute("name") || "";
      const nameB = b.getAttribute("name") || "";

      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
      }

      return nameA.localeCompare(nameB);
    });

    types.forEach(type => {
      root.appendChild(type);
    });

    typesOrganizerInput.value = serializeXmlDocument(xmlDoc);

    typesOrganizerStatus.textContent = `types.xml organisé avec succès (${types.length} items).`;
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
  currentTypesOrganizerFileName = "types.xml";

  const fileName = document.getElementById("typesOrganizerFileName");
  if (fileName) {
    fileName.textContent = "Aucun fichier sélectionné";
  }
});