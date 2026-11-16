// Runs in the active tab's isolated world. Only same-origin GET requests are made.
async function readCanvas() {
  try {
    if (location.protocol !== "https:") throw new Error("Open your school's secure Canvas website first.");
    if (!document.querySelector('meta[name="apple-itunes-app"][content*="canvas"], #ic-app, body.ic-Layout-wrapper, #global_nav_dashboard_link')) {
      throw new Error("This does not look like a Canvas page. Open your Canvas dashboard and try again.");
    }
    const origin = location.origin;
    const deadline = Date.now() + 90000;
    async function pages(path) {
      let next = new URL(path, origin).href;
      const items = [], visited = new Set();
      while (next) {
        const url = new URL(next, origin);
        if (url.origin !== origin || !url.pathname.startsWith("/api/v1/")) throw new Error("Canvas returned an unexpected API link.");
        if (visited.has(url.href) || visited.size >= 100 || Date.now() > deadline) throw new Error("Canvas took too long to load. Please refresh and try again.");
        visited.add(url.href);
        const response = await fetch(url.href, {credentials:"same-origin", headers:{Accept:"application/json"}, signal:AbortSignal.timeout(15000)});
        if (response.status === 401 || response.status === 403) throw new Error("Canvas denied access. Sign in again or check access to this course.");
        if (response.status === 429) throw new Error("Canvas is busy. Wait a minute and refresh.");
        if (!response.ok) throw new Error("Canvas request failed (" + response.status + "). Try refreshing.");
        if (!(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Sign in to Canvas, then reopen this extension.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Canvas returned an unexpected response.");
        items.push(...data);
        const link = (response.headers.get("link") || "").split(",").find(part => /rel="next"/.test(part));
        next = link?.match(/<([^>]+)>/)?.[1] || null;
      }
      return items;
    }
    const courses = await pages("/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100");
    const validCourses = courses.filter(c => c.name && c.workflow_state === "available");
    const results = [], warnings = [], failedCourses = new Set();
    // Small batches avoid flooding Canvas on accounts with many courses.
    for (let i=0; i<validCourses.length; i+=3) {
      await Promise.all(validCourses.slice(i,i+3).map(async course => {
        try {
          const list = await pages("/api/v1/courses/" + encodeURIComponent(course.id) + "/assignments?include%5B%5D=submission&per_page=100");
          for (const a of list) {
            if (a.published === false) continue;
            let url = null;
            try { const u = new URL(a.html_url, origin); if (u.origin === origin && u.protocol === "https:") url = u.href; } catch {}
            results.push({id:a.id, name:a.name || "Untitled assignment", course_id:course.id, course_name:course.name, due_at:a.due_at, points_possible:a.points_possible, submission:a.submission, url});
          }
        } catch (error) { failedCourses.add(course.id); warnings.push(course.name + ": " + error.message); }
      }));
    }
    return {assignments:results, courses:validCourses.map(c => ({id:c.id,name:c.name,assignments_loaded:!failedCourses.has(c.id)})), warnings, host:location.hostname};
  } catch (error) { return {error:error.message}; }
}
