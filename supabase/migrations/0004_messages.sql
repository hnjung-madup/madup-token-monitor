-- Team chat messages table
CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel     TEXT NOT NULL DEFAULT 'general',
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email  TEXT NOT NULL,
    user_name   TEXT,
    body        TEXT NOT NULL,
    image_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel, created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all messages
CREATE POLICY "messages_select" ON messages
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert their own messages
CREATE POLICY "messages_insert" ON messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own messages
CREATE POLICY "messages_delete" ON messages
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
