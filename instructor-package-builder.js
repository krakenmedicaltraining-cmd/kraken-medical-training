"use strict";

(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));

  const uid = () => crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

  let packages = [];
  let sections = [];
  let resources = [];
  let currentId = null;

  function setState(text) {
    $("#saveState").textContent = text;
    $("#mobileSaveState").textContent = text;
  }

  async function requireAdmin() {
    const sessionResult = await supabaseClient.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;

    const session = sessionResult.data.session;
    if (!session) {
      location.href = "login.html";
      return null;
    }

    const adminResult = await supabaseClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (adminResult.error) throw adminResult.error;

    if (!adminResult.data) {
      alert("Instructor Package Builder is only available to administrators.");
      location.href = "instructor-tools.html";
      return null;
    }

    return session;
  }

  function blankSection() {
    return {
      client_id: uid(),
      section_type: "Instructor notes",
      title: "",
      content: ""
    };
  }

  function blankResource() {
    return {
      client_id: uid(),
      title: "",
      description: "",
      resource_type: "PDF",
      url: "",
      button_text: "Open resource"
    };
  }

  function renderSections() {
    $("#sectionRows").innerHTML = sections.length
      ? sections.map((section, index) => `
          <article class="it-row-card" data-section-index="${index}">
            <div class="it-row-head">
              <strong>Section ${index + 1}</strong>
              <button class="it-button danger" type="button" data-remove-section="${index}">Remove</button>
            </div>

            <div class="it-row-grid">
              <div class="it-field">
                <label>Section type</label>
                <select data-section-key="section_type">
                  ${["Overview","Instructor notes","Equipment required","Learning outcomes","Session plan","Preparation","Assessment","References","Custom"].map(type =>
                    `<option ${section.section_type === type ? "selected" : ""}>${type}</option>`
                  ).join("")}
                </select>
              </div>

              <div class="it-field">
                <label>Heading</label>
                <input data-section-key="title" value="${esc(section.title)}" placeholder="Equipment required">
              </div>

              <div class="it-field" style="grid-column:1/-1">
                <label>Content</label>
                <textarea data-section-key="content">${esc(section.content)}</textarea>
              </div>
            </div>
          </article>
        `).join("")
      : `<div class="it-empty">Add sections such as learning outcomes, equipment, session plan or assessment.</div>`;

    $$("[data-section-index]").forEach(card => {
      const index = Number(card.dataset.sectionIndex);
      card.querySelectorAll("[data-section-key]").forEach(input => {
        input.oninput = () => {
          sections[index][input.dataset.sectionKey] = input.value;
          setState("Unsaved changes");
        };
      });
    });

    $$("[data-remove-section]").forEach(button => {
      button.onclick = () => {
        sections.splice(Number(button.dataset.removeSection), 1);
        renderSections();
        setState("Unsaved changes");
      };
    });
  }

  function renderResources() {
    $("#resourceRows").innerHTML = resources.length
      ? resources.map((resource, index) => `
          <article class="it-row-card" data-resource-index="${index}">
            <div class="it-row-head">
              <strong>Resource ${index + 1}</strong>
              <button class="it-button danger" type="button" data-remove-resource="${index}">Remove</button>
            </div>

            <div class="it-row-grid">
              <div class="it-field">
                <label>Title</label>
                <input data-resource-key="title" value="${esc(resource.title)}" placeholder="BLS Instructor Slides">
              </div>

              <div class="it-field">
                <label>Type</label>
                <input data-resource-key="resource_type" value="${esc(resource.resource_type)}" placeholder="PowerPoint">
              </div>

              <div class="it-field" style="grid-column:1/-1">
                <label>Description</label>
                <input data-resource-key="description" value="${esc(resource.description)}">
              </div>

              <div class="it-field" style="grid-column:1/-1">
                <label>Public file or web link</label>
                <input data-resource-key="url" type="url" value="${esc(resource.url)}" placeholder="https://...">
              </div>

              <div class="it-field">
                <label>Button text</label>
                <input data-resource-key="button_text" value="${esc(resource.button_text)}">
              </div>
            </div>
          </article>
        `).join("")
      : `<div class="it-empty">Add presentation files, lesson plans, learner handouts, assessments or external links.</div>`;

    $$("[data-resource-index]").forEach(card => {
      const index = Number(card.dataset.resourceIndex);
      card.querySelectorAll("[data-resource-key]").forEach(input => {
        input.oninput = () => {
          resources[index][input.dataset.resourceKey] = input.value;
          setState("Unsaved changes");
        };
      });
    });

    $$("[data-remove-resource]").forEach(button => {
      button.onclick = () => {
        resources.splice(Number(button.dataset.removeResource), 1);
        renderResources();
        setState("Unsaved changes");
      };
    });
  }

  function reset() {
    $("#packageForm").reset();
    currentId = null;
    $("#packageId").value = "";
    $("#author").value = "Kraken Medical Training";
    $("#status").value = "draft";
    $("#sortOrder").value = 0;
    $("#builderHeading").textContent = "New package";
    $("#deletePackage").hidden = true;
    sections = [];
    resources = [];
    renderSections();
    renderResources();
    renderPackageList();
    setState("Not saved");
  }

  function payload() {
    return {
      title: $("#title").value.trim(),
      subtitle: $("#subtitle").value.trim() || null,
      description: $("#description").value.trim() || null,
      category: $("#category").value.trim() || "Instructor package",
      cover_image_url: $("#coverImage").value.trim() || null,
      estimated_minutes: $("#estimatedMinutes").value ? Number($("#estimatedMinutes").value) : null,
      target_audience: $("#targetAudience").value.trim() || null,
      instructor_level: $("#instructorLevel").value.trim() || null,
      version: $("#version").value.trim() || null,
      author: $("#author").value.trim() || "Kraken Medical Training",
      status: $("#status").value,
      sort_order: Number($("#sortOrder").value || 0),
      resource_count: resources.filter(item => item.url && item.title).length,
      updated_at: new Date().toISOString()
    };
  }

  async function loadPackages() {
    const result = await supabaseClient
      .from("instructor_packages")
      .select("*")
      .order("updated_at", { ascending:false });

    if (result.error) throw result.error;

    packages = result.data || [];
    renderPackageList();
  }

  function renderPackageList() {
    const q = $("#packageAdminSearch").value.trim().toLowerCase();
    const filtered = packages.filter(item =>
      `${item.title} ${item.category} ${item.status}`.toLowerCase().includes(q)
    );

    $("#packageAdminList").innerHTML = filtered.length
      ? filtered.map(item => `
          <article class="it-admin-item ${currentId === item.id ? "selected" : ""}">
            <small>${esc(item.status)} · ${esc(item.category || "")}</small>
            <h3>${esc(item.title)}</h3>

            <div class="it-admin-actions">
              <button type="button" data-edit="${item.id}">Edit</button>
              <a href="instructor-package.html?id=${encodeURIComponent(item.id)}" target="_blank">Preview</a>
              <button type="button" data-duplicate="${item.id}">Duplicate</button>
              <button type="button" data-delete="${item.id}">Delete</button>
            </div>
          </article>
        `).join("")
      : `<div class="it-empty">No packages found.</div>`;

    $$("[data-edit]").forEach(button => button.onclick = () => editPackage(button.dataset.edit));
    $$("[data-duplicate]").forEach(button => button.onclick = () => duplicatePackage(button.dataset.duplicate));
    $$("[data-delete]").forEach(button => button.onclick = () => deletePackage(button.dataset.delete));
  }

  async function editPackage(id) {
    const item = packages.find(x => x.id === id);
    if (!item) return;

    const [sectionResult, resourceResult] = await Promise.all([
      supabaseClient
        .from("instructor_package_sections")
        .select("*")
        .eq("package_id", id)
        .order("position"),
      supabaseClient
        .from("instructor_package_resources")
        .select("*")
        .eq("package_id", id)
        .order("position")
    ]);

    if (sectionResult.error) throw sectionResult.error;
    if (resourceResult.error) throw resourceResult.error;

    currentId = id;
    $("#packageId").value = id;
    $("#title").value = item.title || "";
    $("#subtitle").value = item.subtitle || "";
    $("#description").value = item.description || "";
    $("#category").value = item.category || "";
    $("#coverImage").value = item.cover_image_url || "";
    $("#estimatedMinutes").value = item.estimated_minutes ?? "";
    $("#targetAudience").value = item.target_audience || "";
    $("#instructorLevel").value = item.instructor_level || "";
    $("#version").value = item.version || "";
    $("#author").value = item.author || "Kraken Medical Training";
    $("#status").value = item.status || "draft";
    $("#sortOrder").value = item.sort_order || 0;
    $("#builderHeading").textContent = `Editing: ${item.title}`;
    $("#deletePackage").hidden = false;

    sections = (sectionResult.data || []).map(x => ({...x, client_id:uid()}));
    resources = (resourceResult.data || []).map(x => ({...x, client_id:uid()}));

    renderSections();
    renderResources();
    renderPackageList();
    setState("Loaded");
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function save() {
    const data = payload();

    if (!data.title) {
      alert("Add a package title.");
      return;
    }

    setState("Saving…");

    const saveResult = currentId
      ? await supabaseClient.from("instructor_packages").update(data).eq("id", currentId).select().single()
      : await supabaseClient.from("instructor_packages").insert(data).select().single();

    if (saveResult.error) throw saveResult.error;

    const id = saveResult.data.id;

    const [deleteSections, deleteResources] = await Promise.all([
      supabaseClient.from("instructor_package_sections").delete().eq("package_id", id),
      supabaseClient.from("instructor_package_resources").delete().eq("package_id", id)
    ]);

    if (deleteSections.error) throw deleteSections.error;
    if (deleteResources.error) throw deleteResources.error;

    if (sections.length) {
      const rows = sections.map((section,index) => ({
        package_id:id,
        position:index+1,
        section_type:section.section_type || "Custom",
        title:section.title || `Section ${index+1}`,
        content:section.content || ""
      }));

      const result = await supabaseClient.from("instructor_package_sections").insert(rows);
      if (result.error) throw result.error;
    }

    const validResources = resources.filter(item => item.title && item.url);
    if (validResources.length) {
      const rows = validResources.map((resource,index) => ({
        package_id:id,
        position:index+1,
        title:resource.title,
        description:resource.description || null,
        resource_type:resource.resource_type || "Download",
        url:resource.url,
        button_text:resource.button_text || "Open resource"
      }));

      const result = await supabaseClient.from("instructor_package_resources").insert(rows);
      if (result.error) throw result.error;
    }

    reset();
    await loadPackages();
  }

  async function duplicatePackage(id) {
    await editPackage(id);
    currentId = null;
    $("#packageId").value = "";
    $("#title").value = `${$("#title").value} copy`;
    $("#status").value = "draft";
    $("#builderHeading").textContent = "Duplicated package";
    $("#deletePackage").hidden = true;
    setState("Duplicated, not saved");
  }

  async function deletePackage(id = currentId) {
    if (!id) return;
    const item = packages.find(x => x.id === id);
    if (!confirm(`Delete "${item?.title || "this package"}"?`)) return;
    if (prompt("Type DELETE to confirm.") !== "DELETE") return;

    const result = await supabaseClient
      .from("instructor_packages")
      .delete()
      .eq("id", id);

    if (result.error) throw result.error;

    if (currentId === id) reset();
    await loadPackages();
  }

  $("#newPackage").onclick = reset;
  $("#packageAdminSearch").oninput = renderPackageList;
  $("#addSection").onclick = () => {
    sections.push(blankSection());
    renderSections();
    setState("Unsaved changes");
  };

  $("#addResource").onclick = () => {
    resources.push(blankResource());
    renderResources();
    setState("Unsaved changes");
  };

  $("#packageForm").addEventListener("input", () => setState("Unsaved changes"));

  $("#packageForm").onsubmit = event => {
    event.preventDefault();
    save().catch(error => {
      console.error(error);
      alert(`Could not save package: ${error.message}`);
      setState("Save failed");
    });
  };

  $("#deletePackage").onclick = () =>
    deletePackage().catch(error => alert(error.message));

  $("#signOut").onclick = async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  };

  (async () => {
    const session = await requireAdmin();
    if (!session) return;
    reset();
    await loadPackages();
  })().catch(error => {
    console.error(error);
    alert(`Package Builder could not start: ${error.message}`);
  });
})();
