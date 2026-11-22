"""
RAG ENGINE — Retrieval-Augmented Generation using ChromaDB
"""
from pathlib import Path
import uuid


class RAGEngine:
    def __init__(self, db_path="./chroma_db"):
        from sentence_transformers import SentenceTransformer
        import chromadb

        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(
            name="rag_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

    def ingest_text(self, text: str, source: str = "unknown"):
        chunks = self._chunk_text(text, chunk_size=400, overlap=50)
        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:
                continue
            embedding = self.model.encode(chunk).tolist()
            doc_id = f"rag_{source}_{i}_{uuid.uuid4().hex[:6]}"
            try:
                self.collection.add(
                    documents=[chunk],
                    embeddings=[embedding],
                    ids=[doc_id],
                    metadatas=[{"source": source}]
                )
            except Exception:
                pass

    def ingest_folder(self, folder_path: str):
        folder = Path(folder_path)
        files = list(folder.glob("*.txt")) + list(folder.glob("*.md"))
        print(f"Found {len(files)} files to ingest...")
        for file in files:
            print(f"  Ingesting: {file.name}")
            text = file.read_text(encoding='utf-8', errors='ignore')
            self.ingest_text(text, source=file.stem)
        print(f"Ingested {len(files)} files into RAG.")

    def retrieve(self, query: str, k: int = 3) -> str:
        if self.collection.count() == 0:
            return ""
        query_embedding = self.model.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(k, self.collection.count())
        )
        if not results['documents'] or not results['documents'][0]:
            return ""
        chunks = results['documents'][0]
        return "\n\n".join(chunks)

    def _chunk_text(self, text: str, chunk_size: int = 400, overlap: int = 50) -> list:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        return chunks


_rag = None


def get_rag_engine() -> RAGEngine:
    global _rag
    if _rag is None:
        _rag = RAGEngine()
    return _rag
