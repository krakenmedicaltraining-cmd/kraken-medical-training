-- ============================================================
-- KRAKEN V13.5
-- SIMULATION ACTIVITY + ACHIEVEMENT BADGE SYSTEM
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. ACHIEVEMENT DEFINITIONS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏅',
  description TEXT NOT NULL DEFAULT '',
  unlock_text TEXT NOT NULL DEFAULT '',
  rule_type TEXT NOT NULL CHECK (
    rule_type IN (
      'course_count',
      'specific_course',
      'category_count',
      'perfect_score',
      'xp_total',
      'simulation_count'
    )
  ),
  target_value INTEGER NOT NULL DEFAULT 1 CHECK (target_value > 0),
  required_course_id TEXT,
  required_category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS achievement_definitions_active_idx
ON public.achievement_definitions (is_active, sort_order);

-- ------------------------------------------------------------
-- 2. USER ACHIEVEMENT AWARDS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL
    REFERENCES public.achievement_definitions(id)
    ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  popup_seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_user_idx
ON public.user_achievements (user_id, awarded_at DESC);

-- ------------------------------------------------------------
-- 3. SIMULATION ACTIVITY
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.simulation_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_key TEXT NOT NULL,
  launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS simulation_activity_user_idx
ON public.simulation_activity (user_id, launched_at DESC);

CREATE INDEX IF NOT EXISTS simulation_activity_unique_key_idx
ON public.simulation_activity (user_id, simulation_key);

-- ------------------------------------------------------------
-- 4. UPDATED TIMESTAMP
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_achievement_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS achievement_updated_at_trigger
ON public.achievement_definitions;

CREATE TRIGGER achievement_updated_at_trigger
BEFORE UPDATE ON public.achievement_definitions
FOR EACH ROW
EXECUTE FUNCTION public.set_achievement_updated_at();

-- ------------------------------------------------------------
-- 5. CALCULATE PROGRESS FOR ONE ACHIEVEMENT
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.achievement_current_value(
  target_user_id UUID,
  achievement public.achievement_definitions
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_value INTEGER := 0;
BEGIN
  CASE achievement.rule_type

    WHEN 'course_count' THEN
      SELECT COUNT(*)::INTEGER
      INTO result_value
      FROM public.course_progress
      WHERE user_id = target_user_id
        AND completed = TRUE;

    WHEN 'specific_course' THEN
      SELECT CASE WHEN EXISTS (
        SELECT 1
        FROM public.course_progress
        WHERE user_id = target_user_id
          AND course_id = achievement.required_course_id
          AND completed = TRUE
      ) THEN 1 ELSE 0 END
      INTO result_value;

    WHEN 'category_count' THEN
      SELECT COUNT(*)::INTEGER
      INTO result_value
      FROM public.course_progress progress
      JOIN public.courses course
        ON course.id = progress.course_id
      WHERE progress.user_id = target_user_id
        AND progress.completed = TRUE
        AND LOWER(course.category) =
            LOWER(COALESCE(achievement.required_category, ''));

    WHEN 'perfect_score' THEN
      SELECT COUNT(*)::INTEGER
      INTO result_value
      FROM public.course_progress
      WHERE user_id = target_user_id
        AND completed = TRUE
        AND COALESCE(final_score, score, 0) >= achievement.target_value;

    WHEN 'xp_total' THEN
      SELECT COALESCE(xp, 0)::INTEGER
      INTO result_value
      FROM public.profiles
      WHERE user_id = target_user_id;

      result_value := COALESCE(result_value, 0);

    WHEN 'simulation_count' THEN
      SELECT COUNT(DISTINCT simulation_key)::INTEGER
      INTO result_value
      FROM public.simulation_activity
      WHERE user_id = target_user_id;

    ELSE
      result_value := 0;
  END CASE;

  RETURN COALESCE(result_value, 0);
END;
$$;

-- ------------------------------------------------------------
-- 6. EVALUATE AND AWARD BADGES
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(
  target_user_id UUID
)
RETURNS TABLE (
  achievement_id UUID,
  newly_awarded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  definition public.achievement_definitions%ROWTYPE;
  current_value INTEGER;
  inserted_count INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> target_user_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.admin_users
       WHERE user_id = auth.uid()
     )
  THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  FOR definition IN
    SELECT *
    FROM public.achievement_definitions
    WHERE is_active = TRUE
    ORDER BY sort_order, created_at
  LOOP
    current_value :=
      public.achievement_current_value(
        target_user_id,
        definition
      );

    IF current_value >= definition.target_value THEN
      INSERT INTO public.user_achievements (
        user_id,
        achievement_id
      )
      VALUES (
        target_user_id,
        definition.id
      )
      ON CONFLICT DO NOTHING;

      GET DIAGNOSTICS inserted_count = ROW_COUNT;

      achievement_id := definition.id;
      newly_awarded := inserted_count > 0;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- 7. ACHIEVEMENT CATALOGUE FOR DASHBOARD
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_achievement_catalogue(
  target_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  icon TEXT,
  description TEXT,
  unlock_text TEXT,
  rule_type TEXT,
  target_value INTEGER,
  current_value INTEGER,
  progress_percent INTEGER,
  earned BOOLEAN,
  awarded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> target_user_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.admin_users
       WHERE user_id = auth.uid()
     )
  THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;

  RETURN QUERY
  SELECT
    definition.id,
    definition.name,
    definition.icon,
    definition.description,
    definition.unlock_text,
    definition.rule_type,
    definition.target_value,
    public.achievement_current_value(
      target_user_id,
      definition
    ) AS current_value,
    LEAST(
      100,
      ROUND(
        (
          public.achievement_current_value(
            target_user_id,
            definition
          )::NUMERIC
          /
          GREATEST(definition.target_value, 1)
        ) * 100
      )::INTEGER
    ) AS progress_percent,
    award.achievement_id IS NOT NULL AS earned,
    award.awarded_at
  FROM public.achievement_definitions definition
  LEFT JOIN public.user_achievements award
    ON award.achievement_id = definition.id
   AND award.user_id = target_user_id
  WHERE definition.is_active = TRUE
  ORDER BY definition.sort_order, definition.created_at;
END;
$$;

-- ------------------------------------------------------------
-- 8. AUTOMATIC EVALUATION AFTER COURSE PROGRESS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_achievements_after_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM *
  FROM public.evaluate_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_achievements_progress_trigger
ON public.course_progress;

CREATE TRIGGER evaluate_achievements_progress_trigger
AFTER INSERT OR UPDATE OF completed, final_score, score
ON public.course_progress
FOR EACH ROW
EXECUTE FUNCTION public.evaluate_achievements_after_progress();

-- ------------------------------------------------------------
-- 9. AUTOMATIC EVALUATION AFTER SIMULATION LAUNCH
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evaluate_achievements_after_simulation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM *
  FROM public.evaluate_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_achievements_simulation_trigger
ON public.simulation_activity;

CREATE TRIGGER evaluate_achievements_simulation_trigger
AFTER INSERT ON public.simulation_activity
FOR EACH ROW
EXECUTE FUNCTION public.evaluate_achievements_after_simulation();

-- ------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads active achievements"
ON public.achievement_definitions;

CREATE POLICY "Public reads active achievements"
ON public.achievement_definitions
FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage achievements"
ON public.achievement_definitions;

CREATE POLICY "Admins manage achievements"
ON public.achievement_definitions
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

DROP POLICY IF EXISTS "Users read own achievements"
ON public.user_achievements;

CREATE POLICY "Users read own achievements"
ON public.user_achievements
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users update own achievement popup"
ON public.user_achievements;

CREATE POLICY "Users update own achievement popup"
ON public.user_achievements
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own simulation activity"
ON public.simulation_activity;

CREATE POLICY "Users insert own simulation activity"
ON public.simulation_activity
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own simulation activity"
ON public.simulation_activity;

CREATE POLICY "Users read own simulation activity"
ON public.simulation_activity
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  )
);

-- ------------------------------------------------------------
-- 11. STARTER ACHIEVEMENTS
-- ------------------------------------------------------------

INSERT INTO public.achievement_definitions (
  name,
  icon,
  description,
  unlock_text,
  rule_type,
  target_value,
  sort_order
)
SELECT
  'First Deployment',
  '🎖️',
  'Your first completed Kraken course.',
  'Complete any course.',
  'course_count',
  1,
  10
WHERE NOT EXISTS (
  SELECT 1
  FROM public.achievement_definitions
  WHERE name = 'First Deployment'
);

INSERT INTO public.achievement_definitions (
  name,
  icon,
  description,
  unlock_text,
  rule_type,
  target_value,
  sort_order
)
SELECT
  'Five Course Finisher',
  '🏅',
  'Five completed courses across the Kraken platform.',
  'Complete five courses.',
  'course_count',
  5,
  20
WHERE NOT EXISTS (
  SELECT 1
  FROM public.achievement_definitions
  WHERE name = 'Five Course Finisher'
);

INSERT INTO public.achievement_definitions (
  name,
  icon,
  description,
  unlock_text,
  rule_type,
  target_value,
  sort_order
)
SELECT
  'Perfect Assessment',
  '💯',
  'A flawless final assessment score.',
  'Complete a course with a score of 100%.',
  'perfect_score',
  100,
  30
WHERE NOT EXISTS (
  SELECT 1
  FROM public.achievement_definitions
  WHERE name = 'Perfect Assessment'
);

INSERT INTO public.achievement_definitions (
  name,
  icon,
  description,
  unlock_text,
  rule_type,
  target_value,
  sort_order
)
SELECT
  'Simulation Operator',
  '🎮',
  'Active participation in Kraken simulations.',
  'Launch three different simulations.',
  'simulation_count',
  3,
  40
WHERE NOT EXISTS (
  SELECT 1
  FROM public.achievement_definitions
  WHERE name = 'Simulation Operator'
);

-- Evaluate existing learners against the starter badges.
DO $$
DECLARE
  learner RECORD;
BEGIN
  FOR learner IN
    SELECT user_id FROM public.profiles
  LOOP
    PERFORM *
    FROM public.evaluate_user_achievements(learner.user_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_user_achievements(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_achievement_catalogue(UUID)
TO authenticated;

NOTIFY pgrst, 'reload schema';
