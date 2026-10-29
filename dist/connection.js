'use strict';
let connectionTransport='wifi';
const isLocalConnection = () => ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const localCOMURL = () => `http://localhost:${location.port||8080}/#connect-com`;
const displayDeviceIP = () => state.device.ip||(state.device.transport==='usb'?'USB · Không dùng IP Wi-Fi':'Chưa nhận dữ liệu');
const deviceConnectionHelp = () => state.device.transport==='usb'?'RC522 dùng nguồn 3.3V. Dữ liệu đang truyền qua cáp USB; không cần Wi-Fi của ESP32.':'RC522 dùng nguồn 3.3V. Nếu dùng Wi-Fi, máy tính và ESP32 cần cùng mạng. Bạn cũng có thể chọn cổng COM / USB.';

function useLiveState(result) {
  mode='live';state=result;connected=true;search='';filter='all';tablePage=1;
  render();
}

async function localConnectionAccess() {
  if(!isLocalConnection())throw new Error('Mở kết nối COM trên máy đang cắm ESP32 bằng nút bên dưới.');
  if(adminToken){try{await api('/api/state');return adminToken;}catch{}}
  const response=await fetch('/api/local-session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('Chạy start.bat rồi mở http://localhost:8080 trên máy tính.');
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Không thể ghép nối máy tính này.');
  adminToken=result.token;
  try{sessionStorage.setItem('classroom-admin',adminToken);}catch{}
  return adminToken;
}

function updateSerialDialogStatus(serial=state.serial) {
  const status=$('#serial-connection-status');if(!status)return;
  status.textContent=serial?.connected?(serial.ready?`Đã kết nối ${serial.port} · 115200 baud`:`Đã mở ${serial.port} · Đang chờ ESP32 phản hồi`):serial?.error||'Chưa kết nối cổng COM';
  status.dataset.ready=serial?.connected&&serial?.ready?'true':'false';
  $('#disconnect-com').hidden=!serial?.connected;
}

async function refreshCOMPorts() {
  if(!isLocalConnection())return;
  const refresh=$('#refresh-com-ports');refresh.disabled=true;
  try{
    await localConnectionAccess();
    const result=await api('/api/serial/ports'),select=$('#com-port');
    const preferred=select.value||result.serial?.port||readLocal('classroom-com-port','');
    select.innerHTML=result.ports.map(p=>`<option value="${escapeHTML(p.port)}">${escapeHTML(p.port)} · ${escapeHTML(p.description)}</option>`).join('');
    if(result.ports.some(p=>p.port===preferred))select.value=preferred;
    if(!result.ports.length)select.innerHTML='<option value="">Chưa tìm thấy cổng COM</option>';
    updateSerialDialogStatus(result.serial);
    $('#connection-error').textContent=result.ports.length?'':'Chưa thấy ESP32. Kiểm tra cáp USB rồi bấm Tải lại cổng.';
  }catch(error){
    const select=$('#com-port');
    if(select)select.innerHTML=`<option value="">Lỗi: ${escapeHTML(error.message)}</option>`;
    $('#connection-error').textContent=error.message;
  }finally{refresh.disabled=false;}
}

async function setConnectionTransport(transport) {
  connectionTransport=transport;
  const usb=transport==='usb';
  $('#wifi-connection-panel').hidden=usb;
  $('#usb-connection-panel').hidden=!usb;
  $('#connection-submit').textContent=usb?'Kết nối COM':'Kết nối';
  $('#connection-submit').disabled=usb&&!isLocalConnection();
  $('#connection-error').textContent='';
  $$('[data-connection-transport]').forEach(b=>{const selected=b.dataset.connectionTransport===transport;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  $('#remote-com-notice').hidden=isLocalConnection();
  $('#local-com-controls').hidden=!isLocalConnection();
  $('#open-local-com').href=localCOMURL();
  if(usb)await refreshCOMPorts();
}

function openConnection(transport) {
  if(!$('#connection-dialog').open)$('#connection-dialog').showModal();
  setConnectionTransport(transport||(state.serial?.connected?'usb':'wifi'));
}

function initConnectionUI() {
  $$('[data-connection-transport]').forEach(b=>b.onclick=()=>setConnectionTransport(b.dataset.connectionTransport));
  $('#refresh-com-ports').onclick=refreshCOMPorts;
  $('#disconnect-com').onclick=async()=>{
    try{await localConnectionAccess();const result=await api('/api/serial/disconnect',{});updateSerialDialogStatus(result.serial);useLiveState(await api('/api/state'));toast('Đã ngắt cổng COM.');}catch(e){$('#connection-error').textContent=e.message;}
  };
  $('#connection-form').onsubmit=async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;$('#connection-error').textContent='Đang kết nối...';
    try{
      if(connectionTransport==='usb'){
        await localConnectionAccess();
        const port=$('#com-port').value;if(!port)throw new Error('Chọn một cổng COM trước khi kết nối.');
        await api('/api/serial/connect',{port});saveLocal('classroom-com-port',port);
      }else{
        const token=$('#admin-token').value.trim();
        if(token){await api('/api/state',undefined,token);adminToken=token;try{sessionStorage.setItem('classroom-admin',token);}catch{}}
        else if(isLocalConnection())await localConnectionAccess();
        else throw new Error('Nhập khóa quản trị từ data/credentials.json hoặc mở localhost trên máy tính đang chạy máy chủ.');
      }
      const result=await api('/api/state');if(result.mode!=='live')throw new Error('Máy chủ không hợp lệ.');
      useLiveState(result);$('#admin-token').value='';$('#connection-dialog').close();
      if(location.hash==='#connect-com')location.hash='class/1A1';
      toast(connectionTransport==='usb'?'Đã mở cổng COM. Dữ liệu sẽ cập nhật khi ESP32 phản hồi.':'Đã kết nối máy chủ nội bộ.');
    }catch(err){$('#connection-error').textContent=err.message;}finally{button.disabled=connectionTransport==='usb'&&!isLocalConnection();}
  };
  if(location.hash==='#connect-com')openConnection('usb');
}
