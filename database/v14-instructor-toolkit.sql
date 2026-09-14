-- ============================================================
-- KRAKEN V14
-- INSTRUCTOR TOOLKIT / PACKAGE BUILDER
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. INSTRUCTOR PACKAGES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.instructor_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Instructor package',
  cover_image_url TEXT,
  estimated_minutes INTEGER,
  target_audience TEXT,
  instructor_level TEXT,
  version TEXT,
  author TEXT NOT NULL DEFAULT 'Kraken Medical Training',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  resource_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instructor_packages_status_idx
ON public.instructor_packages (status, sort_order, updated_at DESC);

-- ------------------------------------------------------------
-- 2. PACKAGE CONTENT SECTIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.instructor_package_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL
    REFERENCES public.instructor_packages(id)
    ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  section_type TEXT NOT NULL DEFAULT 'Custom',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instructor_package_sections_package_idx
ON public.instructor_package_sections (package_id, position);

-- ------------------------------------------------------------
-- 3. PACKAGE RESOURCES
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.instructor_package_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL
    REFERENCES public.instructor_packages(id)
    ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'Download',
  url TEXT NOT NULL,
  button_text TEXT NOT NULL DEFAULT 'Open resource',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instructor_package_resources_package_idx
ON public.instructor_package_resources (package_id, position);

-- ------------------------------------------------------------
-- 4. UPDATED AT TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_instructor_package_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS instructor_package_updated_at_trigger
ON public.instructor_packages;

CREATE TRIGGER instructor_package_updated_at_trigger
BEFORE UPDATE ON public.instructor_packages
FOR EACH ROW
EXECUTE FUNCTION public.set_instructor_package_updated_at();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.instructor_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_package_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_package_resources ENABLE ROW LEVEL SECURITY;

-- Public visitors can read published packages.

DROP POLICY IF EXISTS "Public reads published instructor packages"
ON public.instructor_packages;

CREATE POLICY "Public reads published instructor packages"
ON public.instructor_packages
FOR SELECT
USING (
  status = 'published'
  OR EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

-- Public visitors can read sections only when the parent package is published.

DROP POLICY IF EXISTS "Public reads published package sections"
ON public.instructor_package_sections;

CREATE POLICY "Public reads published package sections"
ON public.instructor_package_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.instructor_packages package
    WHERE package.id = package_id
      AND (
        package.status = 'published'
        OR EXISTS (
          SELECT 1
          FROM public.admin_users
          WHERE user_id = auth.uid()
        )
      )
  )
);

-- Public visitors can read resources only when the parent package is published.

DROP POLICY IF EXISTS "Public reads published package resources"
ON public.instructor_package_resources;

CREATE POLICY "Public reads published package resources"
ON public.instructor_package_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.instructor_packages package
    WHERE package.id = package_id
      AND (
        package.status = 'published'
        OR EXISTS (
          SELECT 1
          FROM public.admin_users
          WHERE user_id = auth.uid()
        )
      )
  )
);

-- Admins can create, update and delete packages.

DROP POLICY IF EXISTS "Admins manage instructor packages"
ON public.instructor_packages;

CREATE POLICY "Admins manage instructor packages"
ON public.instructor_packages
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage package sections"
ON public.instructor_package_sections;

CREATE POLICY "Admins manage package sections"
ON public.instructor_package_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage package resources"
ON public.instructor_package_resources;

CREATE POLICY "Admins manage package resources"
ON public.instructor_package_resources
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- 6. OPTIONAL STARTER PACKAGE
-- ------------------------------------------------------------

INSERT INTO public.instructor_packages (
  title,
  subtitle,
  description,
  category,
  estimated_minutes,
  target_audience,
  instructor_level,
  version,
  status,
  sort_order
)
SELECT
  'BLS Instructor Package',
  'A complete teaching pack for a structured BLS session.',
  'Use this package as a starting point for lesson plans, presentations, learner handouts, equipment lists and assessment resources.',
  'Resuscitation',
  60,
  'BLS instructors',
  'Instructor',
  '1.0',
  'draft',
  10
WHERE NOT EXISTS (
  SELECT 1
  FROM public.instructor_packages
  WHERE title = 'BLS Instructor Package'
);

NOTIFY pgrst, 'reload schema';
