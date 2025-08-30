// --------------- 公共安全加载 JSON ---------------
async function safeFetchJSON(url, fallback = {}) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.statusText);
    return await r.json();
  } catch (e) {
    console.error("加载失败", url, e);
    return fallback;
  }
}

// ============ 日记部分 ============
safeFetchJSON("assets/diaryList.json", {}).then(mapping => {
  const nav = document.querySelector(".diary-nav");
  if (!nav) return;

  // 按年份分组
  const groups = {};
  for (const [title, meta] of Object.entries(mapping)) {
    const year = (meta.date || "").slice(0, 4) || "未分类";
    if (!groups[year]) groups[year] = [];
    groups[year].push({ title, ...meta });
  }

  // 年份排序（倒序）
  const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  nav.innerHTML = years.map(y => {
    const items = groups[y]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map(it => `<div><a href="${it.file}" target="content">${it.title}</a></div>`)
      .join("");
    return `<details><summary>${y} 年 (${groups[y].length})</summary>${items}</details>`;
  }).join("");
});

// ============ 画廊部分 ============
let allItems = [];
let currentYear = 'all';
let currentTag = 'all';
let currentPage = 1;
const PAGE_SIZE = 18; // 每页显示张数

const grid     = document.getElementById('gallery-grid');
const tagList  = document.getElementById('tag-list');
const yearList = document.getElementById('year-list');

const prevBtn  = document.getElementById('prev-page');
const nextBtn  = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

function renderCard(it) {
  return `
    <div class="card">
      <a href="${it.full}" target="_blank">
        <img src="${it.thumb}" alt="${it.title || ''}">
      </a>
      <div class="desc">${it.desc || ''}</div>
    </div>
  `;
}

// 渲染年份按钮
function renderYears(items) {
  const years = Array.from(new Set(items.map(it => it.year))).sort((a, b) => b - a);
  yearList.innerHTML =
    `<button class="chip ${currentYear === 'all' ? 'active' : ''}" data-year="all">全部</button>` +
    years.map(y =>
      `<button class="chip ${currentYear === String(y) ? 'active' : ''}" data-year="${y}">${y}</button>`
    ).join('');
}
yearList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-year]');
  if (!btn) return;
  currentYear = btn.dataset.year;
  currentPage = 1;
  renderGallery();
});

// 渲染标签按钮（不渲染分页）
function renderTags(items) {
  const allTags = Array.from(new Set(
    items.flatMap(it => it.tags || [])
  )).sort((a, b) => a.localeCompare(b, 'zh'));

  tagList.innerHTML =
    `<button class="chip ${currentTag === 'all' ? 'active' : ''}" data-tag="all">全部</button>` +
    allTags.map(t =>
      `<button class="chip ${currentTag === t ? 'active' : ''}" data-tag="${t}">${t}</button>`
    ).join('');
}
tagList.addEventListener('click', e => {
  const btn = e.target.closest('button[data-tag]');
  if (!btn) return;
  currentTag = btn.dataset.tag;
  currentPage = 1;
  renderGallery();
});

// 过滤数据
function getFiltered() {
  let list = allItems;
  if (currentYear !== 'all') list = list.filter(it => String(it.year) === String(currentYear));
  if (currentTag !== 'all') list = list.filter(it => (it.tags || []).includes(currentTag));
  return list;
}

// 渲染画廊 + 分页
function renderGallery() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  grid.innerHTML = pageItems.map(renderCard).join('');
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页 • 共 ${filtered.length} 张`;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderGallery(); } };
nextBtn.onclick = () => {
  const totalPages = Math.ceil(getFiltered().length / PAGE_SIZE);
  if (currentPage < totalPages) { currentPage++; renderGallery(); }
};

// 初始化
safeFetchJSON("assets/galleryList.json", []).then(items => {
  allItems = items;
  renderYears(allItems);
  renderTags(allItems);
  renderGallery();
});
