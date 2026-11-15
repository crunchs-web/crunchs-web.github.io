/* ==========================================================================
   CRUNCH'S 점주 포털 — 데이터 레이어
   --------------------------------------------------------------------------
   지금은 브라우저 localStorage 어댑터로 완전히 동작하는 프로토타입입니다.
   무료 DB(Supabase)로 옮길 때는 아래 `SupabaseAdapter`를 채우고
   파일 맨 끝의 `DB = ...` 한 줄만 바꾸면 됩니다. 화면 코드(app.js)는
   어댑터의 메서드 이름만 알고 있으므로 수정할 필요가 없습니다.

   공통 규칙
   - 모든 메서드는 Promise를 돌려줍니다. (localStorage도 async로 감싸 UI 코드를 그대로 재사용)
   - 매장 구분은 storeId ('yangsan' | 'gimhae' | 'pohang'), 본사는 role='hq'
   ========================================================================== */

const STORE_PROFILES = [
  { id: 'yangsan', name: '양산점', owner: '장성진', region: '경남 양산시' },
  { id: 'gimhae_bnb', name: '김해진영비앤비점', owner: '장성진', region: '경남 김해시' },
  { id: 'busan_gwangan', name: '부산광안점', owner: '장성진', region: '부산 수영구' },
  { id: 'pohang_idong', name: '포항이동점', owner: '장성진', region: '경북 포항시' }
];

/* ---------- 발주 카탈로그 기본값 ----------
   화면의 품목·단가는 DB(catalog_items)에 저장된 값을 씁니다.
   아래는 localStorage 어댑터(개발용)의 최초 시드용 기본값이며, 실서비스 화면에는 쓰이지 않습니다. */
const DEFAULT_CATALOG = [
  { id: 'patty-beef', cat: '패티', name: '비프 패티 90g', unit: '1팩(20ea)', price: 24000, note: '냉동' },
  { id: 'patty-chicken', cat: '패티', name: '치킨 패티 (크런치용)', unit: '1팩(20ea)', price: 21500, note: '냉동' },
  { id: 'patty-shrimp', cat: '패티', name: '새우 패티', unit: '1팩(16ea)', price: 19800, note: '냉동' },
  { id: 'patty-bulgogi', cat: '패티', name: '불고기 패티', unit: '1팩(20ea)', price: 22000, note: '냉동' },

  { id: 'bun-brioche', cat: '번', name: '브리오슈 번', unit: '1박스(24ea)', price: 12800, note: '상온' },
  { id: 'bun-sesame', cat: '번', name: '참깨 번', unit: '1박스(24ea)', price: 9600, note: '상온' },

  { id: 'sauce-crunch', cat: '소스', name: '크런치 시그니처 소스', unit: '1통(2kg)', price: 14500, note: '냉장' },
  { id: 'sauce-spicy', cat: '소스', name: '스파이시 소스', unit: '1통(2kg)', price: 15200, note: '냉장' },
  { id: 'sauce-bulgogi', cat: '소스', name: '불고기 소스', unit: '1통(2kg)', price: 13800, note: '냉장' },

  { id: 'chicken-wing', cat: '치킨', name: '치킨 윙', unit: '1봉(1kg)', price: 11900, note: '냉동' },
  { id: 'chicken-tender', cat: '치킨', name: '치킨 텐더', unit: '1봉(1kg)', price: 12600, note: '냉동' },
  { id: 'chicken-whole', cat: '치킨', name: '통닭 (1마리)', unit: '1팩(10ea)', price: 26500, note: '냉동' },

  { id: 'pack-box', cat: '포장재', name: '버거 박스', unit: '1묶음(100ea)', price: 8900, note: '소모품' },
  { id: 'pack-bag', cat: '포장재', name: '포장 봉투', unit: '1묶음(200ea)', price: 6400, note: '소모품' },
  { id: 'pack-cup', cat: '포장재', name: '음료 컵 + 뚜껑', unit: '1묶음(100ea)', price: 9800, note: '소모품' },
  { id: 'pack-napkin', cat: '포장재', name: '냅킨', unit: '1박스(1,000ea)', price: 5200, note: '소모품' }
];

const DEFAULT_CATEGORIES = ['패티', '번', '소스', '치킨', '포장재'];

/* ---------- 매뉴얼 · 체크리스트 기본값 ---------- */
const DEFAULT_MANUALS = {
  recipe: [
    { id: 'r-1', title: '번 데우기', desc: '번 커터로 자른 뒤 180℃ 그릴에서 단면 20초.' },
    { id: 'r-2', title: '소스 도포', desc: '상단 번에 시그니처 소스 15g, 하단 번에 10g.' },
    { id: 'r-3', title: '패티 튀김', desc: '치킨 패티 175℃에서 1차 2분 30초 → 2차 1분 30초.' },
    { id: 'r-4', title: '조립 순서', desc: '하단 번 → 소스 → 패티 → 치즈 → 양상추 → 상단 번.' },
    { id: 'r-5', title: '포장 · 대기', desc: '조립 후 3분 이내 제공. 대기 시 60℃ 보온 램프 사용.' }
  ],
  open: [
    { id: 'o-1', label: '냉장·냉동고 온도 확인 (냉장 0~4℃ / 냉동 -18℃ 이하)' },
    { id: 'o-2', label: '튀김유 산가 측정 및 여과' },
    { id: 'o-3', label: '식자재 유통기한 라벨 확인' },
    { id: 'o-4', label: '조리대·기구 소독' },
    { id: 'o-5', label: '직원 위생 복장 및 건강 상태 확인' },
    { id: 'o-6', label: '키오스크·POS·배달앱 주문 수신 테스트' },
    { id: 'o-7', label: '현금 시재 및 잔돈 준비' }
  ],
  close: [
    { id: 'c-1', label: '튀김유 여과 및 기름통 마감' },
    { id: 'c-2', label: '식자재 밀봉·라벨링 후 냉장 보관' },
    { id: 'c-3', label: '조리대·그릴·튀김기 세척' },
    { id: 'c-4', label: '포장재 및 소모품 재고 확인' },
    { id: 'c-5', label: '매출 마감 및 시재 확인' },
    { id: 'c-6', label: '쓰레기 분리 배출' },
    { id: 'c-7', label: '가스·전원 차단 확인' }
  ]
};

/* 하위 호환: 기존 코드/스크립트가 참조하던 이름 */
const CATALOG = DEFAULT_CATALOG;
const CATEGORIES = DEFAULT_CATEGORIES;

const ORDER_STATUS = {
  pending: { label: '접수대기', tone: 'wait', next: 'confirmed' },
  confirmed: { label: '본사확인', tone: 'progress', next: 'shipped' },
  shipped: { label: '출고완료', tone: 'done', next: null }
};

/* ---------- 최초 1회 시드 데이터 ---------- */
function seedNotices() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: 'n-1004', title: '신메뉴 「핫크런치 치킨버거」 정식 출시 안내', cat: '신메뉴', important: true,
      date: new Date(now - day * 1).toISOString(),
      body: '11월 신메뉴 「핫크런치 치킨버거」가 전 매장에 정식 출시됩니다.\n\n· 판매가: 매장 표기가 기준\n· 구성: 스파이시 소스 치킨 패티 + 할라피뇨 + 체다\n· 교육 자료: 매뉴얼 → 버거 조리 공정 4번 항목\n\n출시 첫 주에는 스파이시 소스 재고를 평소보다 20% 여유 있게 준비해 주세요.'
    },
    {
      id: 'n-1003', title: '치킨 원육 단가 조정 안내 (11월 2주차)', cat: '단가변동', important: true,
      date: new Date(now - day * 3).toISOString(),
      body: '원육 시세 변동에 따라 아래 품목의 공급 단가가 조정됩니다.\n\n· 치킨 윙: 11,900원 → 12,400원\n· 치킨 텐더: 12,600원 → 13,100원\n\n적용일: 11월 2주차 발주분부터.\n기존 재고는 조정 전 단가로 출고됩니다.'
    },
    {
      id: 'n-1002', title: '하반기 위생 점검 일정 및 체크리스트 배포', cat: '위생점검', important: false,
      date: new Date(now - day * 6).toISOString(),
      body: '하반기 본사 위생 점검 일정을 안내드립니다.\n\n· 점검 기간: 11월 3주차 ~ 4주차\n· 점검 항목: 냉장·냉동 온도 기록, 유통기한 라벨링, 조리대 소독, 직원 위생 교육일지\n\n매뉴얼 → 오픈 체크리스트의 위생 항목을 미리 점검해 주세요.'
    }
  ];
}

function seedPosts() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: 'p-501', storeId: 'yangsan', title: '주말 배달 주문 폭주 시 발주 마감 시간 조정 가능할까요?',
      body: '토·일 저녁에 배달 주문이 몰리면 금요일 발주가 늦어지는 경우가 있습니다. 주말 대비 발주 마감을 1시간 늦춰 주실 수 있을까요?',
      date: new Date(now - day * 2).toISOString(),
      comments: [
        { by: 'hq', name: '본사 운영팀', body: '문의 감사합니다. 금요일 발주 마감을 15:00 → 16:00으로 조정하는 안을 검토 중입니다. 다음 주 공지로 확정 안내드리겠습니다.', date: new Date(now - day * 1).toISOString() }
      ]
    },
    {
      id: 'p-500', storeId: 'gimhae', title: '신메뉴 소스 보관 온도 문의',
      body: '스파이시 소스 개봉 후 냉장 보관 며칠까지 가능한가요?',
      date: new Date(now - day * 4).toISOString(),
      comments: [
        { by: 'hq', name: '본사 운영팀', body: '개봉 후 냉장(0~4℃) 보관 기준 7일입니다. 매뉴얼 → 소스 관리 항목에 표로 정리되어 있습니다.', date: new Date(now - day * 3.5).toISOString() }
      ]
    }
  ];
}

function seedOrders() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: 'O-20261113-0412', storeId: 'yangsan', createdAt: new Date(now - day * 1).toISOString(),
      status: 'confirmed', memo: '금요일 오전 배송 희망',
      items: [
        { id: 'patty-chicken', name: '치킨 패티 (크런치용)', unit: '1팩(20ea)', price: 21500, qty: 4 },
        { id: 'bun-brioche', name: '브리오슈 번', unit: '1박스(24ea)', price: 12800, qty: 3 },
        { id: 'sauce-crunch', name: '크런치 시그니처 소스', unit: '1통(2kg)', price: 14500, qty: 2 }
      ]
    },
    {
      id: 'O-20261110-0398', storeId: 'yangsan', createdAt: new Date(now - day * 4).toISOString(),
      status: 'shipped', memo: '',
      items: [
        { id: 'pack-box', name: '버거 박스', unit: '1묶음(100ea)', price: 8900, qty: 6 },
        { id: 'pack-bag', name: '포장 봉투', unit: '1묶음(200ea)', price: 6400, qty: 4 }
      ]
    }
  ];
}

/* ==========================================================================
   LocalStorage 어댑터
   ========================================================================== */
const LocalAdapter = (() => {
  const PREFIX = 'crunchs-portal:v1:';
  const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const write = (key, value) => {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return value;
  };
  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function ensureSeed() {
    if (!localStorage.getItem(PREFIX + 'seeded')) {
      write('notices', seedNotices());
      write('posts', seedPosts());
      write('orders', seedOrders());
      write('seeded', true);
    }
    // 관리자 편집 데이터(카테고리·품목·매뉴얼) — 없으면 기본 예시로 시드
    if (localStorage.getItem(PREFIX + 'categories') === null) write('categories', clone(DEFAULT_CATEGORIES));
    if (localStorage.getItem(PREFIX + 'items') === null) write('items', clone(DEFAULT_CATALOG));
    if (localStorage.getItem(PREFIX + 'manuals') === null) write('manuals', clone(DEFAULT_MANUALS));

    // 알림 읽음 상태·체크리스트는 매장별 (본사 포함)
    STORE_PROFILES.map((s) => s.id).concat(['hq']).forEach((id) => {
      if (localStorage.getItem(PREFIX + 'checklist:' + id) === null) write('checklist:' + id, {});
    });

    // v1.0 체크리스트 키(open:0, close:3 …) → 항목 ID(o-1, c-4 …) 마이그레이션
    STORE_PROFILES.map((s) => s.id).concat(['hq']).forEach((id) => {
      const current = read('checklist:' + id, null);
      if (!current) return;
      const legacy = Object.keys(current).filter((k) => /^(open|close):\d+$/.test(k));
      if (!legacy.length) return;
      const next = {};
      Object.keys(current).forEach((k) => {
        const m = k.match(/^(open|close):(\d+)$/);
        if (m) next[(m[1] === 'open' ? 'o-' : 'c-') + (Number(m[2]) + 1)] = current[k];
        else next[k] = current[k];
      });
      write('checklist:' + id, next);
    });
  }

  const readCategories = () => read('categories', clone(DEFAULT_CATEGORIES)).slice();
  const readItems = () => read('items', clone(DEFAULT_CATALOG)).map((it) => ({ soldOut: false, ...it }));
  const readManuals = () => {
    const raw = read('manuals', clone(DEFAULT_MANUALS)) || {};
    return { recipe: raw.recipe || [], open: raw.open || [], close: raw.close || [] };
  };

  return {
    name: 'local',
    async init() { ensureSeed(); },

    /* --- 발주 --- */
    async listOrders(storeId) {
      const all = read('orders', []);
      return all.filter((o) => o.storeId === storeId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async listAllOrders() {
      return read('orders', []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async createOrder(order) {
      const all = read('orders', []);
      const record = {
        id: 'O-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 9000) + 1000),
        createdAt: new Date().toISOString(),
        status: 'pending',
        ...order
      };
      all.push(record);
      write('orders', all);
      return record;
    },
    async updateOrderStatus(orderId, status) {
      const all = read('orders', []);
      const found = all.find((o) => o.id === orderId);
      if (!found) throw new Error('발주를 찾을 수 없습니다.');
      found.status = status;
      found.updatedAt = new Date().toISOString();
      write('orders', all);
      return found;
    },

    /* --- 공지 --- */
    async listNotices() {
      return read('notices', []).sort((a, b) => {
        if (!!b.important !== !!a.important) return b.important ? 1 : -1;
        return new Date(b.date) - new Date(a.date);
      });
    },
    async createNotice(notice) {
      const all = read('notices', []);
      const record = { id: 'n-' + Date.now(), date: new Date().toISOString(), comments: [], ...notice };
      all.unshift(record);
      write('notices', all);
      return record;
    },
    /* 본사(hq) 전용 — 공지 수정 */
    async updateNotice(id, patch) {
      const all = read('notices', []);
      const found = all.find((n) => n.id === id);
      if (!found) throw new Error('공지를 찾을 수 없습니다.');
      const p = patch || {};
      if (p.title !== undefined) {
        const title = String(p.title == null ? '' : p.title).trim();
        if (!title) throw new Error('공지 제목을 입력해 주세요.');
        found.title = title;
      }
      const cat = p.category !== undefined ? p.category : p.cat;
      if (cat !== undefined) found.cat = String(cat == null ? '' : cat).trim();
      if (p.body !== undefined) found.body = String(p.body == null ? '' : p.body);
      const pinned = p.pinned !== undefined ? p.pinned : p.important;
      if (pinned !== undefined) found.important = !!pinned;
      found.updatedAt = new Date().toISOString();
      write('notices', all);
      return found;
    },
    /* 본사(hq) 전용 — 공지 삭제 (매장별 읽음 상태도 함께 정리) */
    async deleteNotice(id) {
      const all = read('notices', []);
      const next = all.filter((n) => n.id !== id);
      if (next.length === all.length) throw new Error('공지를 찾을 수 없습니다.');
      write('notices', next);
      STORE_PROFILES.map((s) => s.id).concat(['hq']).forEach((store) => {
        const key = 'read:' + store;
        const list = read(key, []);
        if (list.includes(id)) write(key, list.filter((x) => x !== id));
      });
      return next;
    },
    async readState(storeId) {
      return read('read:' + storeId, []);
    },
    async markNoticeRead(storeId, noticeId) {
      const list = read('read:' + storeId, []);
      if (!list.includes(noticeId)) { list.push(noticeId); write('read:' + storeId, list); }
      return list;
    },

    /* --- 건의 게시판 --- */
    async listPosts(storeId) {
      return read('posts', [])
        .filter((p) => p.storeId === storeId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async listAllPosts() {
      return read('posts', []).sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    async createPost(post) {
      const all = read('posts', []);
      const record = { id: 'p-' + Date.now(), date: new Date().toISOString(), comments: [], ...post };
      all.unshift(record);
      write('posts', all);
      return record;
    },
    async deleteBoardPost(id) {
      const all = read('posts', []);
      const next = all.filter((p) => p.id !== id);
      if (next.length === all.length) throw new Error('글을 찾을 수 없습니다.');
      write('posts', next);
      return true;
    },
    async addComment(postId, comment) {
      const all = read('posts', []);
      const found = all.find((p) => p.id === postId);
      if (!found) throw new Error('게시글을 찾을 수 없습니다.');
      found.comments.push({ ...comment, date: new Date().toISOString() });
      write('posts', all);
      return found;
    },

    /* --- 발주 카테고리 (관리자 편집) --- */
    async listCategories() { return readCategories(); },
    async createCategory(name) {
      const next = String(name == null ? '' : name).trim();
      if (!next) throw new Error('카테고리 이름을 입력해 주세요.');
      if (next.length > 20) throw new Error('카테고리 이름은 20자 이내로 입력해 주세요.');
      const cats = readCategories();
      if (cats.includes(next)) throw new Error('이미 등록된 카테고리입니다.');
      cats.push(next);
      write('categories', cats);
      return cats;
    },
    async updateCategory(oldName, newName) {
      const next = String(newName == null ? '' : newName).trim();
      if (!next) throw new Error('카테고리 이름을 입력해 주세요.');
      if (next.length > 20) throw new Error('카테고리 이름은 20자 이내로 입력해 주세요.');
      const cats = readCategories();
      const index = cats.indexOf(oldName);
      if (index < 0) throw new Error('카테고리를 찾을 수 없습니다.');
      if (next === oldName) return cats;
      if (cats.includes(next)) throw new Error('이미 등록된 카테고리입니다.');
      cats[index] = next;
      write('categories', cats);
      const items = readItems().map((it) => (it.cat === oldName ? { ...it, cat: next } : it));
      write('items', items);
      return cats;
    },
    async deleteCategory(name, options) {
      const opts = options || {};
      const cats = readCategories();
      if (!cats.includes(name)) throw new Error('카테고리를 찾을 수 없습니다.');
      if (cats.length <= 1) throw new Error('카테고리는 최소 1개가 필요합니다.');
      const items = readItems();
      const affected = items.filter((it) => it.cat === name);
      let nextItems = items;
      if (affected.length) {
        if (opts.mode === 'move') {
          if (!opts.to || opts.to === name || !cats.includes(opts.to)) {
            throw new Error('품목을 옮길 카테고리를 선택해 주세요.');
          }
          nextItems = items.map((it) => (it.cat === name ? { ...it, cat: opts.to } : it));
        } else if (opts.mode === 'delete') {
          nextItems = items.filter((it) => it.cat !== name);
        } else {
          throw new Error('품목 처리 방식을 선택해 주세요.');
        }
      }
      write('items', nextItems);
      const nextCats = cats.filter((c) => c !== name);
      write('categories', nextCats);
      return { categories: nextCats, removedItems: affected.length };
    },

    /* --- 발주 품목 (관리자 편집) --- */
    async listItems() { return readItems(); },
    async createItem(data) {
      const payload = data || {};
      const cats = readCategories();
      const name = String(payload.name == null ? '' : payload.name).trim();
      const cat = String(payload.cat == null ? '' : payload.cat).trim();
      if (!cats.includes(cat)) throw new Error('카테고리를 선택해 주세요.');
      if (!name) throw new Error('품목명을 입력해 주세요.');
      const price = Number(payload.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('단가를 0원 이상 숫자로 입력해 주세요.');
      const items = readItems();
      const record = {
        id: uid('it'),
        cat,
        name,
        unit: String(payload.unit == null ? '' : payload.unit).trim(),
        price,
        note: payload.note || '상온',
        soldOut: !!payload.soldOut
      };
      items.push(record);
      write('items', items);
      return record;
    },
    async updateItem(id, patch) {
      const items = readItems();
      const found = items.find((it) => it.id === id);
      if (!found) throw new Error('품목을 찾을 수 없습니다.');
      const next = { ...found, ...(patch || {}) };
      if (patch && patch.cat !== undefined && !readCategories().includes(patch.cat)) {
        throw new Error('카테고리를 선택해 주세요.');
      }
      if (!String(next.name || '').trim()) throw new Error('품목명을 입력해 주세요.');
      next.name = String(next.name).trim();
      next.unit = String(next.unit || '').trim();
      next.price = Math.max(0, Number(next.price) || 0);
      next.soldOut = !!next.soldOut;
      const index = items.indexOf(found);
      items[index] = next;
      write('items', items);
      return next;
    },
    async deleteItem(id) {
      const items = readItems();
      const next = items.filter((it) => it.id !== id);
      if (next.length === items.length) throw new Error('품목을 찾을 수 없습니다.');
      write('items', next);
      return next;
    },
    async setItemSoldOut(id, soldOut) {
      return this.updateItem(id, { soldOut: !!soldOut });
    },

    /* --- 매뉴얼 · 체크리스트 (관리자 편집) --- */
    async getManuals() { return readManuals(); },
    async createManualItem(group, data) {
      const manuals = readManuals();
      if (!manuals[group]) throw new Error('매뉴얼 구분이 올바르지 않습니다.');
      const payload = data || {};
      let record;
      if (group === 'recipe') {
        const title = String(payload.title == null ? '' : payload.title).trim();
        if (!title) throw new Error('단계 제목을 입력해 주세요.');
        record = { id: uid('r'), title, desc: String(payload.desc == null ? '' : payload.desc).trim() };
      } else {
        const label = String(payload.label == null ? '' : payload.label).trim();
        if (!label) throw new Error('체크 항목을 입력해 주세요.');
        record = { id: uid(group === 'open' ? 'o' : 'c'), label };
      }
      manuals[group].push(record);
      write('manuals', manuals);
      return record;
    },
    async updateManualItem(group, id, patch) {
      const manuals = readManuals();
      if (!manuals[group]) throw new Error('매뉴얼 구분이 올바르지 않습니다.');
      const list = manuals[group];
      const index = list.findIndex((m) => m.id === id);
      if (index < 0) throw new Error('항목을 찾을 수 없습니다.');
      const next = { ...list[index], ...(patch || {}) };
      if (group === 'recipe') {
        next.title = String(next.title || '').trim();
        next.desc = String(next.desc || '').trim();
        if (!next.title) throw new Error('단계 제목을 입력해 주세요.');
      } else {
        next.label = String(next.label || '').trim();
        if (!next.label) throw new Error('체크 항목을 입력해 주세요.');
      }
      list[index] = next;
      write('manuals', manuals);
      return next;
    },
    async deleteManualItem(group, id) {
      const manuals = readManuals();
      if (!manuals[group]) throw new Error('매뉴얼 구분이 올바르지 않습니다.');
      const next = manuals[group].filter((m) => m.id !== id);
      if (next.length === manuals[group].length) throw new Error('항목을 찾을 수 없습니다.');
      manuals[group] = next;
      write('manuals', manuals);
      // 삭제된 항목의 체크 상태 정리 (매장별 + 본사)
      STORE_PROFILES.map((s) => s.id).concat(['hq']).forEach((store) => {
        const key = 'checklist:' + store;
        const current = read(key, null);
        if (current && Object.prototype.hasOwnProperty.call(current, id)) {
          delete current[id];
          write(key, current);
        }
      });
      return next;
    },

    /* --- 체크리스트 항목(오픈/마감) 별칭 ---
       화면에서는 manuals.open / manuals.close 그룹으로 관리하지만,
       다른 화면에서 체크리스트만 다룰 때 쓸 수 있도록 같은 저장소를 가리키는 메서드를 둡니다. */
    async listChecklists() {
      const manuals = readManuals();
      return { open: manuals.open, close: manuals.close };
    },
    async createChecklistItem(group, data) {
      if (group !== 'open' && group !== 'close') throw new Error('체크리스트 구분은 open 또는 close입니다.');
      return this.createManualItem(group, data);
    },
    async updateChecklistItem(group, id, patch) {
      if (group !== 'open' && group !== 'close') throw new Error('체크리스트 구분은 open 또는 close입니다.');
      return this.updateManualItem(group, id, patch);
    },
    async deleteChecklistItem(group, id) {
      if (group !== 'open' && group !== 'close') throw new Error('체크리스트 구분은 open 또는 close입니다.');
      return this.deleteManualItem(group, id);
    },

    /* --- 설정 백업 · 복원 · 초기화 --- */
    async exportConfig() {
      return {
        app: 'crunchs-portal',
        version: 1,
        exportedAt: new Date().toISOString(),
        categories: readCategories(),
        items: readItems(),
        manuals: readManuals()
      };
    },
    async importConfig(payload) {
      let data = payload;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { throw new Error('JSON 형식이 올바르지 않습니다.'); }
      }
      if (!data || typeof data !== 'object') throw new Error('가져올 설정 데이터가 비어 있습니다.');
      if (!Array.isArray(data.categories) || !data.categories.length) throw new Error('categories 배열이 필요합니다.');
      if (!Array.isArray(data.items)) throw new Error('items 배열이 필요합니다.');
      if (!data.manuals || typeof data.manuals !== 'object') throw new Error('manuals 객체가 필요합니다.');

      const categories = [];
      data.categories.forEach((raw) => {
        const name = String(raw == null ? '' : raw).trim();
        if (name && !categories.includes(name)) categories.push(name);
      });
      if (!categories.length) throw new Error('유효한 카테고리가 없습니다.');

      const seenItemIds = [];
      const items = data.items.map((raw, i) => {
        const it = raw || {};
        const cat = String(it.cat == null ? '' : it.cat).trim();
        const name = String(it.name == null ? '' : it.name).trim();
        if (!cat || !name) throw new Error('items[' + i + ']에 카테고리(cat) 또는 품목명(name)이 없습니다.');
        if (!categories.includes(cat)) categories.push(cat);
        let id = String(it.id == null ? '' : it.id).trim() || ('it-' + i + '-' + Date.now().toString(36));
        if (seenItemIds.includes(id)) id = id + '-' + i;
        seenItemIds.push(id);
        return {
          id, cat, name,
          unit: String(it.unit == null ? '' : it.unit).trim(),
          price: Math.max(0, Number(it.price) || 0),
          note: it.note || '상온',
          soldOut: !!it.soldOut
        };
      });

      const seenManualIds = [];
      const manuals = {};
      ['recipe', 'open', 'close'].forEach((group) => {
        const list = Array.isArray(data.manuals[group]) ? data.manuals[group] : [];
        manuals[group] = list.map((raw, i) => {
          const m = raw || {};
          let id = String(m.id == null ? '' : m.id).trim() || (group + '-' + i + '-' + Date.now().toString(36));
          if (seenManualIds.includes(id)) id = id + '-' + i;
          seenManualIds.push(id);
          if (group === 'recipe') {
            const title = String(m.title == null ? '' : m.title).trim();
            if (!title) throw new Error('manuals.recipe[' + i + ']에 제목(title)이 없습니다.');
            return { id, title, desc: String(m.desc == null ? '' : m.desc).trim() };
          }
          const label = String(m.label == null ? '' : m.label).trim();
          if (!label) throw new Error('manuals.' + group + '[' + i + ']에 항목(label)이 없습니다.');
          return { id, label };
        });
      });

      write('categories', categories);
      write('items', items);
      write('manuals', manuals);
      return { categories: categories.length, items: items.length, manuals: manuals.recipe.length + manuals.open.length + manuals.close.length };
    },
    async resetConfig() {
      write('categories', clone(DEFAULT_CATEGORIES));
      write('items', clone(DEFAULT_CATALOG));
      write('manuals', clone(DEFAULT_MANUALS));
      STORE_PROFILES.map((s) => s.id).concat(['hq']).forEach((id) => write('checklist:' + id, {}));
      return this.exportConfig();
    },

    /* --- 매뉴얼 체크리스트 (매장별 체크 상태) --- */
    async getChecklist(storeId) {      return read('checklist:' + storeId, {});
    },
    async toggleChecklist(storeId, key) {
      const state = read('checklist:' + storeId, {});
      state[key] = !state[key];
      write('checklist:' + storeId, state);
      return state;
    }
  };
})();

/* ==========================================================================
   Supabase 어댑터 (실서비스)
   --------------------------------------------------------------------------
   · 화면 코드(app.js)는 아래 메서드 이름만 알고 있으므로 그대로 동작합니다.
   · 프론트엔드에는 공개용(publishable) 키만 들어갑니다.
     service_role / secret 키는 절대 이 파일이나 저장소에 넣지 않습니다.
   · 접근 통제는 전부 데이터베이스의 RLS 정책이 담당합니다. (supabase/schema.sql 참고)
   ========================================================================== */
const SUPABASE_URL = 'https://hgnnaazxpsytjsjmdgbv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_MIfxqv5yr0WifnFss306hg_vqEtfEXg';

const SupabaseAdapter = (() => {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  const fail = (error, fallback) => { throw new Error((error && error.message) || fallback || '요청을 처리하지 못했습니다.'); };
  const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = () => { const d = new Date(); return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); };

  const mapOrder = (r) => ({
    id: r.id, storeId: r.store_id, status: r.status, memo: r.memo || '',
    items: Array.isArray(r.items) ? r.items : [], createdAt: r.created_at, updatedAt: r.updated_at || null
  });
  const mapNotice = (r) => ({
    id: r.id, title: r.title, cat: r.cat || '', important: !!r.important,
    date: r.created_at, updatedAt: r.updated_at || null, body: r.body || '', comments: []
  });
  const mapComment = (c) => ({ by: c.by_role, name: c.author_name, body: c.body, date: c.created_at });
  const mapPost = (r, comments) => ({ id: r.id, storeId: r.store_id, authorId: r.author_id || null, title: r.title, body: r.body || '', date: r.created_at, comments: comments || [] });
  const mapItem = (r) => ({ id: r.id, cat: r.cat, name: r.name, unit: r.unit || '', price: r.price, note: r.note || '상온', soldOut: !!r.sold_out });
  const mapManual = (r) => (r.kind === 'recipe'
    ? { id: r.id, title: r.title, desc: r.body || '' }
    : { id: r.id, label: r.title });

  /* 아이디 → Supabase Auth 이메일 매핑 (가상 도메인 @crunchs.kr)
     · 'yangsan01' → 'yangsan01@crunchs.kr'
     · '@' 가 포함된 입력은 이메일 그대로 사용 */
  const AUTH_DOMAIN = 'crunchs.kr';
  const toEmail = (idOrEmail) => {
    const v = String(idOrEmail == null ? '' : idOrEmail).trim().toLowerCase();
    if (!v) return '';
    return v.indexOf('@') >= 0 ? v : v + '@' + AUTH_DOMAIN;
  };

  const inviteReason = (reason) => {
    const table = {
      empty: '초대 코드를 입력해 주세요.',
      code_required: '초대 코드를 입력해 주세요.',
      not_found: '초대 코드를 찾을 수 없습니다. 코드를 다시 확인해 주세요.',
      used: '이미 사용된 초대 코드입니다. 본사에 새 코드를 요청해 주세요.',
      already_used: '이미 사용된 초대 코드입니다. 본사에 새 코드를 요청해 주세요.',
      expired: '사용 기간이 지난 초대 코드입니다. 본사에 새 코드를 요청해 주세요.',
      store_mismatch: '이 초대 코드는 다른 지점 전용입니다. 지점을 다시 확인해 주세요.',
      store_required: '가입할 지점을 선택해 주세요.',
      store_not_found: '선택한 지점을 찾을 수 없습니다. 본사에 문의해 주세요.',
      not_authenticated: '로그인 상태가 아닙니다. 다시 시도해 주세요.'
    };
    return table[String(reason == null ? '' : reason).toLowerCase()] || '초대 코드가 올바르지 않습니다.';
  };

  async function rows(query) {
    const { data, error } = await query;
    if (error) fail(error);
    return data || [];
  }
  async function one(query) {
    const { data, error } = await query;
    if (error) fail(error);
    return data;
  }
  const nextSort = async (table, filter) => {
    let q = client.from(table).select('sort');
    if (filter) q = filter(q);
    const data = await rows(q);
    return data.reduce((m, r) => Math.max(m, Number(r.sort) || 0), 0) + 1;
  };
  const removeMissing = async (table, keepIds) => {
    const existing = await rows(client.from(table).select('id'));
    const keep = keepIds.map(String);
    for (const r of existing) {
      if (keep.indexOf(String(r.id)) >= 0) continue;
      const { error } = await client.from(table).delete().eq('id', r.id);
      if (error) fail(error);
    }
  };

  async function loadComments(postIds) {
    if (!postIds.length) return {};
    const data = await rows(client.from('board_comments').select('*').in('post_id', postIds).order('created_at'));
    const map = {};
    data.forEach((c) => { (map[c.post_id] = map[c.post_id] || []).push(mapComment(c)); });
    return map;
  }

  async function listPostsWhere(storeId) {
    let q = client.from('board_posts').select('*').order('created_at', { ascending: false });
    if (storeId) q = client.from('board_posts').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    const data = await rows(q);
    const comments = await loadComments(data.map((p) => p.id));
    return data.map((p) => mapPost(p, comments[p.id]));
  }

  return {
    name: 'supabase',
    client,

    /* ======================================================================
       인증
       ====================================================================== */
    auth: {
      async signIn(idOrEmail, password) {
        const email = toEmail(idOrEmail);
        if (!email) throw new Error('아이디를 입력해 주세요.');
        const { error } = await client.auth.signInWithPassword({
          email,
          password: String(password == null ? '' : password)
        });
        if (error) {
          const raw = error.message || '';
          if (/invalid login/i.test(raw)) throw new Error('아이디 또는 비밀번호를 확인해 주세요.');
          if (/not confirmed/i.test(raw)) throw new Error('이메일 인증이 완료되지 않은 계정입니다. 본사에 문의해 주세요.');
          if (/rate limit|too many/i.test(raw)) throw new Error('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
          throw new Error('로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해 주세요.');
        }
        const profile = await this.currentProfile();
        if (!profile) {
          await client.auth.signOut();
          throw new Error('계정에 매장·권한 정보가 없습니다. 본사에 문의해 주세요.');
        }
        return profile;
      },
      async signOut() {
        await client.auth.signOut();
      },
      async session() {
        const { data } = await client.auth.getSession();
        return (data && data.session) || null;
      },
      async currentProfile() {
        const session = await this.session();
        if (!session) return null;
        const data = await one(client.from('profiles')
          .select('role,store_id,store_name,owner_name')
          .eq('id', session.user.id)
          .maybeSingle());
        if (!data) return null;
        return {
          role: data.role,
          storeId: data.store_id,
          storeName: data.store_name,
          ownerName: data.owner_name,
          email: session.user.email,
          userId: session.user.id
        };
      },

      /* 초대 코드 검증 (소바하지 않음) */
      async verifyInvite(code) {
        const { data, error } = await client.rpc('verify_invite_code', { p_code: String(code == null ? '' : code).trim() });
        if (error) fail(error);
        const row = Array.isArray(data) ? data[0] : data;
        return row || { valid: false, reason: 'not_found', allow_store_choice: false };
      },

      /* 가입 화면 지점 드롭다운 옵션 */
      async storeOptions() {
        const { data, error } = await client.rpc('list_store_options');
        if (error || !data) return [];
        return data.map((r) => ({ id: r.id, name: r.name }));
      },

      /* 초대 코드로 점주 가입 → 즉시 로그인 */
      async signUpWithInvite(input) {
        const code = String((input && input.code) || '').trim().toUpperCase();
        const ownerName = String((input && input.ownerName) || '').trim();
        const email = toEmail(input && (input.id || input.email));
        const password = String((input && input.password) || '');
        const storeId = String((input && input.storeId) || '').trim();

        if (!email) throw new Error('아이디를 입력해 주세요.');
        const check = await this.verifyInvite(code);
        if (!check.valid) throw new Error('유효하지 않거나 이미 사용된 초대 코드입니다.');
        if (check.allow_store_choice && !storeId) throw new Error('지점을 선택해 주세요.');
        if (!check.allow_store_choice && storeId && storeId !== check.store_id) {
          throw new Error('이 초대 코드는 「' + check.store_name + '」 전용입니다. 지점을 다시 확인해 주세요.');
        }

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              invite_code: code,
              store_id: storeId || (check.store_id || null),
              owner_name: ownerName
            }
          }
        });
        if (error) {
          const raw = error.message || '';
          if (/already registered|already exists|user already/i.test(raw)) throw new Error('이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.');
          if (/password/i.test(raw)) throw new Error('비밀번호는 6자 이상으로 입력해 주세요.');
          if (/invite_/i.test(raw)) throw new Error('유효하지 않거나 이미 사용된 초대 코드입니다.');
          throw new Error('유효하지 않거나 이미 사용된 초대 코드입니다. 코드를 확인해 주세요.');
        }
        if (!data || !data.session) {
          throw new Error('가입은 접수되었지만 이메일 인증이 필요합니다. 본사에 문의해 주세요.');
        }

        const profile = await this.currentProfile();
        if (!profile || !profile.storeId) {
          await client.auth.signOut();
          throw new Error('초대 코드 적용에 실패했습니다. 코드를 확인하거나 본사에 문의해 주세요.');
        }
        return profile;
      }
    },

    async init() { /* 세션은 signIn / persistSession 이 관리합니다. */ },

    /* ======================================================================
       발주
       ====================================================================== */
    async listOrders(storeId) {
      const data = await rows(client.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false }));
      return data.map(mapOrder);
    },
    async listAllOrders() {
      const data = await rows(client.from('orders').select('*').order('created_at', { ascending: false }));
      return data.map(mapOrder);
    },
    async createOrder(order) {
      const payload = {
        id: 'O-' + stamp() + '-' + String(Math.floor(Math.random() * 9000) + 1000),
        store_id: order.storeId,
        status: order.status || 'pending',
        memo: order.memo || '',
        items: (order.items || []).map((it) => ({
          id: it.id, name: it.name, unit: it.unit, price: Number(it.price) || 0, qty: Number(it.qty) || 0
        }))
      };
      const data = await one(client.from('orders').insert(payload).select().single());
      return mapOrder(data);
    },
    async updateOrderStatus(orderId, status) {
      const data = await one(client.from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId).select().single());
      return mapOrder(data);
    },

    /* ======================================================================
       공지
       ====================================================================== */
    async listNotices() {
      const data = await rows(client.from('notices').select('*')
        .order('important', { ascending: false })
        .order('created_at', { ascending: false }));
      return data.map(mapNotice);
    },
    async createNotice(notice) {
      const payload = {
        id: 'n-' + Date.now(),
        title: String(notice.title || '').trim(),
        cat: notice.cat || '',
        important: !!notice.important,
        body: notice.body || ''
      };
      if (!payload.title) throw new Error('공지 제목을 입력해 주세요.');
      const data = await one(client.from('notices').insert(payload).select().single());
      return mapNotice(data);
    },
    /* 본사(hq) 전용 — 공지 수정. RLS(notices_write_hq)가 hq 이외의 UPDATE를 0행 처리합니다. */
    async updateNotice(id, patch) {
      const p = patch || {};
      const body = { updated_at: new Date().toISOString() };
      if (p.title !== undefined) {
        const title = String(p.title == null ? '' : p.title).trim();
        if (!title) throw new Error('공지 제목을 입력해 주세요.');
        body.title = title;
      }
      const cat = p.category !== undefined ? p.category : p.cat;
      if (cat !== undefined) body.cat = String(cat == null ? '' : cat).trim();
      if (p.body !== undefined) body.body = String(p.body == null ? '' : p.body);
      const pinned = p.pinned !== undefined ? p.pinned : p.important;
      if (pinned !== undefined) body.important = !!pinned;
      const data = await one(client.from('notices').update(body).eq('id', id).select().maybeSingle());
      if (!data) throw new Error('공지를 수정하지 못했습니다. 본사 관리자 계정으로 다시 시도해 주세요.');
      return mapNotice(data);
    },
    /* 본사(hq) 전용 — 공지 삭제. notice_reads 는 ON DELETE CASCADE 로 함께 정리됩니다. */
    async deleteNotice(id) {
      const data = await rows(client.from('notices').delete().eq('id', id).select());
      if (!data.length) throw new Error('공지를 삭제하지 못했습니다. 본사 관리자 계정으로 다시 시도해 주세요.');
      return true;
    },
    async readState(storeId) {
      const data = await rows(client.from('notice_reads').select('notice_id').eq('store_id', storeId));
      return data.map((r) => r.notice_id);
    },
    async markNoticeRead(storeId, noticeId) {
      const { error } = await client.from('notice_reads')
        .upsert({ store_id: storeId, notice_id: noticeId }, { onConflict: 'store_id,notice_id', ignoreDuplicates: true });
      if (error) fail(error);
      return this.readState(storeId);
    },

    /* ======================================================================
       건의 게시판
       ====================================================================== */
    async listPosts(storeId) { return listPostsWhere(storeId); },
    async listAllPosts() { return listPostsWhere(null); },
    async createPost(post) {
      const payload = {
        id: 'p-' + Date.now(),
        store_id: post.storeId,
        title: String(post.title || '').trim(),
        body: String(post.body || '').trim()
      };
      if (!payload.title) throw new Error('제목을 입력해 주세요.');
      /* author_id 는 DB 기본값(auth.uid())으로 채워집니다. */
      const data = await one(client.from('board_posts').insert(payload).select().single());
      return mapPost(data, []);
    },
    /* 본사(hq) 전용 — 건의 글 삭제. board_comments 는 ON DELETE CASCADE 로 함께 정리됩니다. */
    async deleteBoardPost(id) {
      const data = await rows(client.from('board_posts').delete().eq('id', id).select());
      if (!data.length) throw new Error('글을 삭제하지 못했습니다. 본사 관리자 계정으로 다시 시도해 주세요.');
      return true;
    },
    async addComment(postId, comment) {
      const payload = {
        post_id: postId,
        by_role: comment.by || 'owner',
        author_name: comment.name || '',
        body: String(comment.body || '').trim()
      };
      if (!payload.body) throw new Error('댓글 내용을 입력해 주세요.');
      const { error } = await client.from('board_comments').insert(payload);
      if (error) fail(error);
      const data = await one(client.from('board_posts').select('*').eq('id', postId).maybeSingle());
      return data ? mapPost(data, []) : null;
    },

    /* ======================================================================
       가맹 상담 접수 (본사 전용 조회)
       ====================================================================== */
    async listApplications() {
      const data = await rows(client.from('franchise_applications')
        .select('*').order('created_at', { ascending: false }).limit(200));
      return data.map((r) => ({
        id: r.id, name: r.name, phone: r.phone, region: r.region || '',
        memo: r.memo || '', receiptNo: r.receipt_no || '', date: r.created_at
      }));
    },

    /* ======================================================================
       초대 코드 (본사 전용 관리)
       ====================================================================== */
    async listInviteCodes() {
      const data = await rows(client.from('invite_codes').select('*').order('created_at', { ascending: false }).limit(200));
      return data.map((r) => ({
        code: r.code, storeId: r.store_id, storeName: r.store_name,
        usedBy: r.used_by, usedAt: r.used_at, expiresAt: r.expires_at, createdAt: r.created_at
      }));
    },
    async createInviteCode(input) {
      const payload = input || {};
      const allowChoice = !!payload.allowChoice;
      const storeId = String(payload.storeId == null ? '' : payload.storeId).trim();
      let storeName = String(payload.storeName == null ? '' : payload.storeName).trim();

      const stores = await rows(client.from('stores').select('id,name'));
      if (!allowChoice) {
        if (!storeId) throw new Error('초대할 지점을 선택해 주세요.');
        const target = stores.filter((s) => s.id === storeId)[0];
        if (!target) throw new Error('지점을 찾을 수 없습니다.');
        storeName = target.name;
      } else {
        storeName = '';
      }

      let code = String(payload.code == null ? '' : payload.code).trim().toUpperCase();
      if (code && !/^[A-Z0-9-]{4,24}$/.test(code)) {
        throw new Error('코드는 영문 대문자·숫자·하이픈 4~24자로 입력해 주세요.');
      }
      const days = Math.max(1, Math.min(365, Number(payload.days) || 14));

      if (!code) {
        let tries = 0;
        do {
          code = 'CRUNCHS-' + Math.random().toString(36).slice(2, 6).toUpperCase();
          tries += 1;
        } while (tries < 6 && (await this.listInviteCodes()).some((c) => c.code === code));
      }

      const session = await this.auth.session();
      const { error } = await client.from('invite_codes').insert({
        code,
        store_id: allowChoice ? null : storeId,
        store_name: allowChoice ? null : storeName,
        expires_at: new Date(Date.now() + days * 86400000).toISOString(),
        created_by: session ? session.user.id : null
      });
      if (error) {
        if (/duplicate key/i.test(error.message || '')) throw new Error('이미 같은 코드가 있습니다. 다른 코드를 사용해 주세요.');
        fail(error);
      }
      return this.listInviteCodes();
    },
    async deleteInviteCode(code) {
      const { error } = await client.from('invite_codes').delete().eq('code', code);
      if (error) fail(error);
      return this.listInviteCodes();
    },

    /* ======================================================================
       발주 카테고리 (본사 편집)
       ====================================================================== */
    async listCategories() {
      const data = await rows(client.from('categories').select('name').order('sort'));
      return data.map((c) => c.name);
    },
    async createCategory(name) {
      const next = String(name == null ? '' : name).trim();
      if (!next) throw new Error('카테고리 이름을 입력해 주세요.');
      if (next.length > 20) throw new Error('카테고리 이름은 20자 이내로 입력해 주세요.');
      const cats = await this.listCategories();
      if (cats.indexOf(next) >= 0) throw new Error('이미 등록된 카테고리입니다.');
      const sort = await nextSort('categories');
      const { error } = await client.from('categories').insert({ id: next, name: next, sort });
      if (error) fail(error);
      return this.listCategories();
    },
    async updateCategory(oldName, newName) {
      const next = String(newName == null ? '' : newName).trim();
      if (!next) throw new Error('카테고리 이름을 입력해 주세요.');
      if (next.length > 20) throw new Error('카테고리 이름은 20자 이내로 입력해 주세요.');
      const cats = await this.listCategories();
      if (cats.indexOf(oldName) < 0) throw new Error('카테고리를 찾을 수 없습니다.');
      if (next === oldName) return cats;
      if (cats.indexOf(next) >= 0) throw new Error('이미 등록된 카테고리입니다.');
      // 기본키(id)를 바꾸면 catalog_items.cat 이 ON UPDATE CASCADE 로 함께 옮겨집니다.
      const { error } = await client.from('categories').update({ id: next, name: next }).eq('id', oldName);
      if (error) fail(error);
      return this.listCategories();
    },
    async deleteCategory(name, options) {
      const opts = options || {};
      const cats = await this.listCategories();
      if (cats.indexOf(name) < 0) throw new Error('카테고리를 찾을 수 없습니다.');
      if (cats.length <= 1) throw new Error('카테고리는 최소 1개가 필요합니다.');
      const affected = await rows(client.from('catalog_items').select('id').eq('cat', name));
      if (affected.length) {
        if (opts.mode === 'move') {
          if (!opts.to || opts.to === name || cats.indexOf(opts.to) < 0) throw new Error('품목을 옮길 카테고리를 선택해 주세요.');
          const { error } = await client.from('catalog_items').update({ cat: opts.to }).eq('cat', name);
          if (error) fail(error);
        } else if (opts.mode === 'delete') {
          const { error } = await client.from('catalog_items').delete().eq('cat', name);
          if (error) fail(error);
        } else {
          throw new Error('품목 처리 방식을 선택해 주세요.');
        }
      }
      const { error } = await client.from('categories').delete().eq('id', name);
      if (error) fail(error);
      return { categories: await this.listCategories(), removedItems: affected.length };
    },

    /* ======================================================================
       발주 품목 (본사 편집)
       ====================================================================== */
    async listItems() {
      const data = await rows(client.from('catalog_items').select('*').order('sort'));
      return data.map(mapItem);
    },
    async createItem(data) {
      const payload = data || {};
      const cats = await this.listCategories();
      const name = String(payload.name == null ? '' : payload.name).trim();
      const cat = String(payload.cat == null ? '' : payload.cat).trim();
      if (cats.indexOf(cat) < 0) throw new Error('카테고리를 선택해 주세요.');
      if (!name) throw new Error('품목명을 입력해 주세요.');
      const price = Number(payload.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('단가를 0원 이상 숫자로 입력해 주세요.');
      const sort = await nextSort('catalog_items');
      const record = {
        id: uid('it'), cat, name,
        unit: String(payload.unit == null ? '' : payload.unit).trim(),
        price, note: payload.note || '상온', sold_out: !!payload.soldOut, sort
      };
      const row = await one(client.from('catalog_items').insert(record).select().single());
      return mapItem(row);
    },
    async updateItem(id, patch) {
      const p = patch || {};
      const body = { updated_at: new Date().toISOString() };
      if (p.cat !== undefined) {
        const cats = await this.listCategories();
        if (cats.indexOf(p.cat) < 0) throw new Error('카테고리를 선택해 주세요.');
        body.cat = p.cat;
      }
      if (p.name !== undefined) {
        const n = String(p.name).trim();
        if (!n) throw new Error('품목명을 입력해 주세요.');
        body.name = n;
      }
      if (p.unit !== undefined) body.unit = String(p.unit == null ? '' : p.unit).trim();
      if (p.price !== undefined) body.price = Math.max(0, Number(p.price) || 0);
      if (p.note !== undefined) body.note = p.note || '상온';
      if (p.soldOut !== undefined) body.sold_out = !!p.soldOut;
      const row = await one(client.from('catalog_items').update(body).eq('id', id).select().single());
      return mapItem(row);
    },
    async deleteItem(id) {
      const data = await rows(client.from('catalog_items').delete().eq('id', id).select());
      if (!data.length) throw new Error('품목을 찾을 수 없습니다.');
      return this.listItems();
    },
    async setItemSoldOut(id, soldOut) {
      return this.updateItem(id, { soldOut: !!soldOut });
    },

    /* ======================================================================
       매뉴얼 · 체크리스트
       ====================================================================== */
    async getManuals() {
      const data = await rows(client.from('manual_items').select('*').order('sort'));
      const out = { recipe: [], open: [], close: [] };
      data.forEach((r) => { if (out[r.kind]) out[r.kind].push(mapManual(r)); });
      return out;
    },
    async createManualItem(group, data) {
      if (['recipe', 'open', 'close'].indexOf(group) < 0) throw new Error('매뉴얼 구분이 올바르지 않습니다.');
      const payload = data || {};
      const isRecipe = group === 'recipe';
      const raw = isRecipe ? payload.title : payload.label;
      const title = String(raw == null ? '' : raw).trim();
      if (!title) throw new Error(isRecipe ? '단계 제목을 입력해 주세요.' : '체크 항목을 입력해 주세요.');
      const sort = await nextSort('manual_items', (q) => q.eq('kind', group));
      const record = {
        id: uid(isRecipe ? 'r' : (group === 'open' ? 'o' : 'c')),
        kind: group, title,
        body: isRecipe ? String(payload.desc == null ? '' : payload.desc).trim() : null,
        sort
      };
      const row = await one(client.from('manual_items').insert(record).select().single());
      return mapManual(row);
    },
    async updateManualItem(group, id, patch) {
      if (['recipe', 'open', 'close'].indexOf(group) < 0) throw new Error('매뉴얼 구분이 올바르지 않습니다.');
      const p = patch || {};
      const isRecipe = group === 'recipe';
      const body = {};
      if (isRecipe) {
        if (p.title !== undefined) {
          const t = String(p.title || '').trim();
          if (!t) throw new Error('단계 제목을 입력해 주세요.');
          body.title = t;
        }
        if (p.desc !== undefined) body.body = String(p.desc == null ? '' : p.desc).trim();
      } else if (p.label !== undefined) {
        const l = String(p.label || '').trim();
        if (!l) throw new Error('체크 항목을 입력해 주세요.');
        body.title = l;
      }
      const row = await one(client.from('manual_items').update(body).eq('id', id).eq('kind', group).select().single());
      return mapManual(row);
    },
    async deleteManualItem(group, id) {
      const data = await rows(client.from('manual_items').delete().eq('id', id).eq('kind', group).select());
      if (!data.length) throw new Error('항목을 찾을 수 없습니다.');
      // 삭제된 항목의 체크 상태 정리 (매장별 + 본사)
      const { error } = await client.from('checklists').delete().eq('item_key', id);
      if (error) fail(error);
      const manuals = await this.getManuals();
      return manuals[group];
    },
    async listChecklists() {
      const manuals = await this.getManuals();
      return { open: manuals.open, close: manuals.close };
    },
    async createChecklistItem(group, data) { return this.createManualItem(group, data); },
    async updateChecklistItem(group, id, patch) { return this.updateManualItem(group, id, patch); },
    async deleteChecklistItem(group, id) { return this.deleteManualItem(group, id); },

    /* ======================================================================
       설정 백업 · 복원 · 초기화
       ====================================================================== */
    async exportConfig() {
      return {
        app: 'crunchs-portal',
        version: 2,
        exportedAt: new Date().toISOString(),
        categories: await this.listCategories(),
        items: await this.listItems(),
        manuals: await this.getManuals()
      };
    },
    async importConfig(payload) {
      let data = payload;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { throw new Error('JSON 형식이 올바르지 않습니다.'); }
      }
      if (!data || typeof data !== 'object') throw new Error('가져올 설정 데이터가 비어 있습니다.');
      if (!Array.isArray(data.categories) || !data.categories.length) throw new Error('categories 배열이 필요합니다.');
      if (!Array.isArray(data.items)) throw new Error('items 배열이 필요합니다.');
      if (!data.manuals || typeof data.manuals !== 'object') throw new Error('manuals 객체가 필요합니다.');

      const categories = [];
      data.categories.forEach((raw) => {
        const name = String(raw == null ? '' : raw).trim();
        if (name && categories.indexOf(name) < 0) categories.push(name);
      });
      if (!categories.length) throw new Error('유효한 카테고리가 없습니다.');

      const items = data.items.map((raw, i) => {
        const it = raw || {};
        const cat = String(it.cat == null ? '' : it.cat).trim();
        const name = String(it.name == null ? '' : it.name).trim();
        if (!cat || !name) throw new Error('items[' + i + ']에 카테고리(cat) 또는 품목명(name)이 없습니다.');
        if (categories.indexOf(cat) < 0) categories.push(cat);
        return {
          id: String(it.id == null ? '' : it.id).trim() || ('it-import-' + i),
          cat, name,
          unit: String(it.unit == null ? '' : it.unit).trim(),
          price: Math.max(0, Number(it.price) || 0),
          note: it.note || '상온',
          sold_out: !!it.soldOut,
          sort: i + 1
        };
      });

      const manuals = { recipe: [], open: [], close: [] };
      ['recipe', 'open', 'close'].forEach((group) => {
        const list = Array.isArray(data.manuals[group]) ? data.manuals[group] : [];
        manuals[group] = list.map((raw, i) => {
          const m = raw || {};
          if (group === 'recipe') {
            const title = String(m.title == null ? '' : m.title).trim();
            if (!title) throw new Error('manuals.recipe[' + i + ']에 제목(title)이 없습니다.');
            return { id: String(m.id || ('r-import-' + i)), kind: 'recipe', title, body: String(m.desc == null ? '' : m.desc).trim(), sort: i + 1 };
          }
          const label = String(m.label == null ? '' : m.label).trim();
          if (!label) throw new Error('manuals.' + group + '[' + i + ']에 항목(label)이 없습니다.');
          return { id: String(m.id || (group.charAt(0) + '-import-' + i)), kind: group, title: label, body: null, sort: i + 1 };
        });
      });

      /* 적용: 카테고리 → 품목 → 매뉴얼 순서로 upsert 하고, 빠진 항목은 삭제합니다. */
      for (let i = 0; i < categories.length; i++) {
        const { error } = await client.from('categories').upsert({ id: categories[i], name: categories[i], sort: i + 1 }, { onConflict: 'id' });
        if (error) fail(error);
      }
      if (items.length) {
        const { error } = await client.from('catalog_items').upsert(items, { onConflict: 'id' });
        if (error) fail(error);
      }
      await removeMissing('catalog_items', items.map((it) => it.id));
      await removeMissing('categories', categories);
      const manualRows = [].concat(manuals.recipe, manuals.open, manuals.close);
      if (manualRows.length) {
        const { error } = await client.from('manual_items').upsert(manualRows, { onConflict: 'id' });
        if (error) fail(error);
      }
      await removeMissing('manual_items', manualRows.map((m) => m.id));

      return {
        categories: categories.length,
        items: items.length,
        manuals: manuals.recipe.length + manuals.open.length + manuals.close.length
      };
    },
    async resetConfig() {
      await this.importConfig({
        categories: DEFAULT_CATEGORIES.slice(),
        items: DEFAULT_CATALOG.map((it) => ({ ...it })),
        manuals: {
          recipe: DEFAULT_MANUALS.recipe.map((m) => ({ ...m })),
          open: DEFAULT_MANUALS.open.map((m) => ({ ...m })),
          close: DEFAULT_MANUALS.close.map((m) => ({ ...m }))
        }
      });
      const { error } = await client.from('checklists').delete().neq('store_id', '');
      if (error) fail(error);
      return this.exportConfig();
    },

    /* ======================================================================
       매뉴얼 체크리스트 (매장별 체크 상태)
       ====================================================================== */
    async getChecklist(storeId) {
      const data = await rows(client.from('checklists').select('item_key,checked').eq('store_id', storeId));
      const state = {};
      data.forEach((r) => { state[r.item_key] = !!r.checked; });
      return state;
    },
    async toggleChecklist(storeId, key) {
      const state = await this.getChecklist(storeId);
      const next = !state[key];
      const { error } = await client.from('checklists')
        .upsert({ store_id: storeId, item_key: key, checked: next, updated_at: new Date().toISOString() },
                { onConflict: 'store_id,item_key' });
      if (error) fail(error);
      state[key] = next;
      return state;
    }
  };
})();

/* 데이터 소스: Supabase (실서비스) */
const DB = SupabaseAdapter;

window.CRUNCHS = { DB, CATALOG, CATEGORIES, DEFAULT_CATALOG, DEFAULT_CATEGORIES, DEFAULT_MANUALS, ORDER_STATUS, STORE_PROFILES };
