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
  { id: 'gimhae', name: '김해점', owner: '김해점 점주', region: '경남 김해시' },
  { id: 'pohang', name: '포항점', owner: '포항점 점주', region: '경북 포항시' }
];

/* ---------- 발주 카탈로그 기본값 (데모 단가) ----------
   실제 화면은 localStorage에 저장된 값을 쓰고, 아래는 최초 시드·초기화용 기본값입니다.
   (본사 관리자 → 관리자 설정에서 추가·수정·삭제한 내용이 이 기본값을 대체합니다.) */
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
   Supabase 어댑터 (연동 지점) — 아래를 채우고 파일 끝 DB 한 줄을 바꾸면 전환 완료
   --------------------------------------------------------------------------
   1) <head>에 CDN 추가:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   2) SUPABASE_URL / SUPABASE_ANON_KEY 채우기
   3) 아래 SQL로 테이블 생성 (RLS는 매장 단위로 제한)

      create table stores (id text primary key, name text not null, owner text, region text);
      create table orders (
        id text primary key, store_id text references stores(id), status text not null default 'pending',
        memo text, items jsonb not null, created_at timestamptz default now(), updated_at timestamptz
      );
      create table notices (
        id text primary key, title text not null, category text, important boolean default false,
        body text, created_at timestamptz default now()
      );
      create table posts (
        id text primary key, store_id text references stores(id), title text, body text,
        created_at timestamptz default now()
      );
      create table comments (
        id bigint generated always as identity primary key, post_id text references posts(id) on delete cascade,
        author_name text, author_role text, body text, created_at timestamptz default now()
      );
      create table checklists (store_id text, item_key text, checked boolean default false, primary key (store_id, item_key));

      -- 관리자 편집(카테고리·품목·매뉴얼) 테이블
      create table categories (
        id text primary key, name text not null unique, sort int default 0, created_at timestamptz default now()
      );
      create table catalog_items (
        id text primary key, category_id text references categories(id) on delete restrict,
        name text not null, unit text, price int not null default 0,
        storage text default '상온',          -- 냉동 / 냉장 / 상온 / 소모품
        sold_out boolean default false,
        created_at timestamptz default now(), updated_at timestamptz
      );
      create table manual_items (
        id text primary key, kind text not null check (kind in ('recipe','open','close')),
        title text, body text, sort int default 0, created_at timestamptz default now()
      );

      -- RLS 예시: 카테고리·품목·매뉴얼은 본사(hq)만 쓰기, 전 매장 읽기
      -- alter table catalog_items enable row level security;
      -- create policy catalog_read on catalog_items for select using (true);
      -- create policy catalog_write on catalog_items for all
      --   using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'hq');
   ========================================================================== */
const SupabaseAdapter = (() => {
  // const { createClient } = supabase;
  // const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const notReady = () => Promise.reject(new Error('Supabase 어댑터가 아직 연결되지 않았습니다.'));

  /* 관리자 편집 기능을 Supabase로 옮길 때의 구현 방향
     - listCategories  : client.from('categories').select('id,name').order('sort')
     - createCategory  : client.from('categories').insert({ id: slug(name), name, sort })
     - updateCategory  : categories.update({name}) + catalog_items.update({category_id}) 트랜잭션(RPC 권장)
     - deleteCategory  : 옵션에 따라 catalog_items의 category_id를 옮기거나 delete 후 categories.delete()
     - listItems       : client.from('catalog_items').select('*').order('sort')
     - createItem/updateItem/deleteItem : catalog_items insert/update/delete
     - setItemSoldOut  : catalog_items.update({ sold_out })
     - getManuals      : manual_items.select('*') 후 kind별 그룹화
     - create/update/deleteManualItem : manual_items insert/update/delete
     - export/import/resetConfig : 위 테이블들을 읽어 JSON으로 묶거나, upsert/delete 후 재삽입 (RPC 권장)
     - 쓰기 권한은 RLS에서 role='hq'로 제한하고, 점주는 select만 허용. */

  return {
    name: 'supabase',
    async init() { /* 세션 확인: const { data } = await client.auth.getSession(); */ },
    listOrders: notReady,
    listAllOrders: notReady,
    createOrder: notReady,
    updateOrderStatus: notReady,
    listNotices: notReady,
    createNotice: notReady,
    readState: notReady,
    markNoticeRead: notReady,
    listPosts: notReady,
    listAllPosts: notReady,
    createPost: notReady,
    addComment: notReady,
    getChecklist: notReady,
    toggleChecklist: notReady,
    /* 관리자 편집 */
    listCategories: notReady,
    createCategory: notReady,
    updateCategory: notReady,
    deleteCategory: notReady,
    listItems: notReady,
    createItem: notReady,
    updateItem: notReady,
    deleteItem: notReady,
    setItemSoldOut: notReady,
    getManuals: notReady,
    createManualItem: notReady,
    updateManualItem: notReady,
    deleteManualItem: notReady,
    listChecklists: notReady,
    createChecklistItem: notReady,
    updateChecklistItem: notReady,
    deleteChecklistItem: notReady,
    exportConfig: notReady,
    importConfig: notReady,
    resetConfig: notReady
  };
})();

/* 데이터 소스 전환: localStorage → Supabase 로 옮길 때 이 한 줄만 변경 */
const DB = LocalAdapter;

window.CRUNCHS = { DB, CATALOG, CATEGORIES, DEFAULT_CATALOG, DEFAULT_CATEGORIES, DEFAULT_MANUALS, ORDER_STATUS, STORE_PROFILES };
