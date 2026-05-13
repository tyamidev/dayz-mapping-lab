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
});

document.getElementById("formatJsonBtn").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonInput.value = JSON.stringify(parsed, null, 2);
    jsonStatus.textContent = "JSON valide et formaté.";
  } catch (e) {
    jsonStatus.textContent = "Erreur JSON : " + e.message;
  }
});

document.getElementById("downloadJsonBtn").addEventListener("click", () => {
  downloadFile("formatted.json", jsonInput.value, "application/json");
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
  try {
    xmlInput.value = formatXml(xmlInput.value);
    xmlStatus.textContent = "XML valide et formaté.";
  } catch (e) {
    xmlStatus.textContent = "Erreur XML : " + e.message;
  }
});

document.getElementById("downloadXmlBtn").addEventListener("click", () => {
  downloadFile("formatted.xml", xmlInput.value, "application/xml");
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