// DrCheckPro login-app.js
var SUPA_URL='https://hslxclmezfudjgmehriy.supabase.co';
var SUPA_KEY='sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT';

// Supabase 초기화 (DOMContentLoaded 후)
document.addEventListener('DOMContentLoaded', function(){
  if(typeof supabase !== 'undefined'){
    window.sb = supabase.createClient(SUPA_URL, SUPA_KEY);
  }
});

// 에러 표시
function showErr(id, msg){
  var box = document.getElementById(id);
  if(!box) return;
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

// 로그인
function doLogin(){
  var email = (document.getElementById('email')?.value||'').trim();
  var pw = document.getElementById('password')?.value||'';
  showErr('loginError','');
  if(!email || !pw){ showErr('loginError','⚠️ 이메일과 비밀번호를 입력해주세요.'); return; }
  var btn = document.getElementById('loginBtn');
  if(btn){ btn.disabled=true; btn.textContent='로그인 중...'; }
  if(!window.sb){ showErr('loginError','⚠️ 서버 연결 실패. 잠시 후 다시 시도해주세요.'); if(btn){btn.disabled=false;btn.textContent='로그인';} return; }
  window.sb.auth.signInWithPassword({email:email, password:pw}).then(function(r){
    if(r.error){
      var msg = r.error.message||'';
      if(msg.includes('Invalid login credentials')||msg.includes('invalid')) msg='이메일 또는 비밀번호가 일치하지 않습니다.';
      else if(msg.includes('Email not confirmed')) msg='이메일 인증이 필요합니다.';
      else if(msg.includes('Too many')) msg='로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.';
      showErr('loginError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='로그인';}
      return;
    }
    var uid = r.data.user?.id;
    if(!uid){ showErr('loginError','❌ 로그인 정보를 가져오지 못했습니다.'); if(btn){btn.disabled=false;btn.textContent='로그인';} return; }
    window.sb.from('user_profiles').select('*').eq('id',uid).single().then(function(pr){
      if(pr.error||!pr.data){
        showErr('loginError','❌ 등록된 계정이 없습니다. 관리자에게 문의해주세요.');
        if(btn){btn.disabled=false;btn.textContent='로그인';}
        return;
      }
      var profile = pr.data;
      var role = profile.job_title||profile.role||'';
      if(role==='관리자'||role==='superadmin'||role==='manager'){
        location.href='admin.html';
      } else {
        location.href='index.html';
      }
    });
  });
}

// 회원가입
function doRegister(){
  var name=(document.getElementById('regName')?.value||'').trim();
  var email=(document.getElementById('regEmail')?.value||'').trim();
  var pw=document.getElementById('regPw')?.value||'';
  var pw2=document.getElementById('regPw2')?.value||'';
  var company=(document.getElementById('regCompany')?.value||'').trim();
  var jobTitle=document.getElementById('regJobTitle')?.value||'';
  var region=(document.getElementById('regRegion')?.value||'').trim();
  var phone=(document.getElementById('regPhone')?.value||'').trim();
  showErr('registerError','');
  if(!name||!email||!pw||!company||!jobTitle){ showErr('registerError','⚠️ 필수 항목을 모두 입력해주세요.'); return; }
  if(pw.length<8){ showErr('registerError','⚠️ 비밀번호는 8자 이상이어야 합니다.'); return; }
  if(!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw)){ showErr('registerError','⚠️ 비밀번호는 영문자와 숫자를 모두 포함해야 합니다.'); return; }
  if(pw!==pw2){ showErr('registerError','⚠️ 비밀번호가 일치하지 않습니다.'); return; }
  if(!document.getElementById('agreeTerms')?.checked){ showErr('registerError','⚠️ 이용약관 및 개인정보처리방침에 동의해주세요.'); return; }
  var btn=document.getElementById('registerBtn');
  if(btn){btn.disabled=true;btn.textContent='제출 중...';}
  if(!window.sb){ showErr('registerError','⚠️ 서버 연결 실패.'); if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';} return; }
  window.sb.auth.signUp({email:email, password:pw}).then(function(r){
    if(r.error){
      var msg=r.error.message||'';
      if(msg.includes('already')||msg.includes('registered')) msg='이미 가입된 이메일입니다.';
      else if(msg.includes('rate limit')) msg='잠시 후 다시 시도해주세요.';
      else if(msg.includes('invalid')) msg='이메일 형식이 올바르지 않습니다.';
      showErr('registerError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
      return;
    }
    var uid=r.data.user?.id;
    if(!uid){ showErr('registerError','❌ 가입 처리 중 오류가 발생했습니다.'); if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';} return; }
    window.sb.from('user_profiles').upsert({
      id:uid, full_name:name, email:email,
      company:company, job_title:jobTitle,
      region:region, phone:phone,
      role:'user', is_approved:false,
      agree_marketing:document.getElementById('agreeMarketing')?.checked||false
    },{onConflict:'id'}).then(function(pr){
      if(pr.error&&!pr.error.message.includes('duplicate key')){
        showErr('registerError','❌ 저장 실패: '+pr.error.message);
        if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
        return;
      }
      alert('회원가입 신청이 완료되었습니다.\n관리자 승인 후 로그인하실 수 있습니다.');
      if(typeof showLogin === 'function') showLogin();
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
    });
  });
}

