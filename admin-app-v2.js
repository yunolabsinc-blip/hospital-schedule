var sb, currentRejectUserId = null;
var _allUsersData = [];
var _activityRows = [];

(function init() {
  sb = supabase.createClient(
    'https://hslxclmezfudjgmehriy.supabase.co',
    'sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT'
  );
  document.addEventListener('DOMContentLoaded', function() {
    sb.auth.getSession().then(function(r) {
      var s = r.data && r.data.session;
      if (!s) { window.location.href = 'login.html'; return; }
      sb.from('user_profiles').select('status,role,name').eq('id', s.user.id).maybeSingle()
        .then(function(r2) {
          var p = r2.data;
          if (!p || p.status !== 'approved' || p.role !== 'superadmin') {
            window.location.href = 'login.html'; return;
          }
          var el = document.getElementById('adminEmail');
          if (el) el.textContent = s.user.email + ' (superadmin)';
          loadAll();
        });
    });
  });
})();

function logout() {
  sb.auth.signOut().then(function() { window.location.href = 'login.html'; });
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
  event.target.classList.add('active');
  document.getElementById('pendingTab').style.display = tab==='pending'?'block':'none';
  document.getElementById('allTab').style.display     = tab==='all'    ?'block':'none';
  document.getElementById('dataTab').style.display    = tab==='data'   ?'block':'none';
  if (tab === 'data') loadUserData();
}

function loadAll() { loadStats(); loadPendingList(); loadAllList(); }

function loadStats() {
  sb.from('user_profiles').select('status').then(function(r) {
    var d = r.data || [];
    var cnt = function(s) { return d.filter(function(u){ return u.status===s; }).length; };
    ['statPending','statApproved','statRejected','statInactive'].forEach(function(id,i) {
      var e = document.getElementById(id);
      if (e) e.textContent = cnt(['pending','approved','rejected','inactive'][i]);
    });
    var b = document.getElementById('pendingBadge');
    if (b) b.textContent = cnt('pending');
  });
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');
}

function loadPendingList() {
  var c = document.getElementById('pendingList');
  if (!c) return;
  c.innerHTML = '<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').eq('status','pending').order('created_at',{ascending:false})
    .then(function(r) {
      var data = r.data || [];
      if (!data.length) { c.innerHTML = '<p style="color:#aaa;padding:20px;text-align:center">승인 대기 중인 신청이 없습니다</p>'; return; }
      c.innerHTML = data.map(function(u) {
        return '<div class="user-card pending-card" id="card-'+u.id+'">'+
          '<div class="avatar av-pending">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
          '<div class="user-info">'+
            '<div class="user-name">'+esc(u.name)+'</div>'+
            '<div class="user-detail">'+esc(u.email)+' &middot; '+esc(u.company)+'</div>'+
            '<div class="user-meta">'+
              '직책: '+esc(u.job_title||'-')+
              ' &middot; 지역: '+esc(u.region||'-')+
              ' &middot; 전화: '+esc(u.phone||'-')+
              ' &middot; 신청일: '+formatDate(u.created_at)+
            '</div>'+
            '<div style="margin-top:6px"><select onchange="setPendingRole(\"'+u.id+'\",this.value)" style="font-size:11px;padding:2px 6px;border:1px solid #e2e8f0;border-radius:6px">'+
              '<option value="user">영업 담당자</option>'+
              '<option value="manager">팜장 / 관리자</option>'+
            '</select></div>'+
          '</div>'+
          '<span class="status-badge pending">대기 중</span>'+
          '<div class="action-btns">'+
            '<button class="btn-approve" onclick="approveUser(\"'+u.id+'\")"> 승인</button>'+
            '<button class="btn-reject"  onclick="openRejectModal(\"'+u.id+'\")"> 거절</button>'+
          '</div>'+
          '</div>';
      }).join('');
    });
}

var pendingRoles = {};
function setPendingRole(uid, role) { pendingRoles[uid] = role; }

function approveUser(uid) {
  var role = pendingRoles[uid] || 'user';
  var label = role==='manager'?'팜장/관리자':'영업 담당자';
  if (!confirm('이 사용자를 ['+label+'] 로 승인하시겠습니까?')) return;
  sb.from('user_profiles').update({status:'approved',role:role,approved_at:new Date().toISOString()}).eq('id',uid)
    .then(function(r) {
      if (r.error) { alert('Error: '+r.error.message); return; }
      alert('승인되었습니다!');
      loadAll();
    });
}

function openRejectModal(uid) {
  currentRejectUserId = uid;
  var m = document.getElementById('rejectModal');
  if (m) m.style.display = 'flex';
}
function closeRejectModal() {
  var m = document.getElementById('rejectModal');
  if (m) m.style.display = 'none';
  var r = document.getElementById('rejectReason');
  if (r) r.value = '';
  currentRejectUserId = null;
}
function confirmReject() {
  if (!currentRejectUserId) return;
  var reason = (document.getElementById('rejectReason')||{}).value || '';
  sb.from('user_profiles').update({status:'rejected',rejection_reason:reason}).eq('id',currentRejectUserId)
    .then(function(r) {
      if (r.error) { alert('Error: '+r.error.message); return; }
      closeRejectModal(); loadAll();
    });
}

function loadAllList() {
  var c = document.getElementById('allList');
  if (!c) return;
  c.innerHTML = '<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').order('created_at',{ascending:false})
    .then(function(r) {
      _allUsersData = r.data || [];
      var companies = _allUsersData.map(function(u){return u.company||'';}).filter(Boolean);
      companies = companies.filter(function(v,i,a){return a.indexOf(v)===i;}).sort();
      var cs = document.getElementById('filterCompany');
      if (cs) {
        var cur = cs.value;
        cs.innerHTML = '<option value="">전체 회사</option>' +
          companies.map(function(c){return '<option value="'+esc(c)+'"'+(c===cur?' selected':'')+'>'+esc(c)+'</option>';}).join('');
      }
      renderAllUsers(_allUsersData);
    });
}

function filterAllUsers() {
  var company = (document.getElementById('filterCompany')||{}).value||'';
  var status  = (document.getElementById('filterStatus') ||{}).value||'';
  var search  = ((document.getElementById('filterSearch')||{}).value||'').toLowerCase();
  var filtered = _allUsersData.filter(function(u) {
    if (company && u.company !== company) return false;
    if (status  && u.status  !== status)  return false;
    if (search  && !((u.name||'').toLowerCase().includes(search)||(u.email||'').toLowerCase().includes(search))) return false;
    return true;
  });
  renderAllUsers(filtered);
}

function renderAllUsers(data) {
  var c = document.getElementById('allList');
  if (!c) return;
  if (!data.length) { c.innerHTML = '<p style="color:#aaa;padding:20px;text-align:center">해당 사용자 없음</p>'; return; }
  var sl = {approved:'승인됨',pending:'대기 중',rejected:'거절됨',inactive:'비활성화'};
  c.innerHTML = data.map(function(u) {
    var bc = u.status==='approved'?'approved':u.status==='pending'?'pending':'rejected';
    return '<div class="user-card" id="card-all-'+u.id+'">'+
      '<div class="avatar">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
      '<div class="user-info">'+
        '<div class="user-name">'+esc(u.name)+(u.role==='superadmin'?' 👑':'')+'</div>'+
        '<div class="user-detail">'+esc(u.email)+' &middot; '+esc(u.company||'-')+'</div>'+
        '<div class="user-meta">'+
          '역할: '+esc(u.role)+' &middot; 직책: '+esc(u.job_title||'-')+
          ' &middot; 지역: '+esc(u.region||'-')+' &middot; 전화: '+esc(u.phone||'-')+
          ' &middot; 가입일: '+formatDate(u.created_at)+
        '</div>'+
      '</div>'+
      '<span class="status-badge '+bc+'">'+(sl[u.status]||u.status)+'</span>'+
      (u.role!=='superadmin'?'<div class="action-btns"><button class="btn-reject" onclick="deactivateUser(\"'+u.id+'\")" style="background:#f59e0b;border-color:#f59e0b;color:white">비활성화</button></div>':'')+
      '</div>';
  }).join('');
}

function deactivateUser(uid) {
  if (!confirm('비활성화하시겠습니까?')) return;
  sb.from('user_profiles').update({status:'inactive',inactive_at:new Date().toISOString()}).eq('id',uid)
    .then(function(r) { if (r.error) { alert('Error: '+r.error.message); return; } loadAll(); });
}

function loadUserData() {
  var tb = document.getElementById('activityTableBody');
  if (!tb) return;
  tb.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#aaa">Loading...</td></tr>';
  sb.from('user_app_data').select('user_id,email,name,company,data_v9,synced_at').order('synced_at',{ascending:false})
    .then(function(r) {
      var data = r.data || [];
      if (r.error) { tb.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#e53e3e">'+r.error.message+'</td></tr>'; return; }
      if (!data.length) { tb.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#aaa">데이터 없음</td></tr>'; return; }
      var rows = [], totalH=0, totalD=0, totalR=0;
      data.forEach(function(user) {
        var v9 = user.data_v9;
        if (!v9) return;
        var hospitals=v9.hospitals||[], doctors=v9.doctors||[], plans=v9.plans||{};
        totalH += hospitals.length; totalD += doctors.length;
        Object.keys(plans).forEach(function(drKey) {
          var dates = plans[drKey];
          if (typeof dates !== 'object') return;
          Object.keys(dates).forEach(function(date) {
            var rec = dates[date];
            if (!rec) return;
            var hospId = drKey.replace(/_\d+$/, '');
            var drIdx  = parseInt((drKey.match(/_([0-9]+)$/) || [0,0])[1]) || 0;
            var hosp   = hospitals.find(function(h){ return h.id===hospId; });
            var dr     = doctors[drIdx];
            var done   = !!rec.checked;
            if (done) totalR++;
            rows.push({
              user:    user.name||user.email, company: user.company||'',
              hosp:    hosp?hosp.name:hospId, dr:     dr?dr.name:drKey,
              dept:    dr?(dr.dept||')':'', date:  date, time: rec.time||'',
              products:Array.isArray(rec.products)?rec.products.join(', '):(rec.product||''),
              note:    rec.note||rec.planNote||'',
              type:    done?'completed':'planned',
              synced:  (user.synced_at||'').substring(0,10)
            });
          });
        });
      });
      var el=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      el('statSyncUsers',data.length); el('statHospitals',totalH); el('statDoctors',totalD); el('statRecords',totalR);
      _activityRows = rows;
      updateActivityFilters(rows);
      renderActivityTable(rows);
    });
}

function updateActivityFilters(rows) {
  var uniq = function(arr) { return arr.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(); };
  var users    = uniq(rows.map(function(r){return r.user;}));
  var hosps    = uniq(rows.map(function(r){return r.hosp;}));
  var doctors  = uniq(rows.map(function(r){return r.dr;}));
  var allProds = [];
  rows.forEach(function(r){r.products.split(',').forEach(function(p){var t=p.trim();if(t)allProds.push(t);});});
  var products = uniq(allProds);
  var setOpts = function(id, items, label) {
    var s = document.getElementById(id);
    if (!s) return;
    s.innerHTML = '<option value="">'+label+'</option>' +
      items.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  };
  setOpts('filterDataUser',   users,   '전체 사용자');
  setOpts('filterDataHosp',   hosps,   '전체 거래처');
  setOpts('filterDataDoctor', doctors, '전체 의사');
  setOpts('filterDataProduct',products,'전체 제품');
}

function filterActivityData() {
  var user    = (document.getElementById('filterDataUser')   ||{}).value||'';
  var hosp    = (document.getElementById('filterDataHosp')   ||{}).value||'';
  var doctor  = (document.getElementById('filterDataDoctor') ||{}).value||'';
  var product = (document.getElementById('filterDataProduct')||{}).value||'';
  var type    = (document.getElementById('filterDataType')   ||{}).value||'';
  var filtered = _activityRows.filter(function(r) {
    if (user    && r.user!==user)              return false;
    if (hosp    && r.hosp!==hosp)              return false;
    if (doctor  && r.dr!==doctor)              return false;
    if (product && !r.products.includes(product)) return false;
    if (type    && r.type!==type)              return false;
    return true;
  });
  renderActivityTable(filtered);
}

function renderActivityTable(rows) {
  var tb = document.getElementById('activityTableBody');
  if (!tb) return;
  if (!rows.length) { tb.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#aaa">필터 결과 없음</td></tr>'; return; }
  tb.innerHTML = rows.map(function(r,i) {
    var bg = i%2===0?'':'background:#fafafa';
    var badge = r.type==='completed'
      ? '<span style="background:#dcfce7;color:#166534;font-size:10px;padding:2px 6px;border-radius:4px">결과</span>'
      : '<span style="background:#eff6ff;color:#1d4ed8;font-size:10px;padding:2px 6px;border-radius:4px">계획</span>';
    return '<tr style="border-bottom:1px solid #f0f0f0;'+bg+'">'+
      '<td style="padding:10px 14px"><div style="font-weight:500;font-size:13px">'+esc(r.user)+'</div><div style="font-size:11px;color:#aaa">'+esc(r.company)+'</div></td>'+
      '<td style="padding:10px 14px;font-size:13px">'+esc(r.hosp)+'</td>'+
      '<td style="padding:10px 14px"><div style="font-size:13px">'+esc(r.dr)+'</div><div style="font-size:11px;color:#aaa">'+esc(r.dept)+'</div></td>'+
      '<td style="padding:10px 14px;font-size:13px;white-space:nowrap">'+esc(r.date)+'</td>'+
      '<td style="padding:10px 14px;font-size:13px">'+esc(r.time)+'</td>'+
      '<td style="padding:10px 14px;font-size:12px;color:#2563eb">'+esc(r.products)+'</td>'+
      '<td style="padding:10px 14px;font-size:12px;color:#555;max-width:160px">'+esc(r.note)+'</td>'+
      '<td style="padding:10px 14px">'+badge+'</td>'+
      '</tr>';
  }).join('');
}

function exportExcel() {
  var user=(document.getElementById('filterDataUser')||{}).value||'';
  var hosp=(document.getElementById('filterDataHosp')||{}).value||'';
  var doctor=(document.getElementById('filterDataDoctor')||{}).value||'';
  var product=(document.getElementById('filterDataProduct')||{}).value||'';
  var type=(document.getElementById('filterDataType')||{}).value||'';
  var rows = _activityRows.filter(function(r) {
    if (user    && r.user!==user)              return false;
    if (hosp    && r.hosp!==hosp)              return false;
    if (doctor  && r.dr!==doctor)              return false;
    if (product && !r.products.includes(product)) return false;
    if (type    && r.type!==type)              return false;
    return true;
  });
  if (!rows.length) { alert('데이터가 없습니다.'); return; }
  var h = ['사용자','회사','거래처','의사','진료과','날짜','시간대','제품','활동내용','구분'];
  var csv = [h.join(',')].concat(rows.map(function(r) {
    return [r.user,r.company,r.hosp,r.dr,r.dept,r.date,r.time,r.products,r.note,r.type==='completed'?'결과':'계획']
      .map(function(v){return '"'+(v||'').replace(/"/g,'""')+'"';}).join(',');
  })).join('\n');
  var blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href=url; a.download='drcheck_'+new Date().toISOString().substring(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
