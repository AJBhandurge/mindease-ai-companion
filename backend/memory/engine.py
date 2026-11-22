"""
MEMORY ENGINE — Long-term memory using ChromaDB + sentence-transformers
"""
import uuid
import re
import ast
from datetime import datetime


class MemoryEngine:
    def __init__(self, db_path="./chroma_db"):
        print("Loading memory engine...")
        from sentence_transformers import SentenceTransformer
        import chromadb

        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(
            name="user_memories",
            metadata={"hnsw:space": "cosine"}
        )
        print("Memory engine ready.")

    def store_memory(self, user_id: int, content: str, memory_type: str = "general", importance: float = 0.5):
        embedding = self.model.encode(content).tolist()
        doc_id = f"mem_{user_id}_{uuid.uuid4().hex[:8]}"
        self.collection.add(
            documents=[content],
            embeddings=[embedding],
            ids=[doc_id],
            metadatas=[{
                "user_id": str(user_id),
                "type": memory_type,
                "importance": str(importance),
                "created_at": datetime.utcnow().isoformat()
            }]
        )
        return doc_id

    def retrieve_memories(self, user_id: int, query: str, k: int = 5) -> list:
        if self.collection.count() == 0:
            return []
        query_embedding = self.model.encode(query).tolist()
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(k, self.collection.count()),
                where={"user_id": str(user_id)}
            )
        except Exception:
            return []
        if not results['documents'] or not results['documents'][0]:
            return []
        return [
            {"content": doc, "type": meta.get("type", "general")}
            for doc, meta in zip(results['documents'][0], results['metadatas'][0])
        ]

    def extract_and_store_memories(self, user_id: int, messages: list, llm_service) -> list:
        if len(messages) < 4:
            return []

        conversation_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages[-8:]])
        extraction_prompt = f"""Extract key personal facts about the user from this conversation.
Return ONLY a Python list of strings. Each string = one important fact.
Example: ["User's name is Atharva", "User has exam stress", "User likes morning walks"]
Extract maximum 3 facts. If nothing important, return empty list [].

CONVERSATION:
{conversation_text}

FACTS:"""
        try:
            response = llm_service.generate_simple(extraction_prompt)
            match = re.search(r'\[.*?\]', response, re.DOTALL)
            if match:
                facts = ast.literal_eval(match.group())
                stored = []
                for fact in facts[:3]:
                    if len(str(fact)) > 10:
                        self.store_memory(user_id, str(fact), "long_term", 0.8)
                        stored.append(fact)
                return stored
        except Exception as e:
            print(f"Memory extraction error: {e}")
        return []


_engine = None


def get_memory_engine() -> MemoryEngine:
    global _engine
    if _engine is None:
        _engine = MemoryEngine()
    return _engine
