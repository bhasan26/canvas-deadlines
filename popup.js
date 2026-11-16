const $ = (id) => document.getElementById(id);
let assignments = [];
let filter = "upcoming";
let demoMode = false;
$("date").textContent = new Date().toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"});

function isComplete(a) {
  const s = a.submission || {};
  return Boolean(s.excused || s.submitted_at || s.workflow_state === "submitted" || s.workflow_state === "pending_review" || (s.workflow_state === "graded" && !s.missing));
}
function dueTime(a) {
  const value = a.due_at ? Date.parse(a.due_at) : NaN;
  return Number.isFinite(value) ? value : Infinity;
}
function render() {
  const now = Date.now();
  const day = new Date(); day.setHours(0,0,0,0);
  const tomorrow = new Date(day); tomorrow.setDate(tomorrow.getDate()+1);
  const week = new Date(); week.setDate(week.getDate()+7);
  const scope = assignments.filter(a => $("course").value === "all" || String(a.course_id) === $("course").value);
  const pending = scope.filter(a => !isComplete(a));
  $("today-count").textContent = pending.filter(a => dueTime(a) >= +day && dueTime(a) < +tomorrow).length;
  $("week-count").textContent = pending.filter(a => dueTime(a) >= now && dueTime(a) < +week).length;
  $("late-count").textContent = pending.filter(a => dueTime(a) < now).length;
  const search = $("search").value.trim().toLowerCase();
  const visible = scope.filter(a => {
    if (!(a.name + " " + a.course_name).toLowerCase().includes(search)) return false;
    if (filter === "completed") return isComplete(a);
    return !isComplete(a) && (filter === "overdue" ? dueTime(a) < now : dueTime(a) >= now);
  }).sort((a,b) => {
    const left = dueTime(a), right = dueTime(b);
    return left === right ? a.name.localeCompare(b.name) : left < right ? -1 : 1;
  });
  $("list").replaceChildren();
  if (!visible.length && $("setup").hidden) {
    const p = document.createElement("p"); p.className = "empty";
    p.textContent = search ? "No assignments match your search." : filter === "overdue" ? "No overdue assignments. A little breathing room." : filter === "completed" ? "Submitted, graded, and excused assignments will appear here." : "No upcoming assignments in this view.";
    $("list").append(p);
  }
  for (const a of visible) {
    const card = document.createElement(a.url ? "a" : "article");
    card.className = "assignment";
    if (a.url) { card.href = a.url; card.target = "_blank"; card.rel = "noopener noreferrer"; }
    const course = document.createElement("span"); course.className = "course-name"; course.textContent = a.course_name;
    const title = document.createElement("h3"); title.textContent = a.name;
    const meta = document.createElement("div"); meta.className = "meta";
    const points = document.createElement("span");
    points.textContent = a.submission?.excused ? "Excused" : isComplete(a) ? "Completed" : a.points_possible == null ? "Assignment" : a.points_possible + " pts";
    const badge = document.createElement("span"); badge.className = "due";
    const time = dueTime(a);
    if (time === Infinity) badge.textContent = "No due date";
    else {
      const date = new Date(time);
      const today = date.toDateString() === new Date().toDateString();
      badge.textContent = (today ? "Today" : date.toLocaleDateString(undefined,{month:"short",day:"numeric", ...(date.getFullYear() !== new Date().getFullYear() ? {year:"numeric"} : {})})) + " · " + date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
      badge.title = date.toLocaleString(undefined,{dateStyle:"full",timeStyle:"long"});
      if (!isComplete(a)) badge.classList.add(time < now ? "late" : today ? "urgent" : "normal");
    }
    meta.append(points,badge); card.append(course,title,meta); $("list").append(card);
  }
}
function populateCourses(courses) {
  $("course").replaceChildren(new Option("All courses","all"));
  for (const course of courses) $("course").append(new Option(course.name, String(course.id)));
}
function showDemo() {
  demoMode = true;
  const at = (offset) => { const d = new Date(); d.setDate(d.getDate()+offset); d.setHours(23,59,0,0); return d.toISOString(); };
  assignments = [
    {id:1,name:"Reading response: Design for everyday life",course_id:1,course_name:"DES 210 · Design foundations",due_at:at(0),points_possible:20},
    {id:2,name:"Problem set 04 — Derivatives",course_id:2,course_name:"MATH 120 · Calculus I",due_at:at(1),points_possible:50},
    {id:3,name:"Essay draft: The modern city",course_id:3,course_name:"ENG 201 · Writing & inquiry",due_at:at(3),points_possible:100},
    {id:4,name:"Weekly reflection",course_id:1,course_name:"DES 210 · Design foundations",due_at:at(-2),points_possible:10},
    {id:5,name:"Introduction discussion",course_id:3,course_name:"ENG 201 · Writing & inquiry",due_at:at(-3),points_possible:10,submission:{workflow_state:"submitted"}},
    {id:6,name:"Final portfolio",course_id:1,course_name:"DES 210 · Design foundations",due_at:null,points_possible:100}
  ];
  populateCourses([{id:1,name:"Design foundations"},{id:2,name:"Calculus I"},{id:3,name:"Writing & inquiry"}]);
  $("setup").hidden = true; $("status").className = "";
  $("status").textContent = "Demo preview · Sample assignments, not your Canvas data.";
  $("source").textContent = "Demo · Open on Canvas to connect";
  render();
}

async function load() {
  $("refresh").disabled = true; $("setup").hidden = true; $("list").replaceChildren();
  $("status").className = ""; $("status").textContent = "Loading your courses and assignments…";
  $("source").textContent = "Read-only · No API key needed";
  assignments = []; populateCourses([]);
  for (const id of ["today-count","week-count","late-count"]) $(id).textContent = "—";
  try {
    if (!globalThis.chrome?.scripting) { showDemo(); return; }
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab?.id) throw new Error("Open Canvas in a browser tab first.");
    const result = await chrome.scripting.executeScript({target:{tabId:tab.id},func:readCanvas});
    const data = result[0]?.result;
    if (!data || data.error) throw new Error(data?.error || "Could not read Canvas. Refresh the Canvas page and try again.");
    demoMode = false; assignments = data.assignments; populateCourses(data.courses);
    $("source").textContent = data.host + " · Local time";
    $("status").textContent = data.warnings.length ? "Some courses could not load. " + data.warnings.join(" ") : "Updated " + new Date().toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) + " · " + data.courses.length + " active courses";
    $("status").className = data.warnings.length ? "error" : "";
    if (data.courses.length > 0 && data.warnings.length === data.courses.length) {
      $("status").textContent = "No course assignments could load. " + data.warnings.join(" ");
    } else render();
  } catch (error) {
    $("status").className = "error";
    $("status").textContent = error.message.includes("Cannot access") ? "Open a Canvas tab, then click the extension again." : error.message;
    $("setup").hidden = false;
  } finally { $("refresh").disabled = false; }
}
$("refresh").addEventListener("click",load);
$("demo").addEventListener("click",showDemo);
$("course").addEventListener("change",render);
$("search").addEventListener("input",render);
for (const button of document.querySelectorAll("[data-filter]")) button.addEventListener("click",() => {
  filter = button.dataset.filter;
  for (const tab of document.querySelectorAll("[data-filter]")) tab.setAttribute("aria-pressed",String(tab === button));
  render();
});
load();

