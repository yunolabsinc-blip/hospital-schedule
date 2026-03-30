var sb,currentRejectUserId=null,currentDeactivateUserId=null,currentPriceUserId=null;
var _allUsersData=[],_activityRows=[];
document.addEventListener("DOMContentLoaded", function() {
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
});
;
function logout(){sb.auth.signOut().then(function(){window.location.href='login.html';});}
function switchTab(tab){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
  event.target.classList.add('active');
  document.getElementById('pendingTab').style.display=tab==='pending'?'block':'none';
  document.getElementById('allTab').style.display=tab==='all'?'block':'none';
  document.getElementById('dataTab').style.display=tab==='data'?'block':'none';
  var iq=document.getElementById('inquiryTab');
  if(iq)iq.style.display=tab==='inquiry'?'block':'none';
  if(tab==='data')loadUserData();
  if(tab==='all')loadAllList();
  if(tab==='inquiry')loadInquiries();
}
function loadAll(){loadStats();loadPendingList();loadAllList();loadInquiryBadge();}
function loadInquiryBadge(){
  sb.from('inquiries').select('id').eq('status','pending').then(function(r){
    var cnt=(r.data||[]).length;
    var b=document.getElementById('inquiryBadge');
    if(b){b.textContent=cnt>0?cnt:'';b.style.display=cnt>0?'inline':'none';}
  });
}
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
      var bulkBar='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;flex-wrap:wrap">'+
        '<input type="checkbox" id="checkAll" onchange="toggleAllPending(this)" style="width:15px;height:15px;cursor:pointer">' +
        '<label for="checkAll" style="font-size:12px;font-weight:600;color:#0369a1;cursor:pointer">전체 선택</label>'+
        '<select id="bulkRole" style="font-size:11px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;margin-left:6px">' +
          '<option value="user">영업 담당자</option><option value="manager">팔장/관리자</option></select>'+
        '<select id="bulkPrice" style="font-size:11px;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px">' +
          '<option value="beta">베타(무료)</option><option value="4950">4,950원/월</option><option value="9900">9,900원/월</option>'+
          '<option value="19800">19,800원/월</option><option value="49500">49,500원/년</option><option value="99000">99,000원/년</option><option value="enterprise">기업회원</option></select>'+
        '<button onclick="approveBulk()" style="padding:4px 12px;background:#22c55e;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">선택 승인</button>'+
      '</div>';
      c.innerHTML=bulkBar+data.map(function(u){
        return '<div class="user-card pending-card" id="card-'+u.id+'" style="position:relative;padding-left:36px">'+
          '<input type="checkbox" class="pending-check" value="'+u.id+'" style="position:absolute;top:16px;left:12px;width:16px;height:16px;cursor:pointer" onchange="syncCheckAll()">'+
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
            '<button onclick="sendApprovalEmail(\''+u.id+'\',' +'\''+(u.email||'')+'\',' +'\''+(u.name||'')+'\',' +'\''+(u.company||'')+'\')" style="background:#dbeafe;color:#1d4ed8;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-left:2px">승인메일</button>'+
          '<button onclick="openTeamModal(\''+u.id+'\',' +'\''+(u.name||'')+'\')'+ 
          ' style="background:#f0fdf4;color:#16a34a;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-left:2px">퐜반배정</button>'+
            '<button class="btn-reject" onclick="openRejectModal(\''+u.id+'\')">거절</button>'+
          '</div></div>';
      }).join('');
    });
}
var pendingRoles={},pendingPrices={};
function setPendingRole(uid,role){pendingRoles[uid]=role;}
function setPendingPrice(uid,price){pendingPrices[uid]=price;}
function sendApprovalEmail(uid, email, name, company){
  var subject = encodeURIComponent('[닥터체크Pro] 회원가입 승인 안내');
  var body = encodeURIComponent(
    name + '님,\n\n' +
    '닥터체크Pro 회원가입 승인이 완료되었습니다.\n' +
    '아래 링크에서 로그인하실 수 있습니다.\n' +
    'https://www.drcheckpro.com/login.html\n\n' +
    '감사합니다.\n닥터체크Pro 팀'
  );
  window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
}

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
  var pr=(document.getElementById('filterPrice')||{}).value||'';
  var kw=((document.getElementById('filterSearch')||{}).value||'').toLowerCase();
  renderAllUsers(_allUsersData.filter(function(u){
    if(co&&u.company!==co)return false;
    if(st&&u.status!==st)return false;
    if(pr&&(u.price_plan||'beta')!==pr)return false;
    if(kw&&!(u.name||'').toLowerCase().includes(kw)&&!(u.email||'').toLowerCase().includes(kw))return false;
    return true;
  }));
}
function renderAllUsers(data){
  var c=document.getElementById('allList');if(!c)return;
  var SL={approved:'승인됨',pending:'대기 중',rejected:'거절됨',inactive:'비활성화',withdrawal_requested:'탈퇴신청'};
  var companies=[];_allUsersData.forEach(function(u){if(u.company&&companies.indexOf(u.company)<0)companies.push(u.company);});companies.sort();
  var curCo=(document.getElementById('filterCompany')||{}).value||'';
  var curSt=(document.getElementById('filterStatus')||{}).value||'';
  var curPr=(document.getElementById('filterPrice')||{}).value||'';
  var curKw=(document.getElementById('filterSearch')||{}).value||'';
  var mkSel=function(id,vals,labels,cur){
    return '<select id="'+id+'" onchange="filterAllUsers()" style="font-size:10px;padding:2px 4px;border:1px solid #e2e8f0;border-radius:5px;width:100%;background:white"><option value="">전체</option>'+
      vals.map(function(v,i){return'<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc((labels&&labels[i])||v)+'</option>';}).join('')+'</select>';
  };
  var searchInput='<input id="filterSearch" oninput="filterAllUsers()" placeholder="이름/이메일" value="'+esc(curKw)+'" style="font-size:12px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;width:100%;box-sizing:border-box">';
  var statuses=['approved','pending','rejected','inactive'];
  var stLabels=['승인됨','대기 중','거절됨','비활성화'];
  var priceKeys=Object.keys(PL);
  var th='<tr style="background:#f8fafc">'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:80px;vertical-align:top">회사<br>'+mkSel('filterCompany',companies,null,curCo)+'</th>'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:100px;vertical-align:top">이름<br>'+searchInput+'</th>'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:70px;vertical-align:top">직책/지역</th>'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:70px;vertical-align:top">상태<br>'+mkSel('filterStatus',statuses,stLabels,curSt)+'</th>'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:90px;vertical-align:top">요금제<br>'+mkSel('filterPrice',priceKeys,priceKeys.map(function(p){return PL[p]||p;}),curPr)+'</th>'+
    '<th style="padding:8px 10px;text-align:left;font-size:12px;font-weight:500;color:#555;min-width:60px;vertical-align:top">관리</th>'+
  '</tr>';
  if(!data.length){
    c.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:700px"><thead>'+th+'</thead><tbody><tr><td colspan="6" style="padding:30px;text-align:center;color:#aaa">해당 사용자 없음</td></tr></tbody></table></div>';
    return;
  }
  var rows=data.map(function(u){
    var rl=u.role==='superadmin'?'관리자':u.role==='manager'?'팔장':'담당자';
    var bc=u.status==='approved'?'#22c55e':u.status==='pending'?'#f59e0b':u.status==='inactive'?'#94a3b8':'#e53e3e';
    var planName=PL[u.price_plan]||u.price_plan||'베타(무료)';
    var btns=u.role==='superadmin'?'':
      '<div style="display:flex;flex-direction:column;gap:3px">'+
        (u.status==='inactive'?
          '<button onclick="reactivateUser(\''+u.id+'\')" style="background:#22c55e;color:white;border:none;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer;white-space:nowrap">재활성화</button>'+
          '<button onclick="deleteUser(\''+u.id+'\')" style="background:#e53e3e;color:white;border:none;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer">삭제</button>':
          '<button onclick="openDeactivateModal(\''+u.id+'\')" style="background:#f59e0b;color:white;border:none;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer;white-space:nowrap">비활성화</button>'+
          '<button onclick="sendApprovalEmail(\''+u.id+'\',' +'\''+(u.email||'')+'\',' +'\''+(u.name||'')+'\',' +'\''+(u.company||'')+'\')" style="background:#dbeafe;color:#1d4ed8;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-left:2px">승인메일</button>'+
          '<button onclick="sendApprovalEmail(\''+u.id+'\',' +'\''+(u.email||'')+'\',' +'\''+(u.name||'')+'\',' +'\''+(u.company||'')+'\')'+ 
          ' style="background:#dbeafe;color:#1d4ed8;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;margin-left:2px">승인메일</button>'+
            '<button onclick="sendApprovalEmail(\''+u.id+'\',' +
              '\''+( u.email||'')+'\',' +
              '\''+( u.name||'')+'\',' +
              '\''+( u.company||'')+'\')'+ 
            ' style="background:#dbeafe;color:#1d4ed8;border:none;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600;white-space:nowrap;margin-left:3px">승인메일</button>'
        )+
        '<button onclick="openPriceModal(\''+u.id+'\',\''+esc(u.price_plan||'beta')+'\')" style="background:#3b82f6;color:white;border:none;border-radius:5px;padding:3px 7px;font-size:10px;cursor:pointer;white-space:nowrap">'+esc(planName)+'</button>'+
      '</div>';
    return '<tr style="border-bottom:1px solid #f0f0f0">'+
      '<td style="padding:8px 10px;font-size:12px;white-space:nowrap;font-weight:600">'+esc(u.company||'-')+'</td>'+
      '<td style="padding:8px 10px"><div style="font-size:13px;font-weight:500">'+esc(u.name)+'</div><div style="font-size:11px;color:#888">'+esc(u.email)+'</div></td>'+
      '<td style="padding:8px 10px;font-size:11px;color:#555"><div>'+esc(u.job_title||'-')+'</div><div style="color:#aaa">'+esc(u.region||'-')+'</div></td>'+
      '<td style="padding:8px 10px"><span style="background:'+bc+'22;color:'+bc+';font-size:11px;padding:2px 8px;border-radius:8px;white-space:nowrap">'+(SL[u.status]||u.status)+'</span><br><span style="font-size:10px;color:#aaa">'+rl+'</span></td>'+
      '<td style="padding:8px 10px;font-size:11px;white-space:nowrap"><div>'+esc(planName)+'</div><div style="color:#aaa;font-size:10px">'+fmtDate(u.plan_expires_at)+'</div></td>'+
      '<td style="padding:8px 10px">'+btns+'</td>'+
    '</tr>';
  }).join('');
  c.innerHTML='<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="width:100%;border-collapse:collapse;min-width:700px"><thead>'+th+'</thead><tbody>'+rows+'</tbody></table></div>';
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
  // 엑셀 필터 행 추가
  var filterInfo = [
    '사용자: '+(user||'전체'),
    '거래첸: '+(hosp||'전체'),
    '의사: '+(doctor||'전체'),
    '제품: '+(product||'전체'),
    '검색기간: '+(dateFrom||'시작')+' ~ '+(dateTo||'종료')
  ].join(' | ');
  var csv=[filterInfo, h.join(',')].concat(data.map(function(u){return[u.company,u.name,u.email,u.role,u.job_title,u.region,u.phone,u.status,PL[u.price_plan]||u.price_plan||'',fmtDate(u.plan_expires_at),fmtDate(u.created_at)].map(function(v){return'"'+(v||'').replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  _dlCsv('사용자목록_'+new Date().toISOString().substring(0,10)+'.csv',csv);
}

window._adminActFilter="all";
function filterAdminAct(f){
  window._adminActFilter=f;
  ["today","week","month","all"].forEach(function(k){
    var b=document.getElementById("adf-"+k);
    if(!b)return;
    if(k===f){b.style.border="1px solid #E8734A";b.style.background="#fff8f5";b.style.color="#E8734A";b.style.fontWeight="600";}
    else{b.style.border="1px solid #e5e7eb";b.style.background="white";b.style.color="";b.style.fontWeight="";}
  });
  loadUserData();
}
function loadUserData(){
  var tb=document.getElementById('activityTableBody');if(!tb)return;
  tb.innerHTML='<tr><td colspan="9" style="padding:30px;text-align:center;color:#aaa">Loading...</td></tr>';
  sb.from('user_profiles').select('email,company').then(function(pr){var m={};(pr.data||[]).forEach(function(p){m[p.email]=p.company||'';});window._pMap=m;});
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
            rows.push({company:user.company||(window._pMap&&window._pMap[user.email])||'',user:user.name||user.email,hosp:hosp?hosp.name:hospId,dr:dr?dr.name:drKey,dept:dr?(dr.dept||''):'',date:date,time:rec.time||'',products:Array.isArray(rec.products)?rec.products.join(', '):(rec.product||''),note:rec.note||rec.planNote||'',planNote:rec.planNote||rec.plan||rec.note||'',resultNote:rec.resultNote||rec.result||(done?rec.note||'':''),type:done?'completed':'planned'});
          });
        });
      });
      var el=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
      el('statSyncUsers',data.length);el('statHospitals',totalH);el('statDoctors',totalD);el('statRecords',totalR);
      _activityRows=rows;_updateFilters(rows);renderActivityTable(rows);
    });
}
function _updateFilters(rows){
  var uniq=function(arr){return arr.filter(function(v,i,a){return a.indexOf(v)===i&&v;}).sort();};
  var mkSel=function(id,items,label){
    var cur=(document.getElementById(id)||{}).value||'';
    return '<select id="'+id+'" onchange="filterActivityData()" style="font-size:11px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px;max-width:100%;background:white"><option value="">'+label+'</option>'+items.map(function(v){return'<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(v)+'</option>';}).join('')+'</select>';
  };
  var prods=[];rows.forEach(function(r){r.products.split(',').forEach(function(p){var t=p.trim();if(t&&prods.indexOf(t)<0)prods.push(t);});});
  prods.sort();
  var thead=document.getElementById('activityThead');
  if(!thead)return;
  var cf=(document.getElementById('filterDateFrom')||{}).value||'';
  var ct=(document.getElementById('filterDateTo')||{}).value||'';
  thead.innerHTML='<tr style="background:#f8fafc">'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:60px">회사<br>'+mkSel('filterDataCompany',uniq(rows.map(function(r){return r.company;})),'전체')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:60px">사용자<br>'+mkSel('filterDataUser',uniq(rows.map(function(r){return r.user;})),'전체')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:80px">거래치<br>'+mkSel('filterDataHosp',uniq(rows.map(function(r){return r.hosp;})),'전체')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:70px">의사<br>'+mkSel('filterDataDoctor',uniq(rows.map(function(r){return r.dr;})),'전체')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;white-space:nowrap">날짜<div style="display:flex;gap:2px;margin-top:2px"><input type="date" id="filterDateFrom" onchange="filterActivityData()" value="'+cf+'" style="font-size:11px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;width:115px"><span style="font-size:9px;color:#aaa">~</span><input type="date" id="filterDateTo" onchange="filterActivityData()" value="'+ct+'" style="font-size:11px;padding:4px;border:1px solid #e2e8f0;border-radius:6px;width:115px"></div></th>'+
    
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:80px">제품<br>'+mkSel('filterDataProduct',prods,'전체')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:90px">활동계획<br>'+mkSel('filterDataType',['계획','결과'],'전체+결과')+'</th>'+
    '<th style="padding:7px 10px;text-align:left;font-weight:500;color:#555;min-width:90px">활동결과</th>'+
  '</tr>';
}
function filterActivityData(){
  var company=(document.getElementById('filterDataCompany') ||{}).value||'';
  var user   =(document.getElementById('filterDataUser')   ||{}).value||'';
  var hosp   =(document.getElementById('filterDataHosp')   ||{}).value||'';
  var doctor =(document.getElementById('filterDataDoctor') ||{}).value||'';
  var product=(document.getElementById('filterDataProduct')||{}).value||'';
  var type   =(document.getElementById('filterDataType')   ||{}).value||'';
  var dateFrom=(document.getElementById('filterDateFrom')  ||{}).value||'';
  var dateTo  =(document.getElementById('filterDateTo')    ||{}).value||'';
  var typeEn=type==='결과'?'completed':type==='계획'?'planned':type;
  renderActivityTable(_activityRows.filter(function(r){
    if(company&&r.company!==company)          return false;
    if(user   &&r.user!==user)               return false;
    if(hosp   &&r.hosp!==hosp)               return false;
    if(doctor &&r.dr!==doctor)               return false;
    if(product&&!r.products.includes(product))return false;
    if(typeEn &&r.type!==typeEn)              return false;
    if(dateFrom&&r.date<dateFrom)            return false;
    if(dateTo  &&r.date>dateTo)              return false;
    return true;
  }));
}
function renderActivityTable(rows){
  var tb=document.getElementById('activityTableBody');
  if(!tb)return;
  _updateFilters(rows);
  if(!rows.length){tb.innerHTML='<tr><td colspan="8" style="padding:30px;text-align:center;color:#aaa">필터 결과 없음</td></tr>';return;}
  tb.innerHTML=rows.map(function(r,i){
    var bg=i%2===0?'':'background:#fafafa';
    var pn=esc(r.planNote||r.note||'');
    var rn=r.type==='completed'?esc(r.resultNote||r.note||''):'<span style="color:#d1d5db">미완료</span>';
    return '<tr style="border-bottom:1px solid #f0f0f0;'+bg+'">'+
      '<td style="padding:8px 10px;font-size:12px;color:#444;white-space:nowrap;font-weight:600">'+esc(r.company)+'</td>'+
      '<td style="padding:8px 10px;font-size:12px;font-weight:500;white-space:nowrap">'+esc(r.user)+'</td>'+
      '<td style="padding:8px 10px;font-size:12px">'+esc(r.hosp)+'</td>'+
      '<td style="padding:8px 10px"><div style="font-size:12px;white-space:nowrap">'+esc(r.dr)+'</div><div style="font-size:10px;color:#aaa">'+esc(r.dept)+'</div></td>'+
      '<td style="padding:8px 10px;font-size:12px;white-space:nowrap">'+esc(r.date)+'</td>'+
      
      '<td style="padding:8px 10px;font-size:11px;color:#2563eb">'+esc(r.products)+'</td>'+
      '<td style="padding:8px 10px;font-size:11px;color:#374151;min-width:100px;max-width:180px;word-break:break-word;white-space:pre-wrap">'+pn+'</td>'+
      '<td style="padding:8px 10px;font-size:11px;min-width:100px;max-width:180px;word-break:break-word;white-space:pre-wrap">'+rn+'</td>'+
    '</tr>';
  }).join('');
}
function exportExcel(){
  var user=(document.getElementById('filterDataUser')||{}).value||'';
  var hosp=(document.getElementById('filterDataHosp')||{}).value||'';
  var doctor=(document.getElementById('filterDataDoctor')||{}).value||'';
  var product=(document.getElementById('filterDataProduct')||{}).value||'';
  var type=(document.getElementById('filterDataType')||{}).value||'';
  var dateFrom2=(document.getElementById('filterDateFrom')||{}).value||'';
  var dateTo2=(document.getElementById('filterDateTo')||{}).value||'';
  var rows=_activityRows.filter(function(r){if(user&&r.user!==user)return false;if(hosp&&r.hosp!==hosp)return false;if(doctor&&r.dr!==doctor)return false;if(product&&!r.products.includes(product))return false;if(type&&r.type!==type)return false;return true;});
  if(!rows.length){alert('데이터 없음');return;}
  var h=['회사','사용자','거래치','의사','진료과','날짜','제품','활동계획','활동결과'];
  var csv=[h.join(',')].concat(rows.map(function(r){return[r.company,r.user,r.hosp,r.dr,r.dept,r.date,r.products,r.planNote||r.note||'',r.type==='completed'?(r.resultNote||r.note||''):'미완료'].map(function(v){return'"'+(v||'').replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  _dlCsv('활동데이터_'+new Date().toISOString().substring(0,10)+'.csv',csv);
}
function _dlCsv(filename,csv){
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

function toggleAllPending(cb){document.querySelectorAll('.pending-check').forEach(function(c){c.checked=cb.checked;});}
function syncCheckAll(){var all=document.querySelectorAll('.pending-check');var chk=document.querySelectorAll('.pending-check:checked');var ca=document.getElementById('checkAll');if(ca)ca.checked=all.length>0&&chk.length===all.length;}
function approveBulk(){
  var ids=Array.from(document.querySelectorAll('.pending-check:checked')).map(function(c){return c.value;});
  if(!ids.length){alert('선택된 사용자가 없습니다.');return;}
  var role=(document.getElementById('bulkRole')||{}).value||'user';
  var price=(document.getElementById('bulkPrice')||{}).value||'beta';
  if(!confirm(ids.length+'명을 일괄 승인하시겠습니까?\n요금제: '+(PL[price]||price)))return;
  var exp=new Date();
  if(price==='49500'||price==='99000')exp.setFullYear(exp.getFullYear()+1);
  else exp.setMonth(exp.getMonth()+1);
  var done=0;
  ids.forEach(function(uid){
    sb.from('user_profiles').update({status:'approved',role:role,approved_at:new Date().toISOString(),price_plan:price,plan_expires_at:exp.toISOString()}).eq('id',uid)
      .then(function(r){done++;if(done===ids.length){alert('일괄 승인 완료! ('+done+'명)');loadAll();}});
  });
}

// ── 고객문의 관리 ──
+'</td>'+'<td style="padding:8px 10px;text-align:center">'+'<button onclick="deleteInquiry(\'' + d.id + '\')" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600">삭제</button>'+'</td></tr>'dInquiries(){
  var tb=document.getElementById('inquiryTableBody');if(!tb)return;
  tb.innerHTML='<tr><td colspan="6" style="padding:30px;text-align:center;color:#aaa">Loading...</td></tr>';
  sb.from('inquiries').select('*').order('created_at',{ascending:false})
    .then(function(r){
      var data=r.data||[];
      if(!data.length){tb.innerHTML='<tr><td colspan="6" style="padding:30px;text-align:center;color:#aaa">고객 문의가 없습니다</td></tr>';return;}
      var badge=document.getElementById('inquiryBadge');
      var pending=data.filter(function(d){return d.status==='pending';}).length;
      if(badge)badge.textContent=pending||'';
      tb.innerHTML=data.map(function(d,i){
        var bg=i%2===0?'':'background:#fafafa';
        var st=d.status==='replied'?
          '<span style="background:#dcfce7;color:#166534;font-size:10px;padding:2px 8px;border-radius:4px">답변완료</span>':
          '<span style="background:#fef3c7;color:#92400e;font-size:10px;padding:2px 8px;border-radius:4px">대기중</span>';
        return '<tr style="border-bottom:1px solid #f0f0f0;'+bg+'">'+
          '<td style="padding:10px 14px;font-size:12px;color:#666">'+esc(d.company||'-')+'</td>'+
          '<td style="padding:10px 14px;font-size:13px;font-weight:500">'+esc(d.user_name||d.user_email)+'</td>'+
          '<td style="padding:10px 14px;font-size:13px">'+esc(d.title)+'</td>'+
          '<td style="padding:10px 14px;font-size:12px;color:#555;max-width:200px">'+esc(d.content)+'</td>'+
          '<td style="padding:10px 14px;font-size:11px;color:#888">'+fmtDate(d.created_at)+'</td>'+
          '<td style="padding:10px 14px">'+st+
            '<div style="margin-top:6px">'+
              (d.admin_reply?'<div style="font-size:11px;color:#2563eb;margin-bottom:4px">답변: '+esc(d.admin_reply)+'</div>':'')+
              '<div style="display:flex;gap:4px">'+
                '<input id="reply-'+d.id+'" placeholder="답변 입력..." value="'+esc(d.admin_reply||'')+'" style="font-size:11px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:6px;flex:1;min-width:100px">'+
                '<button onclick="replyInquiry(\''+d.id+'\')" style="padding:4px 10px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:11px;cursor:pointer">답변</button>'+
              '</div>'+
            '</div>'+
          '</td>'+
          '</tr>';
      }).join('');
    });
}

function deleteInquiry(id){
  if(!confirm('문의를 삭제하시겠습니까?')) return;
  sb.from('inquiries').delete().eq('id',id).then(function(r){
    if(r.error){alert('삭제 실패: '+r.error.message);return;}
    loadInquiries();
  });
}

// === 전역 함수 명시적 노출 ===
if(typeof logout!=="undefined") window.logout=logout;
if(typeof switchTab!=="undefined") window.switchTab=switchTab;
if(typeof loadAll!=="undefined") window.loadAll=loadAll;
if(typeof loadInquiryBadge!=="undefined") window.loadInquiryBadge=loadInquiryBadge;
if(typeof loadStats!=="undefined") window.loadStats=loadStats;
if(typeof esc!=="undefined") window.esc=esc;
if(typeof fmtDate!=="undefined") window.fmtDate=fmtDate;
if(typeof loadPendingList!=="undefined") window.loadPendingList=loadPendingList;
if(typeof setPendingRole!=="undefined") window.setPendingRole=setPendingRole;
if(typeof setPendingPrice!=="undefined") window.setPendingPrice=setPendingPrice;
if(typeof sendApprovalEmail!=="undefined") window.sendApprovalEmail=sendApprovalEmail;
if(typeof approveUser!=="undefined") window.approveUser=approveUser;
if(typeof openRejectModal!=="undefined") window.openRejectModal=openRejectModal;
if(typeof closeRejectModal!=="undefined") window.closeRejectModal=closeRejectModal;
if(typeof confirmReject!=="undefined") window.confirmReject=confirmReject;
if(typeof loadAllList!=="undefined") window.loadAllList=loadAllList;
if(typeof filterAllUsers!=="undefined") window.filterAllUsers=filterAllUsers;
if(typeof renderAllUsers!=="undefined") window.renderAllUsers=renderAllUsers;
if(typeof openDeactivateModal!=="undefined") window.openDeactivateModal=openDeactivateModal;
if(typeof closeDeactivateModal!=="undefined") window.closeDeactivateModal=closeDeactivateModal;
if(typeof confirmDeactivate!=="undefined") window.confirmDeactivate=confirmDeactivate;
if(typeof reactivateUser!=="undefined") window.reactivateUser=reactivateUser;
if(typeof deleteUser!=="undefined") window.deleteUser=deleteUser;
if(typeof openPriceModal!=="undefined") window.openPriceModal=openPriceModal;
if(typeof closePriceModal!=="undefined") window.closePriceModal=closePriceModal;
if(typeof confirmPriceChange!=="undefined") window.confirmPriceChange=confirmPriceChange;
if(typeof exportAllUsers!=="undefined") window.exportAllUsers=exportAllUsers;
if(typeof filterAdminAct!=="undefined") window.filterAdminAct=filterAdminAct;
if(typeof loadUserData!=="undefined") window.loadUserData=loadUserData;
if(typeof _updateFilters!=="undefined") window._updateFilters=_updateFilters;
if(typeof filterActivityData!=="undefined") window.filterActivityData=filterActivityData;
if(typeof renderActivityTable!=="undefined") window.renderActivityTable=renderActivityTable;
if(typeof exportExcel!=="undefined") window.exportExcel=exportExcel;
if(typeof _dlCsv!=="undefined") window._dlCsv=_dlCsv;
if(typeof toggleAllPending!=="undefined") window.toggleAllPending=toggleAllPending;
if(typeof syncCheckAll!=="undefined") window.syncCheckAll=syncCheckAll;
if(typeof approveBulk!=="undefined") window.approveBulk=approveBulk;
if(typeof deleteInquiry!=="undefined") window.deleteInquiry=deleteInquiry;
// ── 팀 배정 ──
function openTeamModal(uid,userName){
  if(!sb)return;
  sb.from("user_profiles").select("id,name,company").eq("role","manager").eq("status","approved").then(function(r){
    var managers=r.data||[];
    sb.from("user_profiles").select("manager_id").eq("id",uid).single().then(function(pr){
      var cur=pr.data&&pr.data.manager_id?pr.data.manager_id:"";
      var opts='<option value="">배정 안 함</option>';
      managers.forEach(function(m){opts+='<option value="'+m.id+'" '+(m.id===cur?"selected":"")+'>'+( m.name||"-")+' ('+(m.company||"-")+")</option>";});
      var el=document.getElementById("team-modal");if(el)el.remove();
      var modal=document.createElement("div");
      modal.id="team-modal";
      modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;";
      modal.innerHTML='<div style="background:white;border-radius:16px;padding:28px 24px;width:340px;max-width:95vw;">'+
        '<h3 style="font-size:16px;font-weight:700;margin-bottom:6px">팀 배정</h3>'+
        '<p style="font-size:13px;color:#64748b;margin-bottom:16px">'+userName+' 님 담당 관리자</p>'+
        '<select id="team-mgr-sel" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:16px">'+opts+'</select>'+
        '<div style="display:flex;gap:8px;justify-content:flex-end">'+
        '<button onclick="document.getElementById('+"'team-modal'"+').remove()" style="background:#f1f5f9;border:none;border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer">취소</button>'+
        '<button onclick="assignManager(\''+ uid +'\',\''+userName+'\')" style="background:#E8734A;color:white;border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer">저장</button>'+
        '</div></div>';
      document.body.appendChild(modal);
    });
  });
}
function assignManager(uid,userName){
  var sel=document.getElementById("team-mgr-sel");if(!sel)return;
  var mgrId=sel.value;
  sb.from("user_profiles").update(mgrId?{manager_id:mgrId}:{manager_id:null}).eq("id",uid).then(function(r){
    if(r.error){alert("배정 실패:"+r.error.message);return;}
    var m=document.getElementById("team-modal");if(m)m.remove();
    loadAllList();
  });
}

