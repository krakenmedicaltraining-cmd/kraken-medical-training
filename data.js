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
    resource_ids: course.resource_ids || [],
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

async function ensureLearnerProfile(name=""){const session=await getCurrentSession();if(!session)return null;const{data,error}=await supabaseClient.from("profiles").select("*").eq("user_id",session.user.id).maybeSingle();if(error)throw error;if(data)return data;const display_name=name||session.user.user_metadata?.display_name||session.user.email?.split("@")[0]||"Learner";const r=await supabaseClient.from("profiles").insert({user_id:session.user.id,display_name}).select().single();if(r.error)throw r.error;return r.data}
async function getMyProgress(){const session=await getCurrentSession();if(!session)return[];const{data,error}=await supabaseClient.from("course_progress").select("*, courses(title,icon,category,description)").eq("user_id",session.user.id).order("last_opened_at",{ascending:false});if(error)throw error;return data||[]}
async function getCourseProgress(id){const session=await getCurrentSession();if(!session)return null;const{data,error}=await supabaseClient.from("course_progress").select("*").eq("user_id",session.user.id).eq("course_id",id).maybeSingle();if(error)throw error;return data}
async function saveCourseProgress(courseId,ids,total){const session=await getCurrentSession();if(!session)return null;const unique=[...new Set(ids)],percent=total?Math.min(100,Math.round(unique.length/total*100)):0,completed=percent===100;const old=await getCourseProgress(courseId);const{data,error}=await supabaseClient.from("course_progress").upsert({user_id:session.user.id,course_id:courseId,completed_blocks:unique,percent,completed,last_opened_at:new Date().toISOString(),completed_at:completed?new Date().toISOString():null}).select().single();if(error)throw error;if(completed&&!old?.completed){const profile=await ensureLearnerProfile();await supabaseClient.from("profiles").update({xp:(profile.xp||0)+200,updated_at:new Date().toISOString()}).eq("user_id",session.user.id)}return data}
function isPlayableItchEmbed(url){return /itch\.io\/(embed-upload|embed)\//i.test(url||"")}
function collectPublishedGames(courses){const out=[];(courses||[]).forEach(c=>(c.content_blocks||[]).forEach(b=>{if(b.type==="unity"&&b.url)out.push({...b,course_id:c.id,course_title:c.title,category:c.category,icon:c.icon})}));return out}


function extractGoogleDriveFileId(url) {
  if (!url) return "";
  const value = String(url).trim();
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function normaliseResourceUrl(url, provider = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/google drive/i.test(provider) || /drive\.google\.com|docs\.google\.com/i.test(value)) {
    const id = extractGoogleDriveFileId(value);
    return id ? `https://drive.google.com/file/d/${id}/view` : value;
  }
  return value;
}

function resourcePreviewUrl(resource) {
  const url = resource?.source_url || "";
  const id = extractGoogleDriveFileId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  if (/youtube\.com\/watch|youtu\.be\//i.test(url)) {
    if (url.includes("youtu.be/")) return `https://www.youtube.com/embed/${url.split("youtu.be/")[1].split(/[?&]/)[0]}`;
    try { return `https://www.youtube.com/embed/${new URL(url).searchParams.get("v")}`; } catch {}
  }
  return url;
}

function resourceDownloadUrl(resource) {
  const url = resource?.source_url || "";
  const id = extractGoogleDriveFileId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

async function getPublicResources() {
  const { data, error } = await supabaseClient
    .from("resources")
    .select("*")
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getAllResources() {
  const { data, error } = await supabaseClient
    .from("resources")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getResourcesByIds(ids) {
  if (!ids?.length) return [];
  const { data, error } = await supabaseClient
    .from("resources")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  const order = new Map(ids.map((id, index) => [id, index]));
  return (data || []).sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

async function saveResourceOnline(resource) {
  const payload = {
    id: resource.id || undefined,
    title: resource.title,
    description: resource.description || "",
    resource_type: resource.resource_type || "PDF",
    category: resource.category || "Clinical skills",
    provider: resource.provider || "Google Drive",
    source_url: normaliseResourceUrl(resource.source_url, resource.provider),
    thumbnail_url: resource.thumbnail_url || null,
    file_name: resource.file_name || null,
    tags: resource.tags || [],
    is_public: resource.is_public !== false,
    updated_at: new Date().toISOString()
  };
  if (!payload.id) delete payload.id;

  const query = payload.id
    ? supabaseClient.from("resources").upsert(payload)
    : supabaseClient.from("resources").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

async function deleteResourceOnline(id) {
  const { error } = await supabaseClient.from("resources").delete().eq("id", id);
  if (error) throw error;
}
