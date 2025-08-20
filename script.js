/* =============== 画廊：分类 + 分页 + Lightbox =============== */
let galleryItems = [];      // 全量
let filteredItems = [];     // 筛选后
let currentIndex = 0;       // 当前大图索引（在 filteredItems 上）
let currentYear = '全部';   // 当前年份筛选
let currentPage = 1;        // 当前页
const PAGE_SIZE = 18;       // 每页条数

function initGallery() {
  const grid = document.getElementById("gallery-grid");
  const filterBar = document.getElementById("filter-bar");
  const pagination = document.getElementById("pagination");
  if (!grid || !filterBar) return; // 不在画廊页就直接跳过

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      galleryItems = items;

      // 生成年份按钮
      const years = Array.from(new Set(items.map(i => i.year))).filter(Boolean).sort((a,b)=>b-a);
      buildYearFilters(['全部', ...years]);

      applyFilter('全部');

      // 分页按钮
      const prevBtn = document.getElementById("prev-page");
      const nextBtn = document.getElementById("next-page");
      prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(); } };
      nextBtn.onclick = () => {
        const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
        if (currentPage < totalPages) { currentPage++; renderPage(); }
      };
    })
    .catch(err => {
      console.error("加载画廊失败:", err);
      grid.innerHTML = "<p>画廊加载失败</p>";
      if (pagination) pagination.style.display = "none";
    });
}

function buildYearFilters(list) {
  const bar = document.getElementById("filter-bar");
  bar.innerHTML = "";
  list.forEach(year => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (year === currentYear ? " active" : "");
    btn.textContent = year;
    btn.onclick = () => applyFilter(year);
    bar.appendChild(btn);
  });
}

function applyFilter(year) {
  currentYear = year;
  currentPage = 1;
  filteredItems = (year === '全部') ? [...galleryItems] : galleryItems.filter(i => i.year === Number(year));
  // 高亮按钮
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === year);
  });
  renderPage();
}

function renderPage() {
  const grid = document.getElementById("gallery-grid");
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredItems.slice(start, start + PAGE_SIZE);

  grid.innerHTML = "";
  pageData.forEach((item, idx) => {
    const img = document.createElement("img");
    img.src = item.thumb;
    img.alt = item.title || "";
    img.loading = "lazy";
    const realIndex = start + idx;
    img.onclick = () => openImage(realIndex);
    grid.appendChild(img);
  });

  if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页 · 共 ${total} 张`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function openImage(index) {
  currentIndex = index;
  const item = filteredItems[index];
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  if (!item || !lightbox || !img) return;

  img.src = item.full;
  if (caption) caption.textContent = item.title + (item.desc ? " - " + item.desc : "");
  lightbox.style.display = "flex";
}
function prevImage() {
  if (!filteredItems.length) return;
  currentIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
  openImage(currentIndex);
}
function nextImage() {
  if (!filteredItems.length) return;
  currentIndex = (currentIndex + 1) % filteredItems.length;
  openImage(currentIndex);
}
// 点击遮罩关闭
document.addEventListener("click", e => {
  const lightbox = document.getElementById("lightbox");
  if (e.target === lightbox) lightbox.style.display = "none";
});
// 键盘快捷键
document.addEventListener("keydown", e => {
  const lightbox = document.getElementById("lightbox");
  if (lightbox && lightbox.style.display === "flex") {
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "Escape") lightbox.style.display = "none";
  }
});

/* ================== 日记：自动导航 ================== */
function initDiary() {
  const el = document.getElementById("diary-list");
  if (!el) return; // 不在日记页就跳过
  fetch("assets/diaryList.json")
    .then(res => res.json())
    .then(data => {
      el.innerHTML = "";
      for (const [title, file] of Object.entries(data)) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = title;
        a.onclick = () => loadDiary(file);
        li.appendChild(a);
        el.appendChild(li);
      }
    });
}
function loadDiary(filename) {
  const content = document.getElementById("diary-content");
  if (!content) return;

  fetch(`assets/diary/${filename}`)
    .then(res => { if (!res.ok) throw new Error("not found"); return res.text(); })
    .then(html => {
      // 1) 先放进容器
      content.innerHTML = html;

      // 2) 清理：移除内联样式 & font 标签，避免污染
      const scope = content; // 只处理日记区域
      // 移除 style 属性
      scope.querySelectorAll("[style]").forEach(el => el.removeAttribute("style"));
      // 移除 <font> 这类过时标签（保留内容）
      scope.querySelectorAll("font").forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });
      // 可选：把 H1 降级成 H2，层级更稳
      scope.querySelectorAll("h1").forEach(h1 => {
        const h2 = document.createElement("h2");
        h2.innerHTML = h1.innerHTML;
        h1.replaceWith(h2);
      });
    })
    .catch(() => content.innerHTML = "<p>暂无内容。</p>");
}

/* ================== 页面入口 ================== */
document.addEventListener("DOMContentLoaded", () => {
  initGallery(); // gallery.html 自动生效
  initDiary();   // diary.html 自动生效
});
