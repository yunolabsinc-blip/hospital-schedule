// DrCheckPro login-app.js v4
var SUPA_URL='https://hslxclmezfudjgmehriy.supabase.co';
var SUPA_KEY='sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT';

document.addEventListener('DOMContentLoaded',function(){
  if(typeof supabase!=='undefined'){
    window.sb=supabase.createClient(SUPA_URL,SUPA_KEY);
  }
  var regEmailEl=document.getElementById('regEmail');
  if(regEmailEl){
    var _t=null;
    regEmailEl.addEventListener('input',function(){
      clearTimeout(_t);
      var email=this.value.trim();
      var hint=_getHint();
      if(!email||!email.includes('@')||!email.includes('.')){hint.textContent='';return;}
      hint.style.color='#94a3b8';hint.textContent='… 확인 중';
      _t=setTimeout(function(){checkEmailDuplicate(email);},600);
    });
  }
});

function _getHint(){
  var h=document.getElementById('email-dup-hint');
  if(!h){
    h=document.createElement('div');
    h.id='email-dup-hint';
    h.style.cssText='font-size:12px;margin-top:4px;min-height:16px;';
    var el=document.getElementById('regEmail');
    if(el&&el.parentNode) el.parentNode.appendChild(h);
  }
  return h;
}

function checkEmailDuplicate(email){
  if(!window.sb||!email) return;
  var h=_getHint();
  h.style.color='#94a3b8'; h.textContent='… 확인 중';
  window.sb.rpc('check_email_available',{p_email:email})
    .then(function(r){
      if(r.error){h.style.color='#94a3b8';h.textContent='';return;}
      if(r.data==='available'){
        h.style.color='#22c55e';
        h.textContent='✅ 사용 가능한 이메일입니다.';
      } else if(r.data==='withdrawn'){
        h.style.color='#E8734A';
        h.textContent='⚠️ 탈퇴한 계정입니다. 다시 가입할 수 있습니다.';
      } else {
        h.style.color='#dc2626';
        h.textContent='❌ 이미 사용 중인 이메일입니다.';
      }
    });
}

function showErr(id,msg){
  var b=document.getElementById(id);
  if(!b) return;
  b.textContent=msg; b.style.display=msg?'block':'none';
}

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
    if(!uid){showErr('loginError','❌ 로그인 실패.');if(btn){btn.disabled=false;btn.textContent='로그인';}return;}
    window.sb.from('user_profiles').select('*').eq('id',uid).single().then(function(pr){
      if(pr.error||!pr.data){
        showErr('loginError','❌ 등록된 계정이 없습니다. 관리자에게 문의해주세요.');
        if(btn){btn.disabled=false;btn.textContent='로그인';}return;
      }
      var profile=pr.data;
      var prev=JSON.parse(localStorage.getItem('hs_myinfo')||'{}');
      if(prev.id&&prev.id!==uid){
        Object.keys(localStorage).filter(function(k){return k.startsWith('hs_');}).forEach(function(k){localStorage.removeItem(k);});
      }
      localStorage.setItem('hs_myinfo',JSON.stringify(profile));
      var role=profile.job_title||profile.role||'';
      if(role==='관리자'||role==='superadmin'||role==='manager'){location.href='admin.html';}
      else{location.href='index.html';}
    });
  });
}

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
  if(!window.sb){showErr('registerError','⚠️ 서버 연결 실패.');if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;}

  // RPC로 이메일 가용 여부 확인 (auth.users + user_profiles 동시 체크)
  window.sb.rpc('check_email_available',{p_email:email})
    .then(function(ex){
      if(ex.data==='taken'){
        showErr('registerError','❌ 이미 사용 중인 이메일입니다.');
        if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;
      }
      // 탈퇴/신규: RPC로 이전 데이터 완전 삭제 후 재가입
      window.sb.rpc('cleanup_user_by_email',{p_email:email})
        .then(function(){
          setTimeout(function(){
            _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);
          },500);
        })
        .catch(function(){
          _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn);
        });
    });
}

function _doSignUp(name,email,pw,company,jobTitle,region,phone,agreeMarketing,btn){
  window.sb.auth.signUp({email:email,password:pw}).then(function(r){
    if(r.error){
      var msg=r.error.message||'';
      if(msg.includes('already')||msg.includes('registered')) msg='이 이메일은 이미 사용 중입니다. 관리자에게 문의해주세요.';
      else if(msg.includes('rate')) msg='잠시 후 다시 시도해주세요.';
      showErr('registerError','❌ '+msg);
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;
    }
    var uid=r.data.user?.id;
    if(!uid){showErr('registerError','❌ 가입 처리 오류.');if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;}
    window.sb.from('user_profiles').upsert({
      id:uid,name:name,email:email,company:company,
      job_title:jobTitle,region:region,phone:phone,
      role:'user',status:'pending',agree_marketing:agreeMarketing
    },{onConflict:'id'}).then(function(pr){
      if(pr.error&&!pr.error.message.includes('duplicate key')){
        showErr('registerError','❌ 저장 실패: '+pr.error.message);
        if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}return;
      }
      // 토스트 메시지 표시
      var toast=document.createElement('div');
      toast.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:24px 32px;border-radius:16px;font-size:15px;font-weight:600;z-index:9999;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);line-height:1.6;';
      toast.innerHTML='✅ 회원가입 신청 완료!<br><span style="font-size:13px;font-weight:400;color:#94a3b8">관리자 승인 후 로그인하실 수 있습니다.</span>';
      document.body.appendChild(toast);
      // 3초 후 토스트 제거 + 로그인 화면으로 이동
      setTimeout(function(){
        toast.remove();
        if(typeof showLogin==='function') showLogin();
      }, 2500);
      if(btn){btn.disabled=false;btn.textContent='가입 신청 제출';}
    });
  });
}




