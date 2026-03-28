var sb,currentRejectUserId=null,currentDeactivateUserId=null,currentPriceUserId=null;
var _allUsersData=[],_activityRows=[];
(function init(){
  sb=supabase.createClient('https://hslxclmezfudjgmehriy.supabase.co','sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT');
  document.addEventListener('DOMContentLoaded',function(){
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      ['rejectModal','deactivateModal','priceModal'].forEach(function(id){
        var m=document.getElementById(id);if(m&&m.style.display==='flex')m.style.display='none';
      });
    });
    sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;
      if(!s){window.location.href='login.html';return;}
      sb.from('user_profiles').select('status,role,name').eq('id',s.user.id).maybeSingle()
        .then(function(r2){
          var p=r2.data;
          if(!p||p.status!=='approved'||p.role!=='superadmin'){window.location.href='login.html';return;}
          var el=document.getElementById('adminEmail');
          if(el)el.textContent=s.user.email+' (superadmin)';
          loadAll();
        });
    });
  });
})();
function logout(){sb.auth.signOut().then(function(){window.location.href='login.html';});}
function switchTab(tab){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  event.target.classList.add('active');
  document.getElementById('pendingTab').style.display=tab==='pending'?'block':'none';
  document.getElementById('allTab').style.display=tab==='all'?'block':'none';
  document.getElementById('dataTab').style.display=tab==='data'?'block':'none';
  if(tab==='data')loadUserData();
  if(tab==='all')loadAllList();
}
function loadAll(){loadStats();loadPendingList();loadAllList();}
function loadStats(){
  sb.from('user_profiles').select('status').then(function(r){
    var d=r.data||[];
    var cnt=function(s){return d.filter(function(u){return u.status===s;}).length;};
    [['statPending','pending'],['statApproved','approved'],['statRejected','rejected'],['statInactive','inactive']].forEach(function(x){
      var e=document.getElementById(x[0]);if(e)e.textContent=cnt(x[1]);
    });
    var b=document.getElementById('pendingBadge');if(b)b.textContent=cnt('pending');
  });
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(iso){if(!iso)return '-';var d=new Date(iso);return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');}
var PL={beta:'베타(무료)','4950':'4,950원/월','9900':'9,900원/월','19800':'19,800원/월','49500':'49,500원/년','99000':'99,000원/년',enterprise:'기업회원'};
function loadPendingList(){
  var c=document.getElementById('pendingList');if(!c)return;
  c.innerHTML='<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').eq('status','pending').order('created_at',{ascending:false})
    .then(function(r){
      var data=r.data||[];
      if(!data.length){c.innerHTML='<p style="color:#aaa;padding:20px;text-align:center">승인 대기 중인 신청이 없습니다</p>';return;}
      c.innerHTML=data.map(function(u){
        return '<div class="user-card pending-card" id="card-'+u.id+'">'+
          '<div class="avatar av-pending">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
          '<div class="user-info">'+
            '<div class="user-name">'+esc(u.name)+'</div>'+
            '<div class="user-detail">'+esc(u.email)+' &middot; '+esc(u.company)+'</div>'+
            '<div class="user-meta">직책: '+esc(u.job_title||'-')+' &middot; 지역: '+esc(u.region||'-')+' &middot; 전화: '+esc(u.phone||'-')+' &middot; 신청일: '+fmtDate(u.created_at)+'</div>'+
            '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'+
              '<select onchange="setPendingRole(\''+u.id+'\',this.value)" style="font-size:11px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px">'+
                '<option value="user">영업 담당자</option><option value="manager">팔장/관리자</option>'+
              '</select>'+
              '<select onchange="setPendingPrice(\''+u.id+'\',this.value)" style="font-size:11px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px">'+
                '<option value="beta">베타(무료)</option><option value="4950">4,950원/월</option><option value="9900">9,900원/월</option>'+
                '<option value="19800">19,800원/월</option><option value="49500">49,500원/년</option><option value="99000">99,000원/년</option><option value="enterprise">기업회원</option>'+
              '</select>'+
            '</div>'+
          '</div>'+
          '<span class="status-badge pending">대기 중</span>'+
          '<div class="action-btns">'+
            '<button class="btn-approve" onclick="approveUser(\''+u.id+'\')">승인</button>'+
            '<button class="btn-reject" onclick="openRejectModal(\''+u.id+'\')">거절</button>'+
          '</div></div>';
      }).join('');
    });
}
var pendingRoles={},pendingPrices={};
function setPendingRole(uid,role){pendingRoles[uid]=role;}
function setPendingPrice(uid,price){pendingPrices[uid]=price;}
function approveUser(uid){
  var role=pendingRoles[uid]||'user';
  var price=pendingPrices[uid]||'beta';
  if(!confirm('승인하시겠습니까?\n역할: '+(role==='manager'?'팔장/관리자':'영업 담당자')+' / 요금제: '+(PL[price]||price)))return;
  var exp=new Date();
  if(price==='49500'||price==='99000')exp.setFullYear(exp.getFullYear()+1);
  else exp.setMonth(exp.getMonth()+1);
  sb.from('user_profiles').update({status:'approved',role:role,approved_at:new Date().toISOString(),price_plan:price,plan_expires_at:exp.toISOString()}).eq('id',uid)
    .then(function(r){if(r.error){alert('Error: '+r.error.message);return;}alert('승인 완료!');loadAll();});
}
function openRejectModal(uid){currentRejectUserId=uid;var m=document.getElementById('rejectModal');if(m)m.style.display='flex';}
function closeRejectModal(){var m=document.getElementById('rejectModal');if(m)m.style.display='none';var r=document.getElementById('rejectReason');if(r)r.value='';currentRejectUserId=null;}
function confirmReject(){
  if(!currentRejectUserId)return;
  var reason=(document.getElementById('rejectReason')||{}).value||'';
  sb.from('user_profiles').update({status:'rejected',rejection_reason:reason}).eq('id',currentRejectUserId)
    .then(function(r){if(r.error){alert('Error: '+r.error.message);return;}closeRejectModal();loadAll();});
}
function loadAllList(){
  var c=document.getElementById('allList');if(!c)return;
  c.innerHTML='<div class="loading">Loading...</div>';
  sb.from('user_profiles').select('*').order('company',{ascending:true}).order('name',{ascending:true})
    .then(function(r){
      _allUsersData=r.data||[];
      var companies=[];
      _allUsersData.forEach(function(u){if(u.company&&companies.indexOf(u.company)<0)companies.push(u.company);});
      companies.sort();
      var cs=document.getElementById('filterCompany');
      if(cs){var cur=cs.value;cs.innerHTML='<option value="">전체 회사</option>'+companies.map(function(c){return'<option value="'+esc(c)+'"'+(c===cur?' selected':'')+'>'+esc(c)+'</option>';}).join('');}
      renderAllUsers(_allUsersData);
    });
}
function filterAllUsers(){
  var co=(document.getElementById('filterCompany')||{}).value||'';
  var st=(document.getElementById('filterStatus')||{}).value||'';
  var kw=((document.getElementById('filterSearch')||{}).value||'').toLowerCase();
  renderAllUsers(_allUsersData.filter(function(u){
    if(co&&u.company!==co)return false;
    if(st&&u.status!==st)return false;
    if(kw&&!(u.name||'').toLowerCase().includes(kw)&&!(u.email||'').toLowerCase().includes(kw))return false;
    return true;
  }));
}
function renderAllUsers(data){
  var c=document.getElementById('allList');if(!c)return;
  if(!data.length){c.innerHTML='<p style="color:#aaa;padding:20px;text-align:center">해당 사용자 없음</p>';return;}
  var SL={approved:'승인됨',pending:'대기 중',rejected:'거절됨',inactive:'비활성화',withdrawal_requested:'탈퇴신청'};
  c.innerHTML=data.map(function(u){
    var bc=u.status==='approved'?'approved':u.status==='pending'?'pending':'rejected';
    var rl=u.role==='superadmin'?'관리자':u.role==='manager'?'팔장':'담당자';
    var btns=u.role!=='superadmin'?
      '<div class="action-btns" style="display:flex;flex-direction:column;gap:4px;min-width:72px">'+
        (u.status==='inactive'?
          '<button onclick="reactivateUser(\''+u.id+'\')" style="background:#22c55e;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">재활성화</button>'+
          '<button onclick="deleteUser(\''+u.id+'\')" style="background:#e53e3e;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">삭제</button>':
          '<button class="btn-reject" onclick="openDeactivateModal(\''+u.id+'\')" style="background:#f59e0b;border-color:#f59e0b;color:white">비활성화</button>'
        )+
        '<button onclick="openPriceModal(\''+u.id+'\',\''+esc(u.price_plan||'beta')+'\')" style="background:#3b82f6;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">'+(PL[u.price_plan]||'베타(무료)')+'</button>'+
      '</div>':'';
    return '<div class="user-card" id="card-all-'+u.id+'">'+
      '<div class="avatar">'+esc((u.name||'?')[0].toUpperCase())+'</div>'+
      '<div class="user-info">'+
        '<div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">'+
          '<span style="font-size:13px;font-weight:700">'+esc(u.company||'-')+'</span>'+
          '<span style="font-size:13px;font-weight:500">'+esc(u.name)+'</span>'+
          '<span style="font-size:12px;color:#666">'+esc(u.email)+'</span>'+
          '<span style="font-size:11px;background:#f1f5f9;color:#475569;padding:1px 6px;border-radius:4px">'+rl+'</span>'+
        '</div>'+
        '<div class="user-meta" style="margin-top:4px">직책: '+esc(u.job_title||'-')+' &middot; 지역: '+esc(u.region||'-')+' &middot; 전화: '+esc(u.phone||'-')+' &middot; 가입일: '+fmtDate(u.created_at)+
          (u.price_plan?' &middot; 요금: '+(PL[u.price_plan]||u.price_plan):'')+
          (u.plan_expires_at?' &middot; 만료: '+fmtDate(u.plan_expires_at):'')+
          (u.inactive_reason?' &middot; <span style="color:#e53e3e">비활세 사유: '+esc(u.inactive_reason)+'</span>':'')+
        '</div>'+
      '</div>'+
      '<span class="status-badge '+bc+'">'+(SL[u.status]||u.status)+'</span>'+
      btns+'</div>';
  }).join('');
}
function openDeactivateModal(uid){currentDeactivateUserId=uid;var m=document.getElementById('deactivateModal');if(m){m.style.display='flex';var i=document.getElementById('deactivateReason');if(i)i.value='';}}
function closeDeactivateModal(){var m=document.getElementById('deactivateModal');if(m)m.style.display='none';currentDeactivateUserId=null;}
function confirmDeactivate(){
  if(!currentDeactivateUserId)return;
  var reason=(document.getElementById('deactivateReason')||{}).value||'';
  if(!reason.trim()){alert('비활성화 사유를 입력해주세요.');return;}
  sb.from('user_profiles').update({status:'inactive',inactive_at:new Date().toISOString(),inactive_reason:reason}).eq('id',currentDeactivateUserId)
    .then(function(r){if(r.error){alert('Error: '+r.error.message);return;}closeDeactivateModal();loadAll();});
}
function reactivateUser(uid){if(!confirm('재활성화하시겠습니까?'))return;sb.from('user_profiles').update({status:'approved',inactive_at:null,inactive_reason:null}).eq('id',uid).then(function(r){if(r.error){alert('Error: '+r.error.message);return;}loadAll();});}
function deleteUser(uid){if(!confirm('영구 삭제하시겠습니까?\n되돌릴 수 없습니다.'))return;sb.from('user_profiles').delete().eq('id',uid).then(function(r){if(r.error){alert('Error: '+r.error.message);return;}loadAll();});}
function openPriceModal(uid,plan){currentPriceUserId=uid;var m=document.getElementById('priceModal');if(m)m.style.display='flex';var s=document.getElementById('newPricePlan');if(s)s.value=plan;}
function closePriceModal(){var m=document.getElementById('priceModal');if(m)m.style.display='none';currentPriceUserId=null;}
function confirmPriceChange(){
  if(!currentPriceUserId)return;
  var plan=(document.getElementById('newPricePlan')||{}).value||'beta';
  var exp=new Date();
  if(plan==='49500'||plan==='99000')exp.setFullYear(exp.getFullYear()+1);
  else exp.setMonth(exp.getMonth()+1);
  sb.from('user_profiles').update({price_plan:plan,plan_expires_at:exp.toISOString()}).eq('id',currentPriceUserId)
    .then(function(r){if(r.error){alert('Error: '+r.error.message);return;}alert('요금제 변경 완료!\n만료일: '+exp.toLocaleDateString());closePriceModal();loadAll();});
}
function exportAllUsers(){
  var co=(document.getElementById('filterCompany')||{}).value||'';
  var st=(document.getElementById('filterStatus')||{}).value||'';
  var kw=((document.getElementById('filterSearch')||{}).value||'').toLowerCase();
  var data=_allUsersData.filter(function(u){if(co&&u.company!==co)return false;if(st&&u.status!==st)return false;if(kw&&!(u.name||'').toLowerCase().includes(kw)&&!(u.email||'').toLowerCase().includes(kw))return false;return true;});
  if(!data.length){alert('데이터 없음');return;}
  var h=['회사','이름','이메일','역할','직책','지역','전화','상태','요금제','만료일','가입일'];
  var csv=[h.join(',')].concat(data.map(function(u){return[u.company,u.name,u.email,u.role,u.job_title,u.region,u.phone,u.status,PL[u.price_plan]||u.price_plan||'',fmtDate(u.plan_expires_at),fmtDate(u.created_at)].map(function(v){return'"'+(v||'').replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  _dlCsv('사용자목록_'+new Date().toISOString().substring(0,10)+'.csv',csv);
}
function loadUserData(){
  var tb=document.getElementById('activityTableBody');if(!tb)return;
  tb.innerHTML='<tr><td colspan="9" style="padding:30px;text-align:center;color:#aaa">Loading...</td></tr>';
  sb.from('user_app_data').select('user_id,email,name,company,data_v9,synced_at').order('synced_at',{ascending:false})
    .then(function(r){
      var data=r.data||[];
      if(r.error){tb.innerHTML='<tr><td colspan="9">'+r.error.message+'</td></tr>';return;}
      if(!data.length){tb.innerHTML='<tr><td colspan="9" style="padding:30px;text-align:center;color:#aaa">데이터 없음</td></tr>';return;}
      var rows=[],totalH=0,totalD=0,totalR=0;
      data.forEach(function(user){
        var v9=user.data_v9;if(!v9)return;
        var hospitals=v9.hospitals||[],doctors=v9.doctors||[],plans=v9.plans||{};
        totalH+=hospitals.length;totalD+=doctors.length;
        Object.keys(plans).forEach(function(drKey){
          var dates=plans[drKey];if(typeof dates!=='object')return;
          Object.keys(dates).forEach(function(date){
            var rec=dates[date];if(!rec)return;
            var hospId=drKey.replace(/_\d+$/,'');
            var drIdx=parseInt((drKey.match(/_([0-9]+)$/)||[0,0])[1])||0;
            var hosp=hospitals.find(function(h){return h.id===hospId;});
            var dr=doctors[drIdx];
            var done=!!rec.checked;
            if(done)totalR++;
            rows.push({company:user.company||'',user:user.name||user.email,hosp:hosp?hosp.name:hospId,dr:dr?dr.name:drKey,dept:dr?(dr.dept||''):'',date:date,time:rec.time||'',products:Array.isArray(rec.products)?rec.products.join(', '):(rec.product||''),note:rec.note||rec.planNote||'',type:done?'completed':'planned'});
          });
        });
      });
      var el=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      el('statSyncUsers',data.length);el('statHospitals',totalH);el('statDoctors',totalD);el('statRecords',totalR);
      _activityRows=rows;_updateFilters(rows);renderActivityTable(rows);
    });
}
function _updateFilters(rows){
  var uniq=function(arr){return arr.filter(function(v,i,a){return a.indexOf(v)===i;}).sort();};
  var setOpts=function(id,items,label){var s=document.getElementById(id);if(!s)return;s.innerHTML='<option value="">'+label+'</option>'+items.map(function(v){return'<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');};
  setOpts('filterDataUser',uniq(rows.map(function(r){return r.user;})),'전체 사용자');
  setOpts('filterDataHosp',uniq(rows.map(function(r){return r.hosp;})),'전체 거래치');
  setOpts('filterDataDoctor',uniq(rows.map(function(r){return r.dr;})),'전체 의사');
  var prods=[];rows.forEach(function(r){r.products.split(',').forEach(function(p){var t=p.trim();if(t)prods.push(t);});});
  setOpts('filterDataProduct',uniq(prods),'전체 제품');
}
function filterActivityData(){
  var user=(document.getElementById('filterDataUser')||{}).value||'';
  var hosp=(document.getElementById('filterDataHosp')||{}).value||'';
  var doctor=(document.getElementById('filterDataDoctor')||{}).value||'';
  var product=(document.getElementById('filterDataProduct')||{}).value||'';
  var type=(document.getElementById('filterDataType')||{}).value||'';
  renderActivityTable(_activityRows.filter(function(r){
    if(user&&r.user!==user)return false;
    if(hosp&&r.hosp!==hosp)return false;
    if(doctor&&r.dr!==doctor)return false;
    if(product&&!r.products.includes(product))return false;
    if(type&&r.type!==type)return false;
    return true;
  }));
}
function renderActivityTable(rows){
  var tb=document.getElementById('activityTableBody');if(!tb)return;
  if(!rows.length){tb.innerHTML='<tr><td colspan="9" style="padding:30px;text-align:center;color:#aaa">필터 결과 없음</td></tr>';return;}
  tb.innerHTML=rows.map(function(r,i){
    var bg=i%2===0?'':'background:#fafafa';
    var badge=r.type==='completed'?'<span style="background:#dcfce7;color:#166534;font-size:10px;padding:2px 6px;border-radius:4px">결과</span>':'<span style="background:#eff6ff;color:#1d4ed8;font-size:10px;padding:2px 6px;border-radius:4px">계획</span>';
    return '<tr style="border-bottom:1px solid #f0f0f0;'+bg+'">'+
      '<td style="padding:8px 10px;font-size:12px;color:#666;white-space:nowrap">'+esc(r.company)+'</td>'+
      '<td style="padding:8px 10px;font-size:13px;font-weight:500;white-space:nowrap">'+esc(r.user)+'</td>'+
      '<td style="padding:8px 10px;font-size:13px">'+esc(r.hosp)+'</td>'+
      '<td style="padding:8px 10px"><div style="font-size:13px;white-space:nowrap">'+esc(r.dr)+'</div><div style="font-size:11px;color:#aaa">'+esc(r.dept)+'</div></td>'+
      '<td style="padding:8px 10px;font-size:12px;white-space:nowrap">'+esc(r.date)+'</td>'+
      '<td style="padding:8px 10px;font-size:12px">'+esc(r.time)+'</td>'+
      '<td style="padding:8px 10px;font-size:11px;color:#2563eb">'+esc(r.products)+'</td>'+
      '<td style="padding:8px 10px;font-size:11px;color:#555;max-width:150px">'+esc(r.note)+'</td>'+
      '<td style="padding:8px 10px">'+badge+'</td></tr>';
  }).join('');
}
function exportExcel(){
  var user=(document.getElementById('filterDataUser')||{}).value||'';
  var hosp=(document.getElementById('filterDataHosp')||{}).value||'';
  var doctor=(document.getElementById('filterDataDoctor')||{}).value||'';
  var product=(document.getElementById('filterDataProduct')||{}).value||'';
  var type=(document.getElementById('filterDataType')||{}).value||'';
  var rows=_activityRows.filter(function(r){if(user&&r.user!==user)return false;if(hosp&&r.hosp!==hosp)return false;if(doctor&&r.dr!==doctor)return false;if(product&&!r.products.includes(product))return false;if(type&&r.type!==type)return false;return true;});
  if(!rows.length){alert('데이터 없음');return;}
  var h=['회사','사용자','거래치','의사','진료과','날짜','시간대','제품','활동내용','구분'];
  var csv=[h.join(',')].concat(rows.map(function(r){return[r.company,r.user,r.hosp,r.dr,r.dept,r.date,r.time,r.products,r.note,r.type==='completed'?'결과':'계획'].map(function(v){return'"'+(v||'').replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  _dlCsv('활동데이터_'+new Date().toISOString().substring(0,10)+'.csv',csv);
}
function _dlCsv(filename,csv){
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}
