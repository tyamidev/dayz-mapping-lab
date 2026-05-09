async function req(url, opt = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opt
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) throw new Error(j.error || "Erreur");
  return j;
}

function euro(n) {
  return Number(n || 0).toFixed(2).replace(".00", "") + "€";
}

function esc(v = "") {
  return String(v).replace(/[&<>'"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[m]));
}

function formatDescription(text = "") {
  const clean = String(text).trim();

  if (!clean) {
    return '<p class="muted">Aucune description.</p>';
  }

  const parts = clean
    .split(/\n| - |\+|•|→/)
    .map(item => item.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return `<p class="muted">${esc(clean)}</p>`;
  }

  return `
    <ul class="quote-description-list">
      ${parts.map(item => `<li>${esc(item)}</li>`).join("")}
    </ul>
  `;
}

function toggleQuoteDetails(id) {
  const details = document.getElementById("quote-details-" + id);
  if (details) {
    details.classList.toggle("hidden");
  }
}

const fixedPrices = {
  "Bot Basic": 35,
  "Bot Premium": 65,
  "Bot Ultra": 120,
  "Mapping Small": 20,
  "Mapping Medium": 50,
  "Mapping Large": 100,
  "Discord Setup": 69
};

const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");
const logoutBtn = document.getElementById("logout");

let cachedRequests = [];
let cachedQuotes = [];

async function check() {
  const me = await req("/api/admin/me");

  loginPanel.classList.toggle("hidden", me.authenticated);
  adminPanel.classList.toggle("hidden", !me.authenticated);
  logoutBtn.classList.toggle("hidden", !me.authenticated);

  if (me.authenticated) {
    await refreshAll();
  }
}

async function refreshAll() {
  await loadRequests();
  await loadQuotes();
  updateStats();
}

document.getElementById("loginBtn").onclick = async () => {
  try {
    await req("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: document.getElementById("password").value
      })
    });

    check();
  } catch (e) {
    document.getElementById("loginStatus").textContent = e.message;
  }
};

logoutBtn.onclick = async () => {
  await req("/api/admin/logout", { method: "POST" });
  location.reload();
};

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-btn").forEach(b => {
      b.classList.remove("active");
    });

    btn.classList.add("active");

    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.add("hidden");
    });

    document.getElementById(btn.dataset.tab).classList.remove("hidden");
  };
});

document.getElementById("refreshRequests").onclick = loadRequests;
document.getElementById("refreshQuotes").onclick = loadQuotes;

const serviceSelect = document.getElementById("serviceSelect");
const amountInput = document.getElementById("amountInput");

if (serviceSelect && amountInput) {
  serviceSelect.addEventListener("change", () => {
    const selected = serviceSelect.value;
    if (fixedPrices[selected]) {
      amountInput.value = fixedPrices[selected];
    }
  });
}

document.getElementById("quoteForm").onsubmit = async e => {
  e.preventDefault();

  const status = document.getElementById("quoteStatus");
  status.textContent = "Création du devis...";

  try {
    const quote = await req("/api/admin/quotes", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
    });

    status.innerHTML = `
      Devis ${quote.id} créé.
      <a href="/payer-devis.html?id=${quote.id}" target="_blank">Ouvrir le lien de paiement</a>
    `;

    e.target.reset();
    await loadQuotes();
    updateStats();
  } catch (err) {
    status.textContent = err.message;
  }
};

async function patchQuote(id, data) {
  await req("/api/admin/quotes/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  await loadQuotes();
  updateStats();
}

async function deleteQuote(id) {
  if (!confirm("Supprimer ce devis ?")) return;

  await req("/api/admin/quotes/" + id, {
    method: "DELETE"
  });

  await loadQuotes();
  updateStats();
}


async function patchRequest(id, data) {
  await req("/api/admin/requests/" + id, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  await loadRequests();
  updateStats();
}

async function deleteRequest(id) {
  if (!confirm("Supprimer cette demande ?")) return;

  await req("/api/admin/requests/" + id, {
    method: "DELETE"
  });

  await loadRequests();
  updateStats();
}

const quoteModal = document.getElementById("quoteModal");
const quoteModalClose = document.getElementById("quoteModalClose");
const quoteModalForm = document.getElementById("quoteModalForm");
const quoteModalTitle = document.getElementById("quoteModalTitle");

function openQuoteModal(mode, data = {}) {
  quoteModal.classList.remove("hidden");

  document.getElementById("modalQuoteId").value = data.quoteId || "";
  document.getElementById("modalRequestId").value = data.requestId || "";

  document.getElementById("modalCustomerName").value = data.customerName || "";
  document.getElementById("modalEmail").value = data.email || "";
  document.getElementById("modalService").value = data.service || "";
  document.getElementById("modalAmount").value = data.amount || "";
  document.getElementById("modalDescription").value = data.description || "";

  quoteModal.dataset.mode = mode;

  quoteModalTitle.textContent =
    mode === "edit" ? "Modifier le devis" : "Créer un devis depuis la demande";
}

function closeQuoteModal() {
  quoteModal.classList.add("hidden");
  quoteModalForm.reset();
  quoteModal.dataset.mode = "";
}

quoteModalClose.onclick = closeQuoteModal;

quoteModal.addEventListener("click", (e) => {
  if (e.target === quoteModal) closeQuoteModal();
});

function editQuote(id) {
  const quote = cachedQuotes.find(q => q.id === id);

  if (!quote) {
    alert("Devis introuvable.");
    return;
  }

  openQuoteModal("edit", {
    quoteId: quote.id,
    customerName: quote.customerName || "",
    email: quote.email || "",
    service: quote.service || "",
    amount: quote.amount || "",
    description: quote.description || ""
  });
}

function quoteFromRequest(id) {
  const request = cachedRequests.find(r => r.id === id);

  if (!request) {
    alert("Demande introuvable.");
    return;
  }

  let suggestedAmount = "";

  if (request.service) {
    const normalized = request.service.toLowerCase();

    if (normalized.includes("bot")) suggestedAmount = 35;
    if (normalized.includes("discord")) suggestedAmount = 69;
    if (normalized.includes("mapping")) suggestedAmount = 50;
    if (
      normalized.includes("clé") ||
      normalized.includes("server") ||
      normalized.includes("serveur")
    ) {
      suggestedAmount = 100;
    }
  }

  openQuoteModal("request", {
    requestId: request.id,
    customerName: request.name || "",
    email: request.email || "",
    service: request.service || "",
    amount: suggestedAmount,
    description: request.message || ""
  });
}
quoteModalForm.onsubmit = async (e) => {
  e.preventDefault();

  const mode = quoteModal.dataset.mode;

  const quoteId = document.getElementById("modalQuoteId").value;
  const requestId = document.getElementById("modalRequestId").value;

  const data = {
    customerName: document.getElementById("modalCustomerName").value,
    email: document.getElementById("modalEmail").value,
    service: document.getElementById("modalService").value,
    amount: document.getElementById("modalAmount").value,
    description: document.getElementById("modalDescription").value
  };

  try {
    if (mode === "edit") {
      await patchQuote(quoteId, data);
      alert("Devis modifié avec succès.");
    }

    if (mode === "request") {
      await req("/api/admin/requests/" + requestId + "/create-quote", {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          description: data.description
        })
      });

      alert("Devis créé avec succès.");
      await refreshAll();
    }

    closeQuoteModal();
  } catch (err) {
    alert(err.message);
  }
};

async function loadRequests() {
  const box = document.getElementById("requests");
  box.innerHTML = '<p class="muted">Chargement...</p>';

  try {
    const requests = await req("/api/admin/requests");
    cachedRequests = requests;

    box.innerHTML = requests.map(r => `
      <article class="quote-item">
        <header>
          <div>
            <strong>${esc(r.id)}</strong>
            <p class="muted">${new Date(r.createdAt).toLocaleString("fr-FR")}</p>
          </div>
          <span class="badge ${esc(r.status)}">${esc(r.status)}</span>
        </header>

        <p>
          <strong>${esc(r.name)}</strong> — ${esc(r.email)}
          ${r.discord ? `— Discord : ${esc(r.discord)}` : ""}
        </p>

        <p>
          Service : <strong>${esc(r.service)}</strong>
          ${r.budget ? ` · Budget : <strong>${esc(r.budget)}</strong>` : ""}
        </p>

        <p class="muted">${esc(r.message)}</p>

        ${r.quoteId ? `
          <p>
            Devis lié :
            <a href="/payer-devis.html?id=${esc(r.quoteId)}" target="_blank">${esc(r.quoteId)}</a>
          </p>
        ` : ""}

        <div class="toolbar">
          <button class="btn" onclick="quoteFromRequest('${esc(r.id)}')">Créer devis</button>
          <button class="btn secondary" onclick="patchRequest('${esc(r.id)}',{status:'new'})">Nouveau</button>
          <button class="btn secondary" onclick="patchRequest('${esc(r.id)}',{status:'contacted'})">Contacté</button>
          <button class="btn secondary" onclick="patchRequest('${esc(r.id)}',{status:'closed'})">Classer</button>
          <button class="btn danger" onclick="deleteRequest('${esc(r.id)}')">Supprimer</button>
        </div>
      </article>
    `).join("") || '<p class="muted">Aucune demande.</p>';

    updateStats();
  } catch (e) {
    box.innerHTML = `<p class="status">${e.message}</p>`;
  }
}

async function loadQuotes() {
  const box = document.getElementById("quotes");
  box.innerHTML = '<p class="muted">Chargement...</p>';

  try {
    const quotes = await req("/api/admin/quotes");
    cachedQuotes = quotes;

    const groups = {
      pending: quotes.filter(q => q.status === "pending"),
      paid: quotes.filter(q => q.status === "paid"),
      cancelled: quotes.filter(q => q.status === "cancelled"),
      other: quotes.filter(q => !["pending", "paid", "cancelled"].includes(q.status))
    };

    function renderGroup(title, items) {
      if (!items.length) return "";

      return `
        <div class="quote-status-group">
          <h3>${title} <span>${items.length}</span></h3>

          ${items.map(q => `
            <article class="quote-item compact-quote">
              <header onclick="toggleQuoteDetails('${esc(q.id)}')" class="quote-clickable-header">
                <div>
                  <strong>${esc(q.id)}</strong>
                  <p class="muted">${new Date(q.createdAt).toLocaleString("fr-FR")}</p>
                  <p>
                    <strong>${esc(q.customerName || "Client")}</strong>
                    ${q.email ? ` — ${esc(q.email)}` : ""}
                  </p>
                  <p>${esc(q.service || "Projet personnalisé")} · <strong>${euro(q.amount)}</strong></p>
                </div>

                <div class="quote-header-right">
                  <span class="badge ${esc(q.status)}">${esc(q.status)}</span>
                  <span class="quote-toggle">Voir détails ▾</span>
                </div>
              </header>

              <div id="quote-details-${esc(q.id)}" class="quote-details hidden">
                ${formatDescription(q.description)}

                <p>
                  <a href="/payer-devis.html?id=${esc(q.id)}" target="_blank">Lien de paiement</a>
                </p>

                <div class="toolbar">
                  <button class="btn" onclick="editQuote('${esc(q.id)}')">Modifier</button>
                  <button class="btn secondary" onclick="patchQuote('${esc(q.id)}',{status:'pending'})">En attente</button>
                  <button class="btn secondary" onclick="patchQuote('${esc(q.id)}',{status:'paid'})">Payé</button>
                  <button class="btn secondary" onclick="patchQuote('${esc(q.id)}',{status:'cancelled'})">Annulé</button>
                  <button class="btn danger" onclick="deleteQuote('${esc(q.id)}')">Supprimer</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      `;
    }

    box.innerHTML =
      renderGroup("⏳ Devis en attente", groups.pending) +
      renderGroup("✅ Devis payés", groups.paid) +
      renderGroup("❌ Devis annulés", groups.cancelled) +
      renderGroup("📁 Autres devis", groups.other) ||
      '<p class="muted">Aucun devis.</p>';

    updateStats();
  } catch (e) {
    box.innerHTML = `<p class="status">${e.message}</p>`;
  }
}

function updateStats() {
  const totalRequests = cachedRequests.length;
  const paidQuotes = cachedQuotes.filter(q => q.status === "paid");
  const pendingQuotes = cachedQuotes.filter(q => q.status === "pending");

  const revenue = paidQuotes.reduce((sum, q) => {
    return sum + Number(q.amount || 0);
  }, 0);

  document.getElementById("statsRequests").textContent = totalRequests;
  document.getElementById("statsPaid").textContent = paidQuotes.length;
  document.getElementById("statsPending").textContent = pendingQuotes.length;
  document.getElementById("statsRevenue").textContent = euro(revenue);
}

check();