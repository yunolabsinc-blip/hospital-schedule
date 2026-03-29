var sb;
document.addEventListener('DOMContentLoaded', function () {
  sb = supabase.createClient('https://hslxclmezfudjgmehriy.supabase.co', 'sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT');
  window.sb = sb;

  // ── 로그인 버튼 + 엔터키 ──
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('password').addEventListener('keydown', function(e){
    if(e.key==='Enter') doLogin();
  });
  document.getElementById('email').addEventListener('keydown', function(e){
    if(e.key==='Enter') doLogin();
  });

  // ── 회원가입 화면 전환 ──
  document.getElementById('goRegisterBtn').addEventListener('click', function(){
    document.getElementById('loginSection').style.display='none';
    document.getElementById('registerSection').style.display='block';
  });
  document.getElementById('backToLoginBtn').addEventListener('click', function(){
    document.getElementById('registerSection').style.display='none';
    document.getElementById('loginSection').style.display='block';
  });
  document.getElementById('registerBtn').addEventListener('click', doRegister);

  // ── 자동 로그인 체크 ──
  var savedEmail = localStorage.getItem('drcheck_email');
  if(savedEmail) {
    document.getElementById('email').value = savedEmail;
    document.getElementById('rememberEmail').checked = true;
  }
  if(localStorage.getItem('drcheck_auto')==='1') {
    document.getElementById('autoLogin').checked = true;
    doLogin();
  }

  // ── 날짜 표시 ──
  var d=new Date();
  var el=document.getElementById('logoDate');
  if(el) el.textContent=d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0');

  // ── 비밀번호 보기 ──
  var eye=document.getElementById('loginEye');
  var pw=document.getElementById('password');
  if(eye&&pw) eye.addEventListener('click',function(){
    pw.type=pw.type==='password'?'text':'password';
  });
  var regEye=document.getElementById('regEye');
  var regPw=document.getElementById('regPw');
  if(regEye&&regPw) regEye.addEventListener('click',function(){
    regPw.type=regPw.type==='password'?'text':'password';
  });

  // ── ESC 닫기 ──
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      var r=document.getElementById('registerSection');
      if(r&&r.style.display==='block'){
        r.style.display='none';
        document.getElementById('loginSection').style.display='block';
      }
    }
  });
});

function doLogin(){
  var email=(document.getElementById('email').value||'').trim();
  var password=document.getElementById('password').value||'';
  var errBox=document.getElementById('loginError');
  var remember=document.getElementById('rememberEmail').checked;
  var autoL=document.getElementById('autoLogin').checked;
  if(!email||!password){
    if(errBox){errBox.textContent='⚠️ 이메일과 비밀번호를 입력해주세요.';errBox.style.display='block';}
    return;
  }
  if(errBox) errBox.style.display='none';
  var btn=document.getElementById('loginBtn');
  if(btn){btn.disabled=true;btn.textContent='로그인 중...';}
  window.sb.auth.signInWithPassword({email:email,password:password})
    .then(function(r){
      if(btn){btn.disabled=false;btn.textContent='로그인';}
      if(r.error){
        if(errBox){errBox.textContent='❌ 이메일 또는 비밀번호가 다릅니다.';errBox.style.display='block';}
        return;
      }
      if(remember) localStorage.setItem('drcheck_email',email);
      else localStorage.removeItem('drcheck_email');
      if(autoL) localStorage.setItem('drcheck_auto','1');
      else localStorage.removeItem('drcheck_auto');
      var user=r.data.user;
      window.sb.from('user_profiles').select('*').eq('id',user.id).single()
        .then(function(pr){
          if(pr.error||!pr.data){
            if(errBox){errBox.textContent='⚠️ 프로필 조회 실패.';errBox.style.display='block';}
            return;
          }
          var p=pr.data;
          if(p.status==='pending'){window.sb.auth.signOut();if(errBox){errBox.textContent='⏳ 관리자 승인 대기 중입니다.';errBox.style.display='block';}return;}
          if(p.status==='rejected'){window.sb.auth.signOut();if(errBox){errBox.textContent='거절된 계정입니다.';errBox.style.display='block';}return;}
          if(p.status==='inactive'){window.sb.auth.signOut();if(errBox){errBox.textContent='비활성화된 계정입니다.';errBox.style.display='block';}return;}
          localStorage.setItem('hs_myinfo',JSON.stringify({name:p.name,email:p.email,company:p.company,role:p.role}));
          localStorage.setItem('hs_plan',p.price_plan||'beta');
          window.location.href=(p.role==='superadmin')?'admin.html':'index.html';
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
  var errBox=document.getElementById('registerError');
  var showErr=function(msg){if(errBox){errBox.textContent=msg;errBox.style.display='block';}};
  if(!name||!email||!pw||!company||!jobTitle){showErr('⚠️ 필수 항목을 모두 입력해주세요.');return;}
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
      window.sb.from('user_profiles').upsert({
        id:uid,email:email,name:name,company:company,
        job_title:jobTitle,region:region,phone:phone,
        role:'user',status:'pending'
      },{onConflict:'id'}).then(function(pr){
        if(pr.error){showErr('❌ '+pr.error.message);return;}
        alert('✅ 가입 신청이 접수되었습니다.\n관리자 승인 후 로그인하실 수 있습니다.');
        document.getElementById('registerSection').style.display='none';
        document.getElementById('loginSection').style.display='block';
      });
    });
}


 
