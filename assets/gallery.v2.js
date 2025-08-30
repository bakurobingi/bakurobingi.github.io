/* ===== gallery-only patch（只在画廊页生效，统一为一套分页） ===== */
(function () {
  // 只在画廊页执行（存在图片网格即可）
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  // 兼容两种你的写法：year-list / year-bar，tag-list / tag-bar
  const yearUI = document.getElementById('year-list') || document.getElementById('year-bar');
  const tagUI  = document.getElementById('tag-list')  || document.getElementById('tag-bar');

  // 唯一的分页控件（必须在 gallery.html 里存在）
  const prevBtn  = document.getElementById('prev-page');
  const nextBtn  = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  // 如果标签区域里曾被旧代码渲染过“分页”，这里直接清掉
  if (tagUI) {
    tagUI.querySelectorAll('.pager,.pagination,[id^="prev-"],[id^="next-"]').forEach(el => el.remove());
  }

  let allItems = [];
  let currentYear = 'all';
  let currentTag  = 'all';
  let currentPage = 1;
  const PAGE_SIZE = 18; // ← 每页几张，改这里

  // 小卡片模板（按你现有字段：thumb/full/title/desc/year/tags）
  function card(it) {
    const title = it.title || '';
    const desc  = it.desc  || '';
    const alt   = title || desc || '';
    return `
      <div class="card">
        <a href="${it.full}" target="_blank" rel="noopener">
          <img src="${it.thumb}" alt="${alt}">
        </a>
        ${desc ? `<div class="desc">${desc}</div>` : ``}
      </div>
    `;
  }

  function buildYears(items) {
    if (!yearUI) return;
    const years = Array.from(new Set(items.map(i => i.year))).filter(Boolean).sort((a,b)=>b-a);
    yearUI.innerHTML =
      `<button class="chip ${currentYear==='all'?'active':''}" data-year="all">全部</button>` +
      years.map(y => `<button class="chip ${String(y)===String(currentYear)?'active':''}" data-year="${y}">${y}</button>`).join('');
  }

  function buildTags(items) {
    if (!tagUI) return;
    const tags = Array.from(new Set(items.flatMap(i => i.tags || []))).sort((a,b)=>a.localeCompare(b,'zh'));
    tagUI.innerHTML =
      `<button class="chip ${currentTag==='all'?'active':''}" data-tag="all">全部</button>` +
      tags.map(t => `<button class="chip ${t===currentTag?'active':''}" data-tag="${t}">${t}</button>`).join('');
  }

  // 绑定筛选点击（只负责切换条件，不渲染任何分页）
  yearUI && yearUI.addEventListener('click', e => {
    const btn = e.target.closest('button[data-year]');
    if (!btn) return;
    currentYear = btn.dataset.year;
    currentPage = 1;
    // 高亮
    yearUI.querySelectorAll('button').forEach(b => b.classList.toggle('active', b===btn));
    render();
  });

  tagUI && tagUI.addEventListener('click', e => {
    const btn = e.target.closest('button[data-tag]');
    if (!btn) return;
    currentTag = btn.dataset.tag;
    currentPage = 1;
    tagUI.querySelectorAll('button').forEach(b => b.classList.toggle('active', b===btn));
    render();
  });

  function filtered() {
    let list = allItems;
    if (currentYear !== 'all') list = list.filter(i => String(i.year) === String(currentYear));
    if (currentTag  !== 'all') list = list.filter(i => (i.tags || []).includes(currentTag));
    return list;
  }

  function render() {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const items = list.slice(start, start + PAGE_SIZE);

    grid.innerHTML = items.map(card).join('');
    if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页 • 共 ${list.length} 张`;
    if (prevBtn)  prevBtn.disabled = currentPage <= 1;
    if (nextBtn)  nextBtn.disabled = currentPage >= totalPages;
  }

  prevBtn && (prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; render(); } });
  nextBtn && (nextBtn.onclick = () => {
    const totalPages = Math.max(1, Math.ceil(filtered().length / PAGE_SIZE));
    if (currentPage < totalPages) { currentPage++; render(); }
  });

  // 初始化
  fetch('assets/galleryList.json')
    .then(r => r.json())
    .then(items => {
      allItems = Array.isArray(items) ? items : [];
      buildYears(allItems);
      buildTags(allItems);
      render();
    })
    .catch(err => {
      console.error('galleryList 加载失败：', err);
      grid.innerHTML = '<p>画廊加载失败</p>';
    });
})();
