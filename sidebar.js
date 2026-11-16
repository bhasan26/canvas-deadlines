(() => {
  if (globalThis.__canvasDeadlinesMounted) return;
  globalThis.__canvasDeadlinesMounted = true;
  const palette = ['#528c61', '#c76a21', '#8745ba', '#315dbc', '#b27b12', '#b52343'];
  let host, ticker;
  function fitTicker() {
    if (!ticker?.isConnected) return;
    // Measure the visible text node, not a potentially full-width or hidden
    // heading wrapper. Canvas themes use different heading/container markup.
    let title, text;
    const candidates=document.querySelectorAll('.ic-Dashboard-header__title, .ic-Dashboard-header h1, .ic-Dashboard-header h2, h1, h2, #dashboard_header_container span, #content span');
    for(const candidate of candidates){
      const walker=document.createTreeWalker(candidate,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        if(node.textContent.trim()!=='Dashboard')continue;
        const range=document.createRange();range.selectNodeContents(node);
        const rect=range.getBoundingClientRect();
        const style=getComputedStyle(node.parentElement);
        if(rect.width>20 && rect.height>10 && node.parentElement.getBoundingClientRect().width>10 && node.parentElement.getBoundingClientRect().height>10 && style.visibility!=='hidden' && !node.parentElement.closest('[hidden],.screenreader-only,.sr-only')){title=candidate;text=rect;break;}
      }
      if(title)break;
    }
    if(!title){ticker.hidden=true;return;}
    let header=title.closest('.ic-Dashboard-header') || title.parentElement;
    while(header.parentElement && header.getBoundingClientRect().right-text.right<300)header=header.parentElement;
    const left=text.right+24;
    let right=Math.min(header.getBoundingClientRect().right-24,document.documentElement.clientWidth-24);
    // Reserve room for Canvas's dashboard options menu in the same title row.
    for(const control of header.querySelectorAll('button,[role="button"]')){
      const rect=control.getBoundingClientRect();
      if(rect.width && rect.left>text.right && rect.bottom>text.top && rect.top<text.bottom)right=Math.min(right,rect.left-20);
    }
    ticker.hidden=right-left<200 || text.bottom<0;
    ticker.style.left=left+'px';ticker.style.top=(text.top+(text.height-46)/2)+'px';ticker.style.width=Math.max(0,right-left)+'px';
    const viewport=ticker.shadowRoot.querySelector('.viewport');
    ticker.style.setProperty('--window',viewport.clientWidth+'px');
    const group=ticker.shadowRoot.querySelector('.group');
    if(group)ticker.style.setProperty('--duration',Math.max(15,group.scrollWidth/40)+'s');
  }
  window.addEventListener('scroll',fitTicker,{passive:true});
  document.fonts?.ready.then(fitTicker);
  function fitPanel() {
    fitTicker();
    if (!host?.isConnected) return;
    const sidebar = host.parentElement.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.ic-DashboardCard')]
      .map(card => card.getBoundingClientRect())
      .filter(rect => rect.width && rect.right <= sidebar.left);
    // Borrow only the unused gutter, keeping the panel's right edge in place.
    const gap = cards.length ? sidebar.left - Math.max(...cards.map(rect => rect.right)) : 0;
    const extra = window.innerWidth >= 1100 ? Math.max(0, Math.min(100, 360 - sidebar.width, gap - 24)) : 0;
    host.style.width = `calc(100% + ${extra}px)`;
    host.style.marginLeft = `${-extra}px`;
    // The dashboard menu extends farther right than the cards. Keep the
    // widened panel below that header; padding avoids collapsing margins.
    const topSpace = extra > 0 && cards.length
      ? Math.max(0, Math.min(...cards.map(rect => rect.top)) - host.getBoundingClientRect().top)
      : 0;
    host.style.paddingTop = `${topSpace}px`;
  }
  window.addEventListener('resize', fitPanel);
  new ResizeObserver(fitPanel).observe(document.documentElement);
  function mount() {
    if (!/^\/(dashboard\/?)?$/.test(location.pathname)) { host?.remove(); ticker?.remove(); return; }
    if (host?.isConnected) { fitPanel(); return; }
    const sidebar = document.querySelector('#right-side') || document.querySelector('#right-side-wrapper');
    if (!sidebar) return;
    host = document.createElement('section');
    host.id = 'canvas-deadlines-panel';
    host.setAttribute('aria-label', 'Canvas Deadlines');
    host.style.cssText = 'display:block; margin:0 0 26px; width:100%; min-width:0;';
    const mountedHost = host;
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `
      <style>
        :host{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;font-size:13px;line-height:1.5;font-weight:400;color:#24262b;color-scheme:light}
        *{box-sizing:border-box}button,select,input{font:inherit}button{cursor:pointer}button:disabled{opacity:.45;cursor:wait}
        button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #c8102e;outline-offset:3px}
        .panel{background:#ffffff;border:1px solid #e3e4e8;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px #181b2410}
        header{border-top:3px solid #ad0015;padding:17px 18px 14px;display:flex;align-items:center;gap:9px}.mark{height:30px;width:30px;background:#ad0015;color:white;border-radius:10px;display:grid;place-items:center;font-size:17px}
        .brand{font-size:14px;font-weight:650;letter-spacing:-.2px;flex:1}.live{width:6px;height:6px;background:#ad0015;border-radius:50%;display:inline-block;margin-left:5px}
        .icon{border:1px solid #e1e3e8;background:#fff;color:#565b65;border-radius:8px;width:28px;height:28px;font-size:18px;display:grid;place-items:center;padding:0}
        .content{padding:0 18px 18px}.eyebrow{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6b707a;margin:6px 0 8px}h2{font-size:25px;line-height:1.2;font-weight:650;letter-spacing:-.6px;margin:0 0 8px}.subtitle{color:#666b75;font-size:11px;margin:0 0 18px}
        .progress{margin:0 0 14px}.progress>h3{font-size:15px;font-weight:650;margin:0 0 10px}.progress-list{display:grid;gap:7px}.progress-row{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid color-mix(in srgb,var(--course) 16%,white);background:color-mix(in srgb,var(--course) 5%,white);border-radius:11px}.ring{position:relative;width:60px;height:60px;flex:0 0 60px}.ring svg{width:100%;height:100%;transform:rotate(-90deg)}.ring-track{fill:none;stroke:color-mix(in srgb,var(--course) 16%,white);stroke-width:10}.ring-fill{fill:none;stroke:var(--course);stroke-width:10;stroke-linecap:round;stroke-dasharray:100}.ring-center{position:absolute;inset:0;display:grid;place-items:center;font-size:15px;font-weight:650;font-variant-numeric:tabular-nums;letter-spacing:-.4px}.progress-copy{min-width:0}.progress-copy h4{font-size:12px;font-weight:600;margin:0 0 4px;line-height:1.45;color:var(--course);overflow-wrap:anywhere}.progress-copy p,.progress-message{font-size:11px;line-height:1.5;margin:0;color:#656b76}
        .workload{margin:0 0 20px}.workload h3{font-size:15px;margin:0 0 4px}.workload-note{font-size:11px;line-height:1.6;color:#656b76;margin:0 0 10px}.workload-day{border-bottom:1px solid #eceef1}.workload-day summary{cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 0;font-size:11px;list-style:none}.workload-day summary::-webkit-details-marker{display:none}.workload-day summary:before{content:'›';font-size:16px;color:#737984}.workload-day[open] summary:before{transform:rotate(90deg)}.workload-day summary:focus-visible{outline:3px solid #c8102e;outline-offset:2px}.workload-label{width:76px;flex-shrink:0}.workload-bar{height:6px;flex:1;background:#f0f1f4;border-radius:4px;overflow:hidden}.workload-bar i{display:block;height:100%;background:#ad0015;border-radius:4px}.workload-count{min-width:18px;text-align:right;font-weight:700}.workload-task{display:block;color:inherit;text-decoration:none;border-left:3px solid var(--course);padding:5px 8px;margin:0 0 10px 12px;font-size:11px;overflow-wrap:anywhere}.workload-task:hover{background:#f6f7f9}.workload-task small{display:block;font-size:10px;color:#656b76;margin-top:3px}.workload-empty{font-size:10px;color:#656b76;margin:0 0 10px 12px}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#f6f7f9;border:1px solid #e5e7eb;border-radius:12px;padding:12px 0;margin-bottom:20px}.stat{padding:0 9px;text-align:center}.stat+.stat{border-left:1px solid #dfe2e7}.stat strong{display:block;font-variant-numeric:tabular-nums;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:normal}.stat span{font-size:9px;color:#656b76;white-space:nowrap}.stat:last-child strong{color:#ad0015}
        .controls{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px}.controls h3{font-size:12px;margin:0;font-weight:600}select{min-width:0;max-width:55%;background:transparent;border:0;color:#616772;font-size:10px;text-overflow:ellipsis;padding:5px 0}
        .tabs{display:flex;background:#f1f2f5;padding:3px;border-radius:9px;gap:2px}.tabs button{flex:1;min-width:0;border:0;background:transparent;color:#626873;font-size:10px;padding:7px 2px;border-radius:7px}.tabs button[aria-pressed=true]{background:#ad0015;color:#fff;box-shadow:0 1px 4px #1b1e2712;font-weight:600}
        input{width:100%;min-width:0;border:1px solid #dfe2e7;border-radius:8px;background:#fff;padding:8px 10px;margin-top:12px;font-size:11px;color:#292d35}input::placeholder{color:#858b96}
        .status{font-size:10px;color:#6d737e;margin:12px 0;line-height:1.5}.status.error{color:#ad0015}.list{max-height:520px;overflow:auto;scrollbar-width:thin;scrollbar-color:#cdd0d7 transparent;padding:1px 2px 2px}
        .group{font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;color:#626975;margin:16px 0 8px}.group:first-child{margin-top:0}.card{display:block;position:relative;text-decoration:none;color:inherit;background:white;border:1px solid #e3e5ea;border-radius:11px;padding:13px 12px 12px 15px;margin-bottom:8px;transition:box-shadow .15s,border-color .15s;overflow:hidden}.card:before{content:'';position:absolute;width:3px;height:27px;background:var(--course);left:0;top:14px;border-radius:0 3px 3px 0}.card:hover{border-color:#d4929b;box-shadow:0 3px 10px #2529360d}.course{font-size:10px;color:var(--course);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.title{font-size:12px;font-weight:600;line-height:1.5;margin:5px 0 12px;overflow-wrap:anywhere}.meta{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:9px;color:#727884}.due{color:#4c576b;background:#f0f2f6;padding:3px 6px;border-radius:5px}.due.urgent{color:#915b14;background:#fff3d9}.due.late{color:#ad0015;background:#fff0f2}.empty{padding:23px 7px;text-align:center;color:#69717e;font-size:12px}.foot{border-top:1px solid #e5e7eb;margin-top:12px;padding-top:12px;display:flex;gap:7px;align-items:center;color:#767d89;font-size:9px}.foot svg{width:12px;height:12px}[hidden]{display:none!important}@media(prefers-reduced-motion:reduce){.card{transition:none}}
      </style>
      <div class="panel">
        <header><span class="mark" aria-hidden="true">✓</span><span class="brand">Deadlines<span class="live" aria-hidden="true"></span></span><button class="icon" id="refresh" aria-label="Refresh assignments" title="Refresh assignments">↻</button><button class="icon" id="collapse" aria-expanded="true" aria-controls="content" aria-label="Collapse deadlines">−</button></header>
        <div class="content" id="content">
          <div class="eyebrow" id="date"></div><h2>Ahead of the due date.</h2><p class="subtitle">A clear view of what’s next.</p>
          <section class="workload" aria-labelledby="workload-heading"><h3 id="workload-heading">Your next 3 days</h3><p class="workload-note" id="workload-note">Loading workload…</p><div id="workload-days"></div></section>
          <section class="progress" aria-labelledby="progress-heading"><h3 id="progress-heading">Progress by class</h3><div class="progress-list" id="progress-list"></div><p class="progress-message" id="progress-message">Loading assignments…</p></section>
          <div class="stats"><div class="stat"><strong id="today">—</strong><span>Due today</span></div><div class="stat"><strong id="week">—</strong><span>Next 7 days</span></div><div class="stat"><strong id="overdue">—</strong><span>Overdue</span></div></div>
          <div class="controls"><h3>Your assignments</h3><select id="course" aria-label="Filter by course"><option value="all">All courses</option></select></div>
          <div class="tabs" role="group" aria-label="Assignment status"><button data-filter="upcoming" aria-pressed="true">Upcoming</button><button data-filter="overdue" aria-pressed="false">Overdue</button><button data-filter="completed" aria-pressed="false">Completed</button></div>
          <input type="search" id="search" placeholder="Find an assignment…" aria-label="Search assignments">
          <p class="status" id="status" role="status" aria-live="polite">Loading your assignments…</p><div class="list" id="list" aria-label="Assignments"></div>
          <div class="foot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Only you. Only your Canvas. · Local time</div>
        </div>
      </div>`;
    sidebar.prepend(host);
    fitPanel();
    ticker?.remove();
    ticker=document.createElement('section');ticker.id='canvas-deadlines-ticker';ticker.setAttribute('aria-label','Upcoming deadline ticker');
    ticker.style.cssText='position:fixed;z-index:100;height:46px;display:block;isolation:isolate;';
    const tickerRoot=ticker.attachShadow({mode:'open'});
    tickerRoot.innerHTML=`<style>
      :host{font:600 16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#24262b}:host([hidden]){display:none!important}*{box-sizing:border-box}.ticker{display:flex;align-items:center;height:46px;border:1px solid #ecd6da;border-radius:8px;background:#fff9fa;overflow:hidden}.label{align-self:stretch;display:flex;align-items:center;background:#ad0015;color:white;padding:0 12px;font-size:12px;font-weight:750;letter-spacing:.6px;white-space:nowrap}.viewport{flex:1;min-width:0;overflow:hidden}.track{display:flex;width:max-content;animation:deadline-loop var(--duration,30s) linear infinite}.group{display:flex;align-items:center;flex-shrink:0;min-width:var(--window,0px)}.item{padding:0 22px;white-space:nowrap;text-decoration:none;color:inherit;border-right:1px solid #e4c9cf;line-height:28px}.item strong{color:#ad0015;font-weight:750}.message{padding:0 12px;font-size:14px}.ticker:hover .track,.ticker:focus-within .track,.ticker.paused .track{animation-play-state:paused}button{border:0;border-left:1px solid #ecd6da;background:white;color:#ad0015;cursor:pointer;align-self:stretch;width:36px;flex-shrink:0}a:focus-visible,button:focus-visible{outline:2px solid #ad0015;outline-offset:-2px}[hidden]{display:none!important}@keyframes deadline-loop{to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.track{animation:none}.viewport{overflow-x:auto}}
    </style><div class="ticker"><span class="label">UPCOMING</span><div class="viewport"><span class="message">Loading deadlines…</span></div><button type="button" aria-label="Pause deadline ticker" aria-pressed="false" hidden>Ⅱ</button></div>`;
    document.body.append(ticker);
    const pause=tickerRoot.querySelector('button');
    pause.onclick=()=>{const paused=tickerRoot.querySelector('.ticker').classList.toggle('paused');pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Resume deadline ticker':'Pause deadline ticker');pause.setAttribute('aria-pressed',String(paused));};
    let tickerSignature='';
    function tickerMessage(message){tickerSignature='';const note=document.createElement('span');note.className='message';note.textContent=message;tickerRoot.querySelector('.viewport').replaceChildren(note);pause.hidden=true;fitTicker();}
    function renderTicker(){
      const upcoming=items.filter(a=>!complete(a)&&Number.isFinite(time(a))&&time(a)>=Date.now()).sort((a,b)=>time(a)-time(b));
      const partial=courses.some(c=>c.assignments_loaded===false);
      tickerRoot.querySelector('.label').textContent=partial?'UPCOMING · PARTIAL':'UPCOMING';
      if(!upcoming.length){tickerMessage(partial?'No upcoming deadlines in loaded courses.':'No upcoming deadlines. You’re caught up!');return;}
      const signature=JSON.stringify(upcoming);
      if(signature===tickerSignature)return;
      tickerSignature=signature;
      const track=document.createElement('div');track.className='track';
      const group=document.createElement('div');group.className='group';
      for(const a of upcoming){const item=document.createElement(a.url?'a':'span');item.className='item';if(a.url)item.href=a.url;const title=document.createElement('span');title.textContent=a.course_name+' · '+a.name+' — ';const due=document.createElement('strong');due.textContent=new Date(time(a)).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});item.append(title,due);group.append(item);}
      const duplicate=group.cloneNode(true);duplicate.setAttribute('aria-hidden','true');for(const link of duplicate.querySelectorAll('a'))link.tabIndex=-1;
      track.append(group,duplicate);tickerRoot.querySelector('.viewport').replaceChildren(track);pause.hidden=false;fitTicker();
    }
    fitTicker();
    const $ = id => root.getElementById(id);
    let items = [], courses = [], filter = 'upcoming', loading = false, hasData = false;
    const time = a => a.due_at && Number.isFinite(Date.parse(a.due_at)) ? Date.parse(a.due_at) : Infinity;
    const complete = a => { const s = a.submission || {}; return Boolean(s.excused || s.submitted_at || ['submitted','pending_review'].includes(s.workflow_state) || (s.workflow_state === 'graded' && !s.missing)); };
    function render() {
      $('date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'});
      if (!hasData) return;
      renderWorkload();
      renderTicker();
      const now = Date.now(), start = new Date(), end = new Date(), week = new Date();
      start.setHours(0,0,0,0); end.setHours(24,0,0,0); week.setDate(week.getDate()+7);
      const scope = items.filter(a => $('course').value === 'all' || String(a.course_id) === $('course').value);
      const pending = scope.filter(a => !complete(a));
      $('today').textContent = pending.filter(a => time(a)>=+start && time(a)<+end).length;
      $('week').textContent = pending.filter(a => time(a)>=now && time(a)<+week).length;
      $('overdue').textContent = pending.filter(a => time(a)<now).length;
      const search = $('search').value.trim().toLowerCase();
      const visible = scope.filter(a => (a.name+' '+a.course_name).toLowerCase().includes(search) && (filter === 'completed' ? complete(a) : !complete(a) && (filter === 'overdue' ? time(a)<now : time(a)>=now)))
        .sort((a,b) => time(a) === time(b) ? a.name.localeCompare(b.name) : time(a)<time(b) ? -1 : 1);
      $('list').replaceChildren(); let lastGroup;
      for (const a of visible) {
        const due = time(a), date = new Date(due), today = due>=+start && due<+end;
        const group = due === Infinity ? 'No due date' : date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
        if (group !== lastGroup) { const label = document.createElement('div'); label.className='group'; label.textContent=today?'Today':group; $('list').append(label); lastGroup=group; }
        const card=document.createElement(a.url?'a':'article'); card.className='card';
        if(a.url){card.href=a.url;}
        card.style.setProperty('--course',palette[Math.max(0,courses.findIndex(c => c.id===a.course_id))%palette.length]);
        const course=document.createElement('div'); course.className='course'; course.textContent=a.course_name; course.title=a.course_name;
        const title=document.createElement('div'); title.className='title'; title.textContent=a.name;
        const meta=document.createElement('div'); meta.className='meta';
        const badge=document.createElement('span'); badge.className='due';
        badge.textContent=due===Infinity?'No due date':date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
        if(due!==Infinity)badge.title=date.toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'});
        if(!complete(a) && due<now){badge.classList.add('late');badge.textContent='Overdue · '+badge.textContent;}
        else if(!complete(a) && today)badge.classList.add('urgent');
        const points=document.createElement('span'); points.textContent=complete(a)?(a.submission?.excused?'Excused':'Completed'):a.points_possible==null?'Assignment':a.points_possible+' pts';
        meta.append(badge,points);card.append(course,title,meta);$('list').append(card);
      }
      if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=search?'No matching assignments.':filter==='overdue'?'All clear. No overdue assignments.':filter==='completed'?'Completed work will appear here.':'You’re caught up in this view.';$('list').append(empty);}
    }
    function renderWorkload() {
      const openDays = new Set([...$('workload-days').querySelectorAll('details[open]')].map(day => day.dataset.date));
      const start = new Date(); start.setHours(0,0,0,0);
      const pending = items.filter(a => !complete(a));
      const days = Array.from({length:3}, (_, i) => {
        const date = new Date(start); date.setDate(date.getDate()+i);
        const end = new Date(date); end.setDate(end.getDate()+1);
        return {date, assignments:pending.filter(a => time(a)>=+date && time(a)<+end).sort((a,b)=>time(a)-time(b) || a.name.localeCompare(b.name))};
      });
      const max = Math.max(1,...days.map(day=>day.assignments.length));
      const total = days.reduce((sum,day)=>sum+day.assignments.length,0);
      const partial = courses.some(course => course.assignments_loaded === false);
      $('workload-note').textContent = (partial ? 'Partial results · ' : '') + total + ' unfinished · All classes · Today + 2 days. Tap a day to expand.';
      $('workload-days').replaceChildren();
      days.forEach(({date,assignments}, index) => {
        const day = document.createElement('details'); day.className='workload-day';
        day.dataset.date=date.toDateString(); day.open=openDays.has(day.dataset.date);
        const summary=document.createElement('summary');
        const label=document.createElement('span'); label.className='workload-label';
        label.textContent=index===0?'Today':date.toLocaleDateString(undefined,{weekday:'short',day:'numeric'});
        const count=document.createElement('span'); count.className='workload-count';count.textContent=String(assignments.length);
        const bar=document.createElement('span');bar.className='workload-bar';bar.setAttribute('aria-hidden','true');
        const fill=document.createElement('i');fill.style.width=assignments.length/max*100+'%';bar.append(fill);
        summary.setAttribute('aria-label',date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})+': '+assignments.length+' unfinished assignments');
        summary.append(label,bar,count);day.append(summary);
        for(const a of assignments){
          const task=document.createElement(a.url?'a':'div');task.className='workload-task';
          if(a.url)task.href=a.url;
          task.style.setProperty('--course',palette[Math.max(0,courses.findIndex(c=>String(c.id)===String(a.course_id)))%palette.length]);
          const title=document.createElement('span');title.textContent=a.name;
          const meta=document.createElement('small');meta.textContent=a.course_name+' · '+new Date(time(a)).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+(time(a)<Date.now()?' · Overdue':'');
          task.append(title,meta);day.append(task);
        }
        if(!assignments.length){const empty=document.createElement('p');empty.className='workload-empty';empty.textContent=partial?'No unfinished deadlines in loaded courses.':'No unfinished deadlines.';day.append(empty);}
        $('workload-days').append(day);
      });
    }
    function renderProgress() {
      $('progress-list').replaceChildren();
      $('progress-message').hidden = courses.length > 0;
      $('progress-message').textContent = 'No active courses';
      courses.forEach((course, index) => {
        const assignments = items.filter(a => String(a.course_id) === String(course.id));
        const done = assignments.filter(complete).length;
        const available = course.assignments_loaded !== false;
        const percent = available && assignments.length ? Math.round(done / assignments.length * 100) : null;
        const count = !available ? 'Progress unavailable' : assignments.length ? done + ' of ' + assignments.length + ' completed' : 'No assignments yet';
        const row = document.createElement('div'); row.className = 'progress-row'; row.dataset.courseId = String(course.id);
        row.style.setProperty('--course', palette[index % palette.length]);
        const ring = document.createElement('div'); ring.className = 'ring'; ring.setAttribute('role', 'img');
        ring.setAttribute('aria-label', course.name + ': ' + (percent === null ? count : percent + '% complete. ' + count));
        ring.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/><circle class="ring-fill" cx="50" cy="50" r="42" pathLength="100"/></svg><strong class="ring-center" aria-hidden="true"></strong>';
        ring.querySelector('.ring-center').textContent = percent === null ? '—' : percent + '%';
        const arc = ring.querySelector('.ring-fill');
        arc.style.strokeDashoffset = String(100 - (available && assignments.length ? done / assignments.length * 100 : 0));
        arc.style.opacity = available && done ? '1' : '0';
        const copy = document.createElement('div'); copy.className = 'progress-copy';
        const title = document.createElement('h4'); title.textContent = course.name;
        const detail = document.createElement('p'); detail.textContent = count;
        copy.append(title, detail); row.append(ring, copy); $('progress-list').append(row);
      });
    }
    async function load() {
      if(loading)return;loading=true;$('refresh').disabled=true;hasData=false;items=[];$('list').replaceChildren();
      tickerMessage('Loading deadlines…');
      $('workload-days').replaceChildren();$('workload-note').textContent='Loading workload…';
      for(const id of ['today','week','overdue'])$(id).textContent='—';
      $('progress-list').replaceChildren();$('progress-message').hidden=false;$('progress-message').textContent='Loading assignments…';
      $('status').className='status';$('status').textContent='Loading your assignments…';
      try {
        const data=await readCanvas();if(data.error)throw Error(data.error);
        items=data.assignments;courses=data.courses;
        const selection=$('course').value;$('course').replaceChildren(new Option('All courses','all'));
        for(const c of courses)$('course').append(new Option(c.name,String(c.id)));
        if(courses.some(c => String(c.id)===selection))$('course').value=selection;
        if(courses.length && data.warnings.length===courses.length)throw Error('No courses could load. '+data.warnings.join(' '));
        hasData=true;renderProgress();
        $('status').textContent=data.warnings.length?'Partial results · '+data.warnings.join(' '):'Updated '+new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+' · '+courses.length+' courses';
        if(data.warnings.length)$('status').classList.add('error');render();
      } catch(error){tickerMessage('Deadlines unavailable. Refresh the tracker.');$('workload-note').textContent='Workload unavailable. Refresh to try again.';$('status').className='status error';$('status').textContent=error.message+' Use refresh to try again.';$('progress-message').hidden=false;$('progress-message').textContent='Progress unavailable';}
      finally{loading=false;$('refresh').disabled=false;}
    }
    $('collapse').onclick=()=>{const hidden=!$('content').hidden;$('content').hidden=hidden;$('collapse').textContent=hidden?'+':'−';$('collapse').setAttribute('aria-expanded',String(!hidden));$('collapse').setAttribute('aria-label',hidden?'Expand deadlines':'Collapse deadlines');};
    $('refresh').onclick=load;$('course').onchange=render;$('search').oninput=render;
    for(const button of root.querySelectorAll('[data-filter]'))button.onclick=()=>{filter=button.dataset.filter;for(const tab of root.querySelectorAll('[data-filter]'))tab.setAttribute('aria-pressed',String(tab===button));render();};
    render();load();
    const timer=setInterval(()=>{if(!mountedHost.isConnected){clearInterval(timer);return;}if(!loading)render();},60000);
  }
  mount();
  new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();
