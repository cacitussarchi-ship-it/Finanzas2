import { API_URL, EXCHANGE_RATE, SHEETS } from "./config.js";
import { fallbackRows } from "./mock-data.js";

const credentials = { user: "CACITUS", password: "Fincacitus" };
const colors = ["#669b32", "#df911a", "#a02626", "#10233f", "#6b7d90"];
const menuOptions = Object.entries(SHEETS);

const state = {
  activeSheet: "resumen",
  rows: [],
  filteredRows: [],
  charts: {},
  sort: { key: "fecha", direction: "desc" },
  lastSync: null
};

const $ = (selector) => document.querySelector(selector);
const money = (value, currency = "CRC") =>
  new Intl.NumberFormat("es-CR", { style: "currency", currency, maximumFractionDigits: 0 }).format(value || 0);

document.addEventListener("DOMContentLoaded", () => {
  buildMenu();
  bindEvents();
  restoreSession();
});

function bindEvents() {
  $("#loginForm").addEventListener("submit", handleLogin);
  $("#logoutButton").addEventListener("click", logout);
  $("#refreshButton").addEventListener("click", loadData);
  $("#pdfButton").addEventListener("click", exportPdf);
  $("#searchInput").addEventListener("input", renderTable);
  $("#stateFilter").addEventListener("change", renderTable);
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => setSort(th.dataset.sort));
  });
}

function restoreSession() {
  if (sessionStorage.getItem("cacitusSession") === "active") {
    showDashboard();
    loadData();
  }
}

function handleLogin(event) {
  event.preventDefault();
  const user = $("#username").value.trim();
  const password = $("#password").value;

  if (user === credentials.user && password === credentials.password) {
    sessionStorage.setItem("cacitusSession", "active");
    $("#loginMessage").textContent = "";
    showDashboard();
    loadData();
    return;
  }

  $("#loginMessage").textContent = "Acceso denegado. Verifique usuario y contraseña.";
}

function showDashboard() {
  $("#loginView").classList.add("is-hidden");
  $("#dashboardView").classList.remove("is-hidden");
}

function logout() {
  sessionStorage.removeItem("cacitusSession");
  $("#dashboardView").classList.add("is-hidden");
  $("#loginView").classList.remove("is-hidden");
}

function buildMenu() {
  const menu = $("#sectionMenu");
  menu.innerHTML = menuOptions
    .map(([key, label]) => `<button class="menu-item ${key === state.activeSheet ? "active" : ""}" type="button" data-sheet="${key}">${label}</button>`)
    .join("");

  menu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sheet]");
    if (!button) return;
    state.activeSheet = button.dataset.sheet;
    document.querySelectorAll(".menu-item").forEach((item) => item.classList.toggle("active", item === button));
    renderDashboard();
  });
}

async function loadData() {
  setStatus("Sincronizando datos financieros...");
  try {
    const rows = await fetchRows();
    state.rows = normalizeRows(rows);
    state.lastSync = new Date();
    setStatus("");
  } catch (error) {
    state.rows = fallbackRows;
    state.lastSync = new Date();
    setStatus("No se pudo conectar con Apps Script. Se muestran datos de demostración hasta configurar la API.");
  }
  renderDashboard();
}

async function fetchRows() {
  if (!API_URL || API_URL === "URL_DE_APPS_SCRIPT") {
    throw new Error("API no configurada");
  }

  const response = await fetch(API_URL, { method: "GET" });
  if (!response.ok) throw new Error("Error al consultar Apps Script");
  const payload = await response.json();
  return Array.isArray(payload) ? payload : payload.data || [];
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    hoja: row.hoja || row.sheet || row.tipo || "Resumen general",
    fecha: row.fecha || row.Fecha || "",
    concepto: row.concepto || row.Concepto || row.descripcion || "",
    responsable: row.responsable || row.Responsable || row.encargado || "",
    monto: Number(row.monto || row.Monto || 0),
    estado: row.estado || row.Estado || "Pendiente",
    categoria: row.categoria || row.Categoria || row.hoja || "Otros"
  }));
}

function renderDashboard() {
  const selectedLabel = SHEETS[state.activeSheet];
  state.filteredRows = state.activeSheet === "resumen" ? state.rows : state.rows.filter((row) => row.hoja === selectedLabel);

  renderKpis(state.filteredRows);
  renderCharts(state.filteredRows);
  renderTable();
  updateSyncText();
}

function renderKpis(rows) {
  const positiveRows = rows.filter((row) => row.monto > 0);
  const income = sum(positiveRows);
  const pending = sum(rows.filter((row) => ["Pendiente", "Vencido"].includes(row.estado)));
  const collected = sum(rows.filter((row) => row.estado === "Recaudado"));

  $("#kpiIncome").textContent = money(income);
  $("#kpiIncomeHint").textContent = money(income / EXCHANGE_RATE, "USD");
  $("#kpiPending").textContent = money(pending);
  $("#kpiCollected").textContent = money(collected);
  $("#kpiRecords").textContent = rows.length.toString();
  $("#kpiUpdated").textContent = `Última actualización: ${formatDateTime(state.lastSync)}`;
}

function renderCharts(rows) {
  const incomeRows = rows.filter((row) => row.monto > 0);
  const byCategory = groupSum(incomeRows, "categoria");
  const byDate = groupSum(incomeRows, "fecha");

  upsertChart("barChart", "bar", {
    labels: Object.keys(byCategory),
    datasets: [{ label: "Ingresos", data: Object.values(byCategory), backgroundColor: colors }]
  });

  upsertChart("pieChart", "doughnut", {
    labels: Object.keys(byCategory),
    datasets: [{ data: Object.values(byCategory), backgroundColor: colors, borderWidth: 0 }]
  });

  upsertChart("lineChart", "line", {
    labels: Object.keys(byDate).sort(),
    datasets: [{
      label: "Ingresos",
      data: Object.keys(byDate).sort().map((date) => byDate[date]),
      borderColor: "#669b32",
      backgroundColor: "rgba(102, 155, 50, 0.14)",
      fill: true,
      tension: 0.35
    }]
  });
}

function upsertChart(canvasId, type, data) {
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#10233f", usePointStyle: true } } },
      scales: type === "doughnut" ? {} : {
        x: { grid: { display: false }, ticks: { color: "#65758c" } },
        y: { ticks: { color: "#65758c" }, grid: { color: "#eef2f6" } }
      }
    }
  });
}

function renderTable() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const stateFilter = $("#stateFilter").value;
  const rows = state.filteredRows
    .filter((row) => !stateFilter || row.estado === stateFilter)
    .filter((row) => [row.fecha, row.concepto, row.responsable, row.estado, row.categoria].join(" ").toLowerCase().includes(query))
    .sort(compareRows);

  $("#tableTitle").textContent = SHEETS[state.activeSheet];
  $("#tableTotal").textContent = `Total mostrado: ${money(sum(rows))}`;
  $("#recordsTable").innerHTML = rows.map(rowTemplate).join("") || `<tr><td colspan="5">No hay registros para mostrar.</td></tr>`;
}

function rowTemplate(row) {
  const className = row.estado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return `
    <tr>
      <td>${formatDate(row.fecha)}</td>
      <td>${row.concepto}</td>
      <td>${row.responsable}</td>
      <td class="amount">${money(row.monto)}</td>
      <td><span class="state-pill ${className}">${row.estado}</span></td>
    </tr>
  `;
}

function setSort(key) {
  state.sort.direction = state.sort.key === key && state.sort.direction === "asc" ? "desc" : "asc";
  state.sort.key = key;
  renderTable();
}

function compareRows(a, b) {
  const { key, direction } = state.sort;
  const left = key === "monto" ? a[key] : String(a[key]).toLowerCase();
  const right = key === "monto" ? b[key] : String(b[key]).toLowerCase();
  const result = left > right ? 1 : left < right ? -1 : 0;
  return direction === "asc" ? result : result * -1;
}

function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const rows = state.filteredRows;

  doc.setTextColor(16, 35, 63);
  doc.setFontSize(18);
  doc.text("Finanzas - CACITUS", 16, 18);
  doc.setFontSize(11);
  doc.text(`Reporte: ${SHEETS[state.activeSheet]}`, 16, 28);
  doc.text(`Última sincronización: ${formatDateTime(state.lastSync)}`, 16, 36);
  doc.text(`Total mostrado: ${money(sum(rows))}`, 16, 44);

  let y = 58;
  rows.slice(0, 24).forEach((row) => {
    doc.text(`${formatDate(row.fecha)} | ${row.concepto} | ${money(row.monto)} | ${row.estado}`, 16, y);
    y += 8;
  });

  doc.save(`finanzas-cacitus-${state.activeSheet}.pdf`);
}

function updateSyncText() {
  $("#syncBadge").textContent = `Última sincronización: ${formatDateTime(state.lastSync)}`;
}

function setStatus(message) {
  const box = $("#statusMessage");
  box.textContent = message;
  box.classList.toggle("is-hidden", !message);
}

function sum(rows) {
  return rows.reduce((total, row) => total + Number(row.monto || 0), 0);
}

function groupSum(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || "Sin clasificar";
    acc[label] = (acc[label] || 0) + Number(row.monto || 0);
    return acc;
  }, {});
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "pendiente";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
