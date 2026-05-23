-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for full-text trigram search

-- Pages: the top-level unit of knowledge
CREATE TABLE pages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocks: first-class content units within a page
CREATE TABLE blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type        TEXT NOT NULL DEFAULT 'paragraph',  -- paragraph, heading, code, image, etc.
    content     JSONB NOT NULL DEFAULT '{}',         -- Tiptap node JSON
    block_index INTEGER NOT NULL DEFAULT 0,          -- ordering within the page
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_page_id ON blocks(page_id);
CREATE INDEX idx_blocks_page_order ON blocks(page_id, block_index);

-- Links: wiki-link relationships between pages
CREATE TABLE links (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    target_page_id    UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL DEFAULT 'wiki',  -- wiki, semantic, manual
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_page_id, target_page_id, relationship_type)
);

CREATE INDEX idx_links_source ON links(source_page_id);
CREATE INDEX idx_links_target ON links(target_page_id);

-- Chunks: RAG-ready content slices with embeddings
CREATE TABLE chunks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id        UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    block_id       UUID REFERENCES blocks(id) ON DELETE CASCADE,
    chunk_text     TEXT NOT NULL,
    chunk_index    INTEGER NOT NULL DEFAULT 0,
    embedding      vector(1536),                  -- OpenAI text-embedding-3-small dimensions
    embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_page_id ON chunks(page_id);
-- HNSW index for fast ANN vector search
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

-- Tags
CREATE TABLE tags (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE
);

CREATE TABLE page_tags (
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, tag_id)
);

-- Full-text search index on page titles
CREATE INDEX idx_pages_title_trgm ON pages USING gin (title gin_trgm_ops);

-- Auto-update updated_at on pages
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blocks_updated_at
    BEFORE UPDATE ON blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
