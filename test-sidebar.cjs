const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  const page = await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const date=(offset)=>{const d=new Date();d.setDate(d.getDate()+offset);d.setHours(23,59,0,0);return d.toISOString();};
  const courses=[{id:1,name:'Computer Science',workflow_state:'available'},{id:2,name:'Sociology',workflow_state:'available'}];
  courses.push(...['Environmental Literature','Software Engineering','Sport and Film','The Motivated Project'].map((name,i)=>({id:i+3,name:''+name,workflow_state:'available'})));
  const assignments=[{id:1,name:'Programming exercise',course_id:1,due_at:date(0),points_possible:100,html_url:'https://canvas.example.com/courses/1/assignments/1'},{id:2,name:'Reading reflection',course_id:1,due_at:date(-2),points_possible:20},{id:3,name:'Introduction discussion',course_id:1,due_at:date(-3),submission:{workflow_state:'submitted'}},{id:4,name:'Final portfolio',course_id:1,due_at:null}];
  const html=`<html><body class="ic-Layout-wrapper" style="margin:0;font:16px Arial;background:#fff"><h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Canvas accessibility heading</h1><nav style="position:fixed;width:72px;height:100%;background:#ac0b15;color:white;text-align:center;padding-top:25px;font-size:30px">C</nav><main style="margin-left:110px;padding:40px 30px;display:grid;grid-template-columns:1fr 320px;gap:50px"><div><div class="ic-Dashboard-header" style="position:relative;z-index:10;background:rgba(255,255,255,.96)"><h1 class="ic-Dashboard-header__title" style="font-size:38px;margin:0 0 30px"><span style="display:block">Dashboard</span></h1><button aria-label="Dashboard options" style="position:absolute;right:0;top:8px;width:28px;height:28px">⋮</button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:25px">${['Environmental Literature','Sociology','Computer Science','Software Engineering','Sport and Film','The Motivated Project'].map((x,i)=>`<article class="ic-DashboardCard" style="border:1px solid #ddd;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px #0001"><div style="height:135px;background:${['#cedac8','#e2d6cc','#d4d2e5'][i%3]};display:grid;place-items:center;color:#56624e;font-size:12px;letter-spacing:2px">SAMPLE COURSE</div><div style="padding:20px"><b style="color:#455e93">${x}</b><p style="color:#777;font-size:13px">Sample term</p></div></article>`).join('')}</div><p style="color:#999;margin-top:35px;font-size:12px">TEST PREVIEW · Sample assignments</p></div><aside id="right-side"><div id="original">Canvas sidebar content</div></aside></main></body></html>`;
  await page.route('https://canvas.example.com/**',route=>{
    const url=route.request().url();
    if(url.includes('/api/v1/courses?'))return route.fulfill({json:courses});
    if(url.includes('/courses/1/assignments'))return route.fulfill({json:assignments});
    if(url.includes('/courses/2/assignments'))return route.fulfill({json:[{id:5,name:'Reading response',course_id:2,due_at:date(3),points_possible:20}]});
    if(url.includes('/api/v1/courses/') && url.includes('/assignments'))return route.fulfill({json:[]});
    return route.fulfill({contentType:'text/html',body:html});
  });
  await page.goto('https://canvas.example.com/');
  await page.addScriptTag({path:path.join(__dirname,'canvas-api.js')});
  await page.addScriptTag({path:path.join(__dirname,'sidebar.js')});
  const panel=page.locator('#canvas-deadlines-panel');
  await panel.locator('#status').filter({hasText:'6 courses'}).waitFor();
  const ticker=page.locator('#canvas-deadlines-ticker');
  assert.equal(await ticker.count(),1);
  assert.equal(await ticker.isVisible(),true);
  const tickerBox=await ticker.boundingBox();
  const headingBox=await page.locator('main h1').evaluate(el=>{const r=document.createRange();r.selectNodeContents(el.querySelector('span').firstChild);const b=r.getBoundingClientRect();return {y:b.y,height:b.height};});
  assert.ok(Math.abs(tickerBox.y+tickerBox.height/2-headingBox.y-headingBox.height/2)<1);
  assert.ok(tickerBox.y>=0);
  const menuBox=await page.getByRole('button',{name:'Dashboard options'}).boundingBox();
  assert.ok(tickerBox.x+tickerBox.width<=menuBox.x-19);
  assert.equal(await ticker.evaluate(el=>document.elementFromPoint(el.getBoundingClientRect().x+10,el.getBoundingClientRect().y+20)===el),true);
  assert.equal(await ticker.locator('.group').count(),2);
  assert.equal(await ticker.locator('.group').first().locator('.item').count(),2);
  assert.equal(await ticker.locator('.group').first().locator('a').first().getAttribute('href'),'https://canvas.example.com/courses/1/assignments/1');
  const transform=await ticker.locator('.track').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(150);
  assert.notEqual(await ticker.locator('.track').evaluate(el=>getComputedStyle(el).transform),transform);
  await ticker.locator('button').click();
  assert.equal(await ticker.locator('button').getAttribute('aria-pressed'),'true');
  await page.mouse.move(0,0);
  assert.equal(await ticker.locator('.track').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  await ticker.locator('button').click();await page.mouse.move(0,0);
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await ticker.locator('.track').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await panel.locator('.card').count(),3);
  assert.equal(await panel.locator('.workload-day').count(),3);
  assert.equal(await panel.locator('.workload-task').count(),1);
  assert.equal(await panel.locator('.workload-count').first().textContent(),'1');
  await panel.locator('.workload-day summary').first().click();
  assert.equal(await panel.locator('.workload-task').first().getAttribute('href'),'https://canvas.example.com/courses/1/assignments/1');
  assert.equal(await panel.locator('#overdue').textContent(),'1');
  const firstProgress=panel.locator('.progress-row[data-course-id="1"]');
  assert.equal(await panel.locator('.progress-row').count(),6);
  assert.equal(await firstProgress.locator('.ring-center').textContent(),'25%');
  assert.equal(await firstProgress.locator('.progress-copy p').textContent(),'1 of 4 completed');
  assert.equal(await panel.locator('.progress-row[data-course-id="3"] .progress-copy p').textContent(),'No assignments yet');
  await panel.locator('[data-filter="overdue"]').click();assert.equal(await panel.locator('.card').count(),1);
  await panel.locator('[data-filter="completed"]').click();assert.equal(await panel.locator('.card').count(),1);
  await panel.locator('[data-filter="upcoming"]').click();
  await panel.locator('#course').selectOption('2');assert.equal(await panel.locator('.card').count(),1);
  assert.equal(await panel.locator('.progress-row').count(),6);
  assert.equal(await firstProgress.locator('.ring-center').textContent(),'25%');
  assert.equal(await panel.locator('.progress-row[data-course-id="2"] .ring-center').textContent(),'0%');
  assert.equal(await panel.locator('.progress-row[data-course-id="2"] .ring-fill').evaluate(el=>el.style.opacity),'0');
  assert.equal(await panel.locator('.workload-task').count(),1);
  assert.equal(await panel.locator('.workload-day').first().getAttribute('open'),'');
  await panel.locator('#search').fill('no match');assert.equal(await panel.locator('.card').count(),0);
  await panel.locator('#search').fill('');await panel.locator('#course').selectOption('all');
  await panel.locator('#collapse').click();assert.equal(await panel.locator('#content').isVisible(),false);await panel.locator('#collapse').click();
  await page.addScriptTag({path:path.join(__dirname,'sidebar.js')});assert.equal(await page.locator('#canvas-deadlines-panel').count(),1);assert.equal(await ticker.count(),1);
  assert.equal(await page.locator('#right-side > :first-child').getAttribute('id'),'canvas-deadlines-panel');
  const bounds = await panel.evaluate(el => {
    const rect = el.getBoundingClientRect(), sidebar = el.parentElement.getBoundingClientRect();
    const rightmost = Math.max(...[...document.querySelectorAll('.ic-DashboardCard')].map(card => card.getBoundingClientRect().right));
    return {width:rect.width, sidebarWidth:sidebar.width, gap:rect.left-rightmost, right:rect.right, sidebarRight:sidebar.right, panelTop:el.shadowRoot.querySelector('.panel').getBoundingClientRect().top, cardsTop:Math.min(...[...document.querySelectorAll('.ic-DashboardCard')].map(card=>card.getBoundingClientRect().top))};
  });
  assert.ok(bounds.width > bounds.sidebarWidth);
  assert.ok(bounds.gap >= 24);
  assert.equal(bounds.right, bounds.sidebarRight);
  assert.equal(bounds.panelTop, bounds.cardsTop);
  await page.waitForTimeout(700);
  if (process.env.PREVIEW_PATH) {
    await page.screenshot({path:process.env.PREVIEW_PATH,fullPage:true});
  }
  await page.locator('#right-side').evaluate(el=>el.style.width='260px');
  assert.equal(await panel.evaluate(el=>el.shadowRoot.querySelector('.panel').scrollWidth>el.clientWidth),false);
  await page.setViewportSize({width:1000,height:1100});
  await page.waitForFunction(() => document.querySelector('#canvas-deadlines-panel').style.marginLeft === '0px');
  assert.equal(await panel.evaluate(el=>el.getBoundingClientRect().width),260);
  assert.equal(await panel.evaluate(el=>el.style.paddingTop),'0px');
  await page.route('**/api/v1/courses?**',route=>route.fulfill({status:401}));
  await panel.locator('#refresh').click();await panel.locator('#status.error').waitFor();assert.equal(await panel.locator('#today').textContent(),'—');
  assert.equal(await panel.locator('.progress-row').count(),0);
  assert.equal(await panel.locator('.workload-day').count(),0);
  assert.match(await panel.locator('#workload-note').textContent(),/unavailable/);
  assert.equal(await ticker.locator('.track').count(),0);
  assert.match(await ticker.locator('.message').textContent(),/unavailable/);
  assert.equal(await panel.locator('#progress-message').textContent(),'Progress unavailable');
  await page.route('**/api/v1/courses?**',route=>route.fulfill({json:courses}));
  await page.route('**/courses/2/assignments?**',route=>route.fulfill({status:403}));
  await panel.locator('#refresh').click();await panel.locator('#status').filter({hasText:'Partial results'}).waitFor();
  assert.equal(await panel.locator('.progress-row[data-course-id="2"] .progress-copy p').textContent(),'Progress unavailable');
  assert.equal(await firstProgress.locator('.ring-center').textContent(),'25%');
  await page.route('**/courses/1/assignments?**',route=>route.fulfill({json:assignments.map(a=>({...a,submission:{workflow_state:'submitted'}}))}));
  await panel.locator('#refresh').click();await panel.locator('#status').filter({hasText:'Partial results'}).waitFor();
  assert.match(await panel.locator('#workload-note').textContent(),/Partial results/);
  assert.equal(await firstProgress.locator('.ring-center').textContent(),'100%');
  assert.equal(await firstProgress.locator('.ring-fill').evaluate(el=>el.style.strokeDashoffset),'0');
  const boundary = (offset,hour=0,minute=0) => {const d=new Date();d.setHours(hour,minute,0,0);d.setDate(d.getDate()+offset);return d.toISOString();};
  const workloadFixtures=[
    {id:10,name:'Due at midnight today',due_at:boundary(0)},
    {id:11,name:'Last day starts',due_at:boundary(2)},
    {id:12,name:'Last day ends',due_at:boundary(2,23,59)},
    {id:13,name:'Outside the three days',due_at:boundary(3)},
    {id:14,name:'Yesterday',due_at:boundary(-1)},
    {id:15,name:'Already done',due_at:boundary(1),submission:{workflow_state:'submitted'}},
    {id:16,name:'Undated',due_at:null},
    {id:17,name:'Invalid date',due_at:'invalid'}
  ];
  await page.route('**/api/v1/courses?**',route=>route.fulfill({json:[courses[0]]}));
  await page.route('**/courses/1/assignments?**',route=>route.fulfill({json:workloadFixtures}));
  await panel.locator('#refresh').click();await panel.locator('#status').filter({hasText:'1 courses'}).waitFor();
  assert.equal(await panel.locator('.workload-task').count(),3);
  assert.equal(await panel.locator('.workload-count').first().textContent(),'1');
  assert.equal(await panel.locator('.workload-count').last().textContent(),'2');
  assert.equal(await panel.locator('.workload-bar i').last().evaluate(el=>el.style.width),'100%');
  await page.route('**/api/v1/courses?**',route=>route.fulfill({json:[]}));
  await panel.locator('#refresh').click();await panel.locator('#status').filter({hasText:'0 courses'}).waitFor();
  assert.equal(await panel.locator('.progress-row').count(),0);
  assert.equal(await panel.locator('#progress-message').textContent(),'No active courses');
  assert.match(await ticker.locator('.message').textContent(),/No upcoming deadlines/);
  assert.deepEqual(errors,[]);
  console.log('PASS: automatic right-sidebar mount, date counts, filters, search, collapse, duplicate prevention, narrow layout, and expired session.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
