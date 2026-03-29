var sb;
var sb;

document.addEventListener('DOMContentLoaded', function() {
  sb = supabase.createClient(
    'https://hslxclmezfudjgmehriy.supabase.co',
    'sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT'
  );

  var savedEmail = localStorage.getItem('drcheck_email');
  var autoLogin  = localStorage.getItem('drcheck_auto') === 'true';
  if (savedEmail) { document.getElementById('email').value = savedEmail; document.getElementById('rememberMe').checked = true; }
  if (autoLogin)  { document.getElementById('autoLogin').checked = true; }

  sb.auth.getSession().then(function(r) {
    if (r.data && r.data.session) checkStatus(r.data.session.user);
  });

  document.getElementById('loginBtn').addEventListener('click', doLogin);
  // 회원가입 화면 전환
  document.getElementById('goRegisterBtn').addEventListener('click', function(){
    document.getElementById('loginSection').style.display='none';
    document.getElementById('registerSection').style.display='block';
  });
  document.getElementById('backToLoginBtn').addEventListener('click', function(){
    document.getElementById('registerSection').style.display='none';
    document.getElementById('loginSection').style.display='block';
  });
  // 회원가입 제출 버튼
  document.getElementById('registerBtn').addEventListener('click', doRegister);

  document.getElementById('loginEye').onclick      = function() { togglePw('password', this); };
  document.getElementById('openSignupBtn').onclick = function() { openModal('signupModal'); };
  document.getElementById('findIdBtn').onclick     = function() { openModal('findIdModal'); };
  document.getElementById('findPwBtn').onclick     = function() { openModal('findPwModal'); };
  document.getElementById('closeSignup').onclick   = closeSignupModal;
  document.getElementById('closeFindId').onclick   = closeFindId;
  document.getElementById('closeFindPw').onclick   = closeFindPw;
  document.getElementById('closeSuccessBtn').onclick = closeSignupModal;
  document.getElementById('logoutBtn1').onclick    = doLogout;
  document.getElementById('logoutBtn2').onclick    = doLogout;
  document.getElementById('logoutBtn3').onclick    = doLogout;
  document.getElementById('submitBtn').onclick     = doSignup;
  document.getElementById('findIdSubmit').onclick  = doFindId;
  document.getElementById('findPwSubmit').onclick  = doFindPw;
  document.getElementById('sEye1').onclick = function() { togglePw('sPw', this); };
  document.getElementById('sEye2').onclick = function() { togglePw('sPw2', this); };
  document.getElementById('email').onkeydown    = function(e) { if(e.key==='Enter') doLogin(); };
  document.getElementById('password').onkeydown = function(e) { if(e.key==='Enter') doLogin(); };
  document.getElementById('sPw').oninput  = checkPwStrength;
  document.getElementById('sPw2').oninput = checkConfirm;

  document.querySelectorAll('.role-btn').forEach(function(btn) {
    btn.onclick = function() {
      document.querySelectorAll('.role-btn').forEach(function(b){ b.classList.remove('on'); });
      this.classList.add('on');
      document.getElementById('sRole').value = this.dataset.role;
    };
  });

  // 드래그 시 닫힘 방지: mousedown 시작점 추적
  var _mdTarget = null;
  document.addEventListener('mousedown', function(e){ _mdTarget = e.target; });

  ['signupModal','findIdModal','findPwModal'].forEach(function(id) {
    document.getElementById(id).addEventListener('mouseup', function(e) {
      if(e.target === this && _mdTarget === this) {
        if(id==='signupModal') closeSignupModal();
        else if(id==='findIdModal') closeFindId();
        else closeFindPw();
      }
    });
  });

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if(e.key !== 'Escape') return;
    var modals = [['signupModal',closeSignupModal],['findIdModal',closeFindId],['findPwModal',closeFindPw]];
    modals.forEach(function(m){
      var el = document.getElementById(m[0]);
      if(el && el.style.display === 'flex') m[1]();
    });
  });
});

async function doLogin() {
  var emailEl = document.getElementById('email');
  var pwEl = document.getElementById('password');
  if(!emailEl || !pwEl) return;
  var email = (emailEl.value || '').trim();
  var password = pwEl.value || '';
  var errBox = document.getElementById('loginError');
  if(!email || !password) {
    if(errBox) { errBox.textContent = '⚠️ 이메일과 비밀번호를 입력해주세요.'; errBox.style.display='block'; }
    return;
  }
  if(errBox) errBox.style.display='none';
  var btn = document.getElementById('loginBtn');
  if(btn) { btn.disabled=true; btn.textContent='로그인 중...'; }
  window.sb.auth.signInWithPassword({email:email, password:password})
    .then(function(r) {
      if(btn) { btn.disabled=false; btn.textContent='로그인'; }
      if(r.error) {
        if(errBox) { errBox.textContent='❌ 이메일 또는 비밀번호가 다릅니다.'; errBox.style.display='block'; }
        return;
      }
      var user = r.data.user;
      if(!user) return;
      window.sb.from('user_profiles').select('*').eq('id',user.id).single()
        .then(function(pr) {
          if(pr.error || !pr.data) {
            if(errBox) { errBox.textContent='⚠️ 프로필 조회 실패.'; errBox.style.display='block'; }
            return;
          }
          var p = pr.data;
          if(p.status==='pending') {
            window.sb.auth.signOut();
            if(errBox) { errBox.textContent='⏳ 관리자 승인 대기 중입니다.'; errBox.style.display='block'; }
            return;
          }
          if(p.status==='rejected') {
            window.sb.auth.signOut();
            if(errBox) { errBox.textContent='거절된 계정입니다.'; errBox.style.display='block'; }
            return;
          }
          if(p.status==='inactive') {
            window.sb.auth.signOut();
            if(errBox) { errBox.textContent='비활성화된 계정입니다.'; errBox.style.display='block'; }
            return;
          }
          // 로그인 성공 - myinfo 저장
          var myinfo = {name:p.name,email:p.email,company:p.company,role:p.role};
          localStorage.setItem('hs_myinfo', JSON.stringify(myinfo));
          localStorage.setItem('hs_plan', p.price_plan||'beta');
          // 리다이렉트
          window.location.href = (p.role==='superadmin')?'admin.html':'index.html';
        });
    });
}

function showView(v) {
  document.getElementById('loginSection').style.display  = v==='login'   ?'block':'none';
  document.getElementById('pendingView').style.display   = v==='pending' ?'block':'none';
  document.getElementById('rejectedView').style.display  = v==='rejected'?'block':'none';
  document.getElementById('inactiveView').style.display  = v==='inactive'?'block':'none';
}

async function requestWithdrawal() {
  if(!confirm('정말 탈퇴 신청하시겠습니까?\n\n30일 후 계정과 데이터가 완전 삭제됩니다.')) return;
  try {
    var sess = (await sb.auth.getSession()).data.session;
    if(!sess) return;
    var r = await sb.from('user_profiles').update({
      status:'withdrawal_requested', withdrawal_at:new Date().toISOString()
    }).eq('id', sess.user.id);
    if(r.error) throw r.error;
    alert('탈퇴 신청이 완료되었습니다.\n30일 후 계정이 삭제됩니다.\n문의: yunolabs.inc@gmail.com');
    await sb.auth.signOut();
    location.reload();
  } catch(e) { alert('오류: '+e.message); }
}

async function doLogout() {
  localStorage.setItem('drcheck_auto','false');
  await sb.auth.signOut();
  location.reload();
}

function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}

function closeSignupModal() {
  document.getElementById('signupModal').classList.remove('open'); document.body.style.overflow='';
  document.getElementById('signupFormWrap').style.display='block'; document.getElementById('signupSuccess').style.display='none';
  document.getElementById('signupErr').style.display='none'; document.getElementById('agreeCheck').checked=false;
  ['sName','sEmail','sPw','sPw2','sCompany','sRegion','sPhone'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});
}
function closeFindId() {
  document.getElementById('findIdModal').classList.remove('open'); document.body.style.overflow='';
  document.getElementById('findIdForm').style.display='block'; document.getElementById('findIdResult').style.display='none';
  document.getElementById('findIdErr').style.display='none';
  ['findIdName','findIdCompany','findIdPhone'].forEach(function(id){document.getElementById(id).value='';});
}
function closeFindPw() {
  document.getElementById('findPwModal').classList.remove('open'); document.body.style.overflow='';
  document.getElementById('findPwForm').style.display='block'; document.getElementById('findPwSuccess').style.display='none';
  document.getElementById('findPwErr').style.display='none'; document.getElementById('findPwEmail').value='';
}

async function doFindId() {
  var name=document.getElementById('findIdName').value.trim(), company=document.getElementById('findIdCompany').value.trim();
  var phone=document.getElementById('findIdPhone').value.replace(/[^0-9]/g,'');
  var errBox=document.getElementById('findIdErr'), btn=document.getElementById('findIdSubmit');
  errBox.style.display='none';
  if(!name||!company||!phone){errBox.textContent='⚠️ 이름, 회사명, 핸드폰 번호를 모두 입력해주세요.';errBox.style.display='block';return;}
  btn.disabled=true; btn.textContent='검색 중...';
  try {
    var r=await sb.from('user_profiles').select('email').eq('name',name).eq('company',company).eq('phone',phone).maybeSingle();
    if(r.error||!r.data){errBox.textContent='⚠️ 해당 정보로 가입된 계정을 찾을 수 없습니다.';errBox.style.display='block';return;}
    document.getElementById('foundEmail').textContent=r.data.email;
    document.getElementById('findIdForm').style.display='none'; document.getElementById('findIdResult').style.display='block';
  } catch(e){errBox.textContent='⚠️ 오류: '+e.message; errBox.style.display='block';}
  finally{btn.disabled=false; btn.textContent='이메일 찾기';}
}

async function doFindPw() {
  var email=document.getElementById('findPwEmail').value.trim();
  var errBox=document.getElementById('findPwErr'), btn=document.getElementById('findPwSubmit');
  errBox.style.display='none';
  if(!email){errBox.textContent='⚠️ 이메일을 입력해주세요.';errBox.style.display='block';return;}
  btn.disabled=true; btn.textContent='전송 중...';
  try {
    var r=await sb.auth.resetPasswordForEmail(email,{redirectTo:'https://yunolabsinc-blip.github.io/hospital-schedule/login.html'});
    if(r.error){errBox.textContent='⚠️ '+r.error.message; errBox.style.display='block';return;}
    document.getElementById('sentEmail').textContent=email;
    document.getElementById('findPwForm').style.display='none'; document.getElementById('findPwSuccess').style.display='block';
  } catch(e){errBox.textContent='⚠️ 오류: '+e.message; errBox.style.display='block';}
  finally{btn.disabled=false; btn.textContent='재설정 링크 보내기';}
}

function togglePw(id,eye){var i=document.getElementById(id);i.type=i.type==='password'?'text':'password';eye.textContent=i.type==='password'?'👁':'🙈';}

function formatPhone(input){var v=input.value.replace(/[^0-9]/g,'');if(v.length<=3)input.value=v;else if(v.length<=7)input.value=v.substring(0,3)+'-'+v.substring(3);else input.value=v.substring(0,3)+'-'+v.substring(3,7)+'-'+v.substring(7,11);}

function checkPwStrength(){
  var pw=document.getElementById('sPw').value, score=0;
  if(pw.length>=8)score++; if(/[0-9]/.test(pw))score++; if(/[!@#$%^&*]/.test(pw))score++;
  var info=[{w:'0%',c:'#f0f0f0',t:'8자 이상, 숫자·특수문자 포함 권장',cls:'gray'},{w:'33%',c:'#ef4444',t:'약함',cls:'err'},{w:'66%',c:'#f59e0b',t:'보통',cls:'gray'},{w:'100%',c:'#22c55e',t:'강함 — 좋습니다!',cls:'ok'}][score];
  document.getElementById('pwBar').style.width=info.w; document.getElementById('pwBar').style.background=info.c;
  document.getElementById('pwHint').textContent=info.t; document.getElementById('pwHint').className='hint '+info.cls;
  checkConfirm();
}

function checkConfirm(){
  var pw=document.getElementById('sPw').value, pw2=document.getElementById('sPw2').value;
  var h=document.getElementById('confirmHint'), inp=document.getElementById('sPw2');
  if(!pw2){h.textContent='비밀번호를 한 번 더 입력해주세요';h.className='hint gray';inp.className='';return false;}
  if(pw===pw2){h.textContent='✓ 비밀번호가 일치합니다';h.className='hint ok';inp.className='ok';return true;}
  h.textContent='✗ 비밀번호가 일치하지 않습니다';h.className='hint err';inp.className='err';return false;
}

async function doSignup(){
  var name=document.getElementById('sName').value.trim(), email=document.getElementById('sEmail').value.trim();
  var pw=document.getElementById('sPw').value, company=document.getElementById('sCompany').value.trim();
  var role=document.getElementById('sRole').value, region=document.getElementById('sRegion').value.trim();
  var phone=(document.getElementById('sPhone').value||'').replace(/[^0-9]/g,'');
  var agree=document.getElementById('agreeCheck').checked;
  var errBox=document.getElementById('signupErr'), btn=document.getElementById('submitBtn');
  errBox.style.display='none';
  if(!name){errBox.textContent='⚠️ 이름을 입력해주세요.';errBox.style.display='block';return;}
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errBox.textContent='⚠️ 올바른 이메일을 입력해주세요.';errBox.style.display='block';return;}
  if(!phone||phone.length<10){errBox.textContent='⚠️ 올바른 핸드폰 번호를 입력해주세요.';errBox.style.display='block';return;}
  if(pw.length<8){errBox.textContent='⚠️ 비밀번호는 8자 이상이어야 합니다.';errBox.style.display='block';return;}
  if(!checkConfirm()){errBox.textContent='⚠️ 비밀번호가 일치하지 않습니다.';errBox.style.display='block';return;}
  if(!company){errBox.textContent='⚠️ 회사명을 입력해주세요.';errBox.style.display='block';return;}
  if(!agree){errBox.textContent='⚠️ 개인정보 수집 및 이용에 동의해주세요.';errBox.style.display='block';return;}
  btn.disabled=true; btn.innerHTML='<span class="spinner"></span>신청 중...';
  try {
    var r=await sb.auth.signUp({email:email,password:pw,options:{data:{name:name,company:company,job_title:role,region:region,phone:phone}}});
    if(r.error){var msgs={'User already registered':'이미 가입된 이메일입니다. 로그인해주세요.'};errBox.textContent='⚠️'+(msgs[r.error.message]||r.error.message);errBox.style.display='block';return;}
    document.getElementById('signupFormWrap').style.display='none'; document.getElementById('signupSuccess').style.display='block';
    document.getElementById('successEmail').textContent=email;
  } catch(e){errBox.textContent='⚠️ 오류: '+e.message; errBox.style.display='block';}
  finally{btn.disabled=false; btn.innerHTML='가입 신청';}
}

function doRegister(){
  var name=(document.getElementById('regName')?.value||'').trim();
  var email=(document.getElementById('regEmail')?.value||'').trim();
  var pw=document.getElementById('regPw')?.value||'' ;
  var pw2=document.getElementById('regPw2')?.value||'' ;
  var company=(document.getElementById('regCompany')?.value||'').trim();
  var jobTitle=document.getElementById('regJobTitle')?.value||'' ;
  var region=(document.getElementById('regRegion')?.value||'').trim();
  var phone=(document.getElementById('regPhone')?.value||'').trim();
  var errBox=document.getElementById('registerError');
  var showErr=function(msg){if(errBox){errBox.textContent=msg;errBox.style.display='block';}}
  if(!name||!email||!pw||!company||!jobTitle){
    showErr('⚠️ 필수 항목을 모두 입력해주세요.');
    return;
  }
  if(pw.length<8){showErr('⚠️ 비밀번호는 8자 이상이어야 합니다.');return;}
  if(pw!==pw2){showErr('⚠️ 비밀번호가 일치하지 않습니다.');return;}
  if(errBox) errBox.style.display='none';
  var regBtn=document.getElementById('registerBtn');
  if(regBtn){regBtn.disabled=true;regBtn.textContent='제출 중...';}
  window.sb.auth.signUp({email:email,password:pw})
    .then(function(r){
      if(regBtn){regBtn.disabled=false;regBtn.textContent='가입 신청 제출';}
      if(r.error){showErr('❌ '+r.error.message);return;}
      var uid=r.data?.user?.id;
      if(!uid){showErr('❌ 회원가입 실패.');return;}
      window.sb.from('user_profiles').insert({
        id:uid, email:email, name:name, company:company,
        job_title:jobTitle, region:region, phone:phone,
        role:'user', status:'pending'
      }).then(function(pr){
        if(pr.error){showErr('❌ 프로필 저장 실패: '+pr.error.message);return;}
        alert('✅ 가입 신청이 접수되었습니다.\n관리자 승인 후 로그인하실 수 있습니다.');
        document.getElementById('registerSection').style.display='none';
        document.getElementById('loginSection').style.display='block';
      });
    });
}

