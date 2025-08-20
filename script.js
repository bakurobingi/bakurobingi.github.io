// ===== 画廊：从 JSON 渲染缩略图 =====
function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      grid.innerHTML = ""; // 清空
      items.forEach(item => {
        const img = document.createElement("img");
        img.src = item.thumb;         // 本地小图
        img.alt = item.title || "";
        img.loading = "lazy";         // 懒加载提升性能
        img.onclick = () => openImage(item.full); // 图床大图
        grid.appendChild(img);
      });
    })
    .catch(err => {
      console.error("加载画廊失败:", err);
      const tip = document.createElement("p");
      tip.textContent = "画廊加载失败，请稍后重试。";
      grid.appendChild(tip);
    });
}

// ===== Lightbox 预览 =====
function openImage(src) {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  box.style.display = "flex";
}
function closeImage() {
  const box = document.getElementById("lightbox");
  box.style.display = "none";
  document.getElementById("lightbox-img").src = "";
}

// ===== 日记（如果你已经有自动导航，这里保留） =====
function loadDiaryList() {
  const el = document.getElementById("diary-list");
  if (!el) return;
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
    .then(res => {
      if (!res.ok) throw new Error("not found");
      return res.text();
    })
    .then(html => content.innerHTML = html)
    .catch(() => content.innerHTML = "<p>暂无内容。</p>");
}


// ===== 页面加载触发 =====
document.addEventListener("DOMContentLoaded", () => {
  renderGallery();   // 画廊页会执行；非画廊页 grid 不存在就直接返回
  loadDiaryList();   // 日记页会执行；非日记页列表不存在就直接返回
});

let galleryItems = [];   // 保存 JSON 里的所有图片数据
let currentIndex = 0;

// 渲染缩略图
function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      galleryItems = items; // 保存起来
      grid.innerHTML = "";
      items.forEach((item, index) => {
        const img = document.createElement("img");
        img.src = item.thumb;
        img.alt = item.title || "";
        img.loading = "lazy";
        img.onclick = () => openImage(index);
        grid.appendChild(img);
      });
    });
}

// 打开大图
function openImage(index) {
  currentIndex = index;
  const item = galleryItems[index];
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");

  img.src = item.full;
  caption.textContent = item.title + (item.desc ? " - " + item.desc : "");
  lightbox.style.display = "flex";
}

// 上一张
function prevImage() {
  if (galleryItems.length === 0) return;
  currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
  openImage(currentIndex);
}

// 下一张
function nextImage() {
  if (galleryItems.length === 0) return;
  currentIndex = (currentIndex + 1) % galleryItems.length;
  openImage(currentIndex);
}

// 点击空白处关闭
document.addEventListener("click", e => {
  const lightbox = document.getElementById("lightbox");
  if (e.target === lightbox) {
    lightbox.style.display = "none";
  }
});

// 键盘操作
document.addEventListener("keydown", e => {
  if (document.getElementById("lightbox").style.display === "flex") {
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "Escape") document.getElementById("lightbox").style.display = "none";
  }
});

/* ================== 画廊：分类 + 分页 + Lightbox ================== */

let galleryItems = [];      // 全量数据
let filteredItems = [];     // 当前筛选后的数据
let currentIndex = 0;       // Lightbox 当前索引（在 filteredItems 中）
let currentYear = '全部';   // 当前筛选的年份
const PAGE_SIZE = 18;       // 每页显示数量
let currentPage = 1;        // 当前页

function renderGallery() {
  const grid = document.getElementById("gallery-grid");
  const filterBar = document.getElementById("filter-bar");
  const pagination = document.getElementById("pagination");
  if (!grid || !filterBar) return;

  fetch("assets/galleryList.json")
    .then(res => res.json())
    .then(items => {
      galleryItems = items;

      // 生成年份集合（降序）
      const years = Array.from(new Set(items.map(i => i.year))).filter(Boolean).sort((a,b)=>b-a);
      buildYearFilters(['全部', ...years]);

      // 默认筛选：全部
      applyFilter('全部');
    })
    .catch(err => {
      console.error("加载画廊失败:", err);
      grid.innerHTML = "<p>画廊加载失败</p>";
      pagination.style.display = "none";
    });

  // 绑定分页按钮
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(); } };
  nextBtn.onclick = () => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    if (currentPage < totalPages) { currentPage++; renderPage(); }
  };
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
  // 过滤数据
  filteredItems = (year === '全部')
    ? [...galleryItems]
    : galleryItems.filter(i => i.year === Number(year));

  // 重新高亮筛选按钮
  Array.from(document.querySelectorAll('.filter-btn')).forEach(b=>{
    b.classList.toggle('active', b.textContent === year);
  });

  renderPage();
}

function renderPage() {
  const grid = document.getElementById("gallery-grid");
  const pageInfo = document.getElementById("page-info");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  // 计算分页
  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredItems.slice(start, start + PAGE_SIZE);

  // 渲染缩略图
  grid.innerHTML = "";
  pageData.forEach((item, idx) => {
    const img = document.createElement("img");
    img.src = item.thumb;
    img.alt = item.title || "";
    img.loading = "lazy";
    // 这里的 idx 是页内索引，真正索引需要映射回 filteredItems
    const realIndex = start + idx;
    img.onclick = () => openImage(realIndex);
    grid.appendChild(img);
  });

  // 更新分页控件
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页 · 共 ${total} 张`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

/* ===== Lightbox ===== */
function openImage(index) {
  currentIndex = index; // 在 filteredItems 上的索引
  const item = filteredItems[index];
  const lightbox = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");

  img.src = item.full;
  caption.textContent = item.title + (item.desc ? " - " + item.desc : "");
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

/* ================== 日记：保留你的自动导航逻辑 ================== */
function loadDiaryList() {
  const el = document.getElementById("diary-list");
  if (!el) return;
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
    .then(html => content.innerHTML = html)
    .catch(() => content.innerHTML = "<p>暂无内容。</p>");
}

/* ================== 页面加载入口 ================== */
document.addEventListener("DOMContentLoaded", () => {
  renderGallery();  // 仅在 gallery.html 生效；其他页会自动跳过
  loadDiaryList();  // 仅在 diary.html 生效
});
