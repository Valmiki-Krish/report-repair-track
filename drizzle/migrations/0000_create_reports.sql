CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT NOT NULL,
  after_photo_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Pothole',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Reported',
  reporter_name TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reports_category_check CHECK (category IN ('Pothole','Streetlight','Garbage','Flooding','Other')),
  CONSTRAINT reports_status_check CHECK (status IN ('Reported','Assigned','Repaired','Verified'))
);

GRANT SELECT, INSERT, UPDATE ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Anyone can create reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reports (demo MVP)" ON public.reports FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_set_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.upvote_report(report_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.reports SET upvotes = upvotes + 1 WHERE id = report_id RETURNING upvotes;
$$;

GRANT EXECUTE ON FUNCTION public.upvote_report(UUID) TO anon, authenticated;