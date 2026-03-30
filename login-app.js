// DrCheckPro login-app.js v5
var SUPA_URL='https://hslxclmezfudjgmehriy.supabase.co';
var SUPA_KEY='sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT';

document.addEventListener('DOMContentLoaded',function(){
  if(typeof supabase!=='undefined'){
    window.sb=supabase.createClient(SUPA_URL,SUPA_KEY);
  }
  // 이메일 중복 확인 리스너
  var regEmailEl=document.getElementById('regEmail');
  if(regEmailEl){
    var _t=null;
    regEmailEl.addEventListener('input',function(){
      clearTimeout(_t);
      var email=this.value.trim();
      var hint=document.getElementById('email-dup-hint');
      if(!email||!email.includes('@')||!email.includes('.')){if(hint)hint.textContent='';return;}
      if(hint){hint.style.color='#94a3b8';hint.textContent='… 확인 중';}
      _t=setTimeout(function(){checkEmailDuplicate(email);},600);
    });
  }
});

// 이메일 중복 확인 (RPC)
function checkEmailDuplicate(){
  var email=(document.getElementById("regEmail")?.value||"").trim().toLowerCase();
  var msgEl=document.getElementById("emailDupMsg");
  if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
    if(msgEl){msgEl.style.color="#dc2626";msgEl.textContent="✏️ 유효한 이메일을 입력해주세요.";}
    return;
  }
  if(msgEl){msgEl.style.color="#94a3b8";msgEl.textContent="확인 중...";}
  sb.rpc("check_email_available",{p_email:email}).then(function(r){
    var st=r.data;
    if(st==="available"){
      if(msgEl){msgEl.style.color="#22c55e";msgEl.textContent="✅ 사용 가능한 이메일입니다.";}
      window._emailOk=email;
    } else if(st==="withdrawn"){
      if(msgEl){msgEl.style.color="#94a3b8";msgEl.textContent="정리 중...";}
      sb.rpc("cleanup_user_by_email",{p_email:email}).then(function(cr){
        if(cr.error){if(msgEl){msgEl.style.color="#dc2626";msgEl.textContent="오류: "+cr.error.message;}return;}
        if(msgEl){msgEl.style.color="#22c55e";msgEl.textContent="✅ 재가입 가능한 이메일입니다.";}
        window._emailOk=email;
      });
    } else {
      if(msgEl){msgEl.style.color="#dc2626";msgEl.textContent="⚠️ 이미 사용 중인 이메일입니다.";}
      window._emailOk=null;
    }
  }).catch(function(e){if(msgEl){msgEl.style.color="#dc2626";msgEl.textContent="오류: "+e.message;}});
}

function showErr(id,msg){
  var b=document.getElementById(id);
  if(!b) return;
  b.textContent=msg; b.style.display=msg?'block':'none';
}
function showSuccess(id,msg){
  var b=document.getElementById(id);
  if(!b) return;
  b.textContent=msg; b.style.display=msg?'block':'none';
}

// 로그인
function doLogin(){
  var email=(document.getElementById('email')?.value||'').trim();
  var pw=document.getElementById('password')?.value||'';
  var rememberEmail=document.getElementById('rememberEmail')?.checked||false;
  var autoLogin=document.getElementById('autoLogin')?.checked||false;
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
    // 이메일 기억
    if(rememberEmail) localStorage.setItem('drcheck_saved_email',email);
    else localStorage.removeItem('drcheck_saved_email');
    // 자동 로그인
    if(autoLogin) localStorage.setItem('drcheck_auto_session','1');
    else localStorage.removeItem('drcheck_auto_session');

    var uid=r.data.user?.id;
    if(!uid){showErr('loginError','❌ 로그인 실패.');if(btn){btn.disabled=false;btn.textContent='로그인';}return;}
    window.sb.from('user_profiles').select('*').eq('id',uid).single().then(function(pr){
      if(pr.error||!pr.data){
        showErr('loginError','❌ 등록된 계정이 없습니다. 관리자에게 문의해주세요.');
        if(btn){btn.disabled=false;btn.textContent='로그인';}return;
      }
      var profile=pr.data;
      // 이전 유저 데이터 시 전체 삭제
      var prev=JSON.parse(localStorage.getItem('hs_myinfo')||'{}');
      if(prev.id&&prev.id!==uid){
        Object.keys(localStorage).filter(function(k){return k.startsWith('hs_');}).forEach(function(k){localStorage.removeItem(k);});
      }
      localStorage.setItem('hs_myinfo',JSON.stringify(profile));
      var role=profile.job_title||profile.role||'';
      if(role==='관리자'||role==='superadmin'||role==='manager') location.href='admin.html';
      else location.href='index.html';
    });
  });
}

// 이메일 찾기 (이름 + 연락처)
function doFindId(){
  var name=(document.getElementById("findIdName")?.value||"").trim();
  var raw=(document.getElementById("findIdPhone")?.value||"").replace(/-/g,"").trim();
  var phone=raw.replace(/(\d{3})(\d{3,4})(\d{4})/,"$1-$2-$3");
  var errEl=document.getElementById("findIdError");
  var sucEl=document.getElementById("findIdSuccess");
  if(errEl)errEl.textContent=""; if(sucEl)sucEl.textContent="";
  if(!name||!raw){
    if(errEl){errEl.style.color="#dc2626";errEl.textContent="⚠️ 이름과 연락처를 입력해주세요.";}
    return;
  }
  sb.from("user_profiles").select("email").eq("name",name).eq("phone",phone).maybeSingle()
    .then(function(r){
      if(r.error||!r.data){
        if(errEl){errEl.style.color="#dc2626";errEl.textContent="⚠️ 일치하는 회원 정보가 없습니다.";}
        return;
      }
      var em=r.data.email;
      var masked=em.replace(/(.(?=.*@))/g,"*");
      if(sucEl){sucEl.style.color="#22c55e";sucEl.textContent="✅ 등록된 이메일: "+masked;}
    }).catch(function(e){if(errEl){errEl.style.color="#dc2626";errEl.textContent="오류: "+e.message;}});
}

// 비밀번호 재설정 (이름 + 이메일 + 연락처 확인 후 링크 발송)
function doFindPw(){
  var name=(document.getElementById("findPwName")?.value||"").trim();
  var email=(document.getElementById("findPwEmail")?.value||"").trim().toLowerCase();
  var raw=(document.getElementById("findPwPhone")?.value||"").replace(/-/g,"").trim();
  var phone=raw.replace(/(\d{3})(\d{3,4})(\d{4})/,"$1-$2-$3");
  var errEl=document.getElementById("findPwError");
  var sucEl=document.getElementById("findPwSuccess");
  if(errEl)errEl.textContent=""; if(sucEl)sucEl.textContent="";
  if(!name||!email||!raw){
    if(errEl){errEl.style.color="#dc2626";errEl.textContent="⚠️ 모든 항목을 입력해주세요.";}
    return;
  }
  sb.from("user_profiles").select("id").eq("name",name).eq("email",email).eq("phone",phone).maybeSingle()
    .then(function(r){
      if(r.error||!r.data){
        if(errEl){errEl.style.color="#dc2626";errEl.textContent="⚠️ 일치하는 회원 정보가 없습니다.";}
        return;
      }
      sb.auth.resetPasswordForEmail(email,{redirectTo:"https://www.drcheckpro.com/login.html?mode=reset"})
        .then(function(res){
          if(res.error){if(errEl){errEl.style.color="#dc2626";errEl.textContent="전송 실패: "+res.error.message;}return;}
          if(sucEl){sucEl.style.color="#22c55e";sucEl.textContent="✅ 비밀번호 재설정 메일을 발송했습니다.";}
        });
    }).catch(function(e){if(errEl){errEl.style.color="#dc2626";errEl.textContent="오류: "+e.message;}});
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
  if(!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw)){showErr('registerError','⚠️ 영문자와 숫자를 모두 포함해야 합니다.');return;}
  if(pw!==pw2){showErr('registerError','⚠️ 비밀번호가 일치하지 않습니다.');return;}
  if(!document.getElementById('agreeTerms')?.checked){showErr('registerError','⚠️ 이용약관 및 개인정보처리방침에 동의해주세요.');return;}
  var btn=document.getElementById('registerBtn');
  if(btn){btn.disabled=true;btn.textContent='제출 중...';}
  if(!window.sb){showErr('registerError','⚠️ 서버 연결 실패.');if(btn){btn.disabled=false;btn.textContent='회원가입';}return;}
  window.sb.rpc('check_email_available',{p_email:email}).then(function(ex){
    if(ex.data==='taken'){
      showErr('registerError','❌ 이미 사용 중인 이메일입니다.');
      if(btn){btn.disabled=false;btn.textContent='회원가입';}return;
    }
    window.sb.rpc('cleanup_user_by_email',{p_email:email})
      .then(function(){setTimeout(function(){_doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);},500);})
      .catch(function(){_doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);});
  });
}

function _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn){
  window.sb.auth.signUp({email:email,password:pw}).then(function(r){
    if(r.error){
      var msg=r.error.message||'';
      if(msg.includes('already')||msg.includes('registered')) msg='이미 가입된 이메일입니다. 관리자에게 문의해주세요.';
      else if(msg.includes('rate')) msg='잠시 후 다시 시도해주세요.';
      showErr('registerError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='회원가입';}return;
    }
    var uid=r.data.user?.id;
    if(!uid){showErr('registerError','❌ 가입 처리 오류.');if(btn){btn.disabled=false;btn.textContent='회원가입';}return;}
    window.sb.from('user_profiles').upsert({
      id:uid,name:name,email:email,company:company,
      job_title:jobTitle,region:region,phone:phone,
      role:'user',status:'pending',agree_marketing:agreeMarketing
    },{onConflict:'id'}).then(function(pr){
      if(pr.error&&!pr.error.message.includes('duplicate key')){
        showErr('registerError','❌ 저장 실패: '+pr.error.message);
        if(btn){btn.disabled=false;btn.textContent='회원가입';}return;
      }
      // 토스트 메시지
      var toast=document.createElement('div');
      toast.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:24px 32px;border-radius:16px;font-size:15px;font-weight:600;z-index:9999;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.3);line-height:1.7;max-width:300px;width:90%;';
      toast.innerHTML='✅ 회원가입 완료!<br><span style="font-size:13px;font-weight:400;color:#94a3b8">관리자 승인 후 로그인하실 수 있습니다.</span>';
      document.body.appendChild(toast);
      setTimeout(function(){
        toast.remove();
        if(typeof showLogin==='function') showLogin();
      },2500);
      if(btn){btn.disabled=false;btn.textContent='회원가입';}
    });
  });
}
function formatPhone(input){
  var v=input.value.replace(/\D/g,"");
  if(v.length<=3)input.value=v;
  else if(v.length<=7)input.value=v.slice(0,3)+"-"+v.slice(3);
  else input.value=v.slice(0,3)+"-"+v.slice(3,7)+"-"+v.slice(7,11);
}

