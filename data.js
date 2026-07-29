async function getPublicCoursesOnline() {
  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .eq("status", "Published")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAllCoursesOnline() {
  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getCourseOnline(id) {
  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveCourseOnline(course) {
  const payload = {
    id: course.id,
    icon: course.icon,
    title: course.title,
    status: course.status,
    category: course.category,
    description: course.description,
    lessons: course.lessons,
    pdf_url: course.pdf_url || null,
    video_url: course.video_url || null,
    content_blocks: course.content_blocks || [],
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from("courses")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteCourseOnline(id) {
  const { error } = await supabaseClient
    .from("courses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session) {
    const returnTo = `${location.pathname.split("/").pop() || "admin.html"}${location.search}`;
    localStorage.setItem("kmtReturnTo", returnTo);
    location.href = "login.html";
    return null;
  }

  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    await supabaseClient.auth.signOut();
    throw new Error("This account does not have administrator access.");
  }

  return session;
}

async function uploadCourseFile(file, courseId) {
  if (!file) return null;

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");

  const path = `${courseId}/${Date.now()}-${safeName}`;

  const { error } = await supabaseClient.storage
    .from("course-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });

  if (error) throw error;

  const { data } = supabaseClient.storage
    .from("course-files")
    .getPublicUrl(path);

  return data.publicUrl;
}
