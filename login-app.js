// DrCheckPro login-app.js v3
var SUPA_URL='https://hslxclmezfudjgmehriy.supabase.co';
var SUPA_KEY='sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT';

document.addEventListener('DOMContentLoaded',function(){
  if(typeof supabase!=='undefined'){
    window.sb=supabase.createClient(SUPA_URL,SUPA_KEY);
  }
  // 이메일 중복 확인 실시간 (debounce 600ms)
  var regEmailEl=document.getElementById('regEmail');
  if(regEmailEl){
    var _t=null;
    regEmailEl.addEventListener('input',function(){
      clearTimeout(_t);
      var email=this.value.trim();
      var hint=_getHint();
      if(!email||!email.includes('@')||!email.includes('.')){hint.textContent='';return;}
      hint.style.color='#94a3b8';
      hint.textContent='… 확인 중';
      _t=setTimeout(function(){checkEmailDuplicate(email);},600);
    });
  }
});

function _getHint(){
  var hint=document.getElementById('email-dup-hint');
  if(!hint){
    hint=document.createElement('div');
    hint.id='email-dup-hint';
    hint.style.cssText='font-size:12px;margin-top:4px;min-height:16px;';
    var el=document.getElementById('regEmail');
    if(el&&el.parentNode) el.parentNode.appendChild(hint);
  }
  return hint;
}

// 이메일 중복 확인 - user_profiles 기준
function checkEmailDuplicate(email){
  if(!window.sb||!email) return;
  window.sb.from('user_profiles').select('id,status,email').eq('email',email).maybeSingle()
    .then(function(r){
      var hint=_getHint();
      if(r.error){hint.style.color='#94a3b8';hint.textContent='';return;}
      if(r.data){
        if(r.data.status==='withdrawn'){
          hint.style.color='#E8734A';
          hint.textContent='⚠️ 탈퇴한 계정입니다. 다시 가입할 수 있습니다.';
        } else {
          hint.style.color='#dc2626';
          hint.textContent='❌ 이미 사용 중인 이메일입니다.';
        }
      } else {
        hint.style.color='#22c55e';
        hint.textContent='✅ 사용 가능한 이메일입니다.';
      }
    });
}

function showErr(id,msg){
  var box=document.getElementById(id);
  if(!box) return;
  box.textContent=msg;
  box.style.display=msg?'block':'none';
}

// 로그인
function doLogin(){
  var email=(document.getElementById('email')?.value||'').trim();
  var pw=document.getElementById('password')?.value||'';
  showErr('loginError','');
  if(!email||!pw){showErr('loginError','⚠️ 이메일과 비밀번호를 입력해주세요.');return;}
  var btn=document.getElementById('loginBtn');
  if(btn){btn.disabled=true;btn.textContent='로그인 중...';}
  if(!window.sb){showErr('loginError','⚠️ 서버 연결 실패.');if(btn){btn.disabled=false;btn.textContent='로그인';}return;}
  window.sb.auth.signInWithPassword({email:email,password:pw}).then(function(r){
    if(r.error){
      var msg=r.error.message||'';
      if(msg.includes('Invalid login')||msg.includes('invalid')) msg='이메일 또는 비밀번호가 일치하지 않습니다.';
      else if(msg.includes('Email not confirmed')) msg='이메일 인증이 필요합니다.';
      else if(msg.includes('Too many')) msg='로그인 시도 횟수 초과. 잠시 후 다시 시도해주세요.';
      showErr('loginError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='로그인';}
      return;
    }
    var uid=r.data.user?.id;
    if(!uid){showErr('loginError','❌ 로그인 정보를 가져오지 못했습니다.');if(btn){btn.disabled=false;btn.textContent='로그인';}return;}
    window.sb.from('user_profiles').select('*').eq('id',uid).single().then(function(pr){
      if(pr.error||!pr.data){
        showErr('loginError','❌ 등록된 계정이 없습니다. 관리자에게 문의해주세요.');
        if(btn){btn.disabled=false;btn.textContent='로그인';}
        return;
      }
      var profile=pr.data;
      // 이전 유저 데이터 초기화
      var prev=JSON.parse(localStorage.getItem('hs_myinfo')||'{}');
      if(prev.id&&prev.id!==uid){
        Object.keys(localStorage).filter(function(k){return k.startsWith('hs_');}).forEach(function(k){localStorage.removeItem(k);});
      }
      localStorage.setItem('hs_myinfo',JSON.stringify(profile));
      var role=profile.job_title||profile.role||'';
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
  var agreeMarketing=document.getElementById('agreeMarketing')?.checked||false;
  showErr('registerError','');
  if(!name||!email||!pw||!company||!jobTitle){showErr('registerError','⚠️ 필수 항목을 모두 입력해주세요.');return;}
  if(pw.length<8){showErr('registerError','⚠️ 비밀번호는 8자 이상이어야 합니다.');return;}
  if(!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw)){showErr('registerError','⚠️ 비밀번호는 영문자와 숫자를 모두 포함해야 합니다.');return;}
  if(pw!==pw2){showErr('registerError','⚠️ 비밀번호가 일치하지 않습니다.');return;}
  if(!document.getElementById('agreeTerms')?.checked){showErr('registerError','⚠️ 이용약관 및 개인정보처리방침에 동의해주세요.');return;}
  var btn=document.getElementById('registerBtn');
  if(btn){btn.disabled=true;btn.textContent='제출 중...';}
  if(!window.sb){showErr('registerError','⚠️ 서버 연결 실패.');if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;}

  // user_profiles 중복 체크
  window.sb.from('user_profiles').select('id,status').eq('email',email).maybeSingle()
    .then(function(existing){
      if(existing.data){
        var st=existing.data.status;
        if(st!=='withdrawn'){
          // 탈퇴가 아닌 기존 계정 → 차단
          showErr('registerError','❌ 이미 사용 중인 이메일입니다.');
          if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
          return;
        }
        // 탈퇴 계정 → user_profiles 삭제 후 재가입
        window.sb.from('user_profiles').delete().eq('email',email).then(function(){
          _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);
        });
      } else {
        // 신규 계정
        _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);
      }
    });
}

function _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn){
  window.sb.auth.signUp({email:email,password:pw}).then(function(r){
    if(r.error){
      var msg=r.error.message||'';
      if(msg.includes('already')||msg.includes('registered')) msg='이미 가입된 이메일입니다.';
      else if(msg.includes('rate')) msg='잠시 후 다시 시도해주세요.';
      showErr('registerError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
      return;
    }
    var uid=r.data.user?.id;
    if(!uid){showErr('registerError','❌ 가입 처리 오류.');if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;}
    window.sb.from('user_profiles').upsert({
      id:uid, name:name, email:email,
      company:company, job_title:jobTitle,
      region:region, phone:phone,
      role:'user', status:'pending',
      agree_marketing:agreeMarketing
    },{onConflict:'id'}).then(function(pr){
      if(pr.error&&!pr.error.message.includes('duplicate key')){
        showErr('registerError','❌ 저장 실패: '+pr.error.message);
        if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
        return;
      }
      alert('회원가입 신청이 완료되었습니다.\n관리자 승인 후 로그인하실 수 있습니다.');
      if(typeof showLogin==='function') showLogin();
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
    });
  });
}

