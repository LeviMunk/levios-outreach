-- LeviOS Research Inbox: server-side research staging, unlocked browser-only encryption.
-- Public business research here is deliberately kept separate from the AES-GCM encrypted private vault.
CREATE TABLE IF NOT EXISTS public.outreach_research_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_key text NOT NULL CHECK (char_length(batch_key) BETWEEN 6 AND 150),
  origin text NOT NULL DEFAULT 'research',
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) = 'object'
    AND jsonb_typeof(payload -> 'records') = 'array'
    AND jsonb_array_length(payload -> 'records') <= 50
    AND octet_length(payload::text) <= 250000
  ),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','imported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  imported_at timestamptz,
  UNIQUE (user_id, batch_key)
);
ALTER TABLE public.outreach_research_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_research_batches FROM public, anon, authenticated;
GRANT SELECT ON public.outreach_research_batches TO authenticated;
DROP POLICY IF EXISTS "Owner can read research inbox" ON public.outreach_research_batches;
CREATE POLICY "Owner can read research inbox"
  ON public.outreach_research_batches
  FOR SELECT TO authenticated
  USING (user_id=(select auth.uid())
    AND (select auth.jwt()->>'email')='levivanstap@gmail.com');

-- Acknowledgement only after browser has encrypted + persisted a full successful cloud revision.
-- No client INSERT/UPDATE permissions, and no server-side access to vault plaintext.
CREATE OR REPLACE FUNCTION public.outreach_ack_research_batch(p_batch_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE changed int;
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt()->>'email') IS DISTINCT FROM 'levivanstap@gmail.com' THEN
    RAISE EXCEPTION 'Research inbox access denied' USING errcode='42501';
  END IF;
  UPDATE public.outreach_research_batches
    SET status='imported',imported_at=now()
    WHERE id=p_batch_id AND user_id=auth.uid() AND status='queued';
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed=1;
END $$;
REVOKE ALL ON FUNCTION public.outreach_ack_research_batch(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.outreach_ack_research_batch(uuid) TO authenticated;
