const LS_KEYS = { BOOKINGS:'tres_marias_bookings', OFFERS:'tres_marias_offers', AUTH:'tres_marias_auth', LAST_PAGE:'tres_marias_last_page' };
function lsGet(key, fallback=null){ try{ const r=localStorage.getItem(key); return r!==null?JSON.parse(r):fallback; }catch(e){ return fallback; } }
function lsSet(key,value){ try{ localStorage.setItem(key,JSON.stringify(value)); return true; }catch(e){ showToast('⚠️ Storage full.', 4000); return false; } }
function lsDel(key){ try{ localStorage.removeItem(key); }catch(e){} }

let toastTimer=null;
function showToast(msg,duration=2800){
  const t=document.getElementById('toast');
  document.getElementById('toastMsg').textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),duration);
}

const STAFF_KEY="admin123";
let isAuthenticated=lsGet(LS_KEYS.AUTH,false);
window.addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.shiftKey&&(e.key==='A'||e.key==='a')){
    e.preventDefault();
    if(!isAuthenticated){
      const a=prompt("Enter Staff Access Key:");
      if(a===STAFF_KEY){ isAuthenticated=true; lsSet(LS_KEYS.AUTH,true); showPage('admin'); showToast('✅ Logged in as Staff'); }
      else if(a!==null) alert("Access Denied.");
    } else { showPage('admin'); }
  }
});
function logoutStaff(){ isAuthenticated=false; lsDel(LS_KEYS.AUTH); lsDel(LS_KEYS.LAST_PAGE); showPage('home'); showToast('👋 Logged out.'); }

const PHOTOS = {
  cabins:   "A-Frame Cabins.jpg",
  pool:     "Pool.jpg",
  interior: "Interior.jpg",
  amenities:"Amenities.jpg",
  eventhall:"Event Hall.jpg",
};
const CAT_PHOTOS = { cabin: PHOTOS.cabins, event: PHOTOS.eventhall, combo: PHOTOS.eventhall, day: PHOTOS.pool };
const CAT_LABELS = { cabin:'Cabin Stay', event:'Event Hall', combo:'Cabin + Event Hall', day:'Daytime' };

const DEFAULT_PACKAGES = [
  { id:'cabin-weekday',  icon:'🏠', name:'A-Frame Cabin Stay – Weekday',          cat:'cabin', rate:7000,  duration:'22 hrs',   notes:'Mon–Thu · Good for 8 guests' },
  { id:'cabin-weekend',  icon:'🌙', name:'A-Frame Cabin Stay – Weekend/Holiday',   cat:'cabin', rate:7500,  duration:'22 hrs',   notes:'Fri–Sun & Holidays · +₱300/head beyond 16 pax' },
  { id:'combo-2cabin',   icon:'🎪', name:'Cabin + Event Hall (2 Cabins)',          cat:'combo', rate:21000, duration:'22 hrs',   notes:'61–100 pax · 2 A-Frame cabins' },
  { id:'combo-1cabin',   icon:'🏛️', name:'Cabin + Event Hall (1 Cabin)',           cat:'combo', rate:19000, duration:'22 hrs',   notes:'61–100 pax · 1 A-Frame cabin' },
  { id:'day-2cabin',     icon:'☀️', name:'Daytime Package (2 Cabins)',             cat:'day',   rate:17000, duration:'8AM–6PM',  notes:'61–100 pax · 2 A-Frame cabins' },
  { id:'day-1cabin',     icon:'🌤️', name:'Daytime Package (1 Cabin)',              cat:'day',   rate:16000, duration:'8AM–6PM',  notes:'61–100 pax · 1 A-Frame cabin' },
  { id:'hall-morning',   icon:'🏛️', name:'Event Hall Only – Morning Slot',         cat:'event', rate:15000, duration:'8AM–5PM',  notes:'61–100 pax · No cabin included' },
  { id:'hall-afternoon', icon:'🌆', name:'Event Hall Only – Afternoon Slot',       cat:'event', rate:17000, duration:'11AM–8PM', notes:'61–100 pax · No cabin included' },
];

let bookings = lsGet(LS_KEYS.BOOKINGS, []);
let offers   = lsGet(LS_KEYS.OFFERS,   null);

if (!offers) {
  offers = DEFAULT_PACKAGES.map(p => ({...p}));
} else {
  offers = offers.map((o, i) => ({
    ...o,
    id: o.id || ('pkg-' + Date.now() + '-' + i)
  }));
}
lsSet(LS_KEYS.OFFERS, offers);

let editOfferIdx = null;
function saveBookings(){ lsSet(LS_KEYS.BOOKINGS, bookings); }
function saveOffers(){   lsSet(LS_KEYS.OFFERS, offers); }

function getPkgById(id){ return offers.find(o => o.id === id) || null; }
function getPkgRate(id){ const o=getPkgById(id); return o ? Number(o.rate) : 0; }
function getPkgName(id){ const o=getPkgById(id); return o ? o.name : id; }

const BLOCK_GROUPS = {
  'cabin-weekday':  ['cabin-weekday'],
  'cabin-weekend':  ['cabin-weekend'],
  'combo-2cabin':   ['combo-2cabin'],
  'combo-1cabin':   ['combo-1cabin'],
  'day-2cabin':     ['day-2cabin'],
  'day-1cabin':     ['day-1cabin'],
  'hall-morning':   ['hall-morning'],
  'hall-afternoon': ['hall-afternoon'],
};

function getBlockedDatesForPkg(pkgId){
  const blocked = new Set();
  const relatedKeys = BLOCK_GROUPS[pkgId] || [pkgId];
  bookings.forEach(b => {
    if(b.status === 'cancelled') return;
    const bKey = b.pkgKey || '';
    if(relatedKeys.includes(bKey)) blocked.add(b.date);
  });
  return blocked;
}
function isDateReserved(pkgId, date){ return pkgId && date ? getBlockedDatesForPkg(pkgId).has(date) : false; }

function renderPackagesGrid(){
  const grid = document.getElementById('packagesGrid');
  if(!grid) return;

  if(!offers.length){
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:4rem 2rem;"><div class="empty-icon">📦</div><p>No packages added yet. Add some in Admin → Packages.</p></div>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});

  grid.innerHTML = offers.map(o => {
    const photo = CAT_PHOTOS[o.cat] || '';
    const photoHtml = photo
      ? `<img class="pkg-card-img" src="${photo}" alt="${o.name}" />`
      : `<div class="pkg-card-img-placeholder">${o.icon}</div>`;

    const blocked    = getBlockedDatesForPkg(o.id);
    const upcoming   = [...blocked].filter(d => d >= today).sort();
    const isReserved = upcoming.length > 0;

    const reservedBannerHtml = isReserved
      ? `<div class="reserved-date-banner">🚫 Reserved: <span class="reserved-dates-list">${upcoming.slice(0,5).map(fmt).join(' · ')}${upcoming.length>5?' +'+(upcoming.length-5)+' more':''}</span></div>`
      : '';

    const escapedId = o.id.replace(/'/g,"\\'");
    return `
    <div class="pkg-card${isReserved?' is-reserved':''}" data-cat="${o.cat}" data-pkg-id="${o.id}" style="position:relative;overflow:hidden;">
      ${photoHtml}
      <div class="pkg-card-body">
        <span class="pkg-badge ${o.cat}">${CAT_LABELS[o.cat]||o.cat}</span>
        <div class="pkg-name">${o.name}<br/><small style="font-family:'DM Sans',sans-serif;font-size:0.8rem;color:var(--text-light);">${o.duration}</small></div>
        <div class="pkg-price">₱${Number(o.rate).toLocaleString()} <span>/ ${o.duration}</span></div>
        <div class="pkg-detail">📝 ${o.notes}</div>
        ${reservedBannerHtml}
        <div class="pkg-actions">
          <button class="pkg-see-details" onclick="openModal('${escapedId}')">See Details</button>
          <button class="pkg-cal" onclick="openCalendar('${escapedId}',event)">📅 Availability</button>
          <button class="pkg-book" onclick="showPage('booking')">Book Now</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const activeFilter = document.querySelector('.filter-btn.active');
  if(activeFilter){
    const cat = activeFilter.getAttribute('onclick').match(/'([^']+)'\)/)?.[1] || 'all';
    if(cat !== 'all'){
      document.querySelectorAll('#packagesGrid .pkg-card').forEach(c => {
        c.style.display = (c.dataset.cat === cat) ? '' : 'none';
      });
    }
  }
}

function renderBookingDropdown(){
  const sel = document.getElementById('f_package');
  if(!sel) return;
  const current = sel.value;

  const groups = {};
  offers.forEach(o => {
    if(!groups[o.cat]) groups[o.cat] = [];
    groups[o.cat].push(o);
  });

  const catOrder = ['cabin','combo','day','event'];
  const catDisplayNames = { cabin:'Cabin Stay', combo:'Cabin + Event Hall', day:'Daytime Package', event:'Event Hall Only' };

  sel.innerHTML = '<option value="">— Select a Package —</option>';
  catOrder.forEach(cat => {
    if(!groups[cat] || !groups[cat].length) return;
    const og = document.createElement('optgroup');
    og.label = catDisplayNames[cat] || cat;
    groups[cat].forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = `${o.name} (₱${Number(o.rate).toLocaleString()})`;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  if(current && getPkgById(current)) sel.value = current;
}

function openModal(id){
  const o = getPkgById(id);
  if(!o) return;

  const photo = CAT_PHOTOS[o.cat] || '';
  const heroHtml = photo
    ? `<div class="modal-photo-hero"><img src="${photo}" alt="${o.name}" /></div>`
    : `<div class="modal-photo-hero fallback">${o.icon}</div>`;

  const blocked  = getBlockedDatesForPkg(id);
  const today    = new Date().toISOString().split('T')[0];
  const upcoming = [...blocked].filter(d => d >= today).sort();
  const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'});

  const reservedSection = upcoming.length > 0
    ? `<p class="modal-section-lbl" style="color:var(--reserved);">🚫 Reserved Dates (Unavailable)</p>
       <div class="modal-reserved-box">
         <p style="font-size:0.8rem;color:#9b1c1c;margin-bottom:0.5rem;">The following dates are already booked:</p>
         <div class="modal-reserved-dates">${upcoming.map(d=>`<span class="modal-reserved-date">${fmt(d)}</span>`).join('')}</div>
       </div>` : '';

  const features = o.notes.split(/[·,]/).map(s=>s.trim()).filter(Boolean)
    .map(f=>`<div class="modal-feature-item">${f}</div>`).join('');

  document.getElementById('pkgModalBox').innerHTML = `
    ${heroHtml}
    <div class="modal-inner">
      <div class="modal-header-row">
        <div>
          <span class="pkg-badge ${o.cat}" style="margin-bottom:0.5rem;">${CAT_LABELS[o.cat]||o.cat}</span>
          <div class="modal-pkg-title">${o.name}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;flex-shrink:0;margin-left:1rem;">
          <button class="modal-close-btn" onclick="closeModal()">✕</button>
          <div class="modal-pkg-price">₱${Number(o.rate).toLocaleString()}<br/><small>${o.duration}</small></div>
        </div>
      </div>
      <p class="modal-desc">${o.notes}</p>
      ${reservedSection}
      <p class="modal-section-lbl">Package Details</p>
      <div class="modal-features">${features}</div>
      <p class="modal-section-lbl">Pricing</p>
      <div class="modal-rate-box">
        <div class="modal-rate-row"><span>${o.name}</span><span>₱${Number(o.rate).toLocaleString()}</span></div>
        <div class="modal-rate-row"><span>Duration</span><span>${o.duration}</span></div>
      </div>
      <div class="modal-cta-row">
        <button class="modal-reserve-btn" onclick="closeModal();showPage('booking');">Reserve This Package</button>
      </div>
    </div>`;
  document.getElementById('pkgModal').classList.add('open');
}
function closeModal(){ document.getElementById('pkgModal').classList.remove('open'); }
function closePkgModal(e){ if(e.target.id==='pkgModal') closeModal(); }

function showPage(id){
  if(id==='admin'&&!isAuthenticated){ showPage('home'); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const tabs=['home','packages','booking'];
  const idx=tabs.indexOf(id);
  if(idx>=0) document.querySelectorAll('.nav-tab')[idx].classList.add('active');
  if(id==='admin'){ renderOffersTable(); renderStats(); }
  if(id==='packages'){ renderPackagesGrid(); }
  if(id==='booking'){ renderBookingDropdown(); }
  if(id!=='admin') lsSet(LS_KEYS.LAST_PAGE,id);
  window.scrollTo(0,0);
}

function switchAdmin(el,panel){
  document.querySelectorAll('.admin-nav-item').forEach(i=>i.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('admin-'+panel).classList.add('active');
  if(panel==='offers')    renderOffersTable();
  if(panel==='bookings')  renderBookingsTable(bookings);
  if(panel==='guests')    renderGuestsTable();
  if(panel==='dashboard') renderStats();
  if(panel==='reserved')  renderReservedDatesPanel();
}

function filterPkgs(btn,cat){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#packagesGrid .pkg-card').forEach(c=>{
    c.style.display=(cat==='all'||c.dataset.cat===cat)?'':'none';
  });
}

function updateSummary(){
  const pkg    = document.getElementById('f_package').value;
  const guests = parseInt(document.getElementById('f_guests').value)||0;
  const date   = document.getElementById('f_date').value;
  const name   = document.getElementById('f_name').value;
  const summary   = document.getElementById('bookingSummary');
  const rows      = document.getElementById('summaryRows');
  const warning   = document.getElementById('reservedWarning');
  const submitBtn = document.getElementById('submitBtn');
  const availBar  = document.getElementById('availabilityBar');
  const availGrid = document.getElementById('availDatesGrid');

  if(pkg){
    const blocked  = getBlockedDatesForPkg(pkg);
    const today    = new Date().toISOString().split('T')[0];
    const upcoming = [...blocked].filter(d=>d>=today).sort();
    const fmtS     = d=>new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'});
    if(upcoming.length>0){
      availGrid.innerHTML = upcoming.map(d=>`<span class="avail-date-chip taken">🚫 ${fmtS(d)}</span>`).join('');
      availBar.classList.add('show');
    } else {
      availBar.classList.remove('show');
    }
  } else {
    availBar.classList.remove('show');
  }

  if(pkg&&date){
    if(isDateReserved(pkg,date)){
      const fmtL = d=>new Date(d+'T00:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
      const blocked  = getBlockedDatesForPkg(pkg);
      const today    = new Date().toISOString().split('T')[0];
      const others   = [...blocked].filter(d=>d>=today&&d!==date).sort().slice(0,3);
      document.getElementById('reservedWarningMsg').textContent =
        `"${getPkgName(pkg)}" is already reserved on ${fmtL(date)}. Please choose a different date.`;
      document.getElementById('reservedSuggestDates').textContent =
        others.length>0 ? `Other reserved dates to avoid: ${others.map(fmtL).join(', ')}` : '';
      warning.classList.add('show');
      submitBtn.disabled=true;
      submitBtn.textContent='🚫 Date Unavailable – Choose Another Date';
    } else {
      warning.classList.remove('show');
      submitBtn.disabled=false;
      submitBtn.textContent='✉️ Send Booking Request';
    }
  } else {
    warning.classList.remove('show');
    submitBtn.disabled=false;
    submitBtn.textContent='✉️ Send Booking Request';
  }

  if(!pkg){ summary.style.display='none'; return; }
  const baseRate    = getPkgRate(pkg);
  const extraCharge = (pkg==='cabin-weekday'||pkg==='cabin-weekend')&&guests>16?(guests-16)*300:0;
  const total = baseRate+extraCharge;
  rows.innerHTML = `
    <div class="summary-row"><span>Guest</span><span>${name||'—'}</span></div>
    <div class="summary-row"><span>Package</span><span>${getPkgName(pkg)}</span></div>
    <div class="summary-row"><span>Date</span><span>${date?new Date(date+'T00:00:00').toLocaleDateString('en-PH',{weekday:'short',year:'numeric',month:'long',day:'numeric'}):'—'}</span></div>
    <div class="summary-row"><span>Guests</span><span>${guests||'—'}</span></div>
    <div class="summary-row"><span>Base Rate</span><span>₱${baseRate.toLocaleString()}</span></div>
    ${extraCharge?`<div class="summary-row"><span>Extra guests (+₱300 × ${guests-16})</span><span>+₱${extraCharge.toLocaleString()}</span></div>`:''}
    <div class="summary-row"><span>Estimated Total</span><span>₱${total.toLocaleString()}</span></div>`;
  summary.style.display='block';
}

function submitBooking(){
  const name   = document.getElementById('f_name').value.trim();
  const phone  = document.getElementById('f_phone').value.trim();
  const email  = document.getElementById('f_email').value.trim();
  const guests = parseInt(document.getElementById('f_guests').value)||0;
  const date   = document.getElementById('f_date').value;
  const pkg    = document.getElementById('f_package').value;
  const notes  = document.getElementById('f_notes').value.trim();
  if(!name||!phone||!date||!pkg||!guests){ alert('⚠️ Please fill in all required fields: Name, Phone, Date, Package, and Number of Guests.'); return; }
  if(phone.length !== 11){ alert('⚠️ Contact number must be exactly 11 digits (e.g. 09XXXXXXXXX).'); return; }
  if(isDateReserved(pkg,date)){ alert(`🚫 Sorry, "${getPkgName(pkg)}" is already reserved on that date. Please pick a different date.`); return; }
  const baseRate = getPkgRate(pkg);
  const extra    = (pkg==='cabin-weekday'||pkg==='cabin-weekend')&&guests>16?(guests-16)*300:0;
  const newBooking = { id:'BK-'+Date.now(), name, phone, email, guests, date, pkg:getPkgName(pkg), pkgKey:pkg, notes, status:'pending', total:baseRate+extra, ts:new Date().toISOString() };
  bookings.unshift(newBooking);
  saveBookings();
  ['f_name','f_phone','f_email','f_guests','f_date','f_notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f_package').value='';
  document.getElementById('bookingSummary').style.display='none';
  document.getElementById('reservedWarning').classList.remove('show');
  document.getElementById('availabilityBar').classList.remove('show');
  document.getElementById('submitBtn').disabled=false;
  document.getElementById('submitBtn').textContent='✉️ Send Booking Request';
  showToast(`✅ Booking request saved! Thank you, ${name}. Date is now reserved.`);
  renderStats();
  renderPackagesGrid();
}

function renderStats(){
  const total     = bookings.length;
  const confirmed = bookings.filter(b=>b.status==='confirmed').length;
  const pending   = bookings.filter(b=>b.status==='pending').length;
  const revenue   = bookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+b.total,0);
  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-confirmed').textContent = confirmed;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-revenue').textContent   = '₱'+revenue.toLocaleString();
  renderBookingsTable(bookings.slice(0,5),'dashboardTableBody',true);
}
function statusBadge(s){ const m={confirmed:'status-confirmed',pending:'status-pending',cancelled:'status-cancelled'}; return `<span class="status-badge ${m[s]||''}">${s}</span>`; }
function renderBookingsTable(data,tbodyId='bookingsTableBody',short=false){
  const tb=document.getElementById(tbodyId); if(!tb) return;
  if(!data.length){ tb.innerHTML=`<tr><td colspan="${short?6:7}"><div class="empty-state"><div class="empty-icon">📭</div><p>No bookings yet.</p></div></td></tr>`; return; }
  tb.innerHTML=data.map(b=>{
    const idx=bookings.indexOf(b);
    return `<tr>
      <td><strong>${b.name}</strong><br/><span style="font-size:0.75rem;color:var(--text-light)">${b.id||''}</span></td>
      ${!short?`<td>${b.phone}<br/><span style="font-size:0.78rem;color:var(--text-light)">${b.email||'—'}</span></td>`:''}
      <td>${b.pkg}</td><td>${b.date}</td><td>${b.guests}</td>
      <td>${statusBadge(b.status)}</td>
      <td>
        ${b.status==='pending'?`<button class="action-btn" onclick="setStatus(${idx},'confirmed')">Confirm</button>`:''}
        ${b.status!=='cancelled'?`<button class="action-btn danger" onclick="setStatus(${idx},'cancelled')">Cancel</button>`:''}
        <button class="action-btn danger" onclick="deleteBooking(${idx})" style="margin-top:0.2rem;">Delete</button>
      </td></tr>`;
  }).join('');
}

function renderReservedDatesPanel(){
  const panel=document.getElementById('reservedDatesPanel'); if(!panel) return;
  const grouped={}, today=new Date().toISOString().split('T')[0];
  bookings.forEach(b=>{
    if(b.status==='cancelled') return;
    const key=b.pkgKey||''; const name=getPkgName(key)||b.pkg;
    if(!grouped[key]) grouped[key]={name,dates:[]};
    if(!grouped[key].dates.includes(b.date)) grouped[key].dates.push(b.date);
  });
  const entries=Object.entries(grouped);
  if(!entries.length){ panel.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><p>No reserved dates yet.</p></div>'; return; }
  const fmt=d=>new Date(d+'T00:00:00').toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  panel.innerHTML=`
    <h3>🚫 All Reserved Dates by Package</h3>
    <p style="font-size:0.82rem;color:var(--text-light);margin-bottom:1.2rem;">Dates blocked as soon as a booking is submitted. Cancel or delete a booking to free a date.</p>
    ${entries.map(([pkgKey,grp])=>{
      const sorted=grp.dates.sort(), upcoming=sorted.filter(d=>d>=today), past=sorted.filter(d=>d<today);
      return `<div class="reserved-pkg-group">
        <div class="reserved-pkg-name">${grp.name}</div>
        <div class="reserved-chips">
          ${upcoming.map(d=>`<span class="reserved-chip">📅 ${fmt(d)}<button title="Unblock" onclick="unblockDate('${pkgKey}','${d}')">✕</button></span>`).join('')}
          ${past.map(d=>`<span class="reserved-chip" style="opacity:.45;text-decoration:line-through;" title="Past date">${fmt(d)}</span>`).join('')}
          ${upcoming.length===0&&past.length>0?'<span style="font-size:0.78rem;color:var(--text-light)">No upcoming reserved dates</span>':''}
        </div>
      </div>`;
    }).join('')}`;
}

function unblockDate(pkgKey,date){
  if(!confirm(`Unblock ${date} for this package? This will CANCEL all bookings for that date.`)) return;
  let changed=false;
  bookings.forEach(b=>{ const bKey=b.pkgKey||''; if(bKey===pkgKey&&b.date===date&&b.status!=='cancelled'){ b.status='cancelled'; changed=true; } });
  if(changed){ saveBookings(); showToast(`✅ ${date} unblocked.`); renderReservedDatesPanel(); renderStats(); renderPackagesGrid(); }
}

function setStatus(idx,status){
  if(idx<0||idx>=bookings.length) return;
  bookings[idx].status=status; saveBookings();
  showToast(`✅ Booking ${status}.`);
  renderStats(); renderBookingsTable(bookings); renderGuestsTable(); renderPackagesGrid();
}
function deleteBooking(idx){
  if(!confirm('Delete this booking permanently?')) return;
  bookings.splice(idx,1); saveBookings();
  showToast('🗑️ Booking deleted.');
  renderStats(); renderBookingsTable(bookings); renderGuestsTable(); renderPackagesGrid();
}
function searchBookings(q){
  const filtered=q?bookings.filter(b=>b.name.toLowerCase().includes(q.toLowerCase())||b.pkg.toLowerCase().includes(q.toLowerCase())):bookings;
  renderBookingsTable(filtered);
}

function renderOffersTable(){
  const tb=document.getElementById('offersTableBody'); if(!tb) return;
  if(!offers.length){ tb.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>No packages yet.</p></div></td></tr>`; return; }
  tb.innerHTML=offers.map((o,i)=>`
    <tr>
      <td class="offer-icon">${o.icon}</td>
      <td><strong>${o.name}</strong><br/><span style="font-size:0.72rem;color:var(--text-light);">${o.id}</span></td>
      <td><span class="status-badge" style="background:#e8f4e8;color:var(--forest);">${o.cat}</span></td>
      <td style="font-weight:700;color:var(--gold);">₱${Number(o.rate).toLocaleString()}</td>
      <td>${o.duration}</td>
      <td style="font-size:0.78rem;color:var(--text-light);max-width:160px;">${o.notes}</td>
      <td>
        <button class="action-btn" onclick="editOffer(${i})">Edit</button>
        <button class="action-btn danger" onclick="deleteOffer(${i})">Delete</button>
      </td>
    </tr>`).join('');
}

function renderGuestsTable(){
  const tb=document.getElementById('guestsTableBody'); if(!tb) return;
  if(!bookings.length){ tb.innerHTML=`<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div><p>No guests yet.</p></div></td></tr>`; return; }
  const seen={}, guests=[];
  bookings.forEach(b=>{ if(!seen[b.phone]){ seen[b.phone]=true; guests.push(b); } });
  tb.innerHTML=guests.map(b=>`
    <tr>
      <td><strong>${b.name}</strong></td><td>${b.email||'—'}</td><td>${b.phone}</td><td>${b.date}</td>
      <td>${bookings.filter(x=>x.phone===b.phone).length}</td>
    </tr>`).join('');
}

function openAddOffer(){
  editOfferIdx=null;
  document.getElementById('offerModalTitle').textContent='Add Package';
  ['om_icon','om_name','om_rate','om_duration','om_notes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('om_cat').value='cabin';
  document.getElementById('offerModalOverlay').classList.remove('hidden');
  document.getElementById('om_rate').readOnly = false;
    document.getElementById('packageModal').classList.add('open');
}
function editOffer(i){
  editOfferIdx=i; const o=offers[i];
  document.getElementById('offerModalTitle').textContent='Edit Package';
  document.getElementById('om_icon').value     = o.icon;
  document.getElementById('om_name').value     = o.name;
  document.getElementById('om_cat').value      = o.cat;
  document.getElementById('om_rate').value     = o.rate;
  document.getElementById('om_duration').value = o.duration;
  document.getElementById('om_notes').value    = o.notes;
  document.getElementById('offerModalOverlay').classList.remove('hidden');
  document.getElementById('om_rate').readOnly = true;
    document.getElementById('packageModal').classList.add('open');
}
function closeOfferModal(){ document.getElementById('offerModalOverlay').classList.add('hidden'); }
function saveOffer(){
  const name = document.getElementById('om_name').value.trim();
  const rate = parseFloat(document.getElementById('om_rate').value)||0;
  if(!name||!rate){ alert('Please fill in at least a name and rate.'); return; }

  if(editOfferIdx !== null){
    offers[editOfferIdx] = {
      ...offers[editOfferIdx],
      icon:     document.getElementById('om_icon').value     || '🏠',
      name,
      cat:      document.getElementById('om_cat').value,
      rate,
      duration: document.getElementById('om_duration').value.trim(),
      notes:    document.getElementById('om_notes').value.trim(),
    };
  } else {
    offers.push({
      id:       'pkg-' + Date.now(),
      icon:     document.getElementById('om_icon').value     || '🏠',
      name,
      cat:      document.getElementById('om_cat').value,
      rate,
      duration: document.getElementById('om_duration').value.trim(),
      notes:    document.getElementById('om_notes').value.trim(),
    });
  }

  saveOffers();
  closeOfferModal();
  renderOffersTable();
  renderPackagesGrid();
  renderBookingDropdown();
  showToast('💾 Package saved! Customer views updated.');
}
function deleteOffer(i){
  if(!confirm('Delete this package?')) return;
  offers.splice(i,1); saveOffers();
  renderOffersTable();
  renderPackagesGrid();
  renderBookingDropdown();
  showToast('🗑️ Package deleted.');
}

function clearAllData(){
  if(!confirm('⚠️ This will permanently delete ALL bookings and custom packages.\n\nAre you absolutely sure?')) return;
  Object.values(LS_KEYS).forEach(k=>lsDel(k));
  bookings=[]; offers=DEFAULT_PACKAGES.map(p=>({...p}));
  isAuthenticated=true; lsSet(LS_KEYS.AUTH,true); lsSet(LS_KEYS.OFFERS,offers);
  renderStats(); renderOffersTable(); renderGuestsTable(); renderPackagesGrid(); renderBookingDropdown();
  showToast('🗑️ All data cleared. Packages reset to defaults.',4000);
}

let calendarState = { pkgId: null, year: null, month: null };

function openCalendar(pkgId, e) {
  e.stopPropagation();
  closeCalendar(); 

  const now = new Date();
  calendarState = { pkgId, year: now.getFullYear(), month: now.getMonth() };
  renderCalendarPopup();

  const popup  = document.getElementById('calPopup');
  const rect   = e.target.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;

  let left = rect.left + scrollX;
  const popupWidth = 300;
  if (left + popupWidth > window.innerWidth - 16) {
    left = window.innerWidth - popupWidth - 16;
  }

  popup.style.top  = (rect.bottom + scrollY + 8) + 'px';
  popup.style.left = left + 'px';
  popup.classList.add('open');
}

function renderCalendarPopup() {
  const { pkgId, year, month } = calendarState;
  const blocked     = getBlockedDatesForPkg(pkgId);
  const pkg         = getPkgById(pkgId);
  const today       = new Date().toISOString().split('T')[0];
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName   = new Date(year, month).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast       = dateStr < today;
    const isReservedDay = blocked.has(dateStr);
    let cls = 'cal-cell';
    if (isPast)          cls += ' past';
    else if (isReservedDay) cls += ' reserved';
    else                 cls += ' available';
    const tip = isReservedDay ? 'Reserved' : isPast ? '' : 'Available';
    cells += `<div class="${cls}" title="${tip}">${d}</div>`;
  }

  document.getElementById('calPopup').innerHTML = `
    <div class="cal-header">
      <button onclick="shiftMonth(-1)" title="Previous month">‹</button>
      <div class="cal-header-center">
        <div class="cal-pkg-name">${pkg ? pkg.name : ''}</div>
        <div class="cal-month-label">${monthName}</div>
      </div>
      <button onclick="shiftMonth(1)" title="Next month">›</button>
    </div>
    <div class="cal-weekdays">
      <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-legend">
      <span class="leg available">✔ Available</span>
      <span class="leg reserved">✖ Reserved</span>
      <span class="leg past">· Past</span>
    </div>
    <button class="cal-close-btn" onclick="closeCalendar()">Close</button>`;
}

function shiftMonth(dir) {
  calendarState.month += dir;
  if (calendarState.month > 11) { calendarState.month = 0; calendarState.year++; }
  if (calendarState.month < 0)  { calendarState.month = 11; calendarState.year--; }
  renderCalendarPopup();
}

function closeCalendar() {
  const popup = document.getElementById('calPopup');
  if (popup) popup.classList.remove('open');
}

document.addEventListener('click', function(e) {
  const popup = document.getElementById('calPopup');
  if (popup && popup.classList.contains('open') && !popup.contains(e.target)) {
    closeCalendar();
  }
});

function openDevelopers() {
  document.getElementById('developersModal').classList.add('open');
}

function closeDevelopers(event) {
  if (!event || event.target.id === 'developersModal') {
    document.getElementById('developersModal').classList.remove('open');
  }
}


(function init(){
  renderOffersTable();
  renderStats();
  renderPackagesGrid();
  renderBookingDropdown();
  const lastPage=lsGet(LS_KEYS.LAST_PAGE,'home');
  if(isAuthenticated&&lastPage&&lastPage!=='admin') showPage(lastPage);
})();