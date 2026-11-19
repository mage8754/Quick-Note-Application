const API_BASE_URL = "http://127.0.0.1:8000";

const form = document.querySelector("#note-form");
const titleInput = document.querySelector("#note-title");
const descriptionInput = document.querySelector("#note-description");
const saveButton = document.querySelector("#save-button");
const notesList = document.querySelector("#notes-list");
const noteCount = document.querySelector("#note-count");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const toastRegion = document.querySelector("#toast-region");

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.textContent = message;
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Can't reach the notes service. Check that the backend is running.");
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).join(" ");
      }
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function createNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-card";
  card.dataset.noteId = note.id;

  const title = document.createElement("h3");
  title.textContent = note.title;
  const description = document.createElement("p");
  description.textContent = note.description;

  const meta = document.createElement("div");
  meta.className = "note-meta";
  const date = document.createElement("time");
  date.className = "note-date";
  date.dateTime = note.created_at;
  date.textContent = formatDate(note.created_at);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.deleteId = note.id;
  deleteButton.setAttribute("aria-label", `Delete note: ${note.title}`);
  deleteButton.innerHTML =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11m-9.5 0 .6 10h6.8l.6-10M8 6V4h4v2m-3 3v4m2-4v4" /></svg><span>Delete</span>';

  meta.append(date, deleteButton);
  card.append(title, description, meta);
  return card;
}

function renderNotes(notes) {
  notesList.replaceChildren(...notes.map(createNoteCard));
  noteCount.textContent = String(notes.length);
  emptyState.hidden = notes.length !== 0;
}

async function loadNotes() {
  loadingState.hidden = false;
  notesList.hidden = true;
  emptyState.hidden = true;
  try {
    const notes = await request("/notes");
    renderNotes(notes);
  } catch (error) {
    showToast(error.message, "error");
    emptyState.hidden = true;
  } finally {
    loadingState.hidden = true;
    notesList.hidden = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title || !description) {
    showToast("Add both a title and a note before saving.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.querySelector("span").textContent = "Saving...";
  try {
    const note = await request("/notes", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
    notesList.prepend(createNoteCard(note));
    emptyState.hidden = true;
    noteCount.textContent = String(notesList.children.length);
    form.reset();
    titleInput.focus();
    showToast("Your note is safely saved.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.querySelector("span").textContent = "Save note";
  }
});

notesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const noteId = button.dataset.deleteId;
  button.disabled = true;
  try {
    await request(`/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    button.closest(".note-card").remove();
    noteCount.textContent = String(notesList.children.length);
    emptyState.hidden = notesList.children.length !== 0;
    showToast("Note deleted.");
  } catch (error) {
    button.disabled = false;
    showToast(error.message, "error");
  }
});

loadNotes();
