# Quick Notes

A responsive single-page notes app built with vanilla HTML, CSS, and JavaScript, a FastAPI REST API, and MongoDB. Notes are stored in the `quick_notes` database, in the `notes` collection.

## Requirements

- Python 3.10+
- Docker Desktop for the bundled MongoDB option, or an existing MongoDB server

## Run locally

1. From the project root, start MongoDB with Docker Compose:

   ```powershell
   docker compose up -d
   ```

   Compose keeps database files in the `quick-notes-data` volume. To stop MongoDB without deleting notes, run `docker compose down`. The default backend connection is `mongodb://localhost:27017`.

   If you already have MongoDB running, skip this step and set `MONGODB_URI` if its connection URI differs from the default.

2. From the project root, create a virtual environment and install the backend packages:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Start the API in the `backend` directory:

   ```powershell
   uvicorn main:app --reload
   ```

   The API is available at `http://127.0.0.1:8000`. Interactive API documentation is at `http://127.0.0.1:8000/docs`.

4. In a separate terminal, serve the frontend from the `frontend` directory:

   ```powershell
   cd frontend
   py -m http.server 5500
   ```

5. Open `http://127.0.0.1:5500`.

To remove the Docker database and all saved notes, run `docker compose down --volumes`.

## Configuration

- `MONGODB_URI`: MongoDB connection string (defaults to `mongodb://localhost:27017`).
- `CORS_ORIGINS`: comma-separated allowed browser origins (defaults to `http://localhost:5500,http://127.0.0.1:5500`).
- The frontend API URL is set at the top of `frontend/script.js` and defaults to `http://127.0.0.1:8000`.

For example, in PowerShell, set the MongoDB URI before starting Uvicorn:

```powershell
$env:MONGODB_URI = "mongodb+srv://<user>:<password>@<cluster>/"
```

Keep credentials out of source control. The `quick_notes` database and `notes` collection are created automatically when the first note is saved.

## API

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/notes` | Returns notes, newest first |
| `POST` | `/notes` | Creates a note from a JSON `title` and `description` |
| `DELETE` | `/notes/{note_id}` | Deletes a note by its MongoDB ObjectId |

Titles are required and limited to 120 characters. Descriptions are required and limited to 5,000 characters. Database connection and operation failures return an HTTP 503 response; invalid note IDs return 400, and deleting a nonexistent note returns 404.
