'use strict';
const icons = {
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  school:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-7h6v7M7 10h.01M17 10h.01M12 7h.01"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cpu:'<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3m6-3v3m-6 14v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/>',
  radio:'<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4m-8.4 0a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2M12 16h.01"/>',
  'arrow-up-right':'<path d="M7 17 17 7M7 7h10v10"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>',
  'log-in':'<path d="M15 3h5v18h-5M3 12h12m-5-5 5 5-5 5"/>',
  'log-out':'<path d="M9 3H4v18h5m1-9h12m-5-5 5 5-5 5"/>',
  settings:'<path d="m9 3-.5 2-2 .9-1.9-.6L2.5 9l1.5 1.4v2.3L2.5 14l2.1 3.7 1.9-.6 2 .9.5 3h5l.5-3 2-.9 1.9.6 2.1-3.7-1.5-1.3v-2.3L21 9l-2.1-3.7-1.9.6-2-.9-.5-2Z"/><circle cx="11.7" cy="12" r="3"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  'chevron-left':'<path d="m15 5-7 7 7 7"/>',
  camera:'<path d="M14 7h-3l-2-3H5L3 7H2v13h20V7h-4l-2-3h-3"/><circle cx="12" cy="13" r="4"/>',
  video:'<rect x="2" y="5" width="13" height="14" rx="2"/><path d="m15 10 7-4v12l-7-4"/>',
  thermometer:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v9"/><circle cx="12" cy="18" r="1"/>',
  droplet:'<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0M12 20h.01"/>',
  card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4m-4 4h2m7-4a4 4 0 0 1 0 6m-2-5a2 2 0 0 1 0 4"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  chart:'<path d="M3 3v18h18M7 15l4-6 4 3 5-7"/>',
  link:'<path d="m10 13 4-4m-7 6-1 1a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6M9 12a4 4 0 0 1 0-6l4-4a4 4 0 0 1 6 6l-1 1"/>',
  bulb:'<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
  fan:'<circle cx="12" cy="12" r="2"/><path d="M11 10C5 2 19 0 14 10m0 3c10-3 7 11-1 2m-3-2C2 20 0 7 10 10"/>',
  projector:'<rect x="3" y="5" width="18" height="13" rx="2"/><circle cx="16" cy="11" r="3"/><path d="M6 9h3m-3 4h3m-3 8 2-3m8 0 2 3"/>',
  snowflake:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4m12 14-1-4 4-1M6 19l1-4-4-1m18-4-4-1 1-4"/>'
};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const icon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.grid}</svg>`;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const saveLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast('Trình duyệt không thể lưu dữ liệu dùng thử.'); } };
function decorate() { $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); delete el.dataset.icon; }); }
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 4500); }
const dateKey = d => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const timeText = t => t ? new Date(t).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
const fullTime = t => t ? new Date(t).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh'}) : '—';
const initials = n => n.trim().split(/\s+/).slice(-2).map(x => x[0]).join('').toUpperCase();
const names = ['Nguyễn Minh Anh','Trần Hoàng Bảo','Lê Ngọc Châu','Phạm Anh Dũng','Hoàng Thùy Dương','Vũ Minh Đức','Đặng Gia Hân','Bùi Quang Huy','Đỗ Khánh Linh','Hồ Nhật Minh','Ngô Bảo Ngọc','Dương Tuấn Kiệt','Lý Phương Nhi','Nguyễn Hải Nam','Trần Thanh Phong','Lê Hà Phương','Phạm Đức Quân','Hoàng Như Quỳnh','Vũ Ngọc Sơn','Đặng Phương Thảo','Bùi Anh Thư','Đỗ Minh Trí','Hồ Thanh Trúc','Ngô Quốc Việt','Dương Tường Vy','Lý Hoàng Yến','Nguyễn Khánh An','Trần Minh Khang','Lê Bảo Long','Phạm Tuệ Minh','Hoàng Gia Bảo','Vũ Thảo Nguyên'];
function createDemo() {
  const today = dateKey(new Date());
  const students = names.map((name,i) => ({id:`HS${String(i+1).padStart(3,'0')}`,name,uid:`A1B2${(i+1).toString(16).toUpperCase().padStart(4,'0')}`,inside:i<24?1:0,last_at:i<26?`${today}T07:${String(10+i).padStart(2,'0')}:00+07:00`:null,last_action:i<24?'in':i<26?'out':null}));
  const events = [];
  students.slice(0,26).forEach((s,i) => { events.unshift({id:i+1,student_id:s.id,name:s.name,uid:s.uid,action:'in',at:s.last_at}); });
  students.slice(24,26).forEach((s,i) => { events.unshift({id:27+i,student_id:s.id,name:s.name,uid:s.uid,action:'out',at:`${today}T08:0${i}:00+07:00`}); });
  const temps=[27.1,27.4,27.2,27.7,27.5,27.8,28.0,27.8,28.1,28.3,28.1,28.4];
  const readings=temps.map((temperature,i)=>({temperature,humidity:[65,64,65,63,63,64,62,63,62,61,63,62][i],at:new Date(Date.now()-(11-i)*60000).toISOString()}));
  const equipment=equipmentDefinitions.map((d,i)=>({id:d.id,status:i<3?'on':'off',updated_at:new Date().toISOString()}));
  return {students, events, readings, device:{}, equipment, attended:students.slice(0,26).map(s=>s.id),mode:'demo'};
}
let demo=readLocal('classroom-demo-v1',null);
if (!demo || !Array.isArray(demo.students) || !Array.isArray(demo.events) || !Array.isArray(demo.readings) || !demo.device) demo=createDemo();
if(!Array.isArray(demo.equipment))demo.equipment=equipmentDefinitions.map((d,i)=>({id:d.id,status:i<3?'on':'off',updated_at:new Date().toISOString()}));
let state=demo, mode='demo', page='overview', selectedClass='1A1', search='', filter='all', tablePage=1;
let adminToken=''; try { adminToken=sessionStorage.getItem('classroom-admin') || ''; } catch {}
let connected=false, pollBusy=false, lastScan=new Map(), cameraStream=null, cameraURL='', cameraStatus='Chưa kết nối', cameraFailed=false;
let refreshTime=0;
let renderedFingerprint='';
const labels={overview:'Tổng quan trường',campus:'Chi tiết cơ sở',classroom:'Chi tiết lớp học',classes:'Quản lý lớp học',students:'Học sinh',activity:'Lịch sử điểm danh',devices:'Thiết bị & kết nối'};
const classes=[{name:'1A1',room:'Phòng 101',campus:'main',active:true},{name:'2A1',room:'Phòng 102',campus:'main',active:false},{name:'1A2',room:'Phòng 101',campus:'branch',active:false},{name:'2A2',room:'Phòng 102',campus:'branch',active:false}];
function stats() {
  const inside=state.students.filter(s=>s.inside).length;
  const attended=new Set(mode==='live'?state.attended:state.events.filter(e=>e.action==='in' && dateKey(new Date(e.at))===dateKey(new Date())).map(e=>e.student_id));
  const left=state.students.filter(s=>!s.inside&&attended.has(s.id)).length;
  return {total:state.students.length,inside,left,absent:state.students.length-inside-left,attended:attended.size,percent:state.students.length?Math.round(inside/state.students.length*100):0};
}
function isOnline() { return mode==='live'&&connected&&state.device.lastSeen && Date.now()-Date.parse(state.device.lastSeen)<30000; }
function sensor() { const r=state.readings.at(-1); return r && (mode==='demo'||Date.now()-Date.parse(r.at)<60000) ? r:null; }
function badge(action) { return ({in:'<span class="badge green">● &nbsp;Đang trong lớp</span>',out:'<span class="badge blue">↗ &nbsp;Đã rời lớp</span>',absent:'<span class="badge gray">Chưa đến lớp</span>',unknown:'<span class="badge orange">Thẻ chưa đăng ký</span>',ignored:'<span class="badge gray">Bỏ qua quét trùng</span>'})[action] || ''; }
function classPicker() {
  $('#class-picker').innerHTML=scopedClasses().map(c=>`<button class="class-card ${selectedClass===c.name?'selected':''}" data-class="${c.name}" aria-pressed="${selectedClass===c.name}"><span class="class-icon">${icon('school')}</span><span><strong>${c.name}</strong><small>${campusName(c.campus)} · ${c.active?state.students.length+' học sinh':'Lớp mẫu'}</small></span><span class="badge">${c.active?'Đang hoạt động':'Chưa kích hoạt'}</span></button>`).join('');
}
function spark(values,color='#91b29c') {
  if(values.length<2)return '';
  const min=Math.min(...values)-.3,max=Math.max(...values)+.3;
  const points=values.map((v,i)=>`${i/(values.length-1)*70},${26-(v-min)/(max-min)*22}`).join(' ');
  return `<div class="sparkline"><svg viewBox="0 0 70 30"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg></div>`;
}
function overview() {
  const s=stats(), r=sensor();
  const temp=r?r.temperature.toFixed(1):'—', humidity=r?r.humidity.toFixed(0):'—';
  return `<div class="scope-breadcrumb"><a href="#overview">Toàn trường</a>${icon('chevron')}<a href="#campus/main">Trường chính</a>${icon('chevron')}<strong>Lớp 1A1</strong></div><div class="class-detail"><strong>Lớp 1A1</strong><span class="badge green">Lớp đang hoạt động</span><span>Phòng 101</span><span class="right"><i class="pulse"></i>${mode==='demo'?'Số liệu minh họa':connected?'Đồng bộ mỗi 2 giây':'Mất kết nối máy chủ'}</span></div>
  <section class="stat-grid" aria-label="Các chỉ số lớp học">
    <article class="stat-card emphasis"><div class="stat-title">${icon('users')}Học sinh trong lớp</div><div class="stat-value">${s.inside}<small>/ ${s.total}</small></div><div class="stat-note">${s.percent}% sĩ số hiện tại</div><span class="stat-icon">${icon('users')}</span></article>
    <article class="stat-card"><div class="stat-title">${icon('log-in')}Đã đến lớp hôm nay</div><div class="stat-value">${s.attended}<small>học sinh</small></div><div class="stat-note">${s.left} học sinh đã rời lớp</div></article>
    <article class="stat-card"><div class="stat-title">${icon('thermometer')}Nhiệt độ phòng</div><div class="stat-value">${temp}<small>°C</small></div><div class="stat-note ${r?(r.temperature>32?'warn':'good'):''}">${r?(r.temperature>32?'Nhiệt độ đang cao':'Cảm biến DHT22'):'Chưa có dữ liệu mới'}</div>${r?spark(state.readings.map(x=>x.temperature)):''}</article>
    <article class="stat-card"><div class="stat-title">${icon('droplet')}Độ ẩm không khí</div><div class="stat-value">${humidity}<small>%</small></div><div class="stat-note ${r?'good':''}">${r?'Cảm biến DHT22':'Chưa có dữ liệu mới'}</div>${r?spark(state.readings.map(x=>x.humidity),'#a1b4ce'):''}</article>
  </section>
  <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Tình hình điểm danh</h2><p>Mỗi lượt quét thẻ, một lần cập nhật.</p></div><span class="badge gray">Hôm nay</span></div><div class="attendance-body"><div class="occupancy-ring" role="img" aria-label="${s.inside} trên ${s.total} học sinh trong lớp, ${s.percent}%"><svg viewBox="0 0 160 160"><circle class="track" cx="80" cy="80" r="68"/><circle class="progress" cx="80" cy="80" r="68" style="stroke-dashoffset:${427*(1-s.percent/100)}"/></svg><div class="ring-text"><strong>${s.percent}<span style="font-size:18px;color:#637c70">%</span></strong><span>Học sinh trong lớp</span><small>${s.inside} / ${s.total} học sinh</small></div></div><div class="legend"><div class="legend-row"><i class="legend-dot"></i>Đang trong lớp<strong>${s.inside}</strong></div><div class="legend-row"><i class="legend-dot blue"></i>Đã rời lớp<strong>${s.left}</strong></div><div class="legend-row"><i class="legend-dot gray"></i>Chưa đến lớp<strong>${s.absent}</strong></div></div></div><div class="panel-bottom">${icon('shield')}Điểm danh tự động bằng thẻ RFID · Quét vào / Quét ra</div></section>
  <section class="panel"><div class="panel-head"><div><h2>Camera lớp học</h2><p>Quan sát không gian học tập</p></div><button class="icon-button" data-action="camera" aria-label="Cài đặt camera">${icon('settings')}</button></div><div class="camera-frame" id="camera-frame"><div class="camera-grid"></div><div class="camera-empty"><span>${icon('video')}</span><strong>${cameraStatus==='Chưa kết nối'?'Kết nối để xem lớp học':escapeHTML(cameraStatus)}</strong><p>Webcam hoặc camera IP của bạn</p><button class="button secondary" data-action="camera">${icon('link')}Kết nối camera</button></div><i class="camera-corner tl"></i><i class="camera-corner tr"></i><i class="camera-corner bl"></i><i class="camera-corner br"></i></div><div class="camera-meta"><span>${icon('shield')}Không ghi hình · Chỉ xem trực tiếp</span><span class="camera-status" id="camera-status">Chưa kết nối</span></div></section></div>
  ${studentTable(true)}
  <div class="bottom-grid"><section class="panel"><div class="scan-demo"><div class="scan-visual">${icon('card')}</div><div class="scan-content"><h3>${mode==='demo'?'Trải nghiệm quét thẻ RFID':'Đầu đọc RFID · RC522'}</h3><p>${mode==='demo'?'Chọn một học sinh để thử. Mỗi lần quét chuyển trạng thái vào / ra.':'Quét thẻ tại thiết bị ESP32 để ghi nhận vào / ra lớp.'}</p>${mode==='demo'?`<div class="scan-controls"><select id="demo-student" aria-label="Học sinh quét thẻ">${state.students.filter(s=>s.uid).map(s=>`<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)}</option>`).join('')}</select><button class="button primary" data-action="scan">${icon('radio')}Quét thử thẻ</button></div>`:`<div class="device-note">${isOnline()?'● Thiết bị đang trực tuyến':'○ Chờ kết nối ESP32'}${state.device.unknownUID?` · Thẻ chưa đăng ký: <code>${escapeHTML(state.device.unknownUID)}</code>`:''}</div>`}</div></div></section>${chartPanel()}</div>`;
}
function chartPanel() {
  const readings=state.readings, temps=readings.map(r=>r.temperature),humidity=readings.map(r=>r.humidity);
  function line(values) { if(values.length<2)return ''; const min=Math.min(...values)-1,max=Math.max(...values)+1; return values.map((v,i)=>`${i/(values.length-1)*400},${65-(v-min)/(max-min)*53}`).join(' '); }
  return `<section class="panel"><div class="panel-head"><h2>Môi trường lớp học</h2><div class="chart-caption"><span><i></i>°C</span><span><i class="blue"></i>%</span></div></div><div class="sensor-chart">${readings.length>1?`<svg viewBox="0 0 400 80" preserveAspectRatio="none" role="img" aria-label="Xu hướng nhiệt độ và độ ẩm, mỗi đường dùng thang đo riêng"><path d="M0 18h400M0 43h400M0 68h400" stroke="#f0f3f2" stroke-dasharray="3 4"/><polyline points="${line(humidity)}" fill="none" stroke="#afc0d4" stroke-width="1.5"/><polyline points="${line(temps)}" fill="none" stroke="#8aaf95" stroke-width="1.8"/></svg><div class="chart-axis"><span>${timeText(readings[0].at)}</span><span>Xu hướng · thang đo riêng</span><span>${timeText(readings.at(-1).at)}</span></div>`:'<div class="empty-state small">Chờ dữ liệu nhiệt độ và độ ẩm từ DHT22.</div>'}</div></section>`;
}
function filteredStudents() {
  const today=new Set(mode==='live'?state.attended:state.events.filter(e=>e.action==='in'&&dateKey(new Date(e.at))===dateKey(new Date())).map(e=>e.student_id));
  return state.students.filter(s => {
    const status=s.inside?'in':today.has(s.id)?'out':'absent';
    return (filter==='all'||filter===status) && `${s.name} ${s.uid||''} ${s.id}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'));
  }).map(s=>({...s,status:s.inside?'in':today.has(s.id)?'out':'absent'}));
}
function studentTable(compact=false) {
  const all=filteredStudents(),size=compact?6:10,pages=Math.max(1,Math.ceil(all.length/size)); tablePage=Math.min(tablePage,pages);
  const rows=all.slice((tablePage-1)*size,tablePage*size);
  return `<section class="panel table-panel"><div class="table-heading"><div><h2>Danh sách học sinh <span class="count-label">${state.students.length} học sinh</span></h2><p>Theo dõi trạng thái vào, ra lớp của từng học sinh</p></div><div class="table-tools"><label class="search-field" style="margin:0">${icon('search')}<input id="student-search" placeholder="Tìm tên hoặc mã thẻ..." aria-label="Tìm học sinh" value="${escapeHTML(search)}"></label><select id="status-filter" class="filter-select" aria-label="Lọc trạng thái"><option value="all">Tất cả trạng thái</option><option value="in" ${filter==='in'?'selected':''}>Đang trong lớp</option><option value="out" ${filter==='out'?'selected':''}>Đã rời lớp</option><option value="absent" ${filter==='absent'?'selected':''}>Chưa đến lớp</option></select></div></div><div class="table-scroll"><table><thead><tr><th>HỌC SINH</th><th>MÃ THẺ RFID</th><th>TRẠNG THÁI</th><th>LƯỢT QUÉT GẦN NHẤT</th><th aria-label="Thao tác"></th></tr></thead><tbody>${rows.map((s,i)=>`<tr><td><div class="student-cell"><span class="student-avatar c${i%4}">${escapeHTML(initials(s.name))}</span>${escapeHTML(s.name)}</div></td><td class="uid-text">${escapeHTML(s.uid||'Chưa gán thẻ')}</td><td>${badge(s.status)}</td><td>${timeText(s.last_at)}</td><td><button class="row-action" data-edit="${escapeHTML(s.id)}" aria-label="Sửa ${escapeHTML(s.name)}">${icon('edit')}</button>${!compact?`<button class="row-action" data-delete="${escapeHTML(s.id)}" aria-label="Xóa ${escapeHTML(s.name)}">${icon('trash')}</button>`:''}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty-state small">Chưa có học sinh phù hợp. Thêm học sinh để bắt đầu điểm danh.</div></td></tr>'}</tbody></table></div>${pagination(all.length,size,pages)}</section>`;
}
function pagination(count,size,pages) {
  const start=Math.max(1,Math.min(tablePage-2,pages-4)),visible=Array.from({length:Math.min(pages,5)},(_,i)=>start+i);
  return `<div class="table-footer"><span>${count?`Hiển thị ${(tablePage-1)*size+1}–${Math.min(tablePage*size,count)} trong ${count}`:'0'} kết quả</span><div class="pagination"><button data-page="${tablePage-1}" ${tablePage<=1?'disabled':''} aria-label="Trang trước">${icon('chevron-left')}</button>${visible.map(n=>`<button data-page="${n}" class="${n===tablePage?'active':''}" aria-label="Trang ${n}">${n}</button>`).join('')}<button data-page="${tablePage+1}" ${tablePage>=pages?'disabled':''} aria-label="Trang tiếp">${icon('chevron')}</button></div></div>`;
}
function activityPage() {
  const events=state.events.filter(e=>`${e.name||''} ${e.uid||''}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))&&(filter==='all'||filter===e.action));
  const size=12,pages=Math.max(1,Math.ceil(events.length/size));tablePage=Math.min(tablePage,pages);
  return `<section class="panel table-panel"><div class="table-heading"><div><h2>Lịch sử điểm danh <span class="count-label">${state.events.length} lượt gần nhất</span></h2><p>Thời gian máy chủ · Múi giờ Việt Nam (UTC+7)</p></div><div class="table-tools"><label class="search-field" style="margin:0">${icon('search')}<input id="student-search" placeholder="Tìm tên hoặc mã thẻ..." aria-label="Tìm lịch sử" value="${escapeHTML(search)}"></label><select id="status-filter" class="filter-select" aria-label="Lọc lượt quét"><option value="all">Tất cả lượt quét</option><option value="in" ${filter==='in'?'selected':''}>Vào lớp</option><option value="out" ${filter==='out'?'selected':''}>Ra lớp</option><option value="unknown" ${filter==='unknown'?'selected':''}>Thẻ chưa đăng ký</option><option value="ignored" ${filter==='ignored'?'selected':''}>Quét trùng</option></select></div></div><div class="table-scroll"><table><thead><tr><th>HỌC SINH</th><th>MÃ THẺ RFID</th><th>HOẠT ĐỘNG</th><th>THỜI GIAN</th></tr></thead><tbody>${events.slice((tablePage-1)*size,tablePage*size).map(e=>`<tr><td>${escapeHTML(e.name||'Thẻ chưa đăng ký')}</td><td class="uid-text">${escapeHTML(e.uid)}</td><td>${e.action==='in'?'<span class="badge green">↘ &nbsp;Vào lớp</span>':e.action==='out'?'<span class="badge blue">↗ &nbsp;Ra lớp</span>':badge(e.action)}</td><td>${fullTime(e.at)}</td></tr>`).join('')||'<tr><td colspan="4"><div class="empty-state small">Chưa có lượt quét phù hợp.</div></td></tr>'}</tbody></table></div>${pagination(events.length,size,pages)}<div class="feed-summary">Hiển thị tối đa 500 lượt gần nhất. Xuất báo cáo để tải toàn bộ lịch sử đã lưu trên máy chủ.</div></section>`;
}
function classesPage() { return `<section class="classes-list">${scopedClasses().map(c=>`<article class="panel class-large"><div class="class-large-top"><span class="class-icon">${icon('school')}</span><span class="badge ${c.active?'green':'gray'}">${c.active?'Đang hoạt động':'Lớp mẫu · Chưa kích hoạt'}</span></div><h2>Lớp ${c.name}</h2><p>${campusName(c.campus)} · ${c.room}<br>${c.active?`${state.students.length} học sinh · RFID + DHT22 + Camera`:'Được tạo sẵn để mở rộng trong tương lai.'}</p><button class="button ${c.active?'primary':'secondary'}" data-open-class="${c.name}">${c.active?'Vào lớp học':'Xem lớp mẫu'}${icon('arrow-right')}</button></article>`).join('')}</section>`; }
function devicesPage() {
  const r=sensor();
  return `<div class="device-grid"><section class="panel"><div class="panel-head"><h2>${icon('cpu')} &nbsp;ESP32 DevKit V1</h2><span class="badge ${isOnline()?'green':'gray'}">${isOnline()?'Trực tuyến':mode==='demo'?'Chế độ dùng thử':'Ngoại tuyến'}</span></div><div class="device-content"><div class="device-row"><span>Kết nối</span><strong>Wi-Fi · HTTP nội bộ</strong></div><div class="device-row"><span>Địa chỉ IP ESP32</span><strong>${escapeHTML(state.device.ip||'Chưa nhận dữ liệu')}</strong></div><div class="device-row"><span>Tín hiệu Wi-Fi</span><strong>${escapeHTML(state.device.rssi?state.device.rssi+' dBm':'—')}</strong></div><div class="device-row"><span>Lần liên lạc cuối</span><strong>${fullTime(state.device.lastSeen)}</strong></div><div class="device-row"><span>Thẻ chưa đăng ký gần nhất</span><strong class="uid-text">${escapeHTML(state.device.unknownUID||'—')}</strong></div><p class="device-note">Thẻ chưa đăng ký không làm thay đổi sĩ số. Thêm học sinh và gán UID để sử dụng thẻ này.</p><button class="button primary" data-action="connect">${icon('link')}Cài đặt kết nối</button></div></section><section class="panel"><div class="panel-head"><h2>${icon('thermometer')} &nbsp;Cảm biến & camera</h2></div><div class="device-content"><div class="device-row"><span>Nhiệt độ DHT22</span><strong>${r?r.temperature.toFixed(1)+' °C':'Chưa có dữ liệu mới'}</strong></div><div class="device-row"><span>Độ ẩm DHT22</span><strong>${r?r.humidity.toFixed(1)+' %':'Chưa có dữ liệu mới'}</strong></div><div class="device-row"><span>Chu kỳ gửi cảm biến</span><strong>10 giây</strong></div><div class="device-row"><span>Nguồn camera</span><strong>${escapeHTML(cameraStatus)}</strong></div><p class="device-note">Dữ liệu DHT22 quá 60 giây sẽ hiển thị là cũ. Camera sử dụng thiết bị riêng, không đo nhiệt độ.</p><button class="button secondary" data-action="camera">${icon('video')}Cài đặt camera</button></div></section></div><section class="panel table-panel"><div class="panel-head"><h2>Sơ đồ nối chân ESP32 DevKit V1</h2><span class="badge gray">Nguồn logic 3.3V</span></div><div class="table-scroll"><table class="wiring-table"><thead><tr><th>THIẾT BỊ</th><th>CHÂN THIẾT BỊ</th><th>CHÂN ESP32</th></tr></thead><tbody>${[['RC522','SDA / SS','GPIO 21'],['RC522','SCK','GPIO 18'],['RC522','MOSI','GPIO 23'],['RC522','MISO','GPIO 19'],['RC522','RST','GPIO 22'],['RC522','3.3V / GND','3V3 / GND'],['DHT22','DATA','GPIO 27'],['DHT22','VCC / GND','3V3 / GND']].map(row=>`<tr>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="panel-bottom">${icon('shield')}DHT22 loại rời cần điện trở kéo lên 10kΩ giữa DATA và 3V3. Chân NC để trống.</div></section><div class="notice">RC522 dùng nguồn 3.3V. Máy tính và ESP32 phải cùng mạng Wi-Fi. Chương trình Arduino nằm trong firmware/classroom_esp32/classroom_esp32.ino.</div>`;
}
function inactivePage() { return `<section class="panel empty-state">${icon('school')}<h2>Lớp ${selectedClass} đang chờ sẵn sàng</h2><p>Đây là lớp mẫu để mở rộng hệ thống. Lớp 1A1 đã được chuẩn bị đầy đủ cho điểm danh, cảm biến và camera.</p><button class="button primary" data-open-class="1A1">Mở lớp 1A1 ${icon('arrow-right')}</button></section>`; }
function attachCamera(existingMedia=null) {
  const frame=$('#camera-frame');if(!frame)return;
  if(existingMedia && ((cameraStream&&existingMedia.srcObject===cameraStream)||(cameraURL&&!cameraFailed&&existingMedia.tagName==='IMG'&&existingMedia.src===cameraURL))) {
    frame.append(existingMedia);
    if($('#camera-status'))$('#camera-status').textContent=cameraStream?'Đang xem webcam':cameraStatus==='Camera IP trực tiếp'?'Đang xem':'Đang kết nối...';
    return;
  }
  if(cameraStream){const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=cameraStream;frame.append(video);video.play().catch(()=>{});}
  else if(cameraURL&&!cameraFailed){const img=document.createElement('img');img.alt='Hình ảnh trực tiếp từ camera lớp học';img.onload=()=>{cameraStatus='Camera IP trực tiếp';if($('#camera-status'))$('#camera-status').textContent='Đang xem';};img.onerror=()=>{if(cameraFailed)return;cameraFailed=true;cameraStatus='Không tải được camera';toast('Không tải được camera. Kiểm tra địa chỉ, mạng và quyền truy cập camera.');img.remove();};img.src=cameraURL;frame.append(img);}
  if($('#camera-status'))$('#camera-status').textContent=cameraStream?'Đang xem webcam':cameraURL&&!cameraFailed?'Đang kết nối...':'Chưa kết nối';
}
function render() {
  const focus=document.activeElement?.id,position=document.activeElement?.selectionStart;
  const existingMedia=$('#camera-frame video, #camera-frame img');
  classPicker();
  $('#class-picker').hidden=!['classroom','students','activity'].includes(page);
  $('#campus-selector').value=campusScope;
  $('#scope-caption').textContent=campusName(campusScope);
  $('#breadcrumb').textContent=labels[page];
  $('#page-title').innerHTML=escapeHTML(({overview:'Tổng quan nhà trường',campus:campusName(campusScope),classroom:`Lớp ${selectedClass}`,classes:'Không gian lớp học',students:`Học sinh lớp ${selectedClass}`,activity:'Lịch sử điểm danh',devices:'Thiết bị & kết nối'})[page])+'<span class="heading-dot">.</span>';
  $('#page-description').textContent=({overview:'Kết nối trường chính và phân hiệu trong một không gian quản lý.',campus:'Theo dõi lớp học và thiết bị theo từng cơ sở.',classroom:'Điểm danh, môi trường và thiết bị trong lớp học.',classes:'Chọn lớp tại trường chính hoặc phân hiệu để xem chi tiết.',students:'Mỗi học sinh, một chiếc thẻ. Mọi lượt đến lớp đều được ghi nhận.',activity:'Theo dõi hành trình đến lớp qua từng lượt quét thẻ.',devices:'Xem thiết bị nào đang bật, đã tắt hoặc chưa có phản hồi.'})[page];
  const navPage=page==='campus'?'overview':page==='classroom'?'classes':page;
  $$('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===navPage);if(a.dataset.nav===navPage)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('#mode-label').textContent=mode==='demo'?'Chế độ dùng thử':connected?'Thiết bị thật · Máy chủ đã kết nối':'Thiết bị thật · Mất kết nối máy chủ';
  $('#mode-description').textContent=mode==='demo'?'Dữ liệu mẫu · Sẵn sàng để bạn khám phá':'Lớp 1A1 · Dữ liệu lưu trên máy chủ nội bộ';
  $('#mode-button').innerHTML=(mode==='demo'?'Kết nối thiết bị thật':'Cài đặt kết nối')+icon('arrow-right');
  $('#sidebar-device').textContent=mode==='demo'?'Chưa kết nối · Đang dùng thử':isOnline()?'Đang trực tuyến · RC522 + DHT22':'Đang chờ ESP32 gửi dữ liệu';
  $('#add-student').hidden=!['classroom','students','activity'].includes(page);
  $('#add-student').disabled=!activeClassSelected();
  $('#export-button').disabled=campusScope==='branch'||(['classroom','students','activity'].includes(page)&&!activeClassSelected());
  $('#content').innerHTML=page==='overview'?schoolOverview():page==='campus'?campusOverview():page==='classes'?classesPage():page==='devices'?equipmentPanel()+(campusScope==='branch'?'':devicesPage()):!activeClassSelected()?inactivePage():page==='classroom'?overview()+equipmentPanel():page==='students'?studentTable():activityPage();
  attachCamera(existingMedia);
  if(focus==='student-search'&&$('#student-search')){$('#student-search').focus();try{$('#student-search').setSelectionRange(position,position);}catch{}}
  refreshTime=Date.now();
  renderedFingerprint=stateFingerprint();
  if($('#equipment-dialog').open)showEquipment($('#equipment-dialog').dataset.equipmentId);
}
async function api(path,body,token=adminToken) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch(path,{method:body?'POST':'GET',headers:{'Authorization':`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
    if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Chưa tìm thấy máy chủ nội bộ. Chạy start.bat và mở http://localhost:8080.');
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Không thể kết nối máy chủ.');return result;
  }catch(e){if(e.name==='AbortError')throw new Error('Máy chủ không phản hồi. Kiểm tra lại kết nối.');throw e;}finally{clearTimeout(timer);}
}
async function poll() {
  if(mode!=='live'||pollBusy)return;pollBusy=true;
  try{const token=adminToken,result=await api('/api/state');if(mode!=='live'||adminToken!==token)return;state=result;connected=true;const fingerprint=stateFingerprint();if(fingerprint!==renderedFingerprint&&!$('#student-search')?.matches(':focus')&&!$('#demo-student')?.matches(':focus'))render();}
  catch{if(connected){connected=false;render();toast('Mất kết nối máy chủ. Số liệu đang hiển thị là lần đồng bộ cuối.');}}
  finally{pollBusy=false;}
}
function demoSave() { demo=state;saveLocal('classroom-demo-v1',demo); }
function editStudent(id) {
  const s=state.students.find(x=>x.id===id);
  $('#student-dialog-title').textContent=s?'Chỉnh sửa học sinh':'Thêm học sinh';
  $('#student-id').value=s?.id||'';$('#student-name').value=s?.name||'';$('#student-uid').value=s?.uid||'';
  $('#student-error').textContent='';
  if(!s&&mode==='live'&&state.device.unknownUID)$('#student-uid').value=state.device.unknownUID;
  $('#student-dialog').showModal();$('#student-name').focus();
}
async function deleteStudent(id) {
  const s=state.students.find(x=>x.id===id);if(!s)return;
  if(s.inside)return toast('Học sinh cần quét thẻ ra lớp trước khi xóa.');
  if(!confirm(`Xóa học sinh ${s.name}? Lịch sử điểm danh vẫn được giữ lại.`))return;
  try{if(mode==='live'){await api('/api/students/delete',{id});await poll();}else{state.students=state.students.filter(x=>x.id!==id);demoSave();render();}toast('Đã xóa học sinh.');}catch(e){toast(e.message);}
}
function scanDemo() {
  const s=state.students.find(x=>x.id===$('#demo-student')?.value);if(!s)return toast('Thêm học sinh và gán thẻ trước khi quét thử.');
  if(Date.now()-(lastScan.get(s.id)||0)<3000)return toast('Đã bỏ qua quét trùng. Chờ 3 giây rồi quét lại.');
  lastScan.set(s.id,Date.now());const at=new Date().toISOString();s.inside=s.inside?0:1;s.last_at=at;s.last_action=s.inside?'in':'out';
  state.events.unshift({id:Date.now(),student_id:s.id,name:s.name,uid:s.uid,action:s.last_action,at});
  demoSave();render();if($('#demo-student'))$('#demo-student').value=s.id;
  toast(`${s.name} · ${s.inside?'Đã vào lớp':'Đã rời lớp'}`);
}
function stopCamera() {
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;cameraURL='';cameraFailed=false;cameraStatus='Chưa kết nối';
}
async function exportCSV() {
  let rows=[['Học sinh','UID thẻ','Hoạt động','Thời gian (Việt Nam)']];
  const actions={in:'Vào lớp',out:'Ra lớp',unknown:'Thẻ chưa đăng ký',ignored:'Quét trùng'};
  try{
    const events=mode==='live'?(await api('/api/export')).events:state.events;
    rows.push(...events.map(e=>[e.name||'',e.uid||'',actions[e.action]||e.action,fullTime(e.at)]));
    const cell=v=>'"'+String(/^[=+\-@\t\r]/.test(String(v))?'\''+v:v).replaceAll('"','""')+'"';
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`diem-danh-1A1-${dateKey(new Date())}${mode==='demo'?'-du-lieu-mau':''}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Đã xuất báo cáo điểm danh CSV.');
  }catch(e){toast(e.message);}
}
document.addEventListener('click',e=>{
  const target=e.target.closest('button,a');if(!target)return;
  if(target.dataset.class)openClass(target.dataset.class);
  if(target.dataset.openClass)openClass(target.dataset.openClass);
  if(target.dataset.campus)openCampus(target.dataset.campus);
  if(target.dataset.equipment)showEquipment(target.dataset.equipment);
  if(target.dataset.openDevices){equipmentFilter=target.dataset.openDevices;if(location.hash==='#devices')render();else location.hash='devices';}
  if(target.dataset.page){tablePage=Number(target.dataset.page);render();}
  if(target.dataset.edit)editStudent(target.dataset.edit);
  if(target.dataset.delete)deleteStudent(target.dataset.delete);
  if(target.dataset.close)document.getElementById(target.dataset.close).close();
  if(target.dataset.action==='camera'){$('#camera-error').textContent='';$('#camera-dialog').showModal();}
  if(target.dataset.action==='scan')scanDemo();
  if(target.dataset.action==='connect')$('#connection-dialog').showModal();
});
document.addEventListener('input',e=>{if(e.target.id==='student-search'){search=e.target.value;tablePage=1;render();}});
document.addEventListener('change',e=>{if(e.target.id==='status-filter'){filter=e.target.value;tablePage=1;render();}if(e.target.id==='device-state-filter'){equipmentFilter=e.target.value;render();}if(e.target.id==='campus-selector'){campusScope=e.target.value;equipmentFilter='all';if(page==='devices'||page==='classes'){render();}else if(campusScope==='all'){location.hash='overview';if(page==='overview')render();}else openCampus(campusScope);}});
$('#add-student').onclick=()=>editStudent();
$('#export-button').onclick=exportCSV;
$('#mode-button').onclick=()=>{$('#connection-error').textContent='';$('#connection-dialog').showModal();};
$('#profile-settings').onclick=()=>$('#connection-dialog').showModal();
$('#help-button').onclick=()=>$('#help-dialog').showModal();
$('#mobile-menu').onclick=()=>$('.sidebar').classList.toggle('open');
$('#notification-button').onclick=()=>{const r=sensor();toast(mode==='demo'?'Bạn đang xem dữ liệu mẫu. Kết nối ESP32 để nhận dữ liệu thật.':!connected?'Máy chủ đang mất kết nối.':!isOnline()?'Chưa nhận dữ liệu ESP32 trong 30 giây.':r&&r.temperature>32?'Nhiệt độ phòng trên 32°C. Kiểm tra thông gió.':'Kết nối đang hoạt động. Không có thông báo mới.');};
$('#student-form').onsubmit=async e=>{
  e.preventDefault();const id=$('#student-id').value,name=$('#student-name').value.trim(),uid=$('#student-uid').value.replace(/[:\s-]/g,'').toUpperCase();
  if(!name||name.length>100)return $('#student-error').textContent='Nhập tên từ 1 đến 100 ký tự.';
  if(uid&&!/^(?:[A-F0-9]{8}|[A-F0-9]{14}|[A-F0-9]{20})$/.test(uid))return $('#student-error').textContent='UID phải có 8, 14 hoặc 20 ký tự hex (0–9, A–F).';
  try{
    if(mode==='live'){await api('/api/students',{id:id||undefined,name,uid});await poll();}
    else{if(uid&&state.students.some(s=>s.uid===uid&&s.id!==id))throw new Error('Thẻ này đã được gán cho học sinh khác.');const s=state.students.find(s=>s.id===id);if(s){s.name=name;s.uid=uid;}else state.students.push({id:crypto.randomUUID(),name,uid,inside:0,last_at:null,last_action:null});demoSave();render();}
    $('#student-dialog').close();toast('Đã lưu thông tin học sinh.');
  }catch(err){$('#student-error').textContent=err.message;}
};
$('#connection-form').onsubmit=async e=>{
  e.preventDefault();const token=$('#admin-token').value.trim();if(!token)return $('#connection-error').textContent='Nhập khóa quản trị từ data/credentials.json.';
  const button=e.submitter;button.disabled=true;$('#connection-error').textContent='Đang kết nối...';
  try{const result=await api('/api/state',undefined,token);if(result.mode!=='live')throw new Error('Máy chủ không hợp lệ.');adminToken=token;try{sessionStorage.setItem('classroom-admin',token);}catch{}mode='live';state=result;connected=true;search='';filter='all';tablePage=1;render();$('#admin-token').value='';$('#connection-dialog').close();toast('Đã kết nối máy chủ. Chờ ESP32 gửi dữ liệu.');}
  catch(err){$('#connection-error').textContent=err.message;}finally{button.disabled=false;}
};
$('#demo-mode-button').onclick=()=>{mode='demo';state=demo;connected=false;adminToken='';try{sessionStorage.removeItem('classroom-admin');}catch{}search='';filter='all';tablePage=1;render();$('#connection-dialog').close();toast('Đang dùng dữ liệu mẫu.');};
$('#camera-source').onchange=()=>{$('#camera-url-label').hidden=$('#camera-source').value!=='ip';};
$('#stop-camera').onclick=()=>{stopCamera();render();$('#camera-dialog').close();toast('Đã tắt camera.');};
$('#camera-form').onsubmit=async e=>{
  e.preventDefault();$('#camera-error').textContent='';
  try{
    if($('#camera-source').value==='usb'){
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Webcam cần HTTPS hoặc http://localhost:8080.');
      const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});stopCamera();cameraStream=stream;cameraStatus='Webcam trực tiếp';stream.getVideoTracks()[0].onended=()=>{stopCamera();render();};
    }else{
      const url=new URL($('#camera-url').value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Nhập địa chỉ HTTP/HTTPS, không chứa tên đăng nhập hoặc mật khẩu.');
      if(location.protocol==='https:'&&url.protocol==='http:')throw new Error('Trình duyệt chặn camera HTTP trên trang HTTPS. Mở giao diện tại http://localhost:8080 để xem camera nội bộ.');
      stopCamera();cameraURL=url.href;cameraStatus='Đang kết nối camera IP';
    }
    render();$('#camera-dialog').close();
  }catch(err){$('#camera-error').textContent=err.name==='NotAllowedError'?'Bạn chưa cấp quyền camera. Cho phép camera trong trình duyệt rồi thử lại.':err.name==='NotFoundError'?'Không tìm thấy webcam trên máy tính.':err.message;}
};
window.addEventListener('hashchange',applyRoute);
window.addEventListener('beforeunload',stopCamera);
function updateClock(){const now=new Date();$('#current-date').textContent=now.toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'long',day:'2-digit',month:'long',year:'numeric'});$('#clock').textContent=now.toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'})+' ICT';}
decorate();applyRoute();updateClock();
setInterval(updateClock,1000);setInterval(poll,2000);
if(adminToken){api('/api/state').then(s=>{mode='live';state=s;connected=true;render();}).catch(()=>{toast('Phiên thiết bị thật chưa kết nối. Mở cài đặt để đăng nhập lại.');});}
