CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    cover_url TEXT,
    source_lang TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_target_langs (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  PRIMARY KEY (project_id, lang)
);

CREATE TABLE project_members(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('maintainer', 'reviewer', 'translator')),
    removed_at TIMESTAMPTZ,
    UNIQUE (project_id, user_id)
);

CREATE TABLE dup_groups(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE text_entries(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    dup_group_id uuid NOT NULL REFERENCES dup_groups (id),
    string_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    speaker TEXT,
    context TEXT,
    file_path TEXT NOT NULL,
    section TEXT,
    max_len INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    control_code TEXT[],
    state TEXT NOT NULL DEFAULT 'active'
        CHECK (state IN ('active', 'source_changed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, string_id)
);

CREATE TABLE entry_translations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dup_group_id uuid NOT NULL REFERENCES dup_groups (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    state text not null default 'untranslated'
        CHECK (state IN ('untranslated', 'draft', 'waiting_review', 'approved', 'needs_changes', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dup_group_id, lang)
);

CREATE TABLE translation_revisions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    entry_translation_id uuid NOT NULL REFERENCES entry_translations (id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES project_members (id),
    prev_revision_id uuid REFERENCES translation_revisions (id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entry_sets(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_by uuid NOT NULL REFERENCES project_members (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entry_set_items(
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    set_id uuid NOT NULL REFERENCES entry_sets (id) ON DELETE CASCADE,
    entry_id uuid NOT NULL REFERENCES text_entries (id) ON DELETE CASCADE,
    PRIMARY KEY (set_id, entry_id)
);

CREATE TABLE tasks(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    assignee_id uuid NOT NULL REFERENCES project_members (id),
    assigned_by_id uuid NOT NULL REFERENCES project_members (id),
    set_id uuid NOT NULL REFERENCES entry_sets (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE glossary_terms(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    term TEXT NOT NULL,
    translated_term TEXT NOT NULL,
    category TEXT,
    definition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, term, lang)
);

CREATE TABLE review_decisions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    revision_id uuid NOT NULL REFERENCES translation_revisions (id),
    reviewer_id uuid NOT NULL REFERENCES project_members (id),
    decision TEXT NOT NULL
        CHECK (decision IN ('approved', 'needs_changes', 'rejected', 'edit_and_approve')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entry_translations
    ADD COLUMN current_revision_id uuid REFERENCES translation_revisions (id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION set_entry_set_items_project_id()
RETURNS TRIGGER AS $$
DECLARE
    entry_project_id uuid;
    set_project_id uuid;
BEGIN
    SELECT project_id
    INTO set_project_id
    FROM entry_sets
    WHERE id = new.set_id;

    SELECT project_id
    INTO entry_project_id
    FROM text_entries
    WHERE id = new.entry_id;

    IF set_project_id IS NULL THEN
        RAISE EXCEPTION 'entry_set_items: set_id % not found', new.set_id;
    END IF;

    IF entry_project_id IS NULL THEN
        RAISE EXCEPTION 'entry_set_items: entry_id % not found', new.entry_id;
    END IF;

    IF set_project_id <> entry_project_id THEN
        RAISE EXCEPTION 'entry_set_items project_id mismatch: between set project %, entry project %',
        set_project_id, entry_project_id;
    END IF;

    new.project_id := set_project_id;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_set_items_project_id
BEFORE INSERT ON entry_set_items
FOR EACH ROW
EXECUTE FUNCTION set_entry_set_items_project_id();

CREATE OR REPLACE FUNCTION set_tasks_project_id()
RETURNS TRIGGER AS $$
DECLARE
    set_project_id uuid;
BEGIN
    SELECT project_id
    INTO set_project_id
    FROM entry_sets
    WHERE id = new.set_id;

    IF set_project_id IS NULL THEN
        RAISE EXCEPTION 'tasks: set_id % not found', new.set_id;
    END IF;

    new.project_id := set_project_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_project_id
BEFORE INSERT OR UPDATE OF set_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_tasks_project_id();

CREATE OR REPLACE FUNCTION set_text_entries_project_id()
RETURNS TRIGGER AS $$
DECLARE
    dup_group_project_id uuid;
BEGIN
    SELECT project_id
    INTO dup_group_project_id
    FROM dup_groups
    WHERE id = new.dup_group_id;

    IF dup_group_project_id IS NULL THEN
        RAISE EXCEPTION 'dup_group: dup_group_id % not found', new.dup_group_id;
    END IF;

    new.project_id := dup_group_project_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_text_entries_project_id
BEFORE INSERT OR UPDATE OF dup_group_id ON text_entries
FOR EACH ROW
EXECUTE FUNCTION set_text_entries_project_id();

CREATE OR REPLACE FUNCTION set_translation_revisions_project_id()
RETURNS TRIGGER AS $$
DECLARE
    entry_translations_project_id uuid;
BEGIN
    SELECT project_id
    INTO entry_translations_project_id
    FROM entry_translations
    WHERE id = new.entry_translation_id;

    IF entry_translations_project_id IS NULL THEN
        RAISE EXCEPTION 'entry_translations: entry_translation_id % not found', new.entry_translation_id;
    END IF;

    new.project_id := entry_translations_project_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_translation_revision_project_id
BEFORE INSERT OR UPDATE OF entry_translation_id ON translation_revisions
FOR EACH ROW
EXECUTE FUNCTION set_translation_revisions_project_id();

CREATE OR REPLACE FUNCTION set_review_decisions_project_id()
RETURNS trigger AS $$
DECLARE
    translation_revisions_project_id uuid;
BEGIN
    SELECT project_id
    INTO translation_revisions_project_id
    FROM translation_revisions
    WHERE id = new.revision_id;

    IF translation_revisions_project_id IS NULL THEN
        RAISE EXCEPTION 'review_decisions: revision_id % not found', new.revision_id;
    END IF;

    new.project_id := translation_revisions_project_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_decisions_project_id
BEFORE INSERT OR UPDATE OF revision_id ON review_decisions
FOR EACH ROW
EXECUTE FUNCTION set_review_decisions_project_id();

CREATE OR REPLACE FUNCTION set_entry_translations_project_id()
RETURNS TRIGGER AS $$
DECLARE
    dup_group_project_id uuid;
BEGIN
    SELECT project_id
    INTO dup_group_project_id
    FROM dup_groups
    WHERE id = new.dup_group_id;

    IF dup_group_project_id IS NULL THEN
        RAISE EXCEPTION 'dup_groups: dup_group_id % not found', new.dup_group_id;
    END IF;

    new.project_id := dup_group_project_id;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_translations_project_id
BEFORE INSERT ON entry_translations
FOR EACH ROW
EXECUTE FUNCTION set_entry_translations_project_id();