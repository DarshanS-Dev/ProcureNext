import chromadb
from chromadb.utils import embedding_functions

import os

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_data")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "startups")
PS_COLLECTION_NAME = os.getenv("PS_COLLECTION_NAME", "problem_statements")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

_embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBEDDING_MODEL
)

_client = chromadb.PersistentClient(path=CHROMA_PATH)


def _get_startup_collection():
    return _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=_embedding_fn,
    )


def _get_ps_collection():
    return _client.get_or_create_collection(
        name=PS_COLLECTION_NAME,
        embedding_function=_embedding_fn,
    )


def store_startup(startup_id: int, description: str) -> None:
    """
    Embeds a startup's description and stores/updates it in ChromaDB.
    Call this once per startup (or again to update its description).
    """
    try:
        collection = _get_startup_collection()
        collection.upsert(
            ids=[str(startup_id)],
            documents=[description],
        )
    except Exception as e:
        raise RuntimeError(f"Failed to store startup {startup_id} in ChromaDB: {e}") from e


def store_problem_statement(ps_id: int, description: str) -> None:
    """
    Embeds a problem statement's description and stores/updates it in ChromaDB.
    Call this every time ProblemStatement.description is created or updated.
    """
    try:
        collection = _get_ps_collection()
        collection.upsert(
            ids=[str(ps_id)],
            documents=[description],
        )
    except Exception as e:
        raise RuntimeError(f"Failed to store problem statement {ps_id} in ChromaDB: {e}") from e


def match_problem_to_startups(problem_description: str, top_k: int = 5) -> list[str]:
    """
    Given a govt problem statement's description,
    returns the top_k matching startup ids, ordered best match first.
    Returns empty list if no startups are indexed yet.
    """
    try:
        collection = _get_startup_collection()

        count = collection.count()
        if count == 0:
            return []

        n_results = min(top_k, count)
        results = collection.query(
            query_texts=[problem_description],
            n_results=n_results,
        )
        return results["ids"][0]

    except Exception as e:
        raise RuntimeError(f"Failed to match problem to startups in ChromaDB: {e}") from e


def match_startup_to_problems(startup_description: str, top_k: int = 5) -> list[str]:
    """
    Given a startup's description,
    returns the top_k matching problem statement ids, ordered best match first.
    Returns empty list if no problem statements are indexed yet.
    """
    try:
        collection = _get_ps_collection()

        count = collection.count()
        if count == 0:
            return []

        n_results = min(top_k, count)
        results = collection.query(
            query_texts=[startup_description],
            n_results=n_results,
        )
        return results["ids"][0]

    except Exception as e:
        raise RuntimeError(f"Failed to match startup to problems in ChromaDB: {e}") from e