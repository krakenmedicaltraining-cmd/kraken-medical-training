CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.blog_posts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
 excerpt TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Kraken news', author TEXT NOT NULL DEFAULT 'Kraken Medical Training',
 cover_image_url TEXT, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published')),
 featured BOOLEAN NOT NULL DEFAULT FALSE, allow_sharing BOOLEAN NOT NULL DEFAULT TRUE,
 published_at TIMESTAMPTZ, reading_time_minutes INTEGER NOT NULL DEFAULT 5 CHECK(reading_time_minutes>0),
 seo_title TEXT, seo_description TEXT, view_count INTEGER NOT NULL DEFAULT 0,
 created_by UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.blog_blocks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
 position INTEGER NOT NULL DEFAULT 1, type TEXT NOT NULL CHECK(type IN('heading','paragraph','image','video','link','quote','list','callout')),
 heading TEXT, text TEXT, url TEXT, caption TEXT, button_text TEXT, items TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx ON public.blog_posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS blog_blocks_post_position_idx ON public.blog_blocks(post_id,position);
CREATE OR REPLACE FUNCTION public.set_blog_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=NOW(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_blog_updated_at();
CREATE OR REPLACE FUNCTION public.keep_one_featured_blog_post() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF NEW.featured=TRUE THEN UPDATE public.blog_posts SET featured=FALSE WHERE id<>NEW.id AND featured=TRUE; END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS keep_one_featured_blog_post_trigger ON public.blog_posts;
CREATE TRIGGER keep_one_featured_blog_post_trigger BEFORE INSERT OR UPDATE OF featured ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.keep_one_featured_blog_post();
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published blog posts are readable" ON public.blog_posts;
CREATE POLICY "Published blog posts are readable" ON public.blog_posts FOR SELECT USING(status='published' AND (published_at IS NULL OR published_at<=NOW()));
DROP POLICY IF EXISTS "Published blog blocks are readable" ON public.blog_blocks;
CREATE POLICY "Published blog blocks are readable" ON public.blog_blocks FOR SELECT USING(EXISTS(SELECT 1 FROM public.blog_posts p WHERE p.id=post_id AND p.status='published' AND (p.published_at IS NULL OR p.published_at<=NOW())));
DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins manage blog posts" ON public.blog_posts FOR ALL USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=auth.uid()));
DROP POLICY IF EXISTS "Admins manage blog blocks" ON public.blog_blocks;
CREATE POLICY "Admins manage blog blocks" ON public.blog_blocks FOR ALL USING(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.admin_users a WHERE a.user_id=auth.uid()));
NOTIFY pgrst,'reload schema';
