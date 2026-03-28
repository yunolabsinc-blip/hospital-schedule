document.addEventListener('DOMContentLoaded', function() {

// ★ 여기를 수정하세요! ★
const SUPABASE_URL  = 'https://hslxclmezfudjgmehriy.supabase.co';
const SUPABASE_ANON = 'sb_publishable_EwCNrDIsMbHp-A8LOLqgNg_HznuhiCT';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

let currentRejectUserId = null; // 거절 모달에서 사용


// ============================================================
// 페이지 로드 — superadmin인지 확인
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // 1. 로그인 여부 확인
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'login.html'; // 로그인 안 됐으면 로그인 페이지로
    return;
  }

  // 2. superadmin인지 확인
  const { data: profile } = await sb
    .from('user_profiles')
    .select('role, email, name')
    .eq('id', session.user.id)
    .single();

  if (!profile || profile.role !== 'superadmin') {
    // superadmin이 아니면 앱으로 보냄
    window.location.href = 'index.html';
    return;
  }

  // 3. 관리자 이메일 표시
  document.getElementById('adminEmail').textContent = profile.email + ' (superadmin)';

  // 4. 데이터 불러오기
  await loadAll();
});


// ============================================================
// 전체 데이터 로드
// ============================================================
async function loadAll() {
  await Promise.all([
    loadStats(),
    loadPendingList(),
    loadAllList(),
  ]);
}


// ============================================================
// 통계 로드
// ============================================================
async function loadStats() {
  const { data } = await sb
    .from('user_profiles')
    .select('status');

  if (!data) return;

  const counts = { pending:0, approved:0, rejected:0, inactive:0 };
  data.forEach(u => {
    if (u.status in counts) counts[u.status]++;
    if (u.status === 'withdrawal_requested') counts.inactive++;
  });

  document.getElementById('statPending').textContent  = counts.pending;
  document.getElementById('statApproved').textContent = counts.approved;
  document.getElementById('statRejected').textContent = counts.rejected;
  document.getElementById('statInactive').textContent = counts.inactive;
  document.getElementById('pendingBadge').textContent = counts.pending;
}


// ============================================================
// 가입 신청 목록 로드 (pending 상태만)
// ============================================================
async function loadPendingList() {
  const { data, error } = await sb
    .from('user_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const container = document.getElementById('pendingList');

  if (error || !data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        대기 중인 가입 신청이 없습니다
      </div>`;
    return;
  }

  container.innerHTML = data.map(user => `
    <div class="user-card pending-card" id="card-${user.id}">
      <div class="avatar av-pending">${getInitials(user.name)}</div>
      <div class="user-info">
        <div class="user-name">${esc(user.name)}</div>
        <div class="user-detail">${esc(user.email)} · ${esc(user.company)}</div>
        <div class="user-meta">
          직책: ${esc(user.job_title || '미입력')}
          · 지역: ${esc(user.region || '미입력')}
          · 신청일: ${formatDate(user.created_at)}
        </div>
        <div class="user-meta" style="margin-top:4px">
          <select onchange="setPendingRole('${user.id}', this.value)" style="font-size:11px;padding:2px 6px;border:1px solid #e2e8f0;border-radius:6px;color:#555;background:white;cursor:pointer">
            <option value="user">역할: 영업 담당자</option>
            <option value="manager">역할: 팀장 / 관리자</option>
          </select>
        </div>
      </div>
      <span class="status-badge pending">대기 중</span>
      <div class="action-btns">
        <button class="btn-approve" onclick="approveWithRole('${user.id}')">승인</button>
        <button class="btn-reject"  onclick="openRejectModal('${user.id}')">거절</button>
      </div>
    </div>
  `).join('');
}


// ============================================================
// 전체 사용자 목록 로드
// ============================================================
async function loadAllList() {
  const { data, error } = await sb
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('allList');

  if (error || !data) {
    container.innerHTML = '<div class="empty-state">데이터를 불러올 수 없습니다</div>';
    return;
  }

  const statusLabel = {
    pending:              '대기 중',
    approved:             '승인됨',
    rejected:             '거절됨',
    inactive:             '비활성화',
    withdrawal_requested: '탈퇴 신청',
  };

  container.innerHTML = data.map(user => {
    const st    = user.status;
    const stLbl = statusLabel[st] || st;
    const avCls = st === 'approved' ? 'av-approved'
                : st === 'pending'  ? 'av-pending'
                : st === 'rejected' ? 'av-rejected'
                : 'av-inactive';

    // 액션 버튼 결정
    let actions = '';
    if (st === 'pending') {
      actions = `
        <button class="btn-approve" onclick="approve('${user.id}')">승인</button>
        <button class="btn-reject"  onclick="openRejectModal('${user.id}')">거절</button>`;
    } else if (st === 'approved') {
      actions = `<button class="btn-deactivate" onclick="setInactive('${user.id}')">비활성화</button>`;
    } else if (st === 'inactive') {
      actions = `<button class="btn-activate" onclick="approve('${user.id}')">재활성화</button>`;
    }

    return `
      <div class="user-card" id="card-all-${user.id}">
        <div class="avatar ${avCls}">${getInitials(user.name)}</div>
        <div class="user-info">
          <div class="user-name">${esc(user.name)}
            ${user.role === 'superadmin' ? ' 👑' : user.role === 'manager' ? ' 🎖️' : ''}
          </div>
          <div class="user-detail">${esc(user.email)} · ${esc(user.company)}</div>
          <div class="user-meta">
            역할: ${user.role} · 직책: ${esc(user.job_title || '미입력')}
            · 가입: ${formatDate(user.created_at)}
          </div>
        </div>
        <span class="status-badge ${st}">${stLbl}</span>
        <div class="action-btns">${actions}</div>
      </div>`;
  }).join('');
}


// ============================================================
// 역할 임시 저장 (승인 전)
// ============================================================
const pendingRoles = {};
function setPendingRole(userId, role) {
  pendingRoles[userId] = role;
}

// ============================================================
// 승인 처리 (역할 포함)
// ============================================================
async function approveWithRole(userId) {
  const role = pendingRoles[userId] || 'user';
  const roleLabel = role === 'manager' ? '팀장/관리자' : '영업 담당자';
  if (!confirm(`이 사용자를 [${roleLabel}] 역할로 승인하시겠습니까?`)) return;

  const { error } = await sb
    .from('user_profiles')
    .update({
      status:      'approved',
      role:        role,
      approved_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) { alert('오류: ' + error.message); return; }

  // 승인 이메일 발송 (Supabase 이메일 기능 사용)
  // 실제 이메일 발송은 관리자가 수동으로 하거나 Edge Function으로 처리
  // 지금은 알림창으로 대신 안내
  const userEmail = document.querySelector(`#card-all-${userId} .user-detail`)?.textContent?.split('·')[0]?.trim() || '';
  const userName  = document.querySelector(`#card-all-${userId} .user-name`)?.textContent?.trim() || '';

  alert(`✅ ${userName}님이 승인되었습니다!\n\n` +
    `📧 승인 안내를 이메일(${userEmail})로 직접 보내주세요.\n\n` +
    `─────────────────\n` +
    `제목: [닥터체크Pro] 가입이 승인되었습니다!\n\n` +
    `안녕하세요, ${userName}님!\n` +
    `닥터체크Pro 가입이 승인되었습니다.\n` +
    `지금 바로 로그인하여 이용하실 수 있습니다.\n\n` +
    `▶ https://yunolabsinc-blip.github.io/hospital-schedule/login.html\n` +
    `─────────────────`
  );
  await loadAll();
}

async function approve(userId) {
  await approveWithRole(userId);
}


// ============================================================
// 거절 모달
// ============================================================
function openRejectModal(userId) {
  currentRejectUserId = userId;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectModal').classList.add('open');
}

function closeRejectModal() {
  currentRejectUserId = null;
  document.getElementById('rejectModal').classList.remove('open');
}

async function confirmReject() {
  const reason = document.getElementById('rejectReason').value.trim();

  const { error } = await sb
    .from('user_profiles')
    .update({
      status:           'rejected',
      rejection_reason: reason || null,
    })
    .eq('id', currentRejectUserId);

  closeRejectModal();

  if (error) { alert('오류: ' + error.message); return; }

  alert('거절 처리되었습니다.');
  await loadAll();
}


// ============================================================
// 비활성화 (퇴사 등)
// ============================================================
async function setInactive(userId) {
  const reason = prompt('비활성화 사유를 입력하세요:\n(퇴사 / 휴직 / 장기미사용)');
  if (reason === null) return; // 취소

  const { error } = await sb
    .from('user_profiles')
    .update({
      status:          'inactive',
      inactive_at:     new Date().toISOString(),
      inactive_reason: reason || '퇴사',
    })
    .eq('id', userId);

  if (error) { alert('오류: ' + error.message); return; }

  alert('비활성화되었습니다.');
  await loadAll();
}


// ============================================================
// 탭 전환
// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none';
  document.getElementById('allTab').style.display     = tab === 'all'     ? 'block' : 'none';
  document.getElementById('dataTab').style.display    = tab === 'data'    ? 'block' : 'none';

  if (tab === 'data') loadUserData();
}

// ============================================================
// 활동 데이터 로드
// ============================================================
async function loadUserData() {
  const tbody = document.getElementById('activityTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa">불러오는 중...</td></tr>';

  try {
    // user_app_data 테이블에서 모든 사용자 데이터 조회
    const { data, error } = await sb
      .from('user_app_data')
      .select('user_id, email, name, company, data_v9, synced_at')
      .order('synced_at', { ascending: false });

    if (error) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#e53e3e">오류: ' + error.message + '<br><small>user_app_data 테이블이 없을 수 있어요. SQL을 먼저 실행해주세요.</small></td></tr>';
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#aaa">아직 데이터가 없습니다<br><small style="font-size:11px;color:#ccc">사용자가 로그인하면 자동으로 동기화됩니다</small></td></tr>';
      document.getElementById('statSyncUsers').textContent = '0';
      document.getElementById('statHospitals').textContent = '0';
      document.getElementById('statDoctors').textContent = '0';
      document.getElementById('statRecords').textContent = '0';
      return;
    }

    // 사용자 필터 업데이트
    const filter = document.getElementById('dataUserFilter');
    filter.innerHTML = '<option value="all">전체 사용자</option>' +
      data.map(d => '<option value="' + esc(d.user_id) + '">' + esc(d.name || d.email) + ' (' + esc(d.company || '') + ')</option>').join('');

    // 통계 계산
    let totalHospitals = 0, totalDoctors = 0, totalRecords = 0;
    const allRows = [];

    data.forEach(user => {
      const v9 = user.data_v9;
      if (!v9) return;

      const hospitals = v9.hospitals || [];
      const doctors = v9.doctors || [];
      const plans = v9.plans || {};

      totalHospitals += hospitals.length;
      totalDoctors += doctors.length;

      // 완료된 활동기록 추출
      Object.entries(plans).forEach(([drKey, dates]) => {
        if (typeof dates !== 'object') return;
        Object.entries(dates).forEach(([date, record]) => {
          if (!record || !record.checked) return;
          totalRecords++;

          // 의사 정보 찾기
          const drIdx = parseInt(drKey.split('_').pop()) || 0;
          const hospId = drKey.replace(/_\d+$/, '');
          const hospital = hospitals.find(h => h.id === hospId);
          const doctor = doctors[drIdx] || doctors.find(d => d.id === drKey);

          allRows.push({
            userName: user.name || user.email,
            company: user.company || '',
            hospitalName: hospital?.name || hospId,
            doctorName: doctor?.name || drKey.split('_')[0],
            doctorDept: doctor?.dept || '',
            date: date,
            time: record.time || '',
            products: Array.isArray(record.products) ? record.products.join(', ') : (record.product || ''),
            note: record.note || '',
            syncedAt: user.synced_at ? user.synced_at.substring(0,10) : ''
          });
        });
      });
    });

    // 통계 표시
    document.getElementById('statSyncUsers').textContent = data.length;
    document.getElementById('statHospitals').textContent = totalHospitals;
    document.getElementById('statDoctors').textContent = totalDoctors;
    document.getElementById('statRecords').textContent = totalRecords;

    // 전역 저장 (엑셀 추출용)
    window._activityRows = allRows;
    window._userData = data;

    // 테이블 렌더링
    if (allRows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#aaa">완료된 활동기록이 없습니다</td></tr>';
      return;
    }

    tbody.innerHTML = allRows.map((r, i) => `
      <tr style="border-bottom:1px solid #f0f0f0;${i%2===0?'':'background:#fafafa'}">
        <td style="padding:10px 14px">
          <div style="font-weight:500;font-size:13px">${esc(r.userName)}</div>
          <div style="font-size:11px;color:#aaa">${esc(r.company)}</div>
        </td>
        <td style="padding:10px 14px;font-size:13px">${esc(r.hospitalName)}</td>
        <td style="padding:10px 14px">
          <div style="font-size:13px">${esc(r.doctorName)}</div>
          <div style="font-size:11px;color:#aaa">${esc(r.doctorDept)}</div>
        </td>
        <td style="padding:10px 14px;font-size:13px;white-space:nowrap">${esc(r.date)}</td>
        <td style="padding:10px 14px;font-size:13px">${esc(r.time)}</td>
        <td style="padding:10px 14px;font-size:12px;color:#2563eb">${esc(r.products)}</td>
        <td style="padding:10px 14px;font-size:12px;color:#555;max-width:200px">${esc(r.note)}</td>
      </tr>
    `).join('');

  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#e53e3e">오류: ' + e.message + '</td></tr>';
  }
}

// ============================================================
// 엑셀 추출
// ============================================================
function exportExcel() {
  const rows = window._activityRows;
  if (!rows || rows.length === 0) {
    alert('추출할 데이터가 없습니다. 먼저 새로고침을 눌러주세요.');
    return;
  }

  // CSV 생성
  const headers = ['사용자', '회사', '거래처', '의사', '진료과', '날짜', '시간대', '제품', '활동내용', '동기화일'];
  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      '"' + (r.userName||'').replace(/"/g,'""') + '"',
      '"' + (r.company||'').replace(/"/g,'""') + '"',
      '"' + (r.hospitalName||'').replace(/"/g,'""') + '"',
      '"' + (r.doctorName||'').replace(/"/g,'""') + '"',
      '"' + (r.doctorDept||'').replace(/"/g,'""') + '"',
      '"' + (r.date||'').replace(/"/g,'""') + '"',
      '"' + (r.time||'').replace(/"/g,'""') + '"',
      '"' + (r.products||'').replace(/"/g,'""') + '"',
      '"' + (r.note||'').replace(/"/g,'""') + '"',
      '"' + (r.syncedAt||'').replace(/"/g,'""') + '"',
    ].join(','))
  ];

  // BOM 추가 (한글 엑셀 깨짐 방지)
  const bom = '﻿';
  const csvContent = bom + csvRows.join('
');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().substring(0,10);
  a.href = url;
  a.download = '닥터체크Pro_활동기록_' + today + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ============================================================
// 로그아웃
// ============================================================
async function logout() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}


// ============================================================
// 유틸 함수들
// ============================================================

// 이름 → 이니셜 (홍길동 → 홍)
function getInitials(name) {
  return name ? name.charAt(0) : '?';
}

// HTML 특수문자 이스케이프 (XSS 방지)
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 날짜 포맷
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

});
