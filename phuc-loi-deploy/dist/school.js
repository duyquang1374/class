'use strict';
// School structure is shared by the overview, campus details and device monitor.
const campuses = [
  {id:'main',name:'Trường chính',description:'Cơ sở chính · Trường Tiểu học Phúc Lợi',short:'Cơ sở chính'},
  {id:'branch',name:'Phân hiệu',description:'Điểm trường phân hiệu · Trường Tiểu học Phúc Lợi',short:'Phân hiệu'}
];
const equipmentDefinitions = [
  {id:'lights',name:'Hệ thống đèn',kind:'Chiếu sáng',icon:'bulb',room:'Phòng 101'},
  {id:'fan_1',name:'Quạt trần 01',kind:'Quạt',icon:'fan',room:'Phòng 101'},
  {id:'fan_2',name:'Quạt trần 02',kind:'Quạt',icon:'fan',room:'Phòng 101'},
  {id:'projector',name:'Máy chiếu',kind:'Thiết bị dạy học',icon:'projector',room:'Phòng 101'},
  {id:'ac',name:'Điều hòa',kind:'Điều hòa',icon:'snowflake',room:'Phòng 101'}
];
let campusScope='all', equipmentFilter='all';
const campusName = id => campuses.find(c=>c.id===id)?.name || 'Toàn trường';
const scopedClasses = () => classes.filter(c=>campusScope==='all'||c.campus===campusScope);
const activeClassSelected = () => classes.some(c=>c.name===selectedClass&&c.active&&(campusScope==='all'||c.campus===campusScope));

function equipmentRows(scope=campusScope) {
  if(scope==='branch')return [];
  return equipmentDefinitions.map(d=>{
    const report=(state.equipment||[]).find(e=>e.id===d.id);
    const fresh=report&&(mode==='demo'||connected&&Date.now()-Date.parse(report.updated_at)<30000);
    const status=fresh&&['on','off'].includes(report.status)?report.status:'unknown';
    return {...d,campus:'main',className:'1A1',status,updated_at:report?.updated_at||null,stale:Boolean(report&&!fresh)};
  });
}
function equipmentBadge(status) {
  return status==='on'?'<span class="badge green equipment-on">● &nbsp;Đang bật</span>':status==='off'?'<span class="badge gray">○ &nbsp;Đã tắt</span>':'<span class="badge orange">— &nbsp;Chưa có dữ liệu</span>';
}
function stateFingerprint() {
  return JSON.stringify([state.students,state.events,state.readings,state.device,state.attended,state.equipment,connected,Boolean(isOnline()),Boolean(sensor()),equipmentRows('all').map(e=>e.status)]);
}
function schoolStats(scope=campusScope) {
  const s=scope==='branch'?{total:0,inside:0,attended:0}:stats();
  const rooms=classes.filter(c=>scope==='all'||c.campus===scope), devices=equipmentRows(scope);
  return {...s,rooms:rooms.length,active:rooms.filter(c=>c.active).length,on:devices.filter(e=>e.status==='on').length,unknown:devices.filter(e=>e.status==='unknown').length,devices:devices.length};
}
function campusCards() {
  return `<section class="campus-grid" aria-label="Hai cơ sở của nhà trường">${campuses.map(c=>{
    const s=schoolStats(c.id);
    return `<article class="campus-card ${c.id==='main'?'main-campus':'branch-campus'}"><div class="campus-card-top"><span class="campus-symbol">${icon('school')}</span><span class="badge ${s.active?'green':'gray'}">${s.active?'Có lớp đang hoạt động':'Chờ triển khai thiết bị'}</span></div><div class="campus-kicker">TRƯỜNG TIỂU HỌC PHÚC LỢI</div><h2>${c.name}</h2><p>${c.id==='main'?'Theo dõi lớp học và các thiết bị tại cơ sở chính.':'Không gian quản lý riêng cho điểm trường phân hiệu.'}</p><div class="campus-numbers"><div><strong>${s.rooms}</strong><span>Lớp đã tạo</span></div><div><strong>${s.inside}<small> / ${s.total}</small></strong><span>Học sinh trong lớp</span></div><div><strong>${s.on}</strong><span>Thiết bị đang bật</span></div></div><button class="button ${c.id==='main'?'primary':'secondary'}" data-campus="${c.id}">Xem cơ sở ${icon('arrow-right')}</button></article>`;
  }).join('')}</section>`;
}
function summaryStats(scope=campusScope) {
  const s=schoolStats(scope);
  return `<section class="stat-grid school-stats" aria-label="Thống kê nhà trường"><article class="stat-card emphasis"><div class="stat-title">${icon('school')}Cơ sở quản lý</div><div class="stat-value">${scope==='all'?2:1}<small>cơ sở</small></div><div class="stat-note">${scope==='all'?'1 trường chính · 1 phân hiệu':campusName(scope)}</div></article><article class="stat-card"><div class="stat-title">${icon('users')}Học sinh trong lớp</div><div class="stat-value">${s.inside}<small>/ ${s.total}</small></div><div class="stat-note">${s.attended} học sinh đã đến hôm nay</div></article><article class="stat-card"><div class="stat-title">${icon('grid')}Lớp học</div><div class="stat-value">${s.active}<small>/ ${s.rooms} lớp</small></div><div class="stat-note">${s.active} lớp hoạt động · ${s.rooms-s.active} lớp mẫu</div></article><button class="stat-card equipment-stat" data-open-devices="on"><div class="stat-title">${icon('bulb')}Thiết bị đang bật</div><div class="stat-value">${s.on}<small>/ ${s.devices}</small></div><div class="stat-note">${s.unknown?`${s.unknown} thiết bị chưa có dữ liệu`:'Bấm để xem danh sách chi tiết'} ${icon('arrow-right')}</div></button></section>`;
}
function schoolOverview() {
  return `<div class="school-intro"><div><span class="badge green">${icon('shield')} &nbsp;Góc quản lý nhà trường</span><h2>Hai cơ sở. Một không gian quản lý.</h2><p>Chọn trường chính hoặc phân hiệu để theo dõi lớp học, học sinh và các thiết bị đang sử dụng.</p></div><div class="intro-school" aria-hidden="true">${icon('school')}</div></div>${summaryStats('all')}${campusCards()}<div class="section-heading"><div><h2>Thiết bị đang sử dụng</h2><p>${mode==='demo'?'Trạng thái minh họa tại lớp 1A1 · Trường chính':'Trạng thái nhận từ ESP32 · Dữ liệu quá 30 giây cần được xác minh lại'}</p></div><button class="inline-link" data-open-devices="all">Xem tất cả thiết bị ${icon('arrow-right')}</button></div>${equipmentPanel(true)}`;
}
function campusOverview() {
  const c=campuses.find(c=>c.id===campusScope)||campuses[0];
  return `<div class="scope-breadcrumb"><a href="#overview">Toàn trường</a>${icon('chevron')}<strong>${c.name}</strong></div>${summaryStats(c.id)}<div class="section-heading"><div><h2>Các lớp tại ${c.name.toLocaleLowerCase('vi')}</h2><p>${c.id==='main'?'Lớp 1A1 đã sẵn sàng cho điểm danh và giám sát thiết bị.':'Các lớp được tạo sẵn. Chưa kết nối phần cứng tại phân hiệu.'}</p></div></div>${classesPage()}<div class="section-heading"><div><h2>Trạng thái thiết bị tại cơ sở</h2><p>Bấm vào tên thiết bị để xem thông tin chi tiết.</p></div><button class="inline-link" data-open-devices="all">Xem thêm ${icon('arrow-right')}</button></div>${equipmentPanel(true)}`;
}
function equipmentPanel(compact=false) {
  const all=equipmentRows(),rows=all.filter(d=>compact||equipmentFilter==='all'||d.status===equipmentFilter);
  const shown=compact?rows.filter(d=>d.status==='on'):rows;
  if(!all.length)return `<section class="panel empty-state equipment-empty">${icon('cpu')}<h2>Chưa kết nối thiết bị tại phân hiệu</h2><p>Các lớp tại phân hiệu là lớp mẫu. Khi có phần cứng được kết nối, trạng thái sẽ được hiển thị tại đây.</p><button class="button secondary" data-campus="main">Xem thiết bị tại trường chính ${icon('arrow-right')}</button></section>`;
  return `<section class="panel table-panel equipment-panel"><div class="table-heading"><div><h2>${compact?'Danh sách thiết bị đang bật':'Theo dõi thiết bị lớp học'}<span class="count-label">${compact?shown.length:all.length} thiết bị</span></h2><p>${mode==='demo'?'Dữ liệu mẫu · Chưa phản ánh thiết bị thực tế':'Tín hiệu phản hồi từ ESP32 · Chỉ theo dõi trạng thái'}</p></div>${compact?'':`<label class="equipment-filter-label">Trạng thái<select id="device-state-filter" class="filter-select" aria-label="Lọc trạng thái thiết bị"><option value="all">Tất cả thiết bị</option><option value="on" ${equipmentFilter==='on'?'selected':''}>Đang bật</option><option value="off" ${equipmentFilter==='off'?'selected':''}>Đã tắt</option><option value="unknown" ${equipmentFilter==='unknown'?'selected':''}>Chưa có dữ liệu</option></select></label>`}</div><div class="table-scroll"><table><thead><tr><th>THIẾT BỊ</th><th>CƠ SỞ / LỚP</th><th>TRẠNG THÁI</th><th>${mode==='demo'?'NGUỒN DỮ LIỆU':'CẬP NHẬT GẦN NHẤT'}</th><th></th></tr></thead><tbody>${shown.map(d=>`<tr><td><button class="equipment-name" data-equipment="${d.id}"><span class="equipment-icon ${d.status==='on'?'powered':''}">${icon(d.icon)}</span><span>${escapeHTML(d.name)}<small>${escapeHTML(d.kind)}</small></span></button></td><td>Trường chính <span class="muted">/</span> 1A1</td><td>${equipmentBadge(d.status)}</td><td>${mode==='demo'?'<span class="muted">Mẫu minh họa</span>':d.stale?'<span class="warning-text">Dữ liệu đã cũ</span>':timeText(d.updated_at)}</td><td><button class="inline-link" data-equipment="${d.id}" aria-label="Xem chi tiết ${escapeHTML(d.name)}">Chi tiết ${icon('arrow-up-right')}</button></td></tr>`).join('')||`<tr><td colspan="5"><div class="empty-state small">${compact?'Chưa có thiết bị nào được xác nhận đang bật.':'Không có thiết bị phù hợp với bộ lọc.'}${mode==='live'?' Thiết bị chưa gửi phản hồi sẽ hiện “Chưa có dữ liệu”.':''}</div></td></tr>`}</tbody></table></div><div class="panel-bottom">${icon('shield')}${mode==='demo'?'Bản dùng thử minh họa 3 thiết bị bật và 2 thiết bị tắt.':'Trạng thái bật/tắt chỉ được xác nhận khi có phản hồi còn mới. Không có phản hồi không đồng nghĩa với đã tắt.'}</div></section>`;
}
function showEquipment(id) {
  const item=equipmentRows('all').find(d=>d.id===id);if(!item)return;
  const dialog=$('#equipment-dialog');dialog.dataset.equipmentId=id;
  $('#equipment-dialog-title').textContent=item.name;
  $('#equipment-dialog-body').innerHTML=`<div class="equipment-detail-banner"><span class="equipment-icon ${item.status==='on'?'powered':''}">${icon(item.icon)}</span>${equipmentBadge(item.status)}</div><div class="device-row"><span>Cơ sở</span><strong>Trường chính</strong></div><div class="device-row"><span>Lớp / phòng</span><strong>1A1 · ${item.room}</strong></div><div class="device-row"><span>Loại thiết bị</span><strong>${item.kind}</strong></div><div class="device-row"><span>Nguồn trạng thái</span><strong>${mode==='demo'?'Dữ liệu minh họa':'Tín hiệu phản hồi ESP32'}</strong></div><div class="device-row"><span>Lần nhận gần nhất</span><strong>${mode==='demo'?'Chế độ dùng thử':fullTime(item.updated_at)}</strong></div><p class="form-hint">${mode==='demo'?'Đây là trạng thái mẫu để hiệu trưởng và quản lý trải nghiệm tính năng theo dõi thiết bị.':item.stale?'Phản hồi đã quá 30 giây hoặc mất kết nối máy chủ. Cần nhận dữ liệu mới để xác định thiết bị đang bật hay tắt.':'Thiết bị cần có mạch phản hồi trạng thái kết nối ESP32. Trang này chỉ hiển thị trạng thái, không gửi lệnh bật/tắt.'}</p>`;
  if(!dialog.open)dialog.showModal();
}
function applyRoute() {
  const parts=location.hash.slice(1).split('/');
  if(parts[0]==='class'&&classes.some(c=>c.name===parts[1])) {
    selectedClass=parts[1];campusScope=classes.find(c=>c.name===selectedClass).campus;page='classroom';
  }else if(parts[0]==='campus'&&campuses.some(c=>c.id===parts[1])) {
    campusScope=parts[1];page='campus';
  }else{page=labels[parts[0]]?parts[0]:'overview';if(page==='overview')campusScope='all';}
  if(['students','activity'].includes(page)&&!scopedClasses().some(c=>c.name===selectedClass))selectedClass=scopedClasses()[0].name;
  tablePage=1;search='';filter='all';$('.sidebar').classList.remove('open');render();
}
function openClass(name) {
  if(!classes.some(c=>c.name===name))return;
  const hash=`#class/${name}`;if(location.hash===hash)applyRoute();else location.hash=hash;
}
function openCampus(id) {
  if(!campuses.some(c=>c.id===id))return;
  const hash=`#campus/${id}`;if(location.hash===hash)applyRoute();else location.hash=hash;
}
