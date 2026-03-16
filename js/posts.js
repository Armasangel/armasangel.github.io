const PostsModule = (() => {

  let currentPage    = 1;
  let totalPosts     = 0;
  let currentQuery   = '';
  let searchTimeout  = null;
  let lastAction     = null;

  const stateIdle    = document.getElementById('stateIdle');
  const stateLoading = document.getElementById('stateLoading');
  const stateSuccess = document.getElementById('stateSuccess');
  const stateEmpty   = document.getElementById('stateEmpty');
  const stateError   = document.getElementById('stateError');
  const postsGrid    = document.getElementById('postsGrid');
  const pagination   = document.getElementById('pagination');
  const searchInput  = document.getElementById('searchInput');
  const searchClear  = document.getElementById('searchClear');
  const searchMeta   = document.getElementById('searchMeta');
  const errorMsg     = document.getElementById('errorMessage');
  const emptyQuery   = document.getElementById('emptyQuery');

  function showState(stateName) {
    const states = { idle: stateIdle, loading: stateLoading, success: stateSuccess, empty: stateEmpty, error: stateError };
    Object.entries(states).forEach(([key, el]) => {
      if (key === stateName) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  }

  function renderCard(post, isNew = false) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.style.animationDelay = `${Math.random() * 0.15}s`;

    const tags = (post.tags || [])
      .map(t => `<span class="tag">${t}</span>`)
      .join('');

    const likes    = post.reactions?.likes    ?? post.reactions ?? 0;
    const dislikes = post.reactions?.dislikes ?? 0;

    card.innerHTML = `
      ${isNew ? '<span class="card-new-badge">NEW</span>' : ''}
      <span class="card-number">POST #${post.id}</span>
      <h3 class="card-title">${escapeHtml(post.title)}</h3>
      <p class="card-body">${escapeHtml(post.body)}</p>
      ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      <div class="card-footer">
        <div class="card-reactions">
          <span class="card-reaction">👍 ${likes}</span>
          ${dislikes ? `<span class="card-reaction">👎 ${dislikes}</span>` : ''}
        </div>
        <span>👁 ${post.views ?? '—'}</span>
      </div>
    `;

    card.addEventListener('click', () => ModalModule.open(post));
    return card;
  }

  function renderPosts(posts, isNew = false) {
    postsGrid.innerHTML = '';
    posts.forEach((post, i) => {
      const card = renderCard(post, isNew);
      card.style.animationDelay = `${i * 0.04}s`;
      postsGrid.appendChild(card);
    });
  }

  function renderPagination(total, page) {
    pagination.innerHTML = '';
    const totalPages = Math.ceil(total / API.LIMIT);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => loadPage(page - 1));
    pagination.appendChild(prevBtn);

    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);

    for (let p = start; p <= end; p++) {
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (p === page ? ' active' : '');
      btn.textContent = p;
      btn.addEventListener('click', () => loadPage(p));
      pagination.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = page === totalPages;
    nextBtn.addEventListener('click', () => loadPage(page + 1));
    pagination.appendChild(nextBtn);

    const info = document.createElement('span');
    info.className = 'page-info';
    info.textContent = `${page} / ${totalPages}`;
    pagination.appendChild(info);
  }

  async function loadPosts(page = 1) {
    currentPage  = page;
    currentQuery = '';
    lastAction   = () => loadPosts(page);

    updateSearchMeta('');
    searchClear.classList.remove('visible');
    searchInput.value = '';

    showState('loading');

    try {
      const data = await API.getPosts(page);
      totalPosts = data.total;

      if (!data.posts || data.posts.length === 0) {
        showState('empty');
        return;
      }

      renderPosts(data.posts);
      renderPagination(data.total, page);
      showState('success');
      updateSearchMeta(`Mostrando ${data.posts.length} de ${data.total} posts`);

    } catch (err) {
      errorMsg.textContent = err.message || 'No se pudo conectar con el servidor.';
      showState('error');
    }
  }

  function loadPage(page) {
    if (currentQuery) {
      return;
    }
    loadPosts(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function searchPosts(query) {
    if (!query.trim()) {
      loadPosts(1);
      return;
    }

    currentQuery = query;
    lastAction   = () => searchPosts(query);

    showState('loading');
    updateSearchMeta('Buscando...');

    try {
      const data = await API.searchPosts(query);

      if (!data.posts || data.posts.length === 0) {
        emptyQuery.textContent = query;
        showState('empty');
        updateSearchMeta('');
        return;
      }

      renderPosts(data.posts);
      pagination.innerHTML = ''; 
      showState('success');
      updateSearchMeta(`${data.posts.length} resultado${data.posts.length !== 1 ? 's' : ''} para "${query}"`);

    } catch (err) {
      errorMsg.textContent = err.message || 'Error al buscar posts.';
      showState('error');
    }
  }

  function clearSearch() {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    loadPosts(1);
  }

  //Retry (error state)
  function retry() {
    if (typeof lastAction === 'function') lastAction();
  }

  //Update search meta label
  function updateSearchMeta(text) {
    searchMeta.textContent = text;
  }

  //Prepend a newly created post
  function prependPost(post) {
    if (stateSuccess.hasAttribute('hidden')) return;
    const card = renderCard(post, true);
    postsGrid.insertBefore(card, postsGrid.firstChild);
    // Scroll to top of grid
    postsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  //Init search input listener
  function init() {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      searchClear.classList.toggle('visible', val.length > 0);
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => searchPosts(val), 500);
    });
  }

  //Utility
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    loadPosts,
    searchPosts,
    clearSearch,
    retry,
    prependPost,
  };
})();