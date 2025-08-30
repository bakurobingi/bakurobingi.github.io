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
 * 日记：按年份分组 + 可折叠 + 左侧显示日期 + 正文头部显示标题/日期
 * 需要：#diary-list（左侧）、#diary-content（右侧）
 *      assets/diaryList.json （推荐数组版）
 *        [
 *          {"title":"病中画的","date":"2024-01-18","link":"2024-01-18.html"},
 *          ...
 *        ]
 *      片段放在 assets/diary/ 下
 * =======================================================*/
function initDiary() {
  const listWrap = document.getElementById("diary-list");
  const contentEl = document.getElementById("diary-content");
  if (!listWrap || !contentEl) return; // 不在日记页

  safeFetchJSON("assets/diaryList.json", (raw) => {
    // 兼容旧map：{ "2024-12-31 标题": "2024-12-31.html", ... }
    let items = Array.isArray(raw) ? raw : Object.entries(raw).map(([title, link]) => {
      const mLink = /(\d{4})-(\d{2})-(\d{2})/.exec(link);
      const mTitl = /(\d{4})(?:[-/年](\d{1,2})[-/月](\d{1,2}))?/.exec(title);
      const date = mLink ? `${mLink[1]}-${mLink[2]}-${mLink[3]}`
               : mTitl ? `${mTitl[1]}-${String(mTitl[2]||'01').padStart(2,'0')}-${String(mTitl[3]||'01').padStart(2,'0')}`
                       : "1970-01-01";
      return { title, date, link };
    });

    const toTime = s => {
      const m = /^(\d{4})(?:-(\d{2})-(\d{2}))?/.exec(s || "");
      return m ? new Date(+m[1], (m[2]||1)-1, m[3]||1).getTime() : -Infinity;
    };
    const yearOf = s => (s.match(/^(\d{4})/) || [,"其它"])[1];

    // 全量按日期倒序（新→旧）
    items.sort((a,b) => toTime(b.date) - toTime(a.date) || (b.title||"").localeCompare(a.title||"", "zh"));

    // 分组：{ year -> [items...] }；组内倒序
    const groups = new Map();
    items.forEach(it => {
      const y = String(yearOf(it.date));
      if (!groups.has(y)) groups.set(y, []);
      groups.get(y).push(it);
    });
    for (const arr of groups.values()) arr.sort((a,b)=> toTime(b.date) - toTime(a.date));

    // 折叠状态记忆
    const collapsed = new Set(JSON.parse(localStorage.getItem("diary-collapsed") || "[]"));

    // 渲染
    listWrap.innerHTML = "";
    const years = Array.from(groups.keys()).sort((a,b) => b - a);
    let firstEntryToLoad = null;

    years.forEach((y, yi) => {
      const arr = groups.get(y);

      const group = document.createElement("div");
      group.className = "year-group" + (collapsed.has(y) ? " collapsed" : "");

      // 年份按钮（可折叠）
      const btn = document.createElement("button");
      btn.className = "year-toggle";
      btn.type = "button";
      btn.setAttribute("aria-expanded", !collapsed.has(y));
      btn.innerHTML = `${y} 年 <span class="count">(${arr.length})</span><span class="chev">▾</span>`;
      btn.onclick = () => {
        group.classList.toggle("collapsed");
        const c = group.classList.contains("collapsed");
        btn.setAttribute("aria-expanded", !c);
        const set = new Set(JSON.parse(localStorage.getItem("diary-collapsed") || "[]"));
        if (c) set.add(y); else set.delete(y);
        localStorage.setItem("diary-collapsed", JSON.stringify([...set]));
      };
      group.appendChild(btn);

      // —— 年内条目列表：标题 + 日期（小字） —— //
      const ul = document.createElement("ul");
      ul.className = "year-list";

      arr.forEach((it, idx) => {
        const li = document.createElement("li");
        const a  = document.createElement("a");

        const title = it.title || it.date;
        a.innerHTML = `<strong>${title}</strong><small class="diary-date">${it.date || ""}</small>`;
        a.href = "javascript:void(0)";

        a.onclick = () => {
          listWrap.querySelectorAll("a.active").forEach(x => x.classList.remove("active"));
          a.classList.add("active");
          loadDiaryEntry(it);  // 传整条（含 title/date/link）
        };

        li.appendChild(a);
        ul.appendChild(li);

        // 默认加载：最新年份的第一篇
        if (yi === 0 && idx === 0) {
          a.classList.add("active");
          firstEntryToLoad = it;
        }
      });

      group.appendChild(ul);
      listWrap.appendChild(group);
    });

    if (firstEntryToLoad) loadDiaryEntry(firstEntryToLoad);
    else contentEl.innerHTML = "<p>暂无日记。</p>";
  }, "diary-list");
}

// 兼容旧调用：保留按文件名加载
function loadDiary(filename) {
  const entry = { title: "", date: "", link: filename };
  loadDiaryEntry(entry);
}

// 新：按条目加载（会在正文顶部插入标题/日期）
function loadDiaryEntry(entry) {
  const { title, date, link } = entry || {};
  const content = document.getElementById("diary-content");
  if (!content || !link) return;

  fetch(`assets/diary/${link}`)
    .then(res => { if (!res.ok) throw new Error("not found"); return res.text(); })
    .then(html => {
      // 注入正文
      content.innerHTML = html;

      const scope = content;

      // —— 正文顶部加标题 + 日期头部区 —— //
      const header = document.createElement("div");
      header.className = "diary-header";
      header.innerHTML = `
        <h2 class="diary-title">${title || date || ""}</h2>
        ${date ? `<div class="diary-meta">${date}</div>` : ""}
      `;
      content.prepend(header);

      // —— 清理污染 & 统一风格 —— //
      scope.querySelectorAll("[style]").forEach(el => el.removeAttribute("style"));
      scope.querySelectorAll("font").forEach(el => {
        const p = el.parentNode;
        while (el.firstChild) p.insertBefore(el.firstChild, el);
        p.removeChild(el);
      });
      scope.querySelectorAll("h1").forEach(h1 => {
        const h2 = document.createElement("h2");
        h2.innerHTML = h1.innerHTML;
        h1.replaceWith(h2);
      });
      scope.querySelectorAll("a[href]").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
      scope.querySelectorAll("img").forEach(img => {
        if (!img.hasAttribute("alt")) img.alt = "";
        img.addEventListener("error", () => { img.style.display = "none"; });
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

      // 标签按钮
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

/* ===== 首页打字机（欢迎语） ===== */
(function () {
  // 目标文字（改这里）
  const TEXT = "welcome~ 这里是我屯日记与涂鸦的小站";

  // 找到/创建 #welcome-typing
  function ensureTarget() {
    let el = document.getElementById("welcome-typing");
    if (!el) {
      // 如果你忘了在 index.html 放 <span id="welcome-typing"></span>，那我来补一个
      const p = document.querySelector(".welcome") || document.body;
      el = document.createElement("span");
      el.id = "welcome-typing";
      p.appendChild(el);
    }
    return el;
  }

  function run() {
    const el = ensureTarget();
    // 用户开启“减少动效”时，直接显示完整文字
    const preferReduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (preferReduce) { el.textContent = TEXT; return; }

    // 逐字打
    const TYPE_SPEED = 45;   // 每字间隔（ms）
    const START_DELAY = 300; // 开始前停顿（ms）
    let i = 0;
    setTimeout(function tick() {
      el.textContent = TEXT.slice(0, i++);
      if (i <= TEXT.length) setTimeout(tick, TYPE_SPEED);
    }, START_DELAY);
  }

  // script.js 通常是 defer 的；保险起见两个事件都挂
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
