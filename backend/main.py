import os
from datetime import datetime, timezone
from typing import Annotated

from bson import ObjectId
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from pymongo.errors import PyMongoError

from database import notes_collection


NoteText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class NoteCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: NoteText = Field(max_length=120)
    description: NoteText = Field(max_length=5000)


app = FastAPI(title="Quick Notes API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)


def serialize_note(note: dict) -> dict:
    return {
        "id": str(note["_id"]),
        "title": note["title"],
        "description": note["description"],
        "created_at": note["created_at"].isoformat(),
    }


@app.get("/notes")
def get_notes() -> list[dict]:
    try:
        return [
            serialize_note(note)
            for note in notes_collection.find().sort("created_at", -1)
        ]
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not retrieve notes from the database.",
        ) from exc


@app.post("/notes", status_code=status.HTTP_201_CREATED)
def create_note(note: NoteCreate) -> dict:
    created_at = datetime.now(timezone.utc)
    document = {
        "title": note.title,
        "description": note.description,
        "created_at": created_at,
    }
    try:
        result = notes_collection.insert_one(document)
        document["_id"] = result.inserted_id
        return serialize_note(document)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save the note to the database.",
        ) from exc


@app.delete("/notes/{note_id}")
def delete_note(note_id: str) -> Response:
    if not ObjectId.is_valid(note_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID.",
        )

    try:
        result = notes_collection.delete_one({"_id": ObjectId(note_id)})
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete the note from the database.",
        ) from exc

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found.",
        )

    return JSONResponse({"message": "Note deleted successfully."})
