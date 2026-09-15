/* CampusPulse — student issue hub + facilities team view */

const defaultReports = [
  { id:'CP-2041', cat:'Facilities', title:'Air conditioning not working', loc:'Science Block · Lab 204', status:'In progress', time:'18 min ago', owner:'RK', mine:true, priority:'Normal', supporters:2 },
  { id:'CP-2038', cat:'Safety', title:'Loose handrail near staircase', loc:'Main Building · East Wing', status:'Urgent', time:'42 min ago', owner:'AM', mine:false, priority:'Urgent', supporters:1 },
  { id:'CP-2035', cat:'Cleanliness', title:'Bins need clearing after lunch', loc:'Central Cafeteria', status:'Resolved', time:'1 hr ago', owner:'NK', mine:false, priority:'Normal', supporters:0 },
  { id:'CP-2032', cat:'Tech', title:'Wi-Fi drops in study zone', loc:'Library · Ground Floor', status:'In progress', time:'2 hrs ago', owner:'IT', mine:true, priority:'Normal', supporters:3 },
  { id:'CP-2029', cat:'Facilities', title:'Projector cable is damaged', loc:'Lecture Hall B-12', status:'In progress', time:'3 hrs ago', owner:'RK', mine:false, priority:'Normal', supporters:0 },
  { id:'CP-2023', cat:'Safety', title:'Parking lights are off', loc:'North Parking', status:'Resolved', time:'Yesterday', owner:'AM', mine:false, priority:'Normal', supporters:0 }
];

const CAT_KEYWORDS = {
  Facilities: ['ac','air','projector','cable','chair','desk','light','fan','door','window','leak','floor','bench','table','tap','pipe'],
  Safety:     ['handrail','stair','parking light','unsafe','fire','emergency','broken glass','slip','fall','hazard','smoke','alarm','injury'],
  Cleanliness:['bin','trash','garbage','clean','spill','washroom','toilet','smell','dust','mop','wet','dirty'],
  Tech:       ['wifi','wi-fi','internet','laptop','printer','network','login','software','app','screen','projector tech','server','mouse','keyboard','projector not']
};

function loadJSON(key, fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback }catch{ return fallback } }
function saveJSON(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)) }catch{} }

let savedReports = loadJSON('campusPulseReports', null);
let reports = Array.isArray(savedReports) ? savedReports : defaultReports;
let supportedIds = new Set(loadJSON('cp_supportedIds', []));

let activeFilter='all', selectedCat='Facilities', selectedPriority='Normal';
let teamMode = false, categoryLocked = false;

const grid = document.querySelector('#report-grid');
const myGrid = document.querySelector('#my-report-grid');
const feedEl = document.querySelector('#feed');

let feedItems = [
  {icon:'fa-circle-check', text:'Facilities team resolved the cafeteria bin request', time:'12 min ago'},
  {icon:'fa-wrench', text:'Maintenance started work in Lab 204', time:'24 min ago'},
  {icon:'fa-user-group', text:'Three students supported the Wi-Fi study-zone report', time:'1 hr ago'},
  {icon:'fa-bolt', text:'New hotspot identified: Science Block', time:'2 hrs ago'}
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
  reports.forEach(r=>{
    const place = r.loc.split('·')[0].trim();
    counts[place] = (counts[place]||0)+1;
  });
  let topPlace='', topCount=0;
  Object.entries(counts).forEach(([p,c])=>{ if(c>topCount){topCount=c; topPlace=p;} });
  const nameEl = document.querySelector('#hotspot-name');
  const metaEl = document.querySelector('#hotspot-meta');
  if(nameEl && metaEl && topCount>1){
    nameEl.textContent = `${topPlace} is this week’s hotspot`;
    metaEl.textContent = `${topCount} reports · Facilities team assigned`;
  }
}

/* Cards */
function card(r,i){
  const supporterBadge = (r.supporters||0)>0 ? `<span class="supporter-badge"><i class="fa-solid fa-user-plus"></i> ${r.supporters}</span>` : '';
  return `<article class="report-card" data-id="${r.id}" style="animation-delay:${i*.04}s">
    <div class="card-top"><span class="tag ${r.cat.toLowerCase()}">${r.cat.toUpperCase()}</span><span class="status ${statusClass(r.status)}">${r.status}</span>${supporterBadge}</div>
    <h3>${r.title}</h3>
    <p class="loc"><i class="fa-solid fa-location-dot"></i>${r.loc}</p>
    <div class="card-bottom"><span>${r.time}</span><span class="assigned"><span class="avatar">${r.owner}</span>Assigned</span></div>
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
  </div></div>` : '';

  document.querySelector('#detail-content').innerHTML = `
    <div class="detail-head"><h2>${r.title}</h2><p><i class="fa-solid fa-location-dot"></i> ${r.loc} &nbsp;·&nbsp; ${r.id}</p></div>
    <div class="tracker-status"><span>LIVE STATUS</span><strong class="${statusColorClass(r.status)}">${r.status}</strong></div>
    <div class="timeline">
      <div class="timeline-item done"><b>Report received</b><p>${r.time} · Your voice is on the map.</p></div>
      <div class="timeline-item ${progress||resolved?'done':'current'}"><b>Assigned to Campus Operations</b><p>Facilities coordinator has been notified.</p></div>
      <div class="timeline-item ${resolved?'done':progress?'current':''}"><b>${resolved?'Issue resolved':'Work in progress'}</b><p>${resolved?'The team marked this report complete.':"You’ll see the next update here."}</p></div>
    </div>
    <div class="owner-row"><span class="avatar">${r.owner}</span><span><strong>Campus Operations</strong>Accountable team owner</span></div>
    <button class="support-btn ${mySupport?'active':''}" id="support-btn" data-id="${r.id}">
      <i class="fa-solid fa-user-plus"></i> ${mySupport?'You support this report':"I’m affected too"} <span>${(r.supporters||0)>0?`· ${r.supporters} supporter${(r.supporters||0)>1?'s':''}`:''}</span>
    </button>
    ${teamActions}`;

  document.querySelector('#detail-layer').classList.add('show');

  document.querySelector('#support-btn').onclick = () => toggleSupport(r.id);

  if(teamMode){
    document.querySelectorAll('.team-actions button').forEach(btn=>{
      btn.onclick = () => changeStatus(r.id, btn.dataset.status);
    });
  }
}

function toggleSupport(id){
  const r = reports.find(x=>x.id===id);
  if(!r) return;
  const adding = !supportedIds.has(id);
  if(adding){ supportedIds.add(id); r.supporters = (r.supporters||0)+1; showToast('Support added — this helps prioritize the fix.'); }
  else { supportedIds.delete(id); r.supporters = Math.max(0,(r.supporters||0)-1); showToast('Support removed.'); }
  saveJSON('cp_supportedIds', [...supportedIds]);
  saveJSON('campusPulseReports', reports);
  tracker(r);
  render();
}

function changeStatus(id, newStatus){
  const r = reports.find(x=>x.id===id);
  if(!r || r.status===newStatus) return;
  const oldStatus = r.status;
  r.status = newStatus;
  r.priority = newStatus==='Urgent'?'Urgent':r.priority;
  saveJSON('campusPulseReports', reports);
  showToast(`Status updated to ${newStatus}`);
  addFeed('fa-circle-check', `Campus Operations moved ${r.id} from ${oldStatus} to ${newStatus}`);
  tracker(r);
  render();
}

/* Rendering */
function render(){
  const query = document.querySelector('#search').value.toLowerCase();
  let list = reports.filter(r=>{
    const matchesFilter = activeFilter==='all' ||
      (activeFilter==='urgent' ? r.status==='Urgent' :
       activeFilter==='progress' ? r.status==='In progress' :
       r.status==='Resolved');
    const matchesSearch = (r.title+' '+r.loc+' '+r.cat).toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });
  grid.innerHTML = list.length
    ? list.map(card).join('')
    : '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i>No matching reports yet.<br>Try another filter or make the first report.</div>';
  myGrid.innerHTML = reports.filter(r=>r.mine).map(card).join('') ||
    '<div class="empty-state"><i class="fa-regular fa-flag"></i>No reports yet — your voice starts the change.</div>';

  document.querySelector('#open-count').textContent = Math.max(0, openCount());
  setHealth(); setNavCount(); setResolvedCount(); setHotspot();
  document.querySelectorAll('.report-card').forEach(el=>{
    el.onclick = () => tracker(reports.find(x=>x.id===el.dataset.id));
  });
}

/* Feed */
function renderFeed(){
  feedEl.innerHTML = feedItems.map(x=>`<article class="feed-item"><span class="feed-icon"><i class="fa-solid ${x.icon}"></i></span><p><strong>${x.text}</strong><br>Making campus better, together.</p><time>${x.time}</time></article>`).join('');
}
function addFeed(icon,text){
  feedItems.unshift({icon,text,time:'Just now'});
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
function openModal(){ modal.classList.add('show'); categoryLocked=false; document.querySelector('#auto-detect').textContent=''; }
function closeModal(){
  modal.classList.remove('show');
  setTimeout(()=>{
    document.querySelector('#form-state').style.display='block';
    document.querySelector('#success-state').classList.remove('show');
    document.querySelector('#report-form').reset();
    document.querySelector('#char-count').textContent='0';
    document.querySelector('#auto-detect').textContent='';
    document.querySelectorAll('.category').forEach(b=>b.classList.toggle('active', b.dataset.category==='Facilities'));
    selectedCat='Facilities'; selectedPriority='Normal';
    document.querySelectorAll('.priority').forEach(b=>b.classList.toggle('active', b.dataset.priority==='Normal'));
    categoryLocked=false;
  },200);
}

/* Team mode */
function setTeamMode(on){
  teamMode = on;
  const btn = document.querySelector('#team-toggle');
  if(btn) btn.classList.toggle('active', teamMode);
  if(teamMode) showToast('Team view enabled — you can update report statuses');
}

/* Event bindings */
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  activeFilter=b.dataset.filter;
  render();
});

document.querySelector('#search').oninput = render;

document.querySelectorAll('.report-trigger').forEach(b=>b.onclick=openModal);
document.querySelector('.close-modal').onclick = closeModal;
document.querySelector('.close-success').onclick = closeModal;
modal.onclick = e => { if(e.target===modal) closeModal(); };

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

document.querySelector('#details').oninput = e => {
  document.querySelector('#char-count').textContent = e.target.value.length;
  suggestCategory(e.target.value);
};

document.querySelector('#report-form').onsubmit = e => {
  e.preventDefault();
  const detail = document.querySelector('#details').value.trim();
  const loc = document.querySelector('#location').value.trim();
  if(!detail || !loc) return;
  const n = {
    id: nextId(),
    cat: selectedCat,
    title: detail.length>48 ? detail.slice(0,48)+'…' : detail,
    loc,
    status: selectedPriority==='Urgent' ? 'Urgent' : 'In progress',
    time:'Just now',
    owner: selectedCat==='Tech' ? 'IT' : 'RK',
    mine:true,
    priority: selectedPriority,
    supporters:0
  };
  reports.unshift(n);
  saveJSON('campusPulseReports', reports);
  document.querySelector('#ticket-id').textContent = n.id;
  document.querySelector('#form-state').style.display='none';
  document.querySelector('#success-state').classList.add('show');
  addFeed('fa-bolt', `New ${n.cat.toLowerCase()} report submitted: ${n.title}`);
  render();
};

document.querySelector('.close-detail').onclick = () => document.querySelector('#detail-layer').classList.remove('show');
document.querySelector('#detail-layer').onclick = e => {
  if(e.target===document.querySelector('#detail-layer')) document.querySelector('#detail-layer').classList.remove('show');
};

/* Navigation */
const titles = { dashboard:'Good morning, Shubh', reports:'My reports', explore:'Campus feed', insights:'Campus insights' };
document.querySelectorAll('.nav-link').forEach(a=>a.onclick=()=>{
  document.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active'));
  a.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
  document.querySelector('#'+a.dataset.view+'-view').classList.add('active-view');
  const title = document.querySelector('#page-title');
  if(a.dataset.view==='dashboard'){ updateHeader(); }
  else if(title){ title.innerHTML = titles[a.dataset.view]; }
  document.querySelector('.sidebar').classList.remove('open');
});

document.querySelector('#see-all').onclick = () => document.querySelector('[data-view="explore"]').click();
document.querySelector('.mobile-menu').onclick = () => document.querySelector('.sidebar').classList.toggle('open');

/* Notifications */
function showToast(msg){
  const t = document.querySelector('#toast');
  t.querySelector('span').textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2600);
}

const noticePanel = document.querySelector('#notice-panel');
document.querySelector('.icon-btn[aria-label="Notifications"]').onclick = e => {
  e.stopPropagation();
  noticePanel.classList.toggle('show');
};
document.querySelector('#clear-notices').onclick = () => {
  noticePanel.classList.remove('show');
  document.querySelector('.icon-btn[aria-label="Notifications"] b').style.display='none';
  showToast('Notifications marked as read.');
};
document.addEventListener('click', e=>{
  if(!noticePanel.contains(e.target) && !e.target.closest('.icon-btn[aria-label="Notifications"]')) noticePanel.classList.remove('show');
});

/* Team toggle */
document.querySelector('#team-toggle').onclick = () => setTeamMode(!teamMode);

/* Reset demo */
document.querySelector('#reset-demo').onclick = () => {
  localStorage.removeItem('campusPulseReports');
  localStorage.removeItem('cp_supportedIds');
  location.reload();
};

/* Keyboard shortcuts */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    closeModal();
    document.querySelector('#detail-layer').classList.remove('show');
    document.querySelector('.sidebar').classList.remove('open');
    noticePanel.classList.remove('show');
  }
  if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
  if(e.key==='n' || e.key==='N') openModal();
  if(e.key==='t' || e.key==='T') setTeamMode(!teamMode);
  if(e.key==='/'){ e.preventDefault(); document.querySelector('#search').focus(); }
});

/* Init */
updateHeader();
renderFeed();
render();
