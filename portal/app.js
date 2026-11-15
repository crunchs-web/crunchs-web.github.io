/* ==========================================================================
   CRUNCH'S 점주 포털 — 화면 로직
   데이터는 모두 data.js의 `DB` 어댑터를 통해 읽고 씁니다.
   (localStorage → Supabase 전환 시 이 파일은 수정하지 않아도 됩니다.)
   ========================================================================== */
(function () {
  'use strict';

  const { DB, ORDER_STATUS, STORE_PROFILES } = window.CRUNCHS;

  const state = {
    role: 'owner',
    storeId: 'yangsan',
    userId: '',
    userName: '',
    storeTitle: '',
    view: 'dashboard',
    cart: {},
    catalogCat: '전체',
    catalogSearch: '',
    statusFilter: 'all',
    storeFilter: 'all',
    noticeCat: 'all',
    notices: [],
    readIds: [],
    orders: [],
    posts: [],
    applications: [],
    invites: [],
    members: [],
    memberRole: 'all',
    memberSearch: '',
    checklist: {},
    /* 관리자 편집 데이터 */
    categories: [],
    catalog: [],
    manuals: { manual: [], recipe: [], open: [], close: [] },
    manualCat: '전체',
    manualSearch: '',
    adminTab: 'categories',
    adminItemCat: 'all',
    adminSearch: ''
  };

  /* ---------- 유틸 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const won = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
  const fmtDate = (iso) => {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  };
  const fmtDateTime = (iso) => {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return fmtDate(iso) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  const storeName = (id) => (STORE_PROFILES.find((s) => s.id === id) || {}).name || '전체 매장';
  const isHQ = () => state.role === 'hq';
  const scopeStore = () => (isHQ() ? 'all' : state.storeId);
  const totalOf = (order) => order.items.reduce((sum, it) => sum + it.price * it.qty, 0);

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    $('#toastText').textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => { el.hidden = true; }, 220);
    }, 2400);
  }

  /* ---------- 모달 ---------- */
  function openModal(title, html) {
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#modalBody').innerHTML = '';
    document.body.style.overflow = '';
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  });

  /* ==========================================================================
     세션 · 로그인 (Supabase Auth)
     ========================================================================== */
  function applySession(session) {
    state.role = session.role;
    state.userId = session.userId || '';
    state.storeId = session.role === 'hq' ? 'all' : session.storeId;
    state.userName = session.ownerName || '';
    state.storeTitle = session.storeName || storeName(session.storeId);
    /* 계정 전환 시 이전 계정의 숫자가 잠시 보이지 않도록 초기화 */
    ['#kpiMonthOrders', '#kpiMonthAmount', '#kpiPending', '#kpiUnread', '#kpiPosts', '#dashDate']
      .forEach((sel) => { const el = $(sel); if (el) el.textContent = sel === '#dashDate' ? '' : '—'; });
    /* 이전 계정(본사)의 글·발주 목록이 새 계정 화면에 잠깐 남지 않도록 목록도 비웁니다 */
    ['#postList', '#dashOrders', '#dashNotices'].forEach((sel) => { const el = $(sel); if (el) el.innerHTML = ''; });
    $('#appView').hidden = false;
    $('#loginView').hidden = true;
    const label = session.role === 'hq'
      ? '본사 · 전체 매장'
      : (session.storeName || storeName(session.storeId)) + ' 점주';
    if ($('#storeLabel')) $('#storeLabel').textContent = label;
    updateChrome();
  }

  function updateChrome() {
    const hq = isHQ();
    const name = hq ? '본사 관리자' : storeName(state.storeId);
    /* 로그인한 사람(profiles.owner_name)을 화면 곳곳에서 같은 이름으로 보여 줍니다. */
    const scope = hq ? '본사' : name;
    const person = state.userName || '';
    const accountName = person || (hq ? '본사 관리자' : name);
    const avatarText = person ? person.slice(0, 1) : (hq ? '본' : name.slice(0, 1));
    $('#userName').textContent = accountName;
    $('#userRole').textContent = hq ? '본사 관리자' : name + ' 점주';
    $('#userAvatar').textContent = avatarText;
    /* 대시보드 인사말: 장성진님 (본사·양산점), 오늘도 좋은 하루입니다. (이름 없으면 지점명만)
       owner_name이 이미 지점명을 품고 있으면('김해진영비앤비점 점주' 등) 괄호를 붙이지 않습니다. */
    const nameHasScope = person && (person.indexOf(scope) >= 0 || person.length > 8);
    if ($('#dashName')) $('#dashName').textContent = person ? person + '님' : scope;
    if ($('#dashStore')) $('#dashStore').textContent = person && !nameHasScope ? ' (' + scope + ')' : '';
    /* 모바일 햄버거 메뉴 상단 계정 카드 */
    if ($('#sideAvatar')) $('#sideAvatar').textContent = avatarText;
    if ($('#sideName')) $('#sideName').textContent = accountName;
    if ($('#sideRole')) $('#sideRole').textContent = hq ? '본사 관리자 · 전체 매장' : name + ' 점주';
    $('#newNoticeBtn').hidden = !hq;
    $('#navOrders').hidden = hq;
    $('#newPostBtn').hidden = hq;
    if ($('#navAdmin')) $('#navAdmin').hidden = !hq;
    if ($('#adminLabel')) $('#adminLabel').hidden = !hq;
    const dashOrderBtn = $('#dashActions [data-nav="orders"]');
    if (dashOrderBtn) dashOrderBtn.hidden = hq;
    if ($('#newOrderBtn')) $('#newOrderBtn').hidden = hq;
    const roleHint = $('#roleHint');
    if (roleHint) roleHint.hidden = hq;
    if (hq && state.view === 'orders') navigate('history');
    if (!hq && state.view === 'admin') navigate('dashboard');
    $('#historySub').textContent = hq
      ? '전체 매장의 발주를 확인하고 접수대기 → 본사확인 → 출고완료로 처리합니다.'
      : '접수대기 → 본사확인 → 출고완료 순서로 진행됩니다.';
  }

  async function logout() {
    try { await DB.auth.signOut(); } catch (e) { /* 이미 끊긴 세션이면 그대로 진행 */ }
    state.cart = {};
    state.orders = [];
    state.notices = [];
    state.posts = [];
    state.applications = [];
    state.invites = [];
    $('#appView').hidden = true;
    $('#loginView').hidden = false;
    const pw = $('#loginPassword');
    if (pw) pw.value = '';
    setAuthMode('owner');
    window.scrollTo(0, 0);
    closeModal();
  }

  /* ---------- 로그인 화면: 점주 / 본사 임직원 탭 ---------- */
  const AUTH_META = {
    owner: { title: '점주 로그인', sub: '본사에서 받은 계정 또는 초대 코드로 시작하세요.' },
    hq: { title: '본사 임직원 전용', sub: '본사 관리자 계정으로 로그인합니다.' }
  };
  let authMode = 'owner';
  let authView = 'login';

  function clearAuthErrors() {
    ['#loginError', '#signupError'].forEach((sel) => { const el = $(sel); if (el) el.textContent = ''; });
  }

  function setAuthMode(mode) {
    authMode = mode === 'hq' ? 'hq' : 'owner';
    authView = 'login';
    $$('[data-auth-tab]').forEach((b) => {
      const on = b.dataset.authTab === authMode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    if ($('#loginForm')) $('#loginForm').dataset.mode = authMode;
    if ($('#loginForm')) $('#loginForm').hidden = false;
    if ($('#signupForm')) $('#signupForm').hidden = true;
    if ($('#signupSwitch')) $('#signupSwitch').hidden = false;
    if ($('#hqNotice')) $('#hqNotice').hidden = authMode !== 'hq';
    if ($('#ownerNotice')) $('#ownerNotice').hidden = authMode !== 'owner';
    if ($('#authTitle')) $('#authTitle').textContent = AUTH_META[authMode].title;
    if ($('#authSub')) $('#authSub').textContent = AUTH_META[authMode].sub;
    clearAuthErrors();
    const pw = $('#loginPassword'); if (pw) pw.value = '';
    const focus = $('#loginId'); if (focus && document.activeElement !== focus) focus.focus();
  }

  function setAuthView(view) {
    authView = view === 'signup' ? 'signup' : 'login';
    const signingUp = authView === 'signup';
    if ($('#loginForm')) $('#loginForm').hidden = signingUp;
    if ($('#signupForm')) $('#signupForm').hidden = !signingUp;
    if ($('#authTitle')) $('#authTitle').textContent = signingUp ? '회원가입 (초대 코드)' : AUTH_META[authMode].title;
    if ($('#authSub')) $('#authSub').textContent = signingUp
      ? '본사에서 받은 초대 코드로 계정을 만듭니다. 점주·본사 관리자 모두 같은 화면에서 가입합니다.'
      : AUTH_META[authMode].sub;
    clearAuthErrors();
    if (signingUp) {
      fillStoreOptions();
      applySignupRole(null);
      /* 적어 둔 초대 코드가 있으면 다시 검증해 역할(점주/본사)에 맞춰 화면을 되돌립니다. */
      if ($('#signupCode') && $('#signupCode').value.trim()) checkInviteCode();
      else setSignupHint('', null);
      const code = $('#signupCode'); if (code) code.focus();
    } else {
      const id = $('#loginId'); if (id) id.focus();
    }
  }

  function fillStoreOptions() {
    const sel = $('#signupStore');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">지점을 선택하세요</option>' +
      STORE_PROFILES.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('');
    if (current) sel.value = current;
    /* 지점 목록은 DB(stores)를 우선 사용 */
    DB.auth.storeOptions().then((list) => {
      if (!list || !list.length) return;
      const keep = sel.value;
      sel.innerHTML = '<option value="">지점을 선택하세요</option>' +
        list.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('');
      if (keep) sel.value = keep;
    }).catch(() => {});
  }

  function setSignupHint(text, tone) {
    const el = $('#signupCodeHint');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-ok', tone === 'ok');
    el.classList.toggle('is-bad', tone === 'bad');
  }

  async function checkInviteCode() {
    const raw = ($('#signupCode').value || '').trim();
    if (!raw) { setSignupHint('', null); applySignupRole(null); return null; }
    try {
      const check = await DB.auth.verifyInvite(raw);
      if (!check.valid) {
        applySignupRole(null);
        setSignupHint('유효하지 않거나 이미 사용된 초대 코드입니다.', 'bad');
        return null;
      }
      if (check.role === 'hq') {
        /* 본사 관리자 코드 — 지점 선택 없이 가입 */
        applySignupRole('hq');
        setSignupHint('「본사 관리자」 전용 코드입니다. 지점 선택 없이 본사 관리자 계정으로 가입됩니다.', 'ok');
      } else if (check.allow_store_choice) {
        applySignupRole('owner');
        setSignupHint('지점 선택이 가능한 코드입니다. 가입할 지점을 직접 선택하세요.', 'ok');
      } else {
        applySignupRole('owner');
        setSignupHint('「' + (check.store_name || '지정 지점') + '」 전용 코드입니다. 지점이 자동으로 선택되었습니다.', 'ok');
        const sel = $('#signupStore');
        if (sel && check.store_id) sel.value = check.store_id;
      }
      return check;
    } catch (err) {
      setSignupHint('초대 코드를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'bad');
      return null;
    }
  }

  /* 초대 코드 역할에 맞춰 지점 선택 영역·버튼 문구를 바꿉니다. (hq 코드면 지점 숨김) */
  function applySignupRole(role) {
    const isHqCode = role === 'hq';
    if ($('#signupStoreField')) $('#signupStoreField').hidden = isHqCode;
    if ($('#signupSubmitLabel')) $('#signupSubmitLabel').textContent = isHqCode ? '본사 관리자로 가입하기' : '가입하고 시작하기';
  }

  /* ==========================================================================
     데이터 로드 & 렌더
     ========================================================================== */
  async function reloadAll() {
    const [orders, categories, catalog, manuals] = await Promise.all([
      isHQ() ? DB.listAllOrders() : DB.listOrders(state.storeId),
      DB.listCategories(),
      DB.listItems(),
      DB.getManuals()
    ]);
    state.orders = orders;
    state.categories = categories;
    state.catalog = catalog;
    state.manuals = manuals;
    state.notices = await DB.listNotices();
    state.readIds = await DB.readState(isHQ() ? 'hq' : state.storeId);
    state.posts = isHQ() ? await DB.listAllPosts() : await DB.listPosts(state.storeId);
    state.applications = isHQ() ? await DB.listApplications() : [];
    state.invites = isHQ() ? await DB.listInviteCodes() : [];
    state.members = [];
    if (isHQ()) {
      try { state.members = await DB.listMembers(); } catch (err) { state.members = []; }
    }
    state.checklist = await DB.getChecklist(isHQ() ? 'hq' : state.storeId);

    pruneCart();
    renderBadges();
    renderDashboard();
    renderManualList();
    renderRecipes();
    renderCatalog();
    renderCart();
    renderHistory();
    renderNotices();
    renderPosts();
    renderChecklist();
    renderChecklistProgress();
    renderAdmin();
  }

  function renderBadges() {
    const pending = state.orders.filter((o) => o.status === 'pending').length;
    const unread = state.notices.filter((n) => !state.readIds.includes(n.id)).length;
    const waiting = state.posts.filter((p) => p.comments.length === 0).length;

    const set = (id, value) => {
      const el = $(id);
      if (!el) return;
      el.hidden = !value;
      el.textContent = value ? String(value) : '';
    };
    set('#badgeOrders', pending);
    set('#badgeNotices', unread);
    set('#badgeBoard', waiting);
    $('#bellDot').hidden = unread === 0;
  }

  /* ---------- 대시보드 ---------- */
  function renderDashboard() {
    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthOrders = state.orders.filter((o) => o.createdAt.slice(0, 7) === ym);
    const monthAmount = monthOrders.reduce((s, o) => s + totalOf(o), 0);
    const pending = state.orders.filter((o) => o.status === 'pending').length;
    const unread = state.notices.filter((n) => !state.readIds.includes(n.id)).length;
    const waiting = state.posts.filter((p) => p.comments.length === 0).length;

    $('#dashDate').textContent = now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' +
      ['일', '월', '화', '수', '목', '금', '토'][now.getDay()] + '요일 · ' + (isHQ() ? '전체 매장 기준' : storeName(state.storeId) + ' 기준');

    $('#kpiMonthOrders').textContent = monthOrders.length;
    $('#kpiMonthAmount').textContent = '합계 ' + won(monthAmount);
    $('#kpiPending').textContent = pending;
    $('#kpiPendingFoot').textContent = isHQ() ? '본사 확인이 필요한 발주' : '본사 확인을 기다리는 발주';
    $('#kpiUnread').textContent = unread;
    $('#kpiUnreadFoot').textContent = unread ? '확인하지 않은 본사 공지' : '모든 공지를 확인했습니다';
    $('#kpiPosts').textContent = state.posts.length;
    $('#kpiPostsFoot').textContent = isHQ()
      ? '답변 대기 ' + waiting + '건'
      : '내가 쓴 글 · 답변 대기 ' + waiting + '건';

    /* 최근 발주 */
    const recent = state.orders.slice(0, 3);
    $('#dashOrders').innerHTML = recent.length
      ? recent.map((o) => {
          const st = ORDER_STATUS[o.status];
          return '<button class="mini-row" data-open-order="' + esc(o.id) + '">' +
            '<span class="mini-tag status-pill" data-tone="' + st.tone + '">' + st.label + '</span>' +
            '<span class="mini-main"><strong>' + esc(o.items[0].name) + (o.items.length > 1 ? ' 외 ' + (o.items.length - 1) + '건' : '') + '</strong>' +
            '<small>' + esc(o.id) + ' · ' + fmtDate(o.createdAt) + '</small></span>' +
            '<span class="mini-date">' + won(totalOf(o)) + '</span></button>';
        }).join('')
      : '<p class="empty-line">아직 발주 내역이 없습니다.</p>';

    /* 중요 공지 */
    const notices = state.notices.filter((n) => n.important).slice(0, 3);
    $('#dashNotices').innerHTML = notices.length
      ? notices.map((n) => {
          const unreadItem = !state.readIds.includes(n.id);
          return '<button class="mini-row" data-open-notice="' + esc(n.id) + '">' +
            '<span class="mini-tag' + (unreadItem ? ' mini-tag--important' : '') + '">' + esc(n.cat) + '</span>' +
            '<span class="mini-main"><strong>' + esc(n.title) + '</strong><small>' + fmtDate(n.date) + '</small></span>' +
            (unreadItem ? '<span class="bell-dot" style="position:static"></span>' : '') +
            '</button>';
        }).join('')
      : '<p class="empty-line">등록된 공지가 없습니다.</p>';
  }

  /* ---------- 발주 카탈로그 ---------- */
  function renderCatalog() {
    if (state.catalogCat !== '전체' && !state.categories.includes(state.catalogCat)) state.catalogCat = '전체';
    const chips = ['전체'].concat(state.categories);
    $('#catChips').innerHTML = chips.map((c) =>
      '<button class="chip' + (state.catalogCat === c ? ' is-active' : '') + '" data-cat="' + esc(c) + '" role="tab" aria-selected="' + (state.catalogCat === c) + '">' + esc(c) + '</button>'
    ).join('');

    const q = state.catalogSearch.trim().toLowerCase();
    const items = state.catalog.filter((it) =>
      (state.catalogCat === '전체' || it.cat === state.catalogCat) &&
      (!q || it.name.toLowerCase().includes(q))
    );

    $('#catalogList').innerHTML = items.length ? items.map((it) => {
      const inCart = state.cart[it.id] ? state.cart[it.id].qty : 0;
      const soldOut = !!it.soldOut;
      return '<article class="item-card' + (soldOut ? ' is-soldout' : '') + '" data-item="' + esc(it.id) + '">' +
        '<div class="item-top"><span class="item-cat">' + esc(it.cat) + '</span><span class="item-note">' + esc(it.note) + '</span></div>' +
        '<div><p class="item-name">' + esc(it.name) + (soldOut ? ' <span class="soldout-badge">품절</span>' : '') + '</p><p class="item-meta">' + esc(it.unit) + '</p></div>' +
        '<div class="item-bottom">' +
          '<span class="item-price">' + won(it.price) + '</span>' +
          (soldOut
            ? '<button type="button" class="add-btn" disabled aria-label="품절된 품목">품절</button>'
            : '<span class="stepper">' +
                '<button type="button" data-step="-1" aria-label="수량 줄이기">−</button>' +
                '<span data-qty>' + inCart + '</span>' +
                '<button type="button" data-step="1" aria-label="수량 늘리기">+</button>' +
              '</span>' +
              '<button type="button" class="add-btn' + (inCart ? ' is-added' : '') + '" data-add>' + (inCart ? '담김' : '담기') + '</button>') +
        '</div>' +
      '</article>';
    }).join('') : '<p class="empty-line">조건에 맞는 품목이 없습니다.</p>';
  }

  function addToCart(id, qty) {
    const item = state.catalog.find((i) => i.id === id);
    if (!item) return;
    if (item.soldOut) { toast('품절된 품목입니다.'); return; }
    const current = state.cart[id] ? state.cart[id].qty : 0;
    const next = Math.max(0, current + qty);
    if (next === 0) delete state.cart[id];
    else state.cart[id] = { ...item, qty: next };
    renderCatalog();
    renderCart();
  }

  function pruneCart() {
    Object.keys(state.cart).forEach((id) => {
      const item = state.catalog.find((i) => i.id === id);
      if (!item || item.soldOut) { delete state.cart[id]; return; }
      state.cart[id] = { ...item, qty: state.cart[id].qty };
    });
  }

  function renderCart() {
    const lines = Object.values(state.cart);
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);

    $('#cartTotal').textContent = won(total);
    $('#fabTotal').textContent = won(total);
    $('#fabCount').textContent = count;

    $('#cartList').innerHTML = lines.length ? lines.map((l) =>
      '<div class="cart-line" data-cart-line="' + esc(l.id) + '">' +
        '<span class="cart-line-main"><strong>' + esc(l.name) + '</strong><small>' + l.qty + ' × ' + won(l.price) + '</small></span>' +
        '<span class="stepper">' +
          '<button type="button" data-step="-1" aria-label="수량 줄이기">−</button>' +
          '<span data-qty>' + l.qty + '</span>' +
          '<button type="button" data-step="1" aria-label="수량 늘리기">+</button>' +
        '</span>' +
        '<span class="cart-line-total">' + won(l.price * l.qty) + '</span>' +
        '<button type="button" class="cart-remove" data-remove aria-label="삭제">×</button>' +
      '</div>'
    ).join('') : '<p class="cart-empty">담긴 품목이 없습니다.<br>목록에서 품목을 추가하세요.</p>';

    $('#submitOrder').disabled = lines.length === 0;
  }

  /* ---------- 발주 내역 ---------- */
  function renderHistory() {
    const scoped = (isHQ() && state.storeFilter !== 'all')
      ? state.orders.filter((o) => o.storeId === state.storeFilter)
      : state.orders;
    const list = state.statusFilter === 'all'
      ? scoped
      : scoped.filter((o) => o.status === state.statusFilter);

    $$('#statusFilter .filter').forEach((b) => b.classList.toggle('is-active', b.dataset.status === state.statusFilter));

    const storeFilter = $('#storeFilter');
    if (storeFilter) {
      storeFilter.hidden = !isHQ();
      if (isHQ()) {
        storeFilter.innerHTML = '<button class="filter' + (state.storeFilter === 'all' ? ' is-active' : '') + '" data-store="all">전체 매장</button>' +
          STORE_PROFILES.map((s) => '<button class="filter' + (state.storeFilter === s.id ? ' is-active' : '') + '" data-store="' + esc(s.id) + '">' + esc(s.name) + '</button>').join('');
      }
    }

    $('#orderList').innerHTML = list.length ? list.map((o) => {
      const st = ORDER_STATUS[o.status];
      const steps = Object.keys(ORDER_STATUS).map((key) => {
        const active = key === o.status;
        const done = Object.keys(ORDER_STATUS).indexOf(key) < Object.keys(ORDER_STATUS).indexOf(o.status);
        return '<span class="step-pip' + (active ? ' is-current' : done ? ' is-done' : '') + '">' + ORDER_STATUS[key].label + '</span>';
      }).join('');

      const items = o.items.map((it) =>
        '<div class="order-item"><span>' + esc(it.name) + ' × ' + it.qty + '</span><span>' + won(it.price * it.qty) + '</span></div>'
      ).join('');

      const nextKey = st.next;
      const advance = (isHQ() && nextKey)
        ? '<button class="btn btn-primary btn-sm" data-advance="' + esc(o.id) + '" data-next="' + nextKey + '">' +
          (nextKey === 'confirmed' ? '본사 확인 처리' : '출고 완료 처리') + '</button>'
        : (isHQ() && !nextKey ? '<span class="order-note">출고가 완료된 발주입니다.</span>' : '');

      return '<article class="order-card">' +
        '<button class="order-head" data-toggle-order="' + esc(o.id) + '">' +
          '<span class="status-pill" data-tone="' + st.tone + '">' + st.label + '</span>' +
          '<span class="order-main"><strong>' + esc(o.items[0].name) + (o.items.length > 1 ? ' 외 ' + (o.items.length - 1) + '건' : '') + '</strong>' +
          '<span class="order-meta">' + esc(o.id) + ' · ' + fmtDateTime(o.createdAt) + (isHQ() ? ' · ' + esc(storeName(o.storeId)) : '') + '</span></span>' +
          '<span class="order-amount">' + won(totalOf(o)) + '</span>' +
        '</button>' +
        '<div class="order-detail" hidden>' +
          '<div class="order-items">' + items +
            '<div class="order-item" style="font-weight:800;border-top:1px solid var(--line);margin-top:6px;padding-top:8px"><span>합계</span><span>' + won(totalOf(o)) + '</span></div>' +
          '</div>' +
          (o.memo ? '<p class="order-note">요청 사항: ' + esc(o.memo) + '</p>' : '') +
          '<div class="order-steps">' + steps + '</div>' +
          '<div class="order-actions">' + advance + '</div>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="empty-line">해당 상태의 발주가 없습니다.</div>';
  }

  /* ---------- 공지 ---------- */
  function renderNotices() {
    $$('#noticeFilter .filter').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === state.noticeCat));
    const list = state.noticeCat === 'all'
      ? state.notices
      : state.notices.filter((n) => n.cat === state.noticeCat);

    $('#noticeList').innerHTML = list.length ? list.map((n) => {
      const unread = !state.readIds.includes(n.id);
      return '<button class="notice-card' + (n.important ? ' is-important' : '') + (unread ? ' is-unread' : '') + '" data-open-notice="' + esc(n.id) + '">' +
        '<span class="notice-tag" data-cat="' + esc(n.cat) + '">' + esc(n.cat) + '</span>' +
        '<span class="notice-body-main">' +
          '<span class="notice-title">' + esc(n.title) + '</span>' +
          '<span class="notice-snippet">' + esc(n.body.replace(/\n/g, ' ').slice(0, 90)) + '</span>' +
        '</span>' +
        '<span class="notice-date">' + fmtDate(n.date) + '</span>' +
      '</button>';
    }).join('') : '<div class="empty-line">등록된 공지가 없습니다.</div>';
  }

  async function openNotice(id) {
    const n = state.notices.find((x) => x.id === id);
    if (!n) return;
    if (!state.readIds.includes(id)) {
      state.readIds = await DB.markNoticeRead(isHQ() ? 'hq' : state.storeId, id);
      renderNotices();
      renderBadges();
      renderDashboard();
    }
    /* 본사 관리자에게만 수정·삭제 버튼을 보입니다. 점주 화면에는 절대 노출하지 않습니다. */
    const actions = isHQ()
      ? '<div class="form-actions">' +
          '<button class="btn btn-ghost is-danger" id="deleteNoticeBtn" type="button">삭제</button>' +
          '<button class="btn btn-ghost" id="editNoticeBtn" type="button">수정</button>' +
          '<button class="btn btn-primary" data-close-modal type="button">닫기</button></div>'
      : '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">닫기</button></div>';

    openModal('공지사항', '' +
      '<div class="notice-article-meta">' +
        '<span class="notice-tag" data-cat="' + esc(n.cat) + '">' + esc(n.cat) + '</span>' +
        (n.important ? '<span class="mini-tag mini-tag--important">중요</span>' : '') +
        '<span class="notice-date">' + fmtDateTime(n.date) + '</span>' +
        (n.updatedAt ? '<span class="notice-date notice-edited">수정 ' + fmtDateTime(n.updatedAt) + '</span>' : '') +
      '</div>' +
      '<h3 style="font-size:17px;font-weight:800;letter-spacing:-.02em;margin-bottom:14px;line-height:1.45">' + esc(n.title) + '</h3>' +
      '<div class="notice-article">' + esc(n.body) + '</div>' +
      actions);

    if (isHQ()) {
      $('#editNoticeBtn').addEventListener('click', () => openNoticeForm(n));
      $('#deleteNoticeBtn').addEventListener('click', () => confirmDeleteNotice(n));
    }
  }

  /* 공지 작성 · 수정 모달 (본사 관리자 전용) */
  const NOTICE_CATS = ['신메뉴', '단가변동', '위생점검', '일반'];

  function openNoticeForm(notice) {
    const editing = !!notice;
    const cats = NOTICE_CATS.slice();
    if (editing && notice.cat && cats.indexOf(notice.cat) < 0) cats.unshift(notice.cat);
    const options = (editing && !notice.cat ? [''] : []).concat(cats);

    openModal(editing ? '공지 수정' : '새 공지 작성', '' +
      '<div class="form-grid">' +
        '<label class="field-label" for="noticeTitle">제목</label>' +
        '<input class="text-input" id="noticeTitle" maxlength="80" placeholder="예) 신메뉴 출시 안내" value="' + esc(editing ? notice.title : '') + '">' +
        '<label class="field-label" for="noticeCat">분류</label>' +
        '<select id="noticeCat">' + options.map((c) =>
          '<option value="' + esc(c) + '"' + (editing && c === (notice.cat || '') ? ' selected' : '') + '>' + (c ? esc(c) : '분류 없음') + '</option>'
        ).join('') + '</select>' +
        '<label class="check-item" style="margin-top:10px"><input type="checkbox" id="noticeImportant"' + (editing && notice.important ? ' checked' : '') + '><span>중요 공지로 상단 고정</span></label>' +
        '<label class="field-label" for="noticeBody">내용</label>' +
        '<textarea class="text-input" id="noticeBody" rows="6" placeholder="점주가 알아야 할 내용을 입력하세요.">' + esc(editing ? notice.body : '') + '</textarea>' +
        '<p class="form-error" id="noticeError"></p>' +
      '</div>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn btn-primary" id="saveNotice" type="button">' + (editing ? '수정 저장' : '공지 등록') + '</button></div>');

    $('#noticeTitle').focus();

    $('#saveNotice').addEventListener('click', async () => {
      const title = $('#noticeTitle').value.trim();
      const body = $('#noticeBody').value.trim();
      if (title.length < 4 || body.length < 4) {
        $('#noticeError').textContent = '제목과 내용을 4자 이상 입력해 주세요.';
        return;
      }
      const cat = $('#noticeCat').value;
      const important = $('#noticeImportant').checked;
      const saveBtn = $('#saveNotice');
      saveBtn.disabled = true;
      saveBtn.textContent = '저장 중…';
      try {
        if (editing) {
          await DB.updateNotice(notice.id, { title, body, category: cat, pinned: important });
        } else {
          await DB.createNotice({ title, body, cat, important });
        }
        closeModal();
        await reloadAll();
        if (editing) {
          toast('공지를 수정했습니다.');
          await openNotice(notice.id);
        } else {
          toast('공지를 등록했습니다.');
        }
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = editing ? '수정 저장' : '공지 등록';
        $('#noticeError').textContent = err.message;
      }
    });
  }

  function confirmDeleteNotice(notice) {
    openConfirm('공지 삭제',
      '「' + esc(notice.title) + '」 공지를 삭제합니다.<br>점주 화면에서도 바로 사라지고, 삭제한 공지는 되돌릴 수 없습니다.',
      '공지 삭제', async () => {
        await DB.deleteNotice(notice.id);
        closeModal();
        await reloadAll();
        toast('공지를 삭제했습니다.');
      }, true);
  }

  /* ---------- 매뉴얼 · 레시피 ---------- */
  const MANUAL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"/><path d="M17 7h2v16"/></svg>';
  const RECIPE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v18"/><path d="M6 8h9l-1.5 3L15 14H6z"/></svg>';

  /* 본문 표기 규칙 → HTML
     # 소제목 / 1. 단계 / - 불릿 / ! 주의 / * 팁 / | 표 */
  function manualTableHtml(rows) {
    const clean = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
    if (!clean.length) return '';
    const head = clean[0];
    const rest = clean.slice(1);
    return '<div class="table-scroll"><table class="guide-table"><thead><tr>' +
      head.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      rest.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function renderManualBody(body) {
    const lines = String(body == null ? '' : body).split(/\r?\n/);
    const out = [];
    let list = null;
    const flush = () => { if (list) { out.push('</' + list + '>'); list = null; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) { flush(); continue; }
      if (line.charAt(0) === '|') {
        flush();
        const rows = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '|') {
          const cells = lines[i].trim().split('|');
          rows.push(cells.slice(1, cells.length - 1).map((c) => c.trim()));
          i += 1;
        }
        i -= 1;
        out.push(manualTableHtml(rows));
        continue;
      }
      if (line.slice(0, 2) === '# ') { flush(); out.push('<h4 class="manual-h">' + esc(line.slice(2)) + '</h4>'); continue; }
      if (line.slice(0, 2) === '! ') { flush(); out.push('<p class="manual-caution">' + esc(line.slice(2)) + '</p>'); continue; }
      if (line.slice(0, 2) === '* ') { flush(); out.push('<p class="manual-note">' + esc(line.slice(2)) + '</p>'); continue; }
      if (line.slice(0, 2) === '- ') {
        if (list !== 'ul') { flush(); list = 'ul'; out.push('<ul class="manual-list">'); }
        out.push('<li>' + esc(line.slice(2)) + '</li>');
        continue;
      }
      const step = line.match(/^(\d+)\.\s+(.*)$/);
      if (step) {
        if (list !== 'ol') { flush(); list = 'ol'; out.push('<ol class="manual-steps">'); }
        out.push('<li>' + esc(step[2]) + '</li>');
        continue;
      }
      flush();
      out.push('<p class="manual-p">' + esc(line) + '</p>');
    }
    flush();
    return out.join('');
  }

  function manualCategories() {
    const seen = [];
    (state.manuals.manual || []).forEach((m) => {
      const c = m.category || '기타';
      if (seen.indexOf(c) < 0) seen.push(c);
    });
    return seen;
  }

  function manualArticleCard(m, group, open) {
    const isManual = group === 'manual';
    return '<details class="manual-card manual-article"' + (open ? ' open' : '') + '>' +
      '<summary>' +
        '<span class="manual-icon">' + (isManual ? MANUAL_ICON : RECIPE_ICON) + '</span>' +
        '<span class="manual-title"><strong>' + esc(m.title) + '</strong>' +
          (m.summary ? '<small>' + esc(m.summary) + '</small>' : '') + '</span>' +
        '<span class="manual-chev" aria-hidden="true">⌄</span>' +
      '</summary>' +
      '<div class="manual-body">' + renderManualBody(m.body) +
        (isHQ() ? '<div class="manual-body-foot"><button type="button" class="btn btn-ghost btn-sm" data-manual-edit="' + esc(m.id) + '" data-manual-group="' + group + '">이 글 수정</button></div>' : '') +
      '</div></details>';
  }

  function renderManualList() {
    const host = $('#manualList');
    if (!host) return;
    const cats = ['전체'].concat(manualCategories());
    if (cats.indexOf(state.manualCat) < 0) state.manualCat = '전체';
    const chipHost = $('#manualCatChips');
    if (chipHost) {
      chipHost.innerHTML = cats.map((c) =>
        '<button type="button" class="filter' + (c === state.manualCat ? ' is-active' : '') + '" data-manual-cat="' + esc(c) + '" role="tab" aria-selected="' + (c === state.manualCat) + '">' + esc(c) + '</button>'
      ).join('');
    }
    const q = state.manualSearch.trim().toLowerCase();
    const items = (state.manuals.manual || []).filter((m) => {
      /* 검색어가 있으면 카테고리 구분 없이 전체에서 찾습니다. */
      if (!q && state.manualCat !== '전체' && (m.category || '기타') !== state.manualCat) return false;
      if (!q) return true;
      return ((m.title || '') + ' ' + (m.summary || '') + ' ' + (m.body || '') + ' ' + (m.category || '')).toLowerCase().indexOf(q) >= 0;
    });
    if (!items.length) {
      host.innerHTML = '<div class="empty-card"><span class="empty-emoji" aria-hidden="true">🔍</span>' +
        '<p class="empty-title">' + (q ? '검색 결과가 없습니다.' : '등록된 매뉴얼이 없습니다.') + '</p>' +
        '<p class="empty-text">' + (q ? '다른 검색어로 찾아보세요. (예: 손씻기, 173℃, 소분)' : '본사 관리자 설정에서 매뉴얼을 추가할 수 있습니다.') + '</p></div>';
      return;
    }
    const groups = [];
    items.forEach((m) => {
      const name = m.category || '기타';
      let g = groups.filter((x) => x.name === name)[0];
      if (!g) { g = { name: name, list: [] }; groups.push(g); }
      g.list.push(m);
    });
    let opened = false;
    host.innerHTML = groups.map((g) =>
      '<section class="manual-group">' +
        '<div class="section-head"><h2>' + esc(g.name) + '</h2><span class="section-count">' + g.list.length + '개</span></div>' +
        '<div class="manual-grid">' + g.list.map((m) => {
          const open = !opened && state.manualCat !== '전체' ? (opened = true) : false;
          return manualArticleCard(m, 'manual', open);
        }).join('') + '</div>' +
      '</section>'
    ).join('');
  }

  function renderRecipes() {
    const host = $('#recipeList');
    if (!host) return;
    const list = state.manuals.recipe || [];
    const empty = $('#recipeEmpty');
    if (empty) empty.hidden = list.length > 0;
    const btn = $('#recipeAdminBtn');
    if (btn) btn.hidden = !isHQ();
    host.innerHTML = list.length
      ? '<div class="manual-grid">' + list.map((r, i) => manualArticleCard(r, 'recipe', i === 0)).join('') + '</div>'
      : '';
  }

  function renderChecklist() {
    ['open', 'close'].forEach((group) => {
      const ul = $('[data-checklist="' + group + '"]');
      if (!ul) return;
      const items = state.manuals[group] || [];
      ul.innerHTML = items.map((item) => {
        const checked = !!state.checklist[item.id];
        return '<label class="check-item"><input type="checkbox" data-check="' + esc(item.id) + '"' + (checked ? ' checked' : '') + '><span>' + esc(item.label) + '</span></label>';
      }).join('') || '<li class="manual-empty">등록된 항목이 없습니다.</li>';
    });
    renderChecklistProgress();
  }

  function renderChecklistProgress() {
    const items = (state.manuals.open || []).concat(state.manuals.close || []);
    const done = items.filter((item) => !!state.checklist[item.id]).length;
    const p = $('#checkProgress');
    if (p) p.textContent = '오늘 체크 ' + done + '/' + items.length;
  }

  /* ---------- 게시판 (점주 글은 비공개) ---------- */
  function renderPosts() {
    const note = $('#boardPrivacyNote');
    if (note) note.hidden = isHQ();
    $('#postList').innerHTML = state.posts.length ? state.posts.map((p) => {
      const answered = p.comments.length > 0;
      return '<button class="post-card" data-open-post="' + esc(p.id) + '">' +
        '<div class="post-top">' +
          '<span class="state-pill' + (answered ? ' is-answered' : '') + '">' + (answered ? '답변완료' : '답변대기') + '</span>' +
          (isHQ()
            ? '<span class="mini-tag">' + esc(storeName(p.storeId)) + '</span>'
            : '<span class="mini-tag private-tag" title="본사 관리자와 작성자 본인만 볼 수 있습니다">비공개</span>') +
        '</div>' +
        '<p class="post-title">' + esc(p.title) + '</p>' +
        '<p class="post-snippet">' + esc(p.body.slice(0, 80)) + '</p>' +
        '<div class="post-foot">' +
          '<span class="post-date">' + fmtDate(p.date) + '</span>' +
          (answered ? '<span class="reply-count">답변 ' + p.comments.length + '</span>' : '') +
        '</div>' +
      '</button>';
    }).join('') : '<div class="empty-line">등록된 글이 없습니다. 첫 건의를 남겨보세요.</div>';
  }

  function openPost(id) {
    const p = state.posts.find((x) => x.id === id);
    if (!p) return;
    const comments = p.comments.length
      ? p.comments.map((c) => '<div class="comment' + (c.by === 'owner' ? ' is-mine' : '') + '">' +
          '<div class="comment-head"><strong>' + esc(c.name) + '</strong><span>' + fmtDateTime(c.date) + '</span></div>' +
          '<p>' + esc(c.body) + '</p></div>').join('')
      : '<p class="empty-line" style="padding:14px 0">아직 답변이 없습니다.</p>';

    openModal('건의 · 소통', '' +
      '<div class="post-top" style="margin-bottom:8px">' +
        '<span class="state-pill' + (p.comments.length ? ' is-answered' : '') + '">' + (p.comments.length ? '답변완료' : '답변대기') + '</span>' +
        (isHQ()
          ? '<span class="mini-tag">' + esc(storeName(p.storeId)) + '</span>'
          : '<span class="mini-tag private-tag">비공개</span>') +
        '<span class="post-date">' + (isHQ() ? esc(storeName(p.storeId)) + ' · ' : '') + fmtDateTime(p.date) + '</span>' +
      '</div>' +
      '<h3 style="font-size:16px;font-weight:800;letter-spacing:-.02em;margin-bottom:10px">' + esc(p.title) + '</h3>' +
      '<p class="thread-post" style="margin-bottom:16px">' + esc(p.body) + '</p>' +
      (isHQ() ? '' : '<p class="hint-box" style="margin-bottom:14px">이 글은 <strong>본사 관리자와 작성자 본인에게만</strong> 공개됩니다. 다른 지점 점주에게는 보이지 않습니다.</p>') +
      '<h4 style="font-size:12.5px;font-weight:800;color:var(--mute);margin-bottom:8px">본사 답변 ' + p.comments.length + '</h4>' +
      '<div class="thread">' + comments + '</div>' +
      (isHQ() ? '<div class="thread-form"><label class="field-label" for="replyBody">답변 작성</label>' +
        '<textarea class="text-input" id="replyBody" rows="3" placeholder="점주에게 전달할 답변을 입력하세요."></textarea>' +
        '<p class="form-error" id="replyError"></p>' +
        '<div class="form-actions"><button class="btn btn-danger btn-sm" type="button" data-delete-post="' + esc(p.id) + '" style="margin-right:auto">삭제</button>' +
        '<button class="btn btn-ghost" data-close-modal>닫기</button>' +
        '<button class="btn btn-primary" data-reply="' + esc(p.id) + '">답변 등록</button></div></div>'
        : '<div class="form-actions"><button class="btn btn-ghost" data-close-modal>닫기</button></div>'));
  }

  /* 본사(hq) 전용 — 건의 글 삭제 (본사 답변은 ON DELETE CASCADE 로 함께 삭제) */
  function confirmDeletePost(post) {
    if (!isHQ()) return;
    openConfirm('건의 글 삭제',
      '「' + esc(post.title) + '」 글을 삭제합니다.<br>본사 답변도 함께 삭제되고, 삭제한 글은 되돌릴 수 없습니다.',
      '글 삭제', async () => {
        await DB.deleteBoardPost(post.id);
        closeModal();
        await reloadAll();
        toast('건의 글을 삭제했습니다.');
      }, true);
  }

  /* ==========================================================================
     관리자 설정 (본사 관리자 전용)
     ========================================================================== */
  const MANUAL_GROUPS = ['manual', 'recipe', 'open', 'close'];
  const MANUAL_GROUP_META = {
    manual: { title: '매뉴얼 글', hint: '위생·온도·청소·응대 기준을 카테고리별로 관리합니다. 본문 줄바꿈 규칙(# 소제목, 1. 단계, - 불릿, ! 주의, * 팁, | 표)대로 화면에 서식이 잡힙니다.', addLabel: '매뉴얼 글 추가' },
    recipe: { title: '조리 레시피', hint: '레시피는 점주 화면의 레시피 메뉴에만 표시됩니다. 매뉴얼과 섞이지 않습니다.', addLabel: '레시피 추가' },
    open: { title: '오픈 체크리스트', hint: '영업 시작 전 확인 항목입니다.', addLabel: '항목 추가' },
    close: { title: '마감 체크리스트', hint: '영업 종료 후 확인 항목입니다.', addLabel: '항목 추가' }
  };
  const MANUAL_GROUPS_BY_TAB = { manuals: ['manual', 'open', 'close'], recipes: ['recipe'] };

  function renderAdmin() {
    if (!isHQ() || !$('#adminCatList')) return;
    const manualCount = (state.manuals.manual || []).length;
    const recipeCount = (state.manuals.recipe || []).length;
    const checkCount = (state.manuals.open || []).length + (state.manuals.close || []).length;
    $('#adminCatCount').textContent = state.categories.length;
    $('#adminItemCount').textContent = state.catalog.length;
    if ($('#adminManualCount')) $('#adminManualCount').textContent = manualCount;
    if ($('#adminRecipeCount')) $('#adminRecipeCount').textContent = recipeCount;
    if ($('#adminBackupCat')) $('#adminBackupCat').textContent = state.categories.length;
    if ($('#adminBackupItem')) $('#adminBackupItem').textContent = state.catalog.length;
    if ($('#adminBackupManual')) $('#adminBackupManual').textContent = manualCount;
    if ($('#adminBackupRecipe')) $('#adminBackupRecipe').textContent = recipeCount;
    if ($('#adminBackupCheck')) $('#adminBackupCheck').textContent = checkCount;
    if ($('#adminMemberCount')) $('#adminMemberCount').textContent = (state.members || []).length;

    $$('#adminTabs [data-admin-tab]').forEach((b) => {
      const on = b.dataset.adminTab === state.adminTab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $$('[data-admin-panel]').forEach((p) => { p.hidden = p.dataset.adminPanel !== state.adminTab; });

    renderAdminCategories();
    renderAdminItems();
    renderAdminManuals();
    renderAdminApplications();
    renderAdminMembers();
    renderAdminInvites();
    renderAdminBackup();
  }

  /* ---------- 관리자 설정 → 회원 관리 ---------- */
  function renderAdminMembers() {
    const host = $('#memberList');
    if (!host) return;
    const all = state.members || [];
    const hqCount = all.filter((m) => m.role === 'hq').length;
    const ownerCount = all.length - hqCount;
    if ($('#memberTotal')) $('#memberTotal').textContent = all.length;
    if ($('#memberHq')) $('#memberHq').textContent = hqCount;
    if ($('#memberOwner')) $('#memberOwner').textContent = ownerCount;
    if ($('#memberCountLine')) $('#memberCountLine').textContent = all.length + '명';

    $$('#memberChips [data-member-role]').forEach((b) => {
      const on = b.dataset.memberRole === state.memberRole;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });

    const q = (state.memberSearch || '').trim().toLowerCase();
    const list = all.filter((m) => {
      if (state.memberRole !== 'all' && m.role !== state.memberRole) return false;
      if (!q) return true;
      return [m.ownerName, m.storeName, m.loginId, m.role === 'hq' ? '본사 관리자' : '점주']
        .join(' ').toLowerCase().indexOf(q) >= 0;
    });

    if (!list.length) {
      host.innerHTML = '<p class="empty-line">' + (all.length ? '조건에 맞는 회원이 없습니다.' : '아직 가입한 회원이 없습니다.') + '</p>';
      return;
    }

    host.innerHTML = list.map((m) => {
      const hq = m.role === 'hq';
      const name = m.ownerName || (hq ? '본사 관리자' : '이름 미등록');
      const roleLabel = hq ? '본사 관리자' : '점주';
      const store = hq ? '본사' : (m.storeName || '지점 미지정');
      const meta = [store, '아이디 ' + (m.loginId || '-'), '가입 ' + fmtDate(m.joinedAt)].join(' · ');
      /* 로그인한 본인 행에는 추방 버튼 대신 「본인」 배지를 보여 줍니다. */
      const isSelf = !!state.userId && m.id === state.userId;
      const action = isSelf
        ? '<span class="invite-badge is-self" title="현재 로그인한 계정">본인</span>'
        : '<div class="admin-row-actions"><button type="button" class="btn btn-danger btn-sm" data-member-kick="' +
            esc(m.id) + '">추방</button></div>';
      return '<div class="admin-row" data-member-id="' + esc(m.id) + '">' +
        '<span class="member-avatar' + (hq ? ' is-hq' : '') + '">' + esc(name.slice(0, 1)) + '</span>' +
        '<span class="admin-row-main"><strong>' + esc(name) +
          '<span class="invite-badge ' + (hq ? 'is-hq' : 'is-owner') + '">' + roleLabel + '</span></strong>' +
          '<small>' + esc(meta) + '</small></span>' +
        action +
      '</div>';
    }).join('');
  }

  function renderAdminInvites() {
    const host = $('#inviteList');
    if (!host) return;
    const list = state.invites || [];
    const now = Date.now();
    host.innerHTML = list.length ? list.map((c) => {
      const used = !!c.usedBy;
      const expired = c.expiresAt && new Date(c.expiresAt).getTime() < now;
      const badge = used ? 'is-used' : expired ? 'is-dead' : 'is-live';
      const label = used ? '사용됨' : expired ? '만료됨' : '사용 가능';
      const hqCode = c.role === 'hq';
      const roleTag = '<span class="invite-badge ' + (hqCode ? 'is-hq' : 'is-owner') + '">' + (hqCode ? '본사 관리자' : '점주') + '</span>';
      const store = hqCode ? '본사 (관리자)' : (c.storeName ? esc(c.storeName) : '가입 시 지점 선택');
      const meta = ['발급 ' + fmtDate(c.createdAt)].concat(
        c.expiresAt ? ['만료 ' + fmtDate(c.expiresAt)] : [],
        used && c.usedAt ? ['사용 ' + fmtDateTime(c.usedAt)] : []
      ).join(' · ');
      return '<div class="admin-row" data-invite-code="' + esc(c.code) + '">' +
        '<span class="admin-row-main"><strong>코드 ' + esc(c.code) + roleTag +
          '<span class="invite-badge ' + badge + '">' + label + '</span></strong>' +
          '<small>' + store + ' · ' + meta + (c.memo ? ' · ' + esc(c.memo) : '') + '</small></span>' +
        '<div class="admin-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm is-danger" data-invite-del="' + esc(c.code) + '">폐기</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<p class="empty-line">발급된 초대 코드가 없습니다. 위에서 역할·지점을 고르고 코드를 발급해 주세요.</p>';
  }

  async function addInviteFromForm() {
    const role = $('#inviteRole') ? $('#inviteRole').value : 'owner';
    const storeId = role === 'hq' ? '' : ($('#inviteStore') ? $('#inviteStore').value : '');
    const memo = $('#inviteMemo') ? $('#inviteMemo').value.trim() : '';
    const code = $('#inviteCodeInput') ? $('#inviteCodeInput').value.trim() : '';
    const days = $('#inviteDays') ? $('#inviteDays').value : 14;
    try {
      state.invites = await DB.createInviteCode({ role, storeId, memo, code, days, allowChoice: !storeId });
      if ($('#inviteCodeInput')) $('#inviteCodeInput').value = '';
      if ($('#inviteMemo')) $('#inviteMemo').value = '';
      renderAdminInvites();
      toast(role === 'hq' ? '본사 관리자 초대 코드를 발급했습니다.' : '초대 코드를 발급했습니다.');
    } catch (err) { toast(err.message); }
  }

  function syncInviteRoleFields() {
    const hq = $('#inviteRole') && $('#inviteRole').value === 'hq';
    const store = $('#inviteStore');
    if (store) {
      store.disabled = !!hq;
      if (hq) store.value = '';
    }
    if ($('#inviteMemo')) $('#inviteMemo').placeholder = hq ? '메모 (예: 김기태 본사관리자)' : '메모 (선택)';
  }

  function renderAdminApplications() {
    const host = $('#adminAppList');
    if (!host) return;
    const list = state.applications || [];
    if ($('#adminAppCount')) $('#adminAppCount').textContent = list.length + '건';
    host.innerHTML = list.length ? list.map((a) =>
      '<div class="admin-row" data-app-id="' + esc(a.id) + '">' +
        '<span class="admin-row-main"><strong>' + esc(a.name) + ' · ' + esc(a.region) + '</strong>' +
          '<small>' + esc(a.phone) + ' · ' + fmtDateTime(a.date) + (a.receiptNo ? ' · 접수번호 ' + esc(a.receiptNo) : '') + '</small>' +
          (a.memo ? '<small class="app-memo">' + esc(a.memo) + '</small>' : '') + '</span>' +
      '</div>'
    ).join('') : '<p class="empty-line">아직 접수된 가맹 상담이 없습니다.</p>';
  }

  function renderAdminCategories() {
    const counts = {};
    state.catalog.forEach((it) => { counts[it.cat] = (counts[it.cat] || 0) + 1; });
    $('#adminCatList').innerHTML = state.categories.length ? state.categories.map((c) =>
      '<div class="admin-row" data-category="' + esc(c) + '">' +
        '<span class="admin-row-main"><strong>' + esc(c) + '</strong><small>품목 ' + (counts[c] || 0) + '개</small></span>' +
        '<div class="admin-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-cat-edit="' + esc(c) + '">이름 수정</button>' +
          '<button type="button" class="btn btn-ghost btn-sm is-danger" data-cat-del="' + esc(c) + '">삭제</button>' +
        '</div>' +
      '</div>'
    ).join('') : '<p class="empty-line">카테고리가 없습니다. 새 카테고리를 추가하세요.</p>';
  }

  function renderAdminItems() {
    const select = $('#adminItemCatFilter');
    if (select) {
      if (state.adminItemCat !== 'all' && !state.categories.includes(state.adminItemCat)) state.adminItemCat = 'all';
      select.innerHTML = ['<option value="all">전체 카테고리</option>']
        .concat(state.categories.map((c) => '<option value="' + esc(c) + '">' + esc(c) + '</option>')).join('');
      select.value = state.adminItemCat;
    }
    const q = state.adminSearch.trim().toLowerCase();
    const rows = state.catalog.filter((it) =>
      (state.adminItemCat === 'all' || it.cat === state.adminItemCat) &&
      (!q || (it.name + ' ' + it.cat).toLowerCase().includes(q))
    );
    $('#adminItemList').innerHTML = rows.length ? rows.map((it) =>
      '<div class="admin-row admin-item-row' + (it.soldOut ? ' is-soldout' : '') + '" data-item-id="' + esc(it.id) + '">' +
        '<span class="item-cat">' + esc(it.cat) + '</span>' +
        '<span class="admin-row-main"><strong>' + esc(it.name) + (it.soldOut ? ' <span class="soldout-badge">품절</span>' : '') + '</strong>' +
          '<small>' + esc(it.unit || '규격 미지정') + ' · ' + won(it.price) + ' · ' + esc(it.note || '상온') + '</small></span>' +
        '<div class="admin-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-item-edit="' + esc(it.id) + '">수정</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-item-soldout="' + esc(it.id) + '">' + (it.soldOut ? '판매 재개' : '품절 처리') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm is-danger" data-item-del="' + esc(it.id) + '">삭제</button>' +
        '</div>' +
      '</div>'
    ).join('') : '<p class="empty-line">조건에 맞는 품목이 없습니다. 새 품목을 추가하세요.</p>';
  }

  function renderAdminManuals() {
    Object.keys(MANUAL_GROUPS_BY_TAB).forEach((tab) => {
      const host = $(tab === 'manuals' ? '#adminManualGroups' : '#adminRecipeGroups');
      if (!host) return;
      host.innerHTML = MANUAL_GROUPS_BY_TAB[tab].map((group) => {
        const meta = MANUAL_GROUP_META[group];
        const list = state.manuals[group] || [];
        const isDoc = group === 'manual' || group === 'recipe';
        const rows = list.map((m, i) =>
          '<div class="admin-row" data-manual-row="' + esc(m.id) + '">' +
            '<span class="admin-index">' + (i + 1) + '</span>' +
            (group === 'manual' ? '<span class="item-cat">' + esc(m.category || '기타') + '</span>' : '') +
            '<span class="admin-row-main"><strong>' + esc(isDoc ? m.title : m.label) + '</strong>' +
              (isDoc && m.summary ? '<small>' + esc(m.summary) + '</small>' : '') + '</span>' +
            '<div class="admin-row-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-manual-edit="' + esc(m.id) + '" data-manual-group="' + group + '">수정</button>' +
              '<button type="button" class="btn btn-ghost btn-sm is-danger" data-manual-del="' + esc(m.id) + '" data-manual-group="' + group + '">삭제</button>' +
            '</div>' +
          '</div>'
        ).join('');
        const add = isDoc
          ? '<div class="admin-inline-form"><button type="button" class="btn btn-primary btn-sm" data-manual-add="' + group + '">+ ' + meta.addLabel + '</button></div>'
          : '<div class="admin-inline-form">' +
              '<input class="text-input" id="adminManualInput-' + group + '" maxlength="80" placeholder="새 체크 항목 입력">' +
              '<button type="button" class="btn btn-primary btn-sm" data-manual-add="' + group + '">' + meta.addLabel + '</button>' +
            '</div>';
        return '<section class="admin-group">' +
          '<div class="admin-group-head"><div><h3>' + meta.title + '</h3><p class="admin-hint">' + meta.hint + '</p></div>' +
            '<span class="admin-count">' + list.length + '개</span></div>' +
          add +
          '<div class="admin-list">' + (rows || '<p class="empty-line">등록된 항목이 없습니다.</p>') + '</div>' +
        '</section>';
      }).join('');
    });
  }

  async function renderAdminBackup() {
    const box = $('#adminBackupText');
    if (!box || box.dataset.dirty === 'true') return;
    const data = await DB.exportConfig();
    box.value = JSON.stringify(data, null, 2);
  }

  async function refreshCatalogData() {
    state.categories = await DB.listCategories();
    state.catalog = await DB.listItems();
    state.manuals = await DB.getManuals();
    if (state.catalogCat !== '전체' && !state.categories.includes(state.catalogCat)) state.catalogCat = '전체';
    if (state.adminItemCat !== 'all' && !state.categories.includes(state.adminItemCat)) state.adminItemCat = 'all';
    pruneCart();
    renderManualList();
    renderRecipes();
    renderCatalog();
    renderCart();
    renderChecklist();
    renderChecklistProgress();
    const box = $('#adminBackupText');
    if (box) box.dataset.dirty = 'false';
    renderAdmin();
  }

  function openConfirm(title, message, confirmLabel, onConfirm, danger) {
    openModal(title,
      '<p class="modal-text">' + message + '</p>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="confirmBtn" type="button">' + confirmLabel + '</button></div>');
    $('#confirmBtn').addEventListener('click', async () => {
      try { await onConfirm(); } catch (err) { toast(err.message); }
    });
  }

  async function addCategoryFromForm() {
    const input = $('#adminCatName');
    const name = input.value.trim();
    if (!name) { toast('카테고리 이름을 입력해 주세요.'); input.focus(); return; }
    try {
      await DB.createCategory(name);
      input.value = '';
      await refreshCatalogData();
      toast('카테고리 「' + name + '」를 추가했습니다.');
    } catch (err) { toast(err.message); }
  }

  function openCategoryRename(name) {
    openModal('카테고리 이름 수정',
      '<div class="form-grid">' +
        '<label class="field-label" for="catRename">카테고리 이름</label>' +
        '<input class="text-input" id="catRename" maxlength="20" value="' + esc(name) + '">' +
        '<p class="form-error" id="catRenameError"></p>' +
      '</div>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn btn-primary" id="catRenameSave" type="button">저장</button></div>');
    const save = async () => {
      const next = $('#catRename').value.trim();
      if (!next) { $('#catRenameError').textContent = '이름을 입력해 주세요.'; return; }
      if (next === name) { closeModal(); return; }
      try {
        await DB.updateCategory(name, next);
        closeModal();
        await refreshCatalogData();
        toast('카테고리 이름을 「' + next + '」로 변경했습니다.');
      } catch (err) { $('#catRenameError').textContent = err.message; }
    };
    $('#catRenameSave').addEventListener('click', save);
    $('#catRename').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    $('#catRename').focus();
    $('#catRename').select();
  }

  function openCategoryDelete(name) {
    if (state.categories.length <= 1) { toast('카테고리는 최소 1개가 필요합니다.'); return; }
    const affected = state.catalog.filter((it) => it.cat === name);
    const others = state.categories.filter((c) => c !== name);
    const body = affected.length
      ? '<p class="modal-text">「' + esc(name) + '」 카테고리에 품목 <b>' + affected.length + '개</b>가 있습니다. 품목을 어떻게 처리할까요?</p>' +
        '<div class="form-grid">' +
          '<label class="radio-line"><input type="radio" name="catDelMode" value="move" checked><span>다른 카테고리로 이동</span></label>' +
          '<select id="catDelTarget">' + others.map((c) => '<option>' + esc(c) + '</option>').join('') + '</select>' +
          '<label class="radio-line"><input type="radio" name="catDelMode" value="delete"><span>품목도 함께 삭제</span></label>' +
        '</div>'
      : '<p class="modal-text">「' + esc(name) + '」 카테고리를 삭제합니다. 등록된 품목이 없습니다.</p>';
    openModal('카테고리 삭제', body +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn btn-danger" id="catDeleteSave" type="button">카테고리 삭제</button></div>');

    const target = $('#catDelTarget');
    if (target) {
      $$('input[name="catDelMode"]').forEach((radio) => {
        radio.addEventListener('change', () => { target.disabled = $('input[name="catDelMode"]:checked').value === 'delete'; });
      });
    }
    $('#catDeleteSave').addEventListener('click', async () => {
      const mode = affected.length ? $('input[name="catDelMode"]:checked').value : 'delete';
      try {
        const result = await DB.deleteCategory(name, { mode, to: target ? target.value : null });
        closeModal();
        await refreshCatalogData();
        toast('카테고리 「' + name + '」를 삭제했습니다.' + (result.removedItems ? ' 품목 ' + result.removedItems + '개 정리.' : ''));
      } catch (err) { toast(err.message); }
    });
  }

  function openItemModal(item) {
    const isNew = !item;
    if (!state.categories.length) {
      toast('먼저 카테고리를 추가해 주세요.');
      state.adminTab = 'categories';
      renderAdmin();
      return;
    }
    const selectedCat = item ? item.cat : (state.adminItemCat !== 'all' ? state.adminItemCat : state.categories[0]);
    const selectedNote = item ? item.note : '냉동';
    openModal(isNew ? '발주 품목 추가' : '품목 수정',
      '<div class="form-grid">' +
        '<label class="field-label" for="itemCat">카테고리</label>' +
        '<select id="itemCat">' + state.categories.map((c) => '<option' + (c === selectedCat ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>' +
        '<label class="field-label" for="itemName">품목명</label>' +
        '<input class="text-input" id="itemName" maxlength="40" placeholder="예) 콜라 1.25L" value="' + esc(item ? item.name : '') + '">' +
        '<div class="form-split">' +
          '<div><label class="field-label" for="itemUnit">규격 · 단위</label>' +
            '<input class="text-input" id="itemUnit" maxlength="30" placeholder="예) 1박스(24ea)" value="' + esc(item ? item.unit : '') + '"></div>' +
          '<div><label class="field-label" for="itemPrice">단가(원)</label>' +
            '<input class="text-input" id="itemPrice" type="number" min="0" step="100" placeholder="예) 18900" value="' + esc(item ? item.price : '') + '"></div>' +
        '</div>' +
        '<label class="field-label" for="itemNote">보관 구분</label>' +
        '<select id="itemNote">' + ['냉동', '냉장', '상온', '소모품'].map((n) => '<option' + (n === selectedNote ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
        '<label class="check-item" style="margin-top:8px"><input type="checkbox" id="itemSoldOut"' + (item && item.soldOut ? ' checked' : '') + '><span>품절(일시중지) 상태로 ' + (isNew ? '등록' : '유지') + '</span></label>' +
        '<p class="form-error" id="itemError"></p>' +
      '</div>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn btn-primary" id="itemSave" type="button">' + (isNew ? '추가' : '저장') + '</button></div>');

    const save = async () => {
      const priceRaw = $('#itemPrice').value.trim();
      const payload = {
        cat: $('#itemCat').value,
        name: $('#itemName').value.trim(),
        unit: $('#itemUnit').value.trim(),
        price: Number(priceRaw),
        note: $('#itemNote').value,
        soldOut: $('#itemSoldOut').checked
      };
      const err = $('#itemError');
      if (!payload.name) { err.textContent = '품목명을 입력해 주세요.'; return; }
      if (!payload.unit) { err.textContent = '규격 · 단위를 입력해 주세요.'; return; }
      if (!priceRaw || !Number.isFinite(payload.price) || payload.price < 0) { err.textContent = '단가를 0원 이상 숫자로 입력해 주세요.'; return; }
      try {
        if (isNew) await DB.createItem(payload);
        else await DB.updateItem(item.id, payload);
        closeModal();
        await refreshCatalogData();
        toast(isNew ? '품목을 추가했습니다. 발주 화면에 바로 반영됩니다.' : '품목 정보를 수정했습니다.');
      } catch (saveErr) { err.textContent = saveErr.message; }
    };
    $('#itemSave').addEventListener('click', save);
    $('#itemName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    $('#itemName').focus();
  }

  function openManualModal(group, item) {
    const isDoc = group === 'manual' || group === 'recipe';
    const isNew = !item;
    const inline = $('#adminManualInput-' + group);
    const prefill = isNew && inline ? inline.value.trim() : '';
    const label = group === 'manual' ? '매뉴얼 글' : group === 'recipe' ? '레시피' : '체크 항목';
    const title = (isNew ? label + ' 추가' : label + ' 수정');
    const cats = manualCategories();
    const catValue = item ? (item.category || '') : (state.manualCat !== '전체' ? state.manualCat : (cats[0] || '기본 수칙'));
    const fields = isDoc
      ? (group === 'manual'
          ? '<label class="field-label" for="manualCategory">카테고리</label>' +
            '<input class="text-input" id="manualCategory" list="manualCatOptions" maxlength="30" placeholder="예) 위생·교차오염" value="' + esc(catValue) + '">' +
            '<datalist id="manualCatOptions">' + cats.map((c) => '<option value="' + esc(c) + '"></option>').join('') + '</datalist>'
          : '') +
        '<label class="field-label" for="manualTitle">제목</label>' +
        '<input class="text-input" id="manualTitle" maxlength="60" placeholder="' + (group === 'manual' ? '예) 손 씻기 타이밍과 표준 수세법' : '예) 핫크런치 치킨버거 조립') + '" value="' + esc(item ? item.title : prefill) + '">' +
        '<label class="field-label" for="manualSummary">한 줄 요약</label>' +
        '<input class="text-input" id="manualSummary" maxlength="90" placeholder="목록에 함께 보여질 한 줄 설명" value="' + esc(item ? (item.summary || '') : '') + '">' +
        '<label class="field-label" for="manualBody">본문</label>' +
        '<textarea class="text-input manual-editor" id="manualBody" rows="12" spellcheck="false" placeholder="# 소제목 / 1. 단계 / - 불릿 / ! 주의 / * 팁 / | 표">' + esc(item ? (item.body || item.desc || '') : '') + '</textarea>' +
        '<p class="admin-hint">줄바꿈 기준: <b>#</b> 소제목 · <b>1.</b> 단계 · <b>-</b> 불릿 · <b>!</b> 주의(빨강) · <b>*</b> 팁(초록) · <b>|</b> 표(첫 줄이 머리행)</p>'
      : '<label class="field-label" for="manualLabel">체크 항목</label>' +
        '<input class="text-input" id="manualLabel" maxlength="80" placeholder="예) 아이스크림 냉동고 온도 확인" value="' + esc(item ? item.label : prefill) + '">';
    openModal(title, '<div class="form-grid">' + fields + '<p class="form-error" id="manualError"></p></div>' +
      '<div class="form-actions"><button class="btn btn-ghost" data-close-modal type="button">취소</button>' +
      '<button class="btn btn-primary" id="manualSave" type="button">' + (isNew ? '추가' : '저장') + '</button></div>');

    const save = async () => {
      const err = $('#manualError');
      let payload;
      if (isDoc) {
        const docTitle = $('#manualTitle').value.trim();
        const summary = $('#manualSummary').value.trim();
        const bodyText = $('#manualBody').value.trim();
        if (!docTitle) { err.textContent = '제목을 입력해 주세요.'; return; }
        payload = { title: docTitle, summary: summary, body: bodyText };
        if (group === 'manual') {
          const category = $('#manualCategory').value.trim();
          if (!category) { err.textContent = '카테고리를 입력해 주세요.'; return; }
          payload.category = category;
        }
      } else {
        const itemLabel = $('#manualLabel').value.trim();
        if (!itemLabel) { err.textContent = '체크 항목을 입력해 주세요.'; return; }
        payload = { label: itemLabel };
      }
      try {
        if (isNew) await DB.createManualItem(group, payload);
        else await DB.updateManualItem(group, item.id, payload);
        closeModal();
        await refreshCatalogData();
        toast(isNew ? '항목을 추가했습니다.' : '항목을 수정했습니다.');
      } catch (saveErr) { err.textContent = saveErr.message; }
    };
    $('#manualSave').addEventListener('click', save);
    const first = $('#manualTitle') || $('#manualLabel');
    if (first) first.focus();
  }

  async function addManualFromInline(group) {
    if (group === 'manual' || group === 'recipe') { openManualModal(group, null); return; }
    const input = $('#adminManualInput-' + group);
    const label = input ? input.value.trim() : '';
    if (!label) { toast('추가할 체크 항목을 입력해 주세요.'); if (input) input.focus(); return; }
    try {
      await DB.createManualItem(group, { label });
      await refreshCatalogData();
      toast('체크 항목을 추가했습니다.');
    } catch (err) { toast(err.message); }
  }

  async function exportBackup() {
    const data = await DB.exportConfig();
    const json = JSON.stringify(data, null, 2);
    const box = $('#adminBackupText');
    if (box) { box.value = json; box.dataset.dirty = 'false'; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crunchs-portal-backup-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('설정을 JSON으로 내보냈습니다.');
  }

  async function importBackup(text) {
    let summary;
    try {
      summary = await DB.importConfig(text);
    } catch (err) {
      toast(err.message);
      return false;
    }
    await refreshCatalogData();
    toast('설정을 가져왔습니다. 카테고리 ' + summary.categories + ' · 품목 ' + summary.items + ' · 매뉴얼 ' + summary.manuals + '개');
    return true;
  }

  /* ==========================================================================
     내비게이션
     ========================================================================== */
  function navigate(view) {
    if (view === 'orders' && isHQ()) {
      toast('발주 신청은 점주 모드에서 진행합니다.');
      view = 'history';
    }
    if (view === 'admin' && !isHQ()) {
      toast('관리자 설정은 본사 관리자 모드에서만 사용할 수 있습니다.');
      view = 'dashboard';
    }
    state.view = view;
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === view));
    $$('.side-link').forEach((b) => b.classList.toggle('is-active', b.dataset.nav === view));
    $('#sidebar').classList.remove('is-open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (view === 'manual') { renderManualList(); renderChecklist(); }
    if (view === 'recipe') renderRecipes();
    if (view === 'admin') renderAdmin();
  }

  /* ==========================================================================
     이벤트
     ========================================================================== */
  function bindEvents() {
    /* 로그인 화면 탭 · 보기 전환 */
    $$('[data-auth-tab]').forEach((b) => {
      b.addEventListener('click', () => setAuthMode(b.dataset.authTab));
    });
    if ($('#toSignup')) $('#toSignup').addEventListener('click', () => setAuthView('signup'));
    if ($('#toLogin')) $('#toLogin').addEventListener('click', () => setAuthView('login'));
    if ($('#signupCode')) {
      $('#signupCode').addEventListener('blur', checkInviteCode);
      $('#signupCode').addEventListener('input', () => setSignupHint('', null));
    }

    /* 로그인 (아이디 + 비밀번호 · 역할 탭 일치 검사) */
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = $('#loginId').value.trim();
      const password = $('#loginPassword').value;
      const errorBox = $('#loginError');
      const submitBtn = $('#loginSubmit');
      errorBox.textContent = '';
      if (!id) { errorBox.textContent = '아이디를 입력해 주세요.'; $('#loginId').focus(); return; }
      if (!password) { errorBox.textContent = '비밀번호를 입력해 주세요.'; $('#loginPassword').focus(); return; }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      try {
        const profile = await DB.auth.signIn(id, password);
        const isHqAccount = profile.role === 'hq';
        if (authMode === 'hq' && !isHqAccount) {
          await DB.auth.signOut();
          errorBox.textContent = '본사 임직원 전용 로그인입니다. 점주 계정은 「점주 로그인」 탭에서 로그인해 주세요.';
          $('#loginPassword').value = '';
          return;
        }
        if (authMode === 'owner' && isHqAccount) {
          await DB.auth.signOut();
          errorBox.textContent = '점주 로그인이 아닌 본사 임직원 계정입니다. 「본사 임직원 전용」 탭에서 로그인해 주세요.';
          $('#loginPassword').value = '';
          return;
        }
        applySession(profile);
        await reloadAll();
        navigate('dashboard');
        toast(profile.role === 'hq' ? '본사 관리자로 로그인했습니다.' : (profile.storeName || storeName(profile.storeId)) + ' 점주로 로그인했습니다.');
      } catch (err) {
        errorBox.textContent = err.message || '로그인에 실패했습니다.';
        $('#loginPassword').value = '';
        $('#loginPassword').focus();
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });

    ['#loginId', '#loginPassword'].forEach((sel) => {
      const el = $(sel);
      if (el) el.addEventListener('input', () => { $('#loginError').textContent = ''; });
    });

    /* 점주 회원가입 (초대 코드) */
    if ($('#signupForm')) $('#signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = $('#signupError');
      const submitBtn = $('#signupSubmit');
      errorBox.textContent = '';

      const code = $('#signupCode').value.trim().toUpperCase();
      const storeId = $('#signupStore').value;
      const ownerName = $('#signupName').value.trim();
      const id = $('#signupId').value.trim().toLowerCase();
      const pw = $('#signupPassword').value;
      const pw2 = $('#signupPassword2').value;

      if (!code) { errorBox.textContent = '초대 코드를 입력해 주세요.'; $('#signupCode').focus(); return; }
      if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(id)) { errorBox.textContent = '아이디는 영문 소문자·숫자 3~30자로 입력해 주세요. (예: gimhae01)'; $('#signupId').focus(); return; }
      if (!ownerName) { errorBox.textContent = '이름을 입력해 주세요.'; $('#signupName').focus(); return; }
      if (pw.length < 8) { errorBox.textContent = '비밀번호는 8자 이상으로 입력해 주세요.'; $('#signupPassword').focus(); return; }
      if (pw !== pw2) { errorBox.textContent = '비밀번호가 서로 다릅니다. 다시 확인해 주세요.'; $('#signupPassword2').focus(); return; }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      try {
        const check = await DB.auth.verifyInvite(code);
        if (!check.valid) throw new Error('유효하지 않거나 이미 사용된 초대 코드입니다.');
        if (check.role !== 'hq') {
          if (!storeId) { errorBox.textContent = '지점을 선택해 주세요.'; $('#signupStore').focus(); return; }
          if (!check.allow_store_choice && check.store_id && storeId !== check.store_id) {
            throw new Error('이 초대 코드는 「' + (check.store_name || '지정 지점') + '」 전용입니다. 지점을 다시 확인해 주세요.');
          }
        }

        const profile = await DB.auth.signUpWithInvite({ code, storeId, ownerName, id, password: pw });
        applySession(profile);
        await reloadAll();
        navigate('dashboard');
        toast(profile.role === 'hq' ? '본사 관리자로 가입되었습니다. 환영합니다!' : (profile.storeName || storeName(profile.storeId)) + ' 점주로 가입되었습니다. 환영합니다!');
      } catch (err) {
        errorBox.textContent = err.message || '가입에 실패했습니다.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });

    ['#signupCode', '#signupId', '#signupName', '#signupPassword', '#signupPassword2'].forEach((sel) => {
      const el = $(sel);
      if (el) el.addEventListener('input', () => { $('#signupError').textContent = ''; });
    });
    $('#logoutBtn').addEventListener('click', logout);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-logout]')) logout();
    });
    $('#bellBtn').addEventListener('click', () => navigate('notices'));

    /* 사이드바 / data-nav 공통 */
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        e.preventDefault();
        navigate(navBtn.dataset.nav);
      }
    });

    $('#menuBtn').addEventListener('click', () => {
      const open = $('#sidebar').classList.toggle('is-open');
      $('#menuBtn').setAttribute('aria-expanded', String(open));
    });

    /* 매뉴얼 카테고리·검색 */
    if ($('#manualCatChips')) $('#manualCatChips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-manual-cat]');
      if (!chip) return;
      state.manualCat = chip.dataset.manualCat;
      renderManualList();
    });
    if ($('#manualSearch')) $('#manualSearch').addEventListener('input', (e) => {
      state.manualSearch = e.target.value;
      renderManualList();
    });
    if ($('#recipeAdminBtn')) $('#recipeAdminBtn').addEventListener('click', () => {
      state.adminTab = 'recipes';
      navigate('admin');
    });

    /* 카탈로그 */
    $('#catChips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cat]');
      if (!chip) return;
      state.catalogCat = chip.dataset.cat;
      renderCatalog();
    });

    $('#catalogSearch').addEventListener('input', (e) => {
      state.catalogSearch = e.target.value;
      renderCatalog();
    });

    $('#catalogList').addEventListener('click', (e) => {
      const card = e.target.closest('[data-item]');
      if (!card) return;
      const id = card.dataset.item;
      if (e.target.closest('[data-add]')) { addToCart(id, 1); return; }
      const step = e.target.closest('[data-step]');
      if (step) addToCart(id, Number(step.dataset.step));
    });

    /* 장바구니 */
    $('#cartList').addEventListener('click', (e) => {
      const line = e.target.closest('[data-cart-line]');
      if (!line) return;
      const id = line.dataset.cartLine;
      if (e.target.closest('[data-remove]')) { delete state.cart[id]; renderCatalog(); renderCart(); return; }
      const step = e.target.closest('[data-step]');
      if (step) addToCart(id, Number(step.dataset.step));
    });

    $('#cartFab').addEventListener('click', () => $('#cartPanel').classList.add('is-open'));
    $('#cartClose').addEventListener('click', () => $('#cartPanel').classList.remove('is-open'));

    $('#deliveryDate').value = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    $('#submitOrder').addEventListener('click', async () => {
      const lines = Object.values(state.cart);
      if (!lines.length) return;
      const memoParts = [];
      const date = $('#deliveryDate').value;
      if (date) memoParts.push('배송 요청일 ' + date);
      const memo = $('#orderMemo').value.trim();
      if (memo) memoParts.push(memo);

      const order = await DB.createOrder({
        storeId: state.storeId,
        memo: memoParts.join(' · '),
        items: lines.map((l) => ({ id: l.id, name: l.name, unit: l.unit, price: l.price, qty: l.qty }))
      });

      state.cart = {};
      $('#orderMemo').value = '';
      $('#cartPanel').classList.remove('is-open');
      renderCatalog();
      renderCart();
      await reloadAll();
      toast('발주가 접수되었습니다. (' + order.id + ')');
      navigate('history');
    });

    /* 발주 내역 */
    $('#statusFilter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      state.statusFilter = b.dataset.status;
      renderHistory();
    });

    const storeFilter = $('#storeFilter');
    if (storeFilter) storeFilter.addEventListener('click', (e) => {
      const b = e.target.closest('[data-store]');
      if (!b) return;
      state.storeFilter = b.dataset.store;
      renderHistory();
    });

    $('#orderList').addEventListener('click', async (e) => {
      const toggle = e.target.closest('[data-toggle-order]');
      if (toggle) {
        const card = toggle.closest('.order-card');
        const detail = card.querySelector('.order-detail');
        detail.hidden = !detail.hidden;
        return;
      }
      const adv = e.target.closest('[data-advance]');
      if (adv) {
        await DB.updateOrderStatus(adv.dataset.advance, adv.dataset.next);
        await reloadAll();
        toast(ORDER_STATUS[adv.dataset.next].label + ' 처리했습니다.');
      }
    });

    /* 대시보드의 최근 발주 → 내역에서 열기 */
    document.addEventListener('click', (e) => {
      const open = e.target.closest('[data-open-order]');
      if (!open) return;
      navigate('history');
      state.statusFilter = 'all';
      renderHistory();
      const card = $('[data-toggle-order="' + open.dataset.openOrder + '"]');
      if (card) {
        const detail = card.closest('.order-card').querySelector('.order-detail');
        detail.hidden = false;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    /* 공지 */
    $('#noticeFilter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      state.noticeCat = b.dataset.cat;
      renderNotices();
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-notice]');
      if (btn) openNotice(btn.dataset.openNotice);
    });

    $('#newNoticeBtn').addEventListener('click', () => openNoticeForm(null));

    /* 건의 게시판 */
    $('#newPostBtn').addEventListener('click', () => {
      openModal('글쓰기', '' +
        '<div class="form-grid">' +
          '<p class="hint-box">' + esc(isHQ() ? '본사 관리자 계정으로 작성합니다.' : storeName(state.storeId) + ' 명의로 등록되며, 이 글은 본사 관리자와 작성자 본인에게만 공개됩니다.') + '</p>' +
          '<label class="field-label" for="postTitle">제목</label>' +
          '<input class="text-input" id="postTitle" placeholder="예) 주말 발주 마감 시간 문의">' +
          '<label class="field-label" for="postBody">내용</label>' +
          '<textarea class="text-input" id="postBody" rows="5" placeholder="현장에서 겪은 내용을 편하게 적어주세요."></textarea>' +
          '<p class="form-error" id="postError"></p>' +
        '</div>' +
        '<div class="form-actions"><button class="btn btn-ghost" data-close-modal>취소</button>' +
        '<button class="btn btn-primary" id="savePost">등록</button></div>');

      $('#savePost').addEventListener('click', async () => {
        const title = $('#postTitle').value.trim();
        const body = $('#postBody').value.trim();
        if (title.length < 2 || body.length < 5) {
          $('#postError').textContent = '제목과 내용을 입력해 주세요.';
          return;
        }
        await DB.createPost({ storeId: state.storeId, title, body });
        closeModal();
        await reloadAll();
        toast('건의를 등록했습니다.');
      });
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-post]');
      if (btn) openPost(btn.dataset.openPost);
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-delete-post]');
      if (!btn) return;
      const post = state.posts.find((x) => x.id === btn.dataset.deletePost);
      if (post) confirmDeletePost(post);
    });

    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-reply]');
      if (!btn) return;
      const body = $('#replyBody').value.trim();
      if (body.length < 2) {
        $('#replyError').textContent = '답변 내용을 입력해 주세요.';
        return;
      }
      await DB.addComment(btn.dataset.reply, { by: 'hq', name: '본사 운영팀', body });
      await reloadAll();
      closeModal();
      toast('답변을 등록했습니다.');
    });

    /* 체크리스트 */
    document.addEventListener('change', async (e) => {
      const box = e.target.closest('[data-check]');
      if (!box) return;
      const scope = isHQ() ? 'hq' : state.storeId;
      state.checklist = await DB.toggleChecklist(scope, box.dataset.check);
      renderChecklistProgress();
    });

    /* ---------- 관리자 설정 (본사 전용) ---------- */
    $('#adminCatAdd').addEventListener('click', addCategoryFromForm);
    if ($('#inviteCreate')) $('#inviteCreate').addEventListener('click', addInviteFromForm);
    if ($('#inviteRole')) $('#inviteRole').addEventListener('change', syncInviteRoleFields);
    syncInviteRoleFields();
    if ($('#memberSearch')) $('#memberSearch').addEventListener('input', (e) => {
      state.memberSearch = e.target.value || '';
      renderAdminMembers();
    });
    if ($('#inviteCodeInput')) $('#inviteCodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addInviteFromForm(); }
    });
    $('#adminCatName').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCategoryFromForm(); }
    });
    $('#adminItemAdd').addEventListener('click', () => openItemModal(null));
    $('#adminItemCatFilter').addEventListener('change', (e) => {
      state.adminItemCat = e.target.value;
      renderAdminItems();
    });
    $('#adminItemSearch').addEventListener('input', (e) => {
      state.adminSearch = e.target.value;
      renderAdminItems();
    });
    $('#adminExport').addEventListener('click', exportBackup);
    $('#adminCopy').addEventListener('click', async () => {
      const box = $('#adminBackupText');
      try {
        await navigator.clipboard.writeText(box.value);
        toast('JSON을 복사했습니다.');
      } catch (err) {
        box.select();
        try { document.execCommand('copy'); toast('JSON을 복사했습니다.'); }
        catch (e2) { toast('복사가 차단되었습니다. 직접 선택해 복사해 주세요.'); }
      }
    });
    $('#adminImportFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      e.target.value = '';
      await importBackup(text);
    });
    $('#adminImportText').addEventListener('click', async () => {
      const box = $('#adminBackupText');
      if (!box.value.trim()) { toast('적용할 JSON을 붙여넣어 주세요.'); box.focus(); return; }
      const ok = await importBackup(box.value);
      if (ok) box.dataset.dirty = 'false';
    });
    $('#adminBackupText').addEventListener('input', (e) => { e.target.dataset.dirty = 'true'; });

    document.addEventListener('keydown', (e) => {
      const input = e.target.closest('[id^="adminManualInput-"]');
      if (!input || e.key !== 'Enter') return;
      e.preventDefault();
      const group = input.id.replace('adminManualInput-', '');
      const btn = document.querySelector('[data-manual-add="' + group + '"]');
      if (btn) btn.click();
    });

    document.addEventListener('click', async (e) => {
      const tab = e.target.closest('[data-admin-tab]');
      if (tab) {
        state.adminTab = tab.dataset.adminTab;
        renderAdmin();
        if (state.adminTab === 'applications' && isHQ()) {
          try {
            state.applications = await DB.listApplications();
            renderAdminApplications();
          } catch (err) { toast(err.message); }
        }
        if (state.adminTab === 'invites' && isHQ()) {
          try {
            state.invites = await DB.listInviteCodes();
            renderAdminInvites();
          } catch (err) { toast(err.message); }
        }
        if (state.adminTab === 'members' && isHQ()) {
          try {
            state.members = await DB.listMembers();
            renderAdminMembers();
            if ($('#adminMemberCount')) $('#adminMemberCount').textContent = state.members.length;
          } catch (err) { toast(err.message); }
        }
        return;
      }

      const memberChip = e.target.closest('[data-member-role]');
      if (memberChip) {
        state.memberRole = memberChip.dataset.memberRole;
        renderAdminMembers();
        return;
      }

      const memberKick = e.target.closest('[data-member-kick]');
      if (memberKick) {
        const id = memberKick.dataset.memberKick;
        const m = (state.members || []).find((x) => x.id === id);
        if (!m) return;
        if (state.userId && id === state.userId) { toast('본인 계정은 추방할 수 없습니다.'); return; }
        const targetHq = m.role === 'hq';
        const label = m.ownerName || (targetHq ? '본사 관리자' : '이름 미등록');
        const lines = ['이름 <b>' + esc(label) + '</b>',
          '지점 <b>' + esc(targetHq ? '본사' : (m.storeName || '지점 미지정')) + '</b>',
          '아이디 <b>' + esc(m.loginId || '-') + '</b>'].join('<br>');
        openConfirm('회원 추방',
          lines +
          '<br><br>이 계정을 추방하면 <b>바로 삭제</b>되어 다시 로그인할 수 없습니다.<br>' +
          '작성한 건의글은 지점 기록으로 남고, 사용한 초대 코드는 함께 폐기됩니다.',
          '추방', async () => {
            await DB.deleteMember(id);
            closeModal();
            state.members = await DB.listMembers();
            renderAdminMembers();
            if ($('#adminMemberCount')) $('#adminMemberCount').textContent = state.members.length;
            toast('「' + label + '」 계정을 추방했습니다.');
          }, true);
        return;
      }

      const invDel = e.target.closest('[data-invite-del]');
      if (invDel) {
        const code = invDel.dataset.inviteDel;
        openConfirm('초대 코드 폐기', '코드 「' + code + '」를 폐기합니다. 이미 가입한 점주 계정에는 영향이 없습니다.', '폐기', async () => {
          state.invites = await DB.deleteInviteCode(code);
          renderAdminInvites();
          closeModal();
          toast('초대 코드를 폐기했습니다.');
        }, true);
        return;
      }

      const catEdit = e.target.closest('[data-cat-edit]');
      if (catEdit) { openCategoryRename(catEdit.dataset.catEdit); return; }
      const catDel = e.target.closest('[data-cat-del]');
      if (catDel) { openCategoryDelete(catDel.dataset.catDel); return; }

      const itemEdit = e.target.closest('[data-item-edit]');
      if (itemEdit) {
        openItemModal(state.catalog.find((it) => it.id === itemEdit.dataset.itemEdit));
        return;
      }
      const itemSold = e.target.closest('[data-item-soldout]');
      if (itemSold) {
        const item = state.catalog.find((it) => it.id === itemSold.dataset.itemSoldout);
        if (!item) return;
        const resume = !!item.soldOut;
        try {
          await DB.setItemSoldOut(item.id, !item.soldOut);
          await refreshCatalogData();
          toast(resume ? '「' + item.name + '」 판매를 재개했습니다.' : '「' + item.name + '」를 품절 처리했습니다.');
        } catch (err) { toast(err.message); }
        return;
      }
      const itemDel = e.target.closest('[data-item-del]');
      if (itemDel) {
        const item = state.catalog.find((it) => it.id === itemDel.dataset.itemDel);
        if (!item) return;
        openConfirm('품목 삭제',
          '「' + esc(item.name) + '」 품목을 삭제합니다.<br>발주 바구니에 담아둔 같은 품목도 사라집니다.',
          '삭제', async () => {
            await DB.deleteItem(item.id);
            closeModal();
            await refreshCatalogData();
            toast('품목을 삭제했습니다.');
          }, true);
        return;
      }

      const manualAdd = e.target.closest('[data-manual-add]');
      if (manualAdd) { await addManualFromInline(manualAdd.dataset.manualAdd); return; }
      const manualEdit = e.target.closest('[data-manual-edit]');
      if (manualEdit) {
        const group = manualEdit.dataset.manualGroup;
        const item = (state.manuals[group] || []).find((m) => m.id === manualEdit.dataset.manualEdit);
        if (item) openManualModal(group, item);
        return;
      }
      const manualDel = e.target.closest('[data-manual-del]');
      if (manualDel) {
        const group = manualDel.dataset.manualGroup;
        const item = (state.manuals[group] || []).find((m) => m.id === manualDel.dataset.manualDel);
        if (!item) return;
        const itemName = (group === 'manual' || group === 'recipe') ? item.title : item.label;
        openConfirm('항목 삭제', '「' + esc(itemName) + '」 항목을 삭제합니다.' +
          (group === 'manual' ? '<br>점주 화면의 매뉴얼에서도 바로 사라집니다.' : ''), '삭제', async () => {
          await DB.deleteManualItem(group, item.id);
          closeModal();
          await refreshCatalogData();
          toast('항목을 삭제했습니다.');
        }, true);
        return;
      }
    });

    /* 발주 내역: 본사 모드 안내 */
    $('#orderList').addEventListener('click', () => {});
  }

  /* ==========================================================================
     시작
     ========================================================================== */
  /* ==========================================================================
     PWA — 홈 화면에 추가(앱 설치)
     --------------------------------------------------------------------------
     manifest 는 index.html 에서 불러오고, 여기서는 서비스 워커만 등록합니다.
     서비스 워커가 실패해도 포털 자체는 그대로 동작합니다(설치형 실행만 못 함).
     ========================================================================== */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
    });
  }

  async function init() {
    bindEvents();
    registerServiceWorker();
    renderChecklist();

    let profile = null;
    try {
      await DB.init();
      profile = await DB.auth.currentProfile();
    } catch (err) {
      const errorBox = $('#loginError');
      if (errorBox) errorBox.textContent = '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }

    if (profile) {
      applySession(profile);
      try {
        await reloadAll();
        navigate('dashboard');
      } catch (err) {
        toast(err.message || '데이터를 불러오지 못했습니다.');
      }
    } else {
      setAuthMode('owner');
      $('#loginView').hidden = false;
      $('#appView').hidden = true;
    }

    // 점주 모드에서는 발주 상태 변경 안내를 위해 현재 역할을 노출
    const hint = document.createElement('p');
    hint.className = 'hint-box';
    hint.id = 'roleHint';
    hint.innerHTML = '점주 모드에서는 발주 <b>신청</b>과 <b>상태 확인</b>만 가능합니다. 상태 변경(접수대기 → 본사확인 → 출고완료)은 본사 관리자 계정에서 처리합니다.';
    const historyView = $('[data-view="history"]');
    if (historyView && !$('#roleHint')) historyView.insertBefore(hint, historyView.children[1] || null);
    const updateHint = () => { const el = $('#roleHint'); if (el) el.hidden = isHQ(); };
    updateHint();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
