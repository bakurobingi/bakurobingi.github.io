/* =========================================================
 * 入口：根据页面存在的元素决定初始化哪些功能
 * =======================================================*/
document.addEventListener("DOMContentLoaded", () => {
  initGallery();  // 画廊（gallery.html）
  initDiary();    // 日记（diary.html）
});

/* =========================================================
 * 通用：更友好的 fetch JSON（失败时显示可见错误）
 * =======================================================*/
function safeFetchJSON(url, onOK, mountId) {
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return r.json();
    })
    .then(onOK)
    .catch(err => {
      console.error("加载失败:", err);
      const m = document.getElementById(mountId);
      if (m) m.innerHTML = `<p style="color:#c00">加载失败：${url}<br>${String(err)}</p>`;
    });
}

/* =========================================================
 * 日记：左侧列表 + 加载正文（“洗白”内联样式、统一字号）
 * 需要：#diary-list（左侧）、#diary-content（右侧）
 *      assets/diaryList.json 形如：
 *      { "2024-03-31": "2024-03-31.html", "2023-12-31": "2023-12-31.html" }
 *      片段放在 assets/diary/ 下
 * =======================================================*/
function initDiary() {
  const listEl = document.getElementById("diary-list");
  const contentEl = document.getElementById("diary-content");
  if (!listEl || !contentEl) return; // 不在日记页

  safeFetchJSON("assets/diaryList.json", (mapping) => {
    // 排序（把看起来像日期的键倒序）
    const entries = Object.entries(mapping);
    const asDate = s => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      return m ? new Date(+m[1], +m[2]-1, +m[3]).getTime() : -Infinity;
    };
    entries.sort((a,b) => asDate(b[0]) - asDate(a[0]) || a[0].localeCompare(b[0]));

    // 渲染左侧列表
    listEl.innerHTML = "";
    entries.forEach(([key, file], idx) => {
      const li = document.createElement("li");
      const a  = document.createElement("a");
      a.href = "javascript:void(0)";
      a.textContent = key;
      a.onclick = () => {
        // 高亮
        listEl.querySelectorAll("a.active").forEach(x => x.classList.remove("active"));
        a.classList.add("active");
        // 加载正文
        loadDiary(file);
      };
      if (idx === 0) a.classList.add("active");
      li.appendChild(a);
      listEl.appendChild(li);
    });

    // 默认加载第一篇
    if (entries.length) loadDiary(entries[0][1]);
    else contentEl.innerHTML = "<p>暂无日记。</p>";
  }, "diary-list");
}

function loadDiary(filename) {
  const content = document.getElementById("diary-content");
  if (!content) return;

  fetch(`assets/diary/${filename}`)
    .then(res => { if (!res.ok) throw new Error("not found"); return res.text(); })
    .then(html => {
      // 注入
      content.innerHTML = html;

      const scope = content;

      // 1) 清理：移除所有内联 style，避免污染全站
      scope.querySelectorAll("[style]").forEach(el => el.removeAttribute("style"));

      // 2) 删除 <font> 标签（保留内部文字）
      scope.querySelectorAll("font").forEach(el => {
        const parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });

      // 3) H1 -> H2，层级更稳
      scope.querySelectorAll("h1").forEach(h1 => {
        const h2 = document.createElement("h2");
        h2.innerHTML = h1.innerHTML;
        h1.replaceWith(h2);
      });

      // 4) 外链默认新窗口 + 安全属性
      scope.querySelectorAll("a[href]").forEach(a => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });

      // 5) 图片兜底：如果没有 alt，给个空；破图时不炸布局
      scope.querySelectorAll("img").forEach(img => {
        if (!img.hasAttribute("alt")) img.alt = "";
        img.addEventListener("error", () => {
          img.style.display = "none";
        });
      });
    })
    .catch(err => {
      console.error(err);
      content.innerHTML = "<p>暂时加载不到这篇内容。</p>";
    });
}

/* =========================================================
 * 画廊：年份 + 标签 + 分页 + Lightbox
 * 需要：#year-bar  #tag-bar  #gallery-grid  #pagination
 *       #prev-page #next-page #page-info
 *       #lightbox  #lightbox-img #lightbox-caption
 *       数据：assets/galleryList.json
 *       每项形如：
 *       {
 *         "title": "", "thumb": "assets/x.jpg", "full": "https://...", 
 *         "desc": "说明", "year": 2025, "tags": ["fanart","zzz"]
 *       }
 * =======================================================*/
let galleryItems = [];      // 全量
let filteredItems = [];     // 筛选后
let currentIndex = 0;       // 当前大图索引（在 filteredItems 上）

let currentYear = "全部";   // 年份筛选
let currentTag  = "全部";   // 标签筛选

let currentPage = 1;
const PAGE_SIZE = 18;

function initGallery() {
  const grid = document.getElementById("gallery-grid");
  const yearBar = document.getElementById("year-bar");
  const tagBar  = document.getElementById("tag-bar");
  const pagination = document.getElementById("pagination");

  if (!grid || !yearBar) return; // 不在画廊页

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      galleryItems = items;

      // 年份按钮
      const years = Array.from(new Set(items.map(i => i.year))).filter(Boolean).sort((a,b)=>b-a);
      buildFilters(yearBar, ["全部", ...years], (y) => applyYear(y));

      // 标签按钮（从 tags 去重汇总）
      const tags = Array.from(new Set(items.flatMap(i => (i.tags || [])))).sort();
      if (tagBar && tags.length) {
        buildFilters(tagBar, ["全部", ...tags], (t) => applyTag(t));
      }

      // 首次渲染
      refreshFilter();

      // 分页按钮
      const prevBtn = document.getElementById("prev-page");
      const nextBtn = document.getElementById("next-page");
      if (prevBtn && nextBtn) {
        prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(); } };
        nextBtn.onclick = () => {
          const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
          if (currentPage < totalPages) { currentPage++; renderPage(); }
        };
      }
    })
    .catch(err => {
      console.error("加载画廊失败:", err);
      grid.innerHTML = "<p>画廊加载失败</p>";
      if (pagination) pagination.style.display = "none";
    });
}

// 生成筛选按钮
function buildFilters(container, list, handler) {
  container.innerHTML = "";
  list.forEach(val => {
    const btn = document.createElement("button");
    const activeVal = (container.id === "year-bar") ? currentYear : currentTag;
    btn.className = "filter-btn" + (activeVal === val ? " active" : "");
    btn.textContent = val;
    btn.onclick = () => handler(val);
    container.appendChild(btn);
  });
}

function applyYear(year) {
  currentYear = year;
  currentPage = 1;
  document.querySelectorAll("#year-bar .filter-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === year);
  });
  refreshFilter();
}

function applyTag(tag) {
  currentTag = tag;
  currentPage = 1;
  document.querySelectorAll("#tag-bar .filter-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === tag);
  });
  refreshFilter();
}

// 统一计算 filteredItems（同时考虑年份 & 标签）
function refreshFilter() {
  filteredItems = galleryItems.filter(i => {
    const passYear = (currentYear === "全部") || (i.year === Number(currentYear));
    const tags = i.tags || [];
    const passTag  = (currentTag === "全部") || tags.includes(currentTag);
    return passYear && passTag;
  });
  currentIndex = 0;
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
    img.onclick = () => { currentIndex = realIndex; openImage(currentIndex); };
    grid.appendChild(img);
  });

  if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页 · 共 ${total} 张`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

/* ======================== Lightbox ======================== */
function openImage(index) {
  const item = filteredItems[index];
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  if (!item || !lightbox || !img) return;

  img.src = item.full;
  if (caption) caption.textContent = (item.title || "") + (item.desc ? " - " + item.desc : "");
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
