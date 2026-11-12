"""Writes documents and chunks to Supabase.

A document's content_hash is written only after all its chunks are stored,
so an interrupted run is retried instead of being skipped next time.
"""

from __future__ import annotations

from supabase import Client, create_client

from .config import Settings

INSERT_BATCH = 100


class Store:
    def __init__(self, settings: Settings):
        self.db: Client = create_client(settings.supabase_url, settings.supabase_key)

    def check_model(self, model_tag: str) -> None:
        """Refuse to mix embedding models in one table: their vectors aren't comparable."""
        res = self.db.table("chunks").select("embed_model").neq("embed_model", model_tag).limit(1).execute()
        if res.data:
            raise SystemExit(
                f"The knowledge base contains chunks embedded with {res.data[0]['embed_model']}, but this run uses {model_tag}.\n"
                "Mixing models breaks search. Clear the tables (see docs/rag-setup.md) or switch back to the original model."
            )

    def existing_hash(self, url: str) -> str | None:
        res = self.db.table("documents").select("content_hash").eq("url", url).limit(1).execute()
        return res.data[0]["content_hash"] if res.data else None

    def save(self, doc_row: dict, chunk_rows: list[dict], content_hash: str) -> int:
        res = self.db.table("documents").upsert({**doc_row, "content_hash": "pending"}, on_conflict="url").execute()
        doc_id = res.data[0]["id"]
        self.db.table("chunks").delete().eq("document_id", doc_id).execute()
        for i in range(0, len(chunk_rows), INSERT_BATCH):
            batch = [{**row, "document_id": doc_id} for row in chunk_rows[i : i + INSERT_BATCH]]
            self.db.table("chunks").insert(batch).execute()
        self.db.table("documents").update({"content_hash": content_hash}).eq("id", doc_id).execute()
        return doc_id

    def search(self, query_text: str, query_embedding: list[float], match_count: int = 5, crop: str | None = None, state: str | None = None) -> list[dict]:
        res = self.db.rpc(
            "hybrid_search",
            {
                "query_text": query_text,
                "query_embedding": query_embedding,
                "match_count": match_count,
                "filter_crop": crop,
                "filter_state": state,
            },
        ).execute()
        return res.data or []
