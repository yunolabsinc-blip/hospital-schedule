var sb, currentRejectUserId = null;

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
          document.getElementById('adminEmail').textContent = s.user.email + ' (superadmin)';
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
  document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none';
  document.getElementById('allTab').style.display     = tab === 'all'     ? 'block' : 'none';
  document.getElementById('dataTab').style.display    = tab === 'data'    ? 'block' : 'none';
  if (tab === 'data') loadUserData();
}

function loadAll() {
  loadStats();
  loadPendingList();
  loadAllList();
}

function loadStats() {
  sb.from('user_profiles').select('status').then(function(r) {
    var d = r.data || [];
    var cnt = function(s) { return d.filter(function(u){return u.status===s;}).length; };
    var el = function(id,v) { var e=document.getElementById(id); if(e) e.textContent=v; };
    el('statPending',cnt('pending'));
    el('statApproved',cnt('approved'));
    el('statRejected',cnt('rejected'));
    el('statInactive',cnt('inactive'));
    var badge = document.getElementById('pendingBadge');
    if (badge) badge.textContent = cnt('pending');
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
  var container = document.getElementById('pendingList');
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').eq('status','pending').order('created_at',{ascending:false})
    .then(function(r) {
      var data = r.data || [];
      if (!data.length) { container.innerHTML = '<p style="color:#aaa;padding:20px">No pending requests</p>'; return; }
      container.innerHTML = data.map(function(u) {
        return '<div class="user-card pending-card" id="card-'+u.id+'">'+
          '<div class="avatar av-pending">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
          '<div class="user-info">'+
          '<div class="user-name">'+esc(u.name)+'</div>'+
          '<div class="user-detail">'+esc(u.email)+' - '+esc(u.company)+'</div>'+
          '<div class="user-meta">'+esc(u.job_title||'')+' / '+esc(u.region||'No region')+' / '+formatDate(u.created_at)+'</div>'+
          '<div style="margin-top:4px"><select onchange="setPendingRole(\''+u.id+'\',this.value)" style="font-size:11px;padding:2px 6px;border:1px solid #e2e8f0;border-radius:6px">'+
          '<option value="user">Sales Rep</option>'+
          '<option value="manager">Manager</option>'+
          '</select></div>'+
          '</div>'+
          '<span class="status-badge pending">Pending</span>'+
          '<div class="action-btns">'+
          '<button class="btn-approve" onclick="approveUser(\''+u.id+'\')">승인</button>'+
          '<button class="btn-reject" onclick="openRejectModal(\''+u.id+'\')">거절</button>'+
          '</div></div>';
      }).join('');
    });
}

var pendingRoles = {};
function setPendingRole(uid, role) { pendingRoles[uid] = role; }

function approveUser(uid) {
  var role = pendingRoles[uid] || 'user';
  if (!confirm('Approve this user as ' + role + '?')) return;
  sb.from('user_profiles').update({status:'approved',role:role,approved_at:new Date().toISOString()}).eq('id',uid)
    .then(function(r) {
      if (r.error) { alert('Error: '+r.error.message); return; }
      alert('Approved!');
      loadAll();
    });
}

function openRejectModal(uid) {
  currentRejectUserId = uid;
  document.getElementById('rejectModal').style.display = 'flex';
}

function closeRejectModal() {
  document.getElementById('rejectModal').style.display = 'none';
  document.getElementById('rejectReason').value = '';
  currentRejectUserId = null;
}

function confirmReject() {
  if (!currentRejectUserId) return;
  var reason = document.getElementById('rejectReason').value.trim();
  sb.from('user_profiles').update({status:'rejected',rejection_reason:reason}).eq('id',currentRejectUserId)
    .then(function(r) {
      if (r.error) { alert('Error: '+r.error.message); return; }
      closeRejectModal();
      loadAll();
    });
}

function loadAllList() {
  var container = document.getElementById('allList');
  if (!container) return;
  container.innerHTML = '<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').order('created_at',{ascending:false})
    .then(function(r) {
      var data = r.data || [];
      container.innerHTML = data.map(function(u) {
        var badgeClass = u.status==='approved'?'approved':u.status==='pending'?'pending':'rejected';
        return '<div class="user-card" id="card-all-'+u.id+'">'+
          '<div class="avatar">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
          '<div class="user-info">'+
          '<div class="user-name">'+esc(u.name)+(u.role==='superadmin'?' 👑':'')+'</div>'+
          '<div class="user-detail">'+esc(u.email)+' - '+esc(u.company)+'</div>'+
          '<div class="user-meta">'+esc(u.role)+' / '+esc(u.job_title||'')+' / '+formatDate(u.created_at)+'</div>'+
          '</div>'+
          '<span class="status-badge '+badgeClass+'">'+esc(u.status)+'</span>'+
          (u.status!=='superadmin'?'<div class="action-btns"><button class="btn-reject" onclick="deactivateUser(\''+u.id+'\')" style="background:#f59e0b;border-color:#f59e0b">비활성화</button></div>':'')+
          '</div>';
      }).join('');
    });
}

function deactivateUser(uid) {
  if (!confirm('Deactivate this user?')) return;
  sb.from('user_profiles').update({status:'inactive',inactive_at:new Date().toISOString()}).eq('id',uid)
    .then(function(r) {
      if (r.error) { alert('Error: '+r.error.message); return; }
      loadAll();
    });
}

function loadUserData() {
  var tbody = document.getElementById('activityTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa">Loading...</td></tr>';
  sb.from('user_app_data').select('user_id,email,name,company,data_v9,synced_at').order('synced_at',{ascending:false})
    .then(function(r) {
      var data = r.data || [];
      if (r.error) { tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#e53e3e">'+r.error.message+'</td></tr>'; return; }
      if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa">No data yet</td></tr>'; return; }
      var rows = [];
      var totalH=0, totalD=0, totalR=0;
      data.forEach(function(user) {
        var v9 = user.data_v9;
        if (!v9) return;
        var hospitals = v9.hospitals || [];
        var doctors = v9.doctors || [];
        var plans = v9.plans || {};
        totalH += hospitals.length; totalD += doctors.length;
        Object.keys(plans).forEach(function(drKey) {
          var dates = plans[drKey];
          if (typeof dates !== 'object') return;
          Object.keys(dates).forEach(function(date) {
            var rec = dates[date];
            if (!rec || !rec.checked) return;
            totalR++;
            var hospId = drKey.replace(/_\d+$/, '');
            var drIdx = parseInt(drKey.split('_').pop()) || 0;
            var hosp = hospitals.find(function(h){return h.id===hospId;});
            var dr = doctors[drIdx];
            rows.push({
              user: user.name||user.email, company: user.company||'',
              hosp: hosp?hosp.name:hospId, dr: dr?dr.name:drKey,
              dept: dr?dr.dept:'', date:date, time:rec.time||'',
              products: Array.isArray(rec.products)?rec.products.join(', '):(rec.product||''),
              note: rec.note||'', synced: (user.synced_at||'').substring(0,10)
            });
          });
        });
      });
      var el=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      el('statSyncUsers',data.length); el('statHospitals',totalH); el('statDoctors',totalD); el('statRecords',totalR);
      window._activityRows = rows;
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa">No completed records</td></tr>'; return; }
      tbody.innerHTML = rows.map(function(r,i) {
        var bg = i%2===0?'':'background:#fafafa';
        return '<tr style="border-bottom:1px solid #f0f0f0;'+bg+'">'+
          '<td style="padding:10px 14px"><div style="font-weight:500">'+esc(r.user)+'</div><div style="font-size:11px;color:#aaa">'+esc(r.company)+'</div></td>'+
          '<td style="padding:10px 14px;font-size:13px">'+esc(r.hosp)+'</td>'+
          '<td style="padding:10px 14px"><div>'+esc(r.dr)+'</div><div style="font-size:11px;color:#aaa">'+esc(r.dept)+'</div></td>'+
          '<td style="padding:10px 14px;font-size:13px">'+esc(r.date)+'</td>'+
          '<td style="padding:10px 14px;font-size:13px">'+esc(r.time)+'</td>'+
          '<td style="padding:10px 14px;font-size:12px;color:#2563eb">'+esc(r.products)+'</td>'+
          '<td style="padding:10px 14px;font-size:12px;color:#555">'+esc(r.note)+'</td>'+
          '</tr>';
      }).join('');
    });
}

function exportExcel() {
  var rows = window._activityRows;
  if (!rows || !rows.length) { alert('No data. Click refresh first.'); return; }
  var headers = ['User','Company','Hospital','Doctor','Dept','Date','Time','Products','Note','Synced'];
  var csv = [headers.join(',')].concat(rows.map(function(r) {
    return [r.user,r.company,r.hosp,r.dr,r.dept,r.date,r.time,r.products,r.note,r.synced]
      .map(function(v){return '"'+(v||'').replace(/"/g,'""')+'"';}).join(',');
  })).join('\n');
  var blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href=url; a.download='drcheck_activity_'+new Date().toISOString().substring(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
