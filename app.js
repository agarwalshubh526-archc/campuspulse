/* CampusPulse — student issue hub + facilities team view + campus intelligence */

const defaultReports = [
  { id:'CP-2041', cat:'Facilities', title:'Air conditioning not working', loc:'Science Block · Lab 204', status:'In progress', time:'18 min ago', owner:'RK', mine:true, priority:'Normal', supporters:2, image:null },
  { id:'CP-2038', cat:'Safety', title:'Loose handrail near staircase', loc:'Main Building · East Wing', status:'Urgent', time:'42 min ago', owner:'AM', mine:false, priority:'Urgent', supporters:1, image:null },
  { id:'CP-2035', cat:'Cleanliness', title:'Bins need clearing after lunch', loc:'Central Cafeteria', status:'Resolved', time:'1 hr ago', owner:'NK', mine:false, priority:'Normal', supporters:0, image:null },
  { id:'CP-2032', cat:'Tech', title:'Wi-Fi drops in study zone', loc:'Library · Ground Floor', status:'In progress', time:'2 hrs ago', owner:'IT', mine:true, priority:'Normal', supporters:3, image:null },
  { id:'CP-2029', cat:'Facilities', title:'Projector cable is damaged', loc:'Lecture Hall B-12', status:'In progress', time:'3 hrs ago', owner:'RK', mine:false, priority:'Normal', supporters:0, image:null },
  { id:'CP-2023', cat:'Safety', title:'Parking lights are off', loc:'North Parking', status:'Resolved', time:'Yesterday', owner:'AM', mine:false, priority:'Normal', supporters:0, image:null }
];

const CAT_KEYWORDS = {
  Facilities: ['ac','air','projector','cable','chair','desk','light','fan','door','window','leak','floor','bench','table','tap','pipe'],
  Safety:     ['handrail','stair','parking light','unsafe','fire','emergency','broken glass','slip','fall','hazard','smoke','alarm','injury'],
  Cleanliness:['bin','trash','garbage','clean','spill','washroom','toilet','smell','dust','mop','wet','dirty'],
  Tech:       ['wifi','wi-fi','internet','laptop','printer','network','login','software','app','screen','projector tech','server','mouse','keyboard','projector not'],
  Security:   ['bully','ragging','harass','fight','theft','stolen','broken camera','camera broken','mischief','vandalism','abuse','threat','assault']
};

const ZONES = ['Science Block','Main Building','Library','Central Cafeteria','Lecture Hall','North Parking','Sports Complex'];

function loadJSON(key, fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback }catch{ return fallback } }
function saveJSON(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)) }catch{} }

let savedReports = loadJSON('campusPulseReports', null);
let reports = Array.isArray(savedReports) ? savedReports : defaultReports;
let supportedIds = new Set(loadJSON('cp_supportedIds', []));
let karma = loadJSON('cp_karma', {reports:0,supports:0,resolved:0,points:0});
let theme = loadJSON('cp_theme', 'light');

let activeFilter='all', selectedCat='Facilities', selectedPriority='Normal', selectedAnonymous = false;
let teamMode = false, categoryLocked = false, selectedEvidence = null;

const grid = document.querySelector('#report-grid');
const myGrid = document.querySelector('#my-report-grid');
const feedEl = document.querySelector('#feed');

let feedItems = [
  {icon:'fa-circle-check', text:'Facilities team resolved the cafeteria bin request', time:'12 min ago', reportId:'CP-2035'},
  {icon:'fa-wrench', text:'Maintenance started work on Lab 204', time:'24 min ago', reportId:'CP-2041'},
  {icon:'fa-user-group', text:'Three students supported the Wi-Fi study-zone report', time:'1 hr ago', reportId:'CP-2032'},
  {icon:'fa-bolt', text:'New hotspot identified: Science Block', time:'2 hrs ago', reportId:'CP-2041'}
];

/* Helpers */
function statusClass(s){ return s==='Resolved'?'resolved':s==='Urgent'?'urgent':'in-progress'; }
function statusColorClass(s){ return s==='Resolved'?'resolved':s==='Urgent'?'urgent':'in-progress'; }
function nextId(){
  let max=2049;
  reports.forEach(r=>{ const n=parseInt(r.id.replace('CP-',''),10); if(!isNaN(n)&&n>max) max=n; });
  return 'CP-'+(max+1);
}
function openCount(){ return reports.filter(r=>r.status!=='Resolved').length; }
function resolvedCount(){ return reports.filter(r=>r.status==='Resolved').length; }
function zoneOf(loc){ return ZONES.find(z=>loc.toLowerCase().includes(z.toLowerCase())) || loc.split('·')[0].trim(); }

/* Theme */
function applyTheme(t){
  theme=t;
  document.body.classList.toggle('dark', theme==='dark');
  const icon = document.querySelector('#theme-toggle i');
  if(icon) icon.className = theme==='dark'?'fa-solid fa-sun':'fa-solid fa-moon';
  saveJSON('cp_theme', theme);
}
function toggleTheme(){ applyTheme(theme==='dark'?'light':'dark'); }

/* Header */
function updateHeader(){
  const now = new Date();
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const months = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  const eyebrow = document.querySelector('#date-eyebrow');
  if(eyebrow) eyebrow.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  const hour = now.getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const title = document.querySelector('#page-title');
  if(title && document.querySelector('.nav-link.active')?.dataset.view==='dashboard'){
    title.innerHTML = `${greeting}, Shubh <span>✦</span>`;
  }
}

/* Karma */
function addKarma(type){
  if(type==='report'){karma.reports++;karma.points+=20}
  if(type==='support'){karma.supports++;karma.points+=5}
  if(type==='resolve'){karma.resolved++;karma.points+=15}
  saveJSON('cp_karma', karma);
  renderKarma();
}
function renderKarma(){
  ['karma-reports','karma-supports','karma-points','karma-points-header'].forEach(id=>{
    const el=document.querySelector('#'+id);
    if(el) el.textContent = id==='karma-points'||id==='karma-points-header'?karma.points:(id==='karma-reports'?karma.reports:karma.supports);
  });
}

/* Health & counts */
function setHealth(){
  const open = openCount();
  const score = Math.max(72, Math.round(92 - open*1.5));
  const scoreEl = document.querySelector('#health-score');
  const bar = document.querySelector('.health-bar i');
  const mini = document.querySelector('.health-mini b');
  if(scoreEl) scoreEl.textContent = score;
  if(bar) bar.style.width = score+'%';
  if(mini) mini.textContent = open;
}
function setNavCount(){
  const el = document.querySelector('.nav-count');
  if(el) el.textContent = openCount();
}
function setResolvedCount(){
  const el = document.querySelector('#resolved-count');
  if(el) el.textContent = resolvedCount();
}
function setHotspot(){
  const counts = {};
  reports.forEach(r=>{ const z=zoneOf(r.loc); counts[z]=(counts[z]||0)+1; });
  let topPlace='', topCount=0;
  Object.entries(counts).forEach(([p,c])=>{ if(c>topCount){topCount=c; topPlace=p;} });
  const nameEl = document.querySelector('#hotspot-name');
  const metaEl = document.querySelector('#hotspot-meta');
  if(nameEl && metaEl && topCount>=1){
    nameEl.textContent = `${topPlace} is this week’s hotspot`;
    metaEl.textContent = `${topCount} report${topCount>1?'s':''} · Facilities team assigned`;
  }
}

/* Campus Oracle — predictive intelligence */
function generatePredictions(){
  const catGroups={};
  const zoneGroups={};
  reports.filter(r=>r.status!=='Resolved').forEach(r=>{
    const z=zoneOf(r.loc);
    if(!catGroups[r.cat]) catGroups[r.cat]={zone:'campus-wide',cat:r.cat,count:0,supporters:0};
    catGroups[r.cat].count++;
    catGroups[r.cat].supporters += (r.supporters||0);
    if(!zoneGroups[z]) zoneGroups[z]={zone:z,cat:'Multi-category issue',count:0,supporters:0};
    zoneGroups[z].count++;
    zoneGroups[z].supporters += (r.supporters||0);
  });
  const preds=[
    ...Object.values(catGroups).filter(g=>g.count>=2),
    ...Object.values(zoneGroups).filter(g=>g.count>=2)
  ].map(g=>({...g,confidence:Math.min(95,Math.round(35+g.count*18+g.supporters*1))}))
   .sort((a,b)=>b.confidence-a.confidence)
   .slice(0,3);
  return preds;
}
function renderOracle(){
  const preds = generatePredictions();
  const headline = document.querySelector('#oracle-headline');
  const meta = document.querySelector('#oracle-meta');
  if(!headline || !meta) return;
  if(preds.length){
    const top = preds[0];
    const catText = top.cat==='Multi-category issue'?'Multiple issues':top.cat+' issue';
    const zoneText = top.zone==='campus-wide'?'anywhere on campus':'in '+top.zone;
    headline.textContent = `${catText} likely ${zoneText}`;
    meta.textContent = `${top.confidence}% confidence · based on ${top.count} recent reports`;
  } else {
    headline.textContent = 'No strong failure signals yet';
    meta.textContent = 'Campus Oracle learns as more reports arrive';
  }
  const list = document.querySelector('#prediction-list');
  const insights = document.querySelector('#insights-predictions');
  const html = preds.map(p=>{
    const cat = p.cat==='Multi-category issue'?'Multiple issues':p.cat;
    return `<article class="prediction-item"><b>${cat} · ${p.zone}</b><span>${p.count} reports · ${p.confidence}% confidence</span><div class="confidence"><i style="width:${p.confidence}%"></i></div></article>`;
  }).join('');
  if(list) list.innerHTML = html;
  if(insights) insights.innerHTML = preds.length ? html : '<div class="empty-state"><i class="fa-solid fa-wand-magic-sparkles"></i>No predictions yet — more reports help the Oracle learn.</div>';
}

/* Cards */
function card(r,i){
  const supporterBadge = (r.supporters||0)>0 ? `<span class="supporter-badge"><i class="fa-solid fa-user-plus"></i> ${r.supporters}</span>` : '';
  const anonBadge = r.anonymous ? `<span class="anonymous-badge"><i class="fa-solid fa-user-secret"></i> Anonymous</span>` : '';
  const thumb = r.image ? `<img src="${r.image}" class="card-thumb" alt=""/>` : '';
  const assigned = r.anonymous
    ? `<span class="assigned"><span class="avatar" style="background:#f3e5f5;color:#6a1b9a"><i class="fa-solid fa-user-secret"></i></span>Anonymous</span>`
    : `<span class="assigned"><span class="avatar">${r.owner}</span>Assigned</span>`;
  return `<article class="report-card" data-id="${r.id}" style="animation-delay:${i*.04}s">
    <div class="card-top"><span class="tag ${r.cat.toLowerCase()}">${r.cat.toUpperCase()}</span><span class="status ${statusClass(r.status)}">${r.status}</span>${supporterBadge}${anonBadge}</div>
    ${thumb}<h3>${r.title}</h3>
    <p class="loc"><i class="fa-solid fa-location-dot"></i>${r.loc}</p>
    <div class="card-bottom"><span>${r.time}</span>${assigned}</div>
  </article>`;
}

/* Detail / tracker */
function tracker(r){
  const resolved = r.status==='Resolved';
  const progress = r.status==='In progress' || r.status==='Urgent';
  const mySupport = supportedIds.has(r.id);
  const teamActions = teamMode ? `<div class="team-actions"><span>UPDATE STATUS</span><div class="status-options">
    <button type="button" class="${r.status==='In progress'?'active':''}" data-status="In progress">In progress</button>
    <button type="button" class="${r.status==='Urgent'?'active':''}" data-status="Urgent">Urgent</button>
    <button type="button" class="${r.status==='Resolved'?'active':''}" data-status="Resolved">Resolved</button>
  </div></div>` : `<div class="team-actions"><span>TEAM ACTION</span><div class="status-options"><button type="button" class="resolve-lock" data-status="Resolved" ${resolved?'disabled':''}><i class="fa-solid fa-lock"></i> ${resolved?'Resolved':'Mark as resolved'}</button></div></div>`;
  const image = r.image ? `<img src="${r.image}" class="detail-image" alt="Report evidence"/>` : '';
  const anonBanner = r.anonymous ? `<div class="anon-banner"><i class="fa-solid fa-user-secret"></i> Anonymous report — identity protected</div>` : '';
  const reporterCard = !r.anonymous && r.reporter ? `<div class="reporter-card"><strong><i class="fa-solid fa-user"></i>${r.reporter.name}</strong>${r.reporter.department} · ${r.reporter.regNo}</div>` : '';
  const ownerLabel = r.anonymous ? 'Campus Safety Team' : 'Campus Operations';
  const ownerInitials = r.anonymous ? '<i class="fa-solid fa-user-secret"></i>' : r.owner;
  const ownerStyle = r.anonymous ? 'background:#f3e5f5;color:#6a1b9a' : '';

  document.querySelector('#detail-content').innerHTML = `
    <div class="detail-head"><h2>${r.title}</h2><p><i class="fa-solid fa-location-dot"></i> ${r.loc} &nbsp;·&nbsp; ${r.id}</p></div>
    ${anonBanner}${reporterCard}${image}
    <div class="tracker-status"><span>LIVE STATUS</span><strong class="${statusColorClass(r.status)}">${r.status}</strong></div>
    <div class="timeline">
      <div class="timeline-item done"><b>Report received</b><p>${r.time} · Your voice is on the map.</p></div>
      <div class="timeline-item ${progress||resolved?'done':'current'}"><b>Assigned to Campus Operations</b><p>Facilities coordinator has been notified.</p></div>
      <div class="timeline-item ${resolved?'done':progress?'current':''}"><b>${resolved?'Issue resolved':'Work in progress'}</b><p>${resolved?'The team marked this report complete.':"You’ll see the next update here."}</p></div>
    </div>
    <div class="owner-row"><span class="avatar" style="${ownerStyle}">${ownerInitials}</span><span><strong>${ownerLabel}</strong>${r.anonymous?'Anonymous reporter · routed to safety team':'Accountable team owner'}</span></div>
    <button class="support-btn ${mySupport?'active':''}" id="support-btn" data-id="${r.id}">
      <i class="fa-solid fa-user-plus"></i> ${mySupport?'You support this report':"I’m affected too"} <span>${(r.supporters||0)>0?`· ${r.supporters} supporter${(r.supporters||0)>1?'s':''}`:''}</span>
    </button>
    ${teamActions}`;

  document.querySelector('#detail-layer').classList.add('show');
  document.body.classList.add('modal-open');

  document.querySelector('#support-btn').onclick = () => toggleSupport(r.id);

  document.querySelectorAll('.team-actions button').forEach(btn=>{
    btn.onclick = () => changeStatus(r.id, btn.dataset.status);
  });
}

function toggleSupport(id){
  const r = reports.find(x=>x.id===id);
  if(!r) return;
  const adding = !supportedIds.has(id);
  if(adding){ supportedIds.add(id); r.supporters = (r.supporters||0)+1; addKarma('support'); showToast('Support added — this helps prioritize the fix.'); }
  else { supportedIds.delete(id); r.supporters = Math.max(0,(r.supporters||0)-1); showToast('Support removed.'); }
  saveJSON('cp_supportedIds', [...supportedIds]);
  saveJSON('campusPulseReports', reports);
  tracker(r);
  render();
}

function changeStatus(id, newStatus){
  const r = reports.find(x=>x.id===id);
  if(!r || r.status===newStatus) return;
  if(newStatus==='Resolved'){ requestResolution(id); return; }
  applyStatusChange(id, newStatus);
}

function applyStatusChange(id, newStatus){
  const r = reports.find(x=>x.id===id);
  if(!r || r.status===newStatus) return;
  const oldStatus = r.status;
  r.status = newStatus;
  r.priority = newStatus==='Urgent'?'Urgent':r.priority;
  if(newStatus==='Resolved'){ addKarma('resolve'); fireConfetti(); }
  saveJSON('campusPulseReports', reports);
  showToast(`Status updated to ${newStatus}`);
  addFeed('fa-circle-check', `Campus Operations moved ${r.id} from ${oldStatus} to ${newStatus}`, r.id);
  tracker(r);
  render();
}

let pendingResolveId = null;
function requestResolution(id){
  pendingResolveId = id;
  const layer = document.querySelector('#resolve-layer');
  const input = document.querySelector('#resolve-password');
  const error = document.querySelector('#resolve-error');
  if(error) error.textContent = '';
  if(input) input.value = '';
  if(layer) layer.classList.add('show');
  document.body.classList.add('modal-open');
  setTimeout(()=>input?.focus(), 0);
}
function closeResolution(){
  document.querySelector('#resolve-layer')?.classList.remove('show');
  pendingResolveId = null;
  document.body.classList.remove('modal-open');
}
function confirmResolution(){
  const input = document.querySelector('#resolve-password');
  const error = document.querySelector('#resolve-error');
  if(!pendingResolveId || !input) return;
  if(input.value !== '2007'){
    if(error) error.textContent = 'Incorrect password. Resolution was not changed.';
    input.focus(); input.select();
    return;
  }
  const id = pendingResolveId;
  closeResolution();
  applyStatusChange(id, 'Resolved');
}
const resolveLayer = document.querySelector('#resolve-layer');
const resolveSubmit = document.querySelector('#resolve-submit');
const resolvePassword = document.querySelector('#resolve-password');
if(resolveSubmit) resolveSubmit.onclick = confirmResolution;
if(resolvePassword) resolvePassword.onkeydown = e => { if(e.key==='Enter') confirmResolution(); };
document.querySelector('.close-resolve')?.addEventListener('click', closeResolution);
if(resolveLayer) resolveLayer.onclick = e => { if(e.target===resolveLayer) closeResolution(); };

/* Rendering */
function render(){
  const query = document.querySelector('#search')?.value.toLowerCase()||'';
  let list = reports.filter(r=>{
    const matchesFilter = activeFilter==='all' ||
      (activeFilter==='urgent' ? r.status==='Urgent' :
       activeFilter==='progress' ? r.status==='In progress' :
       r.status==='Resolved');
    const matchesSearch = (r.title+' '+r.loc+' '+r.cat).toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  if(grid) grid.innerHTML = list.length
    ? list.map(card).join('')
    : '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i>No matching reports yet.<br>Try another filter or make the first report.</div>';
  if(myGrid) myGrid.innerHTML = reports.filter(r=>r.mine).map(card).join('') ||
    '<div class="empty-state"><i class="fa-regular fa-flag"></i>No reports yet — your voice starts the change.</div>';

  const openC = openCount();
  const openEl = document.querySelector('#open-count');
  if(openEl) openEl.textContent = Math.max(0, openC);
  setHealth(); setNavCount(); setResolvedCount(); setHotspot(); renderOracle(); renderKarma(); renderMap(); renderAnalytics(); renderLeaderboard();
  document.querySelectorAll('.report-card').forEach(el=>{
    el.onclick = () => tracker(reports.find(x=>x.id===el.dataset.id));
  });
}

/* Feed */
function renderFeed(){
  if(!feedEl) return;
  feedEl.innerHTML = feedItems.map(x=>`<article class="feed-item ${x.reportId?'clickable':''}" ${x.reportId?`data-report-id="${x.reportId}"`:''}><span class="feed-icon"><i class="fa-solid ${x.icon}"></i></span><p><strong>${x.text}</strong><br>Making campus better, together.</p><time>${x.time}</time></article>`).join('');
  feedEl.querySelectorAll('.feed-item[data-report-id]').forEach(item=>item.onclick=()=>{
    const report = reports.find(r=>r.id===item.dataset.reportId);
    if(report) tracker(report);
  });
}
function addFeed(icon,text,reportId=null){
  feedItems.unshift({icon,text,time:'Just now',reportId});
  if(feedItems.length>8) feedItems.pop();
  renderFeed();
}

/* Auto-categorization */
function suggestCategory(text){
  const note = document.querySelector('#auto-detect');
  if(categoryLocked || !text.trim()){ if(note) note.textContent=''; return; }
  const lower = text.toLowerCase();
  for(const [cat,words] of Object.entries(CAT_KEYWORDS)){
    if(words.some(w=>lower.includes(w))){
      document.querySelectorAll('.category').forEach(b=>b.classList.toggle('active', b.dataset.category===cat));
      selectedCat = cat;
      if(note) note.textContent = `Detected category: ${cat}`;
      return;
    }
  }
  if(note) note.textContent='';
}

/* Modal */
const modal = document.querySelector('#modal-layer');
function openModal(){ if(modal) modal.classList.add('show'); document.body.classList.add('modal-open'); categoryLocked=false; selectedAnonymous=false; const note=document.querySelector('#auto-detect'); if(note) note.textContent=''; selectedEvidence=null; const prev=document.querySelector('#evidence-preview'); if(prev){prev.src='';prev.classList.remove('show');} const anon=document.querySelector('#anonymous'); if(anon) anon.checked=false; setReporterFields(false); }
function closeModal(){
  if(modal) modal.classList.remove('show');
  document.body.classList.remove('modal-open');
  setTimeout(()=>{
    const fs=document.querySelector('#form-state'); if(fs) fs.style.display='block';
    const ss=document.querySelector('#success-state'); if(ss) ss.classList.remove('show');
    const form=document.querySelector('#report-form'); if(form) form.reset();
    const cc=document.querySelector('#char-count'); if(cc) cc.textContent='0';
    const note=document.querySelector('#auto-detect'); if(note) note.textContent='';
    document.querySelectorAll('.category').forEach(b=>b.classList.toggle('active', b.dataset.category==='Facilities'));
    selectedCat='Facilities'; selectedPriority='Normal'; selectedAnonymous=false;
    document.querySelectorAll('.priority').forEach(b=>b.classList.toggle('active', b.dataset.priority==='Normal'));
    categoryLocked=false; selectedEvidence=null;
    const prev=document.querySelector('#evidence-preview'); if(prev){prev.src='';prev.classList.remove('show');}
    const anon=document.querySelector('#anonymous'); if(anon) anon.checked=false; setReporterFields(false);
  },200);
}

/* Evidence upload */
function handleEvidence(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    selectedEvidence = e.target.result;
    const prev = document.querySelector('#evidence-preview');
    if(prev){ prev.src=selectedEvidence; prev.classList.add('show'); }
  };
  reader.readAsDataURL(file);
}

/* Team mode */
function setTeamMode(on){
  teamMode = on;
  const btn = document.querySelector('#team-toggle');
  if(btn) btn.classList.toggle('active', teamMode);
  if(teamMode) showToast('Team view enabled — you can update report statuses');
  render();
}

/* Event bindings */
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  activeFilter=b.dataset.filter;
  render();
});

const searchInput = document.querySelector('#search');
if(searchInput) searchInput.oninput = render;

document.querySelectorAll('.report-trigger').forEach(b=>b.onclick=openModal);
const closeModalBtn = document.querySelector('.close-modal');
if(closeModalBtn) closeModalBtn.onclick = closeModal;
const closeSuccessBtn = document.querySelector('.close-success');
if(closeSuccessBtn) closeSuccessBtn.onclick = closeModal;
if(modal) modal.onclick = e => { if(e.target===modal) closeModal(); };

document.querySelectorAll('.category').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.category').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  selectedCat = b.dataset.category;
  categoryLocked = true;
  const note = document.querySelector('#auto-detect');
  if(note) note.textContent = `Category locked: ${selectedCat}`;
});

document.querySelectorAll('.priority').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.priority').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  selectedPriority = b.dataset.priority;
});

function setReporterFields(anonymous){
  const block = document.querySelector('#reporter-details');
  const inputs = document.querySelectorAll('#reporter-details input');
  if(block) block.classList.toggle('hidden', anonymous);
  inputs.forEach(input=>{ input.disabled=anonymous; input.required=!anonymous; if(anonymous) input.value=''; });
}
const anonCheckbox = document.querySelector('#anonymous');
if(anonCheckbox) anonCheckbox.onchange = e => { selectedAnonymous = e.target.checked; setReporterFields(selectedAnonymous); };

const detailsEl = document.querySelector('#details');
if(detailsEl) detailsEl.oninput = e => {
  const cc=document.querySelector('#char-count'); if(cc) cc.textContent = e.target.value.length;
  suggestCategory(e.target.value);
};

const evidenceEl = document.querySelector('#evidence');
if(evidenceEl) evidenceEl.onchange = e => handleEvidence(e.target.files[0]);

const reportForm = document.querySelector('#report-form');
if(reportForm) reportForm.onsubmit = e => {
  e.preventDefault();
  const detail = document.querySelector('#details').value.trim();
  const loc = document.querySelector('#location').value.trim();
  const reporterName = document.querySelector('#reporter-name')?.value.trim()||'';
  const reporterDepartment = document.querySelector('#reporter-department')?.value.trim()||'';
  const reporterRegNo = document.querySelector('#reporter-regno')?.value.trim()||'';
  if(!detail || !loc || (!selectedAnonymous && (!reporterName || !reporterDepartment || !reporterRegNo))){ showToast('Please complete the required report details.'); return; }
  const n = {
    id: nextId(),
    cat: selectedCat,
    title: detail.length>48 ? detail.slice(0,48)+'…' : detail,
    loc,
    status: selectedPriority==='Urgent' ? 'Urgent' : 'In progress',
    time:'Just now',
    owner: selectedAnonymous ? 'CS' : (selectedCat==='Tech' ? 'IT' : 'RK'),
    mine: !selectedAnonymous,
    priority: selectedPriority,
    supporters:0,
    image: selectedEvidence,
    anonymous: selectedAnonymous,
    reporter: selectedAnonymous ? null : {name:reporterName, department:reporterDepartment, regNo:reporterRegNo}
  };
  reports.unshift(n);
  saveJSON('campusPulseReports', reports);
  addKarma('report');
  fireConfetti();
  const ticket=document.querySelector('#ticket-id'); if(ticket) ticket.textContent = n.id;
  const fs=document.querySelector('#form-state'); if(fs) fs.style.display='none';
  const ss=document.querySelector('#success-state'); if(ss) ss.classList.add('show');
  addFeed('fa-bolt', `New ${n.cat.toLowerCase()} report submitted: ${n.title}`, n.id);
  render();
};

function closeDetail(){ document.querySelector('#detail-layer').classList.remove('show'); document.body.classList.remove('modal-open'); }
const closeDetailBtn = document.querySelector('.close-detail');
if(closeDetailBtn) closeDetailBtn.onclick = closeDetail;
const detailLayer = document.querySelector('#detail-layer');
if(detailLayer) detailLayer.onclick = e => { if(e.target===detailLayer) closeDetail(); };

/* Navigation */
const titles = { dashboard:'Good morning, Shubh', map:'Campus map', reports:'My reports', explore:'Campus feed', insights:'Campus insights' };
document.querySelectorAll('.nav-link').forEach(a=>a.onclick=()=>{
  document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
  a.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  const target = document.querySelector('#'+a.dataset.view+'-view');
  if(target) target.classList.add('active-view');
  const title = document.querySelector('#page-title');
  if(a.dataset.view==='dashboard'){ updateHeader(); }
  else if(title){ title.innerHTML = titles[a.dataset.view] || 'CampusPulse'; }
  document.querySelector('.sidebar').classList.remove('open');
  if(a.dataset.view==='map') renderMap();
  if(a.dataset.view==='insights') renderAnalytics();
});

const seeAllBtn = document.querySelector('#see-all');
if(seeAllBtn) seeAllBtn.onclick = () => document.querySelector('[data-view="explore"]').click();
const mobileMenu = document.querySelector('.mobile-menu');
if(mobileMenu) mobileMenu.onclick = () => document.querySelector('.sidebar').classList.toggle('open');

/* Notifications */
function showToast(msg){
  const t = document.querySelector('#toast');
  if(!t) return;
  t.querySelector('span').textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

const noticePanel = document.querySelector('#notice-panel');
const notifBtn = document.querySelector('.icon-btn[aria-label="Notifications"]');
if(notifBtn) notifBtn.onclick = e => { e.stopPropagation(); noticePanel.classList.toggle('show'); };
const clearNotices = document.querySelector('#clear-notices');
if(clearNotices) clearNotices.onclick = () => {
  noticePanel.classList.remove('show');
  const dot = document.querySelector('.icon-btn[aria-label="Notifications"] b');
  if(dot) dot.style.display='none';
  showToast('Notifications marked as read.');
};
document.addEventListener('click', e=>{
  if(!noticePanel) return;
  if(!noticePanel.contains(e.target) && !e.target.closest('.icon-btn[aria-label="Notifications"]')) noticePanel.classList.remove('show');
});

/* Team toggle */
const teamToggle = document.querySelector('#team-toggle');
if(teamToggle) teamToggle.onclick = () => setTeamMode(!teamMode);

/* Theme toggle */
const themeToggle = document.querySelector('#theme-toggle');
if(themeToggle) themeToggle.onclick = toggleTheme;

/* Reset demo */
const resetBtn = document.querySelector('#reset-demo');
if(resetBtn) resetBtn.onclick = () => {
  localStorage.removeItem('campusPulseReports');
  localStorage.removeItem('cp_supportedIds');
  localStorage.removeItem('cp_karma');
  localStorage.removeItem('cp_theme');
  location.reload();
};

/* Keyboard shortcuts */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    closeModal(); closeDetail();
    const sb=document.querySelector('.sidebar'); if(sb) sb.classList.remove('open');
    if(noticePanel) noticePanel.classList.remove('show');
  }
  if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
  if(e.key==='n' || e.key==='N') openModal();
  if(e.key==='t' || e.key==='T') setTeamMode(!teamMode);
  if(e.key==='m' || e.key==='M') document.querySelector('[data-view="map"]')?.click();
  if(e.key==='/'){ e.preventDefault(); if(searchInput) searchInput.focus(); }
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openCmd(); }
});

/* Map */
function zoneCounts(){
  const counts={};
  reports.filter(r=>r.status!=='Resolved').forEach(r=>{
    const z=zoneOf(r.loc);
    counts[z]=(counts[z]||0)+1;
  });
  return counts;
}
function renderMap(){
  const map = document.querySelector('#campus-map');
  const panel = document.querySelector('#map-panel');
  if(!map || !panel) return;
  const counts = zoneCounts();
  const max = Math.max(1, ...Object.values(counts));
  map.querySelectorAll('.map-zone').forEach(zone=>{
    const z = zone.dataset.zone;
    const c = counts[z]||0;
    zone.classList.remove('active');
    if(c===0) zone.style.fill = '';
    else if(c<=max/3) zone.style.fill = '#fdcb6e';
    else if(c<=2*max/3) zone.style.fill = '#ffab9a';
    else zone.style.fill = '#ff7675';
    zone.onclick = () => {
      map.querySelectorAll('.map-zone').forEach(zo=>zo.classList.remove('active'));
      zone.classList.add('active');
      showZoneReports(z);
    };
  });
  if(!panel.dataset.populated) showZoneReports('All zones');
}
function showZoneReports(zone){
  const panel = document.querySelector('#map-panel');
  if(!panel) return;
  panel.dataset.populated = 'true';
  const list = zone==='All zones'?reports.filter(r=>r.status!=='Resolved'):reports.filter(r=>zoneOf(r.loc)===zone && r.status!=='Resolved');
  let html = `<h3>${zone}</h3><p>${list.length} open report${list.length!==1?'s':''}</p>`;
  if(list.length) html += `<div class="report-grid">${list.map((r,i)=>card(r,i)).join('')}</div>`;
  else html += `<div class="empty-state"><i class="fa-solid fa-map-location-dot"></i>No open reports here.</div>`;
  panel.innerHTML = html;
  panel.querySelectorAll('.report-card').forEach(el=>{
    el.onclick = () => tracker(reports.find(x=>x.id===el.dataset.id));
  });
}

/* Analytics */
function renderAnalytics(){
  renderCategoryChart();
  renderTrendChart();
  renderResolutionGauge();
}
function renderCategoryChart(){
  const el = document.querySelector('#category-chart');
  if(!el) return;
  const counts={};
  reports.forEach(r=>counts[r.cat]=(counts[r.cat]||0)+1);
  const cats = Object.keys(counts);
  const total = reports.length||1;
  const colors = {Facilities:'#6c5ce7',Safety:'#ff7675',Cleanliness:'#00b894',Tech:'#0984e3'};
  let start=0; let svg='';
  cats.forEach(cat=>{
    const pct=counts[cat]/total;
    const dash=pct*100;
    svg += `<circle cx="50" cy="50" r="40" fill="none" stroke="${colors[cat]||'#999'}" stroke-width="12" stroke-dasharray="${dash} ${100-dash}" stroke-dashoffset="-${start}" transform="rotate(-90 50 50)"/>`;
    start += dash;
  });
  let legend='';
  cats.forEach(cat=>legend+=`<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:#7b7f94"><span style="width:8px;height:8px;border-radius:50%;background:${colors[cat]}"></span>${cat} ${counts[cat]}</span>`);
  el.innerHTML = `<svg viewBox="0 0 100 100" style="width:120px;height:120px">${svg}</svg><div style="display:grid;gap:4px">${legend}</div>`;
}
function renderTrendChart(){
  const el = document.querySelector('#trend-chart');
  if(!el) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = [2,4,3,6,5,8,reports.length];
  const max = Math.max(...data,1);
  const bars = data.map((d,i)=>{
    const h=(d/max)*90;
    return `<rect x="${12+i*18}" y="${100-h}" width="12" height="${h}" rx="4" fill="url(#trendGrad)"/><text x="${18+i*18}" y="110" font-size="8" text-anchor="middle" fill="#7b7f94">${days[i]}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 140 120" style="width:100%;height:120px"><defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6c5ce7"/><stop offset="100%" stop-color="#a29bfe"/></linearGradient></defs>${bars}</svg>`;
}
function renderResolutionGauge(){
  const el = document.querySelector('#resolution-gauge');
  if(!el) return;
  const total = reports.length||1;
  const resolved = resolvedCount();
  const pct = Math.round((resolved/total)*100);
  const dash = pct*2.51;
  el.innerHTML = `<svg viewBox="0 0 120 70" style="width:160px;height:90px"><path d="M20 60 A40 40 0 0 1 100 60" fill="none" stroke="#e9eaf0" stroke-width="10" stroke-linecap="round"/><path d="M20 60 A40 40 0 0 1 100 60" fill="none" stroke="url(#gaugeGrad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} 251"/><defs><linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#00b894"/><stop offset="100%" stop-color="#55efc4"/></linearGradient></defs><text x="60" y="55" text-anchor="middle" font-size="22" font-weight="800" fill="var(--ink)">${pct}%</text><text x="60" y="70" text-anchor="middle" font-size="9" fill="#7b7f94">resolved</text></svg>`;
}
function renderLeaderboard(){
  const el = document.querySelector('#leaderboard');
  if(!el) return;
  const leaders = [
    {name:'Shubh Agarwal',pts:karma.points,me:true},
    {name:'Aisha M.',pts:145,me:false},
    {name:'Rahul K.',pts:132,me:false},
    {name:'Nisha K.',pts:98,me:false}
  ].sort((a,b)=>b.pts-a.pts);
  el.innerHTML = leaders.map((l,i)=>`<li><span class="mini-avatar">${l.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</span>${l.me?'<strong>You</strong>':l.name}<b>${l.pts} pts</b></li>`).join('');
}

/* Hotspot link */
const hotspotView = document.querySelector('#hotspot-view');
if(hotspotView) hotspotView.onclick = () => document.querySelector('[data-view="map"]')?.click();

/* Live simulation */
function liveTick(){
  if(document.hidden || teamMode || reports.length===0) return;
  const open = reports.filter(r=>r.status!=='Resolved');
  if(!open.length) return;
  const r = open[Math.floor(Math.random()*open.length)];
  if(Math.random()>0.6){
    r.supporters = (r.supporters||0)+1;
    saveJSON('campusPulseReports', reports);
    addFeed('fa-user-group', `Another student supported ${r.id}`, r.id);
    render();
  }
}
setInterval(liveTick, 22000);

/* Service Worker / PWA */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

/* Spotlight hover effect */
document.addEventListener('mousemove', e=>{
  const card = e.target.closest('.report-card,.metrics article,.chart-card,.feed-item,.health-card,.oracle-card,.welcome-card');
  if(!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--x', (e.clientX-rect.left)+'px');
  card.style.setProperty('--y', (e.clientY-rect.top)+'px');
});

/* Confetti */
function fireConfetti(){
  const canvas = document.querySelector('#confetti');
  if(!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  const pieces = Array.from({length:80},()=>({
    x:canvas.width/2,y:canvas.height/2,
    vx:(Math.random()-.5)*14,vy:(Math.random()-1)*12,
    size:Math.random()*6+3,
    color:['#6c5ce7','#00b894','#ff7675','#fdcb6e','#a29bfe'][Math.floor(Math.random()*5)],
    life:100
  }));
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=false;
    pieces.forEach(p=>{
      if(p.life<=0) return;
      alive=true;
      p.x+=p.vx;p.y+=p.vy;p.vy+=.4;p.life--;
      ctx.fillStyle=p.color;ctx.globalAlpha=p.life/100;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;
    if(alive) requestAnimationFrame(draw); else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

/* Chatbot */
const chatLauncher = document.querySelector('#chat-launcher');
const chatPanel = document.querySelector('#chat-panel');
const chatBody = document.querySelector('#chat-body');
const chatInput = document.querySelector('#chat-input');
const chatSend = document.querySelector('#chat-send');
const closeChat = document.querySelector('#close-chat');
function addChat(text, who='bot'){
  if(!chatBody) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${who}`;
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function botReply(text){ addChat(text,'bot'); }
function processChat(msg){
  const lower = msg.toLowerCase();
  addChat(msg,'user');
  if(lower.includes('report') || lower.includes('broken') || lower.includes('not working')){
    botReply('I can help with that. Click "Report an issue" and pick a category — or tell me the location and I’ll auto-detect it.');
    setTimeout(()=>{ openModal(); suggestCategory(msg); }, 900);
  } else if(lower.includes('status') || lower.includes('track')){
    botReply('Open any report card to see its live status timeline and assigned team.');
  } else if(lower.includes('anonymous') || lower.includes('bully') || lower.includes('ragging')){
    botReply('You can report anonymously. Choose Security and check "Report anonymously" — your identity stays hidden.');
  } else if(lower.includes('team') || lower.includes('facilities')){
    botReply('Click the user-gear icon to enable Team mode and update report statuses.');
  } else if(lower.includes('oracle') || lower.includes('predict')){
    botReply('Campus Oracle analyzes report clusters to predict what may break next. Check the dashboard or Insights page.');
  } else if(lower.includes('theme') || lower.includes('dark')){
    botReply('Use the moon/sun icon in the header to switch themes.');
  } else if(lower.includes('hello') || lower.includes('hi')){
    botReply('Hey! I’m Pulse, your campus assistant. Ask me about reporting, tracking, or predictions.');
  } else {
    botReply('I’m still learning. Try asking how to report an issue, track status, or use Team mode.');
  }
}
if(chatLauncher) chatLauncher.onclick = () => {
  chatPanel.classList.toggle('show');
  if(chatPanel.classList.contains('show') && chatBody.children.length===0){
    botReply('Hey! I’m Pulse. Ask me how to report an issue, check status, or use anonymous reporting.');
  }
};
if(closeChat) closeChat.onclick = () => chatPanel.classList.remove('show');
if(chatSend) chatSend.onclick = () => { const v=chatInput.value.trim(); if(v){ processChat(v); chatInput.value=''; } };
if(chatInput) chatInput.onkeydown = e => { if(e.key==='Enter') chatSend.click(); };

/* Command palette */
const cmdLayer = document.querySelector('#cmd-layer');
const cmdInput = document.querySelector('#cmd-input');
const cmdList = document.querySelector('#cmd-list');
const commands = [
  {name:'Go to Dashboard',icon:'fa-table-cells-large',run:()=>document.querySelector('[data-view="dashboard"]')?.click()},
  {name:'Open Campus Map',icon:'fa-map',run:()=>document.querySelector('[data-view="map"]')?.click()},
  {name:'View My Reports',icon:'fa-flag',run:()=>document.querySelector('[data-view="reports"]')?.click()},
  {name:'Open Campus Feed',icon:'fa-compass',run:()=>document.querySelector('[data-view="explore"]')?.click()},
  {name:'Open Insights',icon:'fa-chart-pie',run:()=>document.querySelector('[data-view="insights"]')?.click()},
  {name:'Report an issue',icon:'fa-plus',run:()=>openModal()},
  {name:'Toggle Team mode',icon:'fa-user-gear',run:()=>setTeamMode(!teamMode)},
  {name:'Toggle theme',icon:'fa-moon',run:()=>toggleTheme()},
  {name:'Reset demo data',icon:'fa-rotate-right',run:()=>document.querySelector('#reset-demo')?.click()}
];
let activeCmd = 0;
function renderCmd(filter=''){
  const f = filter.toLowerCase();
  const list = commands.filter(c=>c.name.toLowerCase().includes(f));
  cmdList.innerHTML = list.map((c,i)=>`<div class="cmd-item ${i===activeCmd?'active':''}" data-index="${i}"><i class="fa-solid ${c.icon}"></i><b>${c.name}</b><span>↵</span></div>`).join('');
  cmdList.querySelectorAll('.cmd-item').forEach(el=>{
    el.onclick = () => { executeCmd(parseInt(el.dataset.index)); };
  });
}
function executeCmd(idx){
  const f = cmdInput.value.toLowerCase();
  const list = commands.filter(c=>c.name.toLowerCase().includes(f));
  if(list[idx]){ list[idx].run(); closeCmd(); }
}
function openCmd(){ if(cmdLayer){ cmdLayer.classList.add('show'); cmdInput.value=''; activeCmd=0; renderCmd(); cmdInput.focus(); } }
function closeCmd(){ if(cmdLayer) cmdLayer.classList.remove('show'); }
if(cmdInput){
  cmdInput.oninput = () => { activeCmd=0; renderCmd(cmdInput.value); };
  cmdInput.onkeydown = e => {
    const f = cmdInput.value.toLowerCase();
    const list = commands.filter(c=>c.name.toLowerCase().includes(f));
    if(e.key==='ArrowDown'){ activeCmd=(activeCmd+1)%list.length; renderCmd(f); }
    if(e.key==='ArrowUp'){ activeCmd=(activeCmd-1+list.length)%list.length; renderCmd(f); }
    if(e.key==='Enter'){ executeCmd(activeCmd); }
    if(e.key==='Escape') closeCmd();
  };
}
if(cmdLayer) cmdLayer.onclick = e => { if(e.target===cmdLayer) closeCmd(); };

/* Voice input */
const micBtn = document.querySelector('#mic-btn');
if(micBtn){
  micBtn.onclick = () => {
    if(!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)){
      showToast('Voice input is not supported in this browser.'); return;
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Speech();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    micBtn.classList.add('listening');
    rec.start();
    rec.onresult = e => {
      const text = e.results[0][0].transcript;
      const details = document.querySelector('#details');
      if(details){ details.value = text; details.dispatchEvent(new Event('input')); }
      showToast('Voice captured');
    };
    rec.onerror = () => showToast('Voice input failed');
    rec.onend = () => micBtn.classList.remove('listening');
  };
}

/* Onboarding tour */
const tourOverlay = document.querySelector('#tour-overlay');
const tourTitle = document.querySelector('#tour-title');
const tourText = document.querySelector('#tour-text');
const tourNext = document.querySelector('#tour-next');
const tourSkip = document.querySelector('#tour-skip');
const tourSteps = [
  {title:'Welcome to CampusPulse',text:'Your smart campus issue hub — report, track, and predict campus problems.'},
  {title:'Make a report',text:'Click "Report an issue" to file facilities, safety, tech, or anonymous security reports.'},
  {title:'Campus Oracle',text:'See predictive alerts about what may break next, based on real report patterns.'},
  {title:'Team mode',text:'Facilities staff can toggle Team mode to update statuses directly.'},
  {title:'You are all set',text:'Use Cmd/Ctrl+K for quick commands, or ask Pulse the chatbot for help.'}
];
let tourIdx = 0;
function showTour(step){
  if(!tourTitle || !tourText) return;
  tourTitle.textContent = step.title;
  tourText.textContent = step.text;
  tourNext.innerHTML = tourIdx===tourSteps.length-1?'Done <i class="fa-solid fa-check"></i>':'Next <i class="fa-solid fa-arrow-right"></i>';
}
function nextTour(){
  tourIdx++;
  if(tourIdx>=tourSteps.length){ tourOverlay.classList.remove('show'); saveJSON('cp_tourDone', true); return; }
  showTour(tourSteps[tourIdx]);
}
if(tourOverlay && tourNext && !loadJSON('cp_tourDone', false)){
  setTimeout(()=>{ tourOverlay.classList.add('show'); showTour(tourSteps[0]); }, 1200);
  tourNext.onclick = nextTour;
  tourSkip.onclick = () => { tourOverlay.classList.remove('show'); saveJSON('cp_tourDone', true); };
}

/* Init */
applyTheme(theme);
updateHeader();
renderFeed();
render();
