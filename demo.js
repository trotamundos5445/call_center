const storageKey = "some-call-center-demo-v1";
const feedback = document.querySelector("#app-feedback");
const dateNow = new Date();
const makeId = () => globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function demoSeed() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextDay = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const calls = [
    { CallId: "demo-call-001", PatientName: "Paciente de prueba 01", PatientRut: "DEMO-001", PatientPhone: "000000001", Reason: "Solicitud de hora médica", Notes: "Consulta por disponibilidad de medicina general.", IdentityStatus: "validated", Outcome: "appointment", Status: "closed", FollowUpAt: "", Consent: true, NotificationStatus: "consent-granted", CreatedAt: now.toISOString() },
    { CallId: "demo-call-002", PatientName: "Paciente de prueba 02", PatientRut: "DEMO-002", PatientPhone: "000000002", Reason: "Consulta de medicamentos / receta", Notes: "Caso derivado para revisión del equipo correspondiente.", IdentityStatus: "pending", Outcome: "referred", Status: "follow-up", FollowUpAt: tomorrow.toISOString().slice(0, 10), Consent: false, NotificationStatus: "not-requested", CreatedAt: now.toISOString() },
    { CallId: "demo-call-003", PatientName: "Paciente de prueba 03", PatientRut: "DEMO-003", PatientPhone: "000000003", Reason: "Reclamo / sugerencia", Notes: "Pendiente de respuesta de la unidad.", IdentityStatus: "not-validated", Outcome: "pending", Status: "open", FollowUpAt: nextDay.toISOString().slice(0, 10), Consent: false, NotificationStatus: "not-requested", CreatedAt: now.toISOString() }
  ];
  const appointments = [{ AppointmentId: "demo-appointment-001", CallId: calls[0].CallId, ScheduledAt: nextDay.toISOString(), Clinic: "Centro de demostración", Professional: "Medicina general", AppointmentStatus: "pending-avis" }];
  return { calls, appointments, events: [] };
}

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.calls) && Array.isArray(saved.appointments) && Array.isArray(saved.events)) return saved;
  } catch { /* Inicializar datos ficticios si el almacenamiento local está vacío o inválido. */ }
  const initial = demoSeed();
  saveStore(initial);
  return initial;
}

let store = loadStore();

function saveStore(nextStore = store) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextStore));
  } catch {
    showFeedback("El navegador no permitió guardar la demo. Revisa la configuración de almacenamiento.", true);
  }
}

function showFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("error-message", isError);
}

function recordEvent(callId, message) {
  store.events.unshift({ id: makeId(), callId, message, at: new Date().toISOString() });
  store.events = store.events.slice(0, 200);
  saveStore();
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatStatus(status) {
  return ({ open: "Abierta", "follow-up": "Requiere seguimiento", closed: "Cerrada", "pending-avis": "Pendiente AVIS", cancelled: "Cancelada" })[status] || status;
}

function formatOutcome(outcome) {
  return ({ pending: "Pendiente", resolved: "Resuelto", appointment: "Solicitud de hora", referred: "Derivado" })[outcome] || outcome || "—";
}

function formatIdentity(status) {
  return ({ pending: "Pendiente de validar", validated: "Validada por protocolo", "not-validated": "No validada" })[status] || status || "—";
}

function formatNotification(call) {
  if (!call.Consent) return "Sin consentimiento";
  if (call.NotificationStatus === "simulated") return "Simulación registrada";
  if (call.IdentityStatus !== "validated") return "Pendiente de validación";
  if (!call.PatientPhone) return "Falta teléfono de prueba";
  return "Consentimiento registrado · no enviado";
}

function addCell(row, value) {
  const cell = row.insertCell();
  cell.textContent = value || "—";
  return cell;
}

function addEmptyRow(body, columns, message) {
  const row = body.insertRow();
  const cell = row.insertCell();
  cell.colSpan = columns;
  cell.className = "empty-state";
  cell.textContent = message;
}

function actionButton(label, action, callId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-secondary table-action";
  button.textContent = label;
  button.addEventListener("click", () => action(callId));
  return button;
}

function renderCalls(search = "") {
  const query = search.trim().toLocaleLowerCase("es-CL");
  const calls = store.calls.filter((call) => !query || [call.PatientName, call.PatientRut, call.PatientPhone, call.Reason, call.Notes].some((value) => value?.toLocaleLowerCase("es-CL").includes(query)));
  for (const [selector, columns, isHistory] of [["#calls-table", 6, false], ["#history-table", 8, true]]) {
    const body = document.querySelector(selector);
    body.replaceChildren();
    if (!calls.length) addEmptyRow(body, columns, "No se encontraron interacciones.");
    for (const call of calls) {
      const row = body.insertRow();
      addCell(row, formatDate(call.CreatedAt));
      if (!isHistory) addCell(row, call.PatientName);
      addCell(row, call.PatientRut);
      addCell(row, call.Reason);
      if (isHistory) {
        addCell(row, formatOutcome(call.Outcome));
        addCell(row, formatStatus(call.Status));
        addCell(row, call.FollowUpAt || "—");
        addCell(row, formatNotification(call));
      } else {
        addCell(row, formatOutcome(call.Outcome));
        addCell(row, formatStatus(call.Status));
      }
      const actions = row.insertCell();
      actions.append(actionButton("Editar", editCall, call.CallId));
      if (call.Status !== "closed") actions.append(actionButton("Cerrar", closeCall, call.CallId));
      if (call.Consent && call.IdentityStatus === "validated" && call.PatientPhone && call.NotificationStatus !== "simulated") actions.append(actionButton("Simular aviso", simulateNotification, call.CallId));
    }
  }

  renderAppointmentOptions();
}

function renderAppointmentOptions() {
  const select = document.querySelector("#appointment-call");
  const selected = select.value;
  select.replaceChildren(new Option("Selecciona una interacción", ""));
  for (const call of store.calls.filter((item) => item.Status !== "closed")) {
    select.add(new Option(`${call.PatientRut} · ${call.Reason}`, call.CallId));
  }
  if (store.calls.some((call) => call.CallId === selected && call.Status !== "closed")) select.value = selected;
}

function renderAudit() {
  const list = document.querySelector("#audit-list");
  if (!list) return;
  list.replaceChildren();
  if (!store.events.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Sin actividad registrada.";
    list.append(empty);
    return;
  }
  for (const event of store.events.slice(0, 30)) {
    const item = document.createElement("article");
    item.className = "record-item";
    const call = store.calls.find((record) => record.CallId === event.callId);
    item.textContent = `${formatDate(event.at)} · ${call?.PatientRut || "Interacción"} · ${event.message}`;
    list.append(item);
  }
}

function renderAppointments() {
  const list = document.querySelector("#appointments-list");
  list.replaceChildren();
  const upcomingList = document.querySelector("#upcoming-list");
  upcomingList.replaceChildren();
  const sorted = [...store.appointments].sort((a, b) => new Date(a.ScheduledAt) - new Date(b.ScheduledAt));
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Sin solicitudes de hora registradas.";
    list.append(empty);
    upcomingList.append(empty.cloneNode(true));
    return;
  }
  for (const appointment of sorted) {
    const call = store.calls.find((item) => item.CallId === appointment.CallId);
    const item = document.createElement("article");
    item.className = "record-item";
    const title = document.createElement("strong");
    title.textContent = call?.PatientName || "Paciente de prueba";
    const detail = document.createElement("p");
    detail.textContent = `${formatDate(appointment.ScheduledAt)} · ${appointment.Clinic} · ${formatStatus(appointment.AppointmentStatus)}`;
    item.append(title, detail);
    if (appointment.AppointmentStatus === "pending-avis") {
      const note = document.createElement("p");
      note.textContent = "No reservar ni confirmar hasta verificar disponibilidad en AVIS.";
      item.append(note);
    }
    list.append(item);
    if (appointment.AppointmentStatus === "pending-avis") upcomingList.append(item.cloneNode(true));
  }
}

function renderReports() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = store.calls.filter((call) => new Date(call.CreatedAt) >= monthAgo);
  const followUps = store.calls.filter((call) => call.Status === "follow-up" || call.Status === "open");
  const structured = recent.filter((call) => call.Reason && call.Outcome && call.IdentityStatus && call.Status);
  const metrics = document.querySelector("#report-metrics");
  metrics.replaceChildren();
  const values = [
    ["Interacciones ficticias", recent.length],
    ["Pendientes / derivadas", followUps.length],
    ["Con campos críticos completos", `${structured.length} de ${recent.length}`]
  ];
  for (const [label, value] of values) {
    const metric = document.createElement("div");
    metric.className = "metric";
    const caption = document.createElement("span");
    caption.textContent = label;
    const number = document.createElement("strong");
    number.textContent = String(value);
    metric.append(caption, number);
    metrics.append(metric);
  }
  const reasonList = document.querySelector("#reason-report");
  reasonList.replaceChildren();
  const totals = new Map();
  for (const call of recent) totals.set(call.Reason, (totals.get(call.Reason) || 0) + 1);
  for (const [reason, total] of totals) {
    const item = document.createElement("div");
    item.className = "record-item";
    item.textContent = `${reason}: ${total} (muestra)`;
    reasonList.append(item);
  }
}

function refreshData() {
  renderCalls();
  renderAppointments();
  renderReports();
  renderAudit();
}

function editCall(id) {
  const call = store.calls.find((item) => item.CallId === id);
  if (!call) return;
  document.querySelector("#call-id").value = call.CallId;
  document.querySelector("#patient-name").value = call.PatientName;
  document.querySelector("#patient-rut").value = call.PatientRut;
  document.querySelector("#patient-phone").value = call.PatientPhone;
  document.querySelector("#call-reason").value = call.Reason;
  document.querySelector("#call-notes").value = call.Notes || "";
  document.querySelector("#identity-status").value = call.IdentityStatus || "pending";
  document.querySelector("#call-outcome").value = call.Outcome || "pending";
  document.querySelector("#follow-up-date").value = call.FollowUpAt || "";
  document.querySelector("#notification-consent").checked = Boolean(call.Consent);
  document.querySelector("#save-call").textContent = "Guardar pendiente";
  document.querySelector("#cancel-edit").hidden = false;
  document.querySelector("#close-call").hidden = call.Status === "closed";
  openView("home-view");
  document.querySelector("#patient-name").focus();
}

function closeCall(id) {
  const call = store.calls.find((item) => item.CallId === id);
  if (!call) return;
  if (call.IdentityStatus !== "validated") {
    showFeedback("No cierres como resuelta una interacción sin identidad validada; déjala pendiente o derívala.", true);
    return;
  }
  call.Status = call.Outcome === "referred" || call.Outcome === "pending" ? "follow-up" : "closed";
  call.UpdatedAt = new Date().toISOString();
  recordEvent(id, `Interacción marcada: ${formatStatus(call.Status)}`);
  showFeedback("Estado de la interacción actualizado.");
  refreshData();
}

function resetCallForm() {
  document.querySelector("#call-form").reset();
  document.querySelector("#call-id").value = "";
  document.querySelector("#save-call").textContent = "Guardar pendiente";
  document.querySelector("#cancel-edit").hidden = true;
  document.querySelector("#close-call").hidden = false;
}

function openView(viewId) {
  document.querySelectorAll(".page-view").forEach((view) => { view.hidden = view.id !== viewId; });
  document.querySelectorAll("[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === viewId));
  const link = document.querySelector(`[data-view="${viewId}"]`);
  document.querySelector("#page-title").textContent = link?.textContent.trim() || "Atención trazable";
  if (viewId === "calls-view") renderCalls();
  if (viewId === "appointments-view") renderAppointments();
  if (viewId === "history-view") renderCalls(document.querySelector("#history-search").value);
  if (viewId === "reports-view") renderReports();
}

document.querySelectorAll("[data-view]").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  openView(link.dataset.view);
}));
document.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.openView)));

document.querySelector("#call-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = document.querySelector("#call-id").value;
  const form = Object.fromEntries(new FormData(event.currentTarget));
  const closing = event.submitter?.value === "closed";
  if (["pending", "referred"].includes(form.outcome) && !form.followUpAt) {
    showFeedback("Indica una fecha de seguimiento para dejar este caso pendiente o derivado.", true);
    return;
  }
  if (closing && (form.identityStatus !== "validated" || !["resolved", "appointment"].includes(form.outcome))) {
    showFeedback("Para cerrar, marca la validación según protocolo y selecciona Resuelto o Solicitud de hora.", true);
    return;
  }
  let call = store.calls.find((item) => item.CallId === id);
  const now = new Date().toISOString();
  const fields = {
    PatientName: form.patientName.trim(),
    PatientRut: form.patientRut.trim(),
    PatientPhone: form.patientPhone.trim(),
    Reason: form.reason,
    Notes: form.notes.trim(),
    IdentityStatus: form.identityStatus,
    Outcome: form.outcome,
    FollowUpAt: form.followUpAt,
    Consent: form.consent === "on",
    NotificationStatus: form.consent === "on" ? "consent-granted" : "not-requested",
    Status: closing ? "closed" : ["pending", "referred"].includes(form.outcome) ? "follow-up" : "open",
    UpdatedAt: now
  };
  if (call) Object.assign(call, fields);
  else {
    call = { ...fields, CallId: makeId(), CreatedAt: now };
    store.calls.unshift(call);
  }
  recordEvent(call.CallId, closing ? "Interacción cerrada" : call.IdentityStatus === "validated" ? "Interacción guardada con validación declarada" : "Interacción guardada pendiente o con excepción de identidad");
  resetCallForm();
  showFeedback(closing ? "Interacción cerrada en la demo." : "Interacción guardada localmente.");
  refreshData();
});

function simulateNotification(id) {
  const call = store.calls.find((item) => item.CallId === id);
  if (!call?.Consent) {
    showFeedback("No hay consentimiento registrado para esta interacción.", true);
    return;
  }
  if (call.IdentityStatus !== "validated" || !call.PatientPhone) {
    showFeedback("Para simular una confirmación, valida según protocolo y usa un teléfono ficticio.", true);
    return;
  }
  call.NotificationStatus = "simulated";
  recordEvent(id, "Notificación marcada como simulada; no se envió ningún mensaje");
  showFeedback("Simulación registrada. No se envió WhatsApp.");
  refreshData();
}

document.querySelector("#cancel-edit").addEventListener("click", resetCallForm);
document.querySelector("#appointment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const callId = document.querySelector("#appointment-call").value;
  const scheduledAt = document.querySelector("#appointment-date").value;
  const clinic = document.querySelector("#appointment-clinic").value.trim();
  if (!callId || !scheduledAt || !clinic) return;
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    showFeedback("Selecciona una fecha futura válida.", true);
    return;
  }
  const duplicate = store.appointments.some((item) => item.AppointmentStatus === "pending-avis" && item.ScheduledAt === scheduledDate.toISOString() && item.Clinic.toLocaleLowerCase("es-CL") === clinic.toLocaleLowerCase("es-CL"));
  if (duplicate) {
    showFeedback("Ya existe una solicitud de demostración para ese centro y horario.", true);
    return;
  }
  const appointment = { AppointmentId: makeId(), CallId: callId, ScheduledAt: scheduledDate.toISOString(), Clinic: clinic, Professional: document.querySelector("#appointment-professional").value.trim(), AppointmentStatus: "pending-avis" };
  store.appointments.push(appointment);
  recordEvent(callId, "Solicitud de hora creada; falta verificar disponibilidad en AVIS");
  event.currentTarget.reset();
  showFeedback("Solicitud guardada como pendiente. No se reservó en AVIS.");
  refreshData();
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  renderCalls(document.querySelector("#history-search").value);
});

document.querySelector("#call-outcome").addEventListener("change", (event) => {
  const needsFollowUp = ["pending", "referred"].includes(event.currentTarget.value);
  document.querySelector("#follow-up-date").required = needsFollowUp;
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  store = demoSeed();
  saveStore();
  resetCallForm();
  showFeedback("Datos ficticios de demostración restablecidos.");
  refreshData();
});

document.querySelector("#current-date").textContent = new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeStyle: "short" }).format(dateNow);
document.querySelector("#whatsapp-status").textContent = "WhatsApp no conectado · la demo no envía mensajes.";
document.querySelector("#auth-screen")?.remove();
document.querySelector("#logout-button")?.remove();
refreshData();