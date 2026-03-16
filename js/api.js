const API = (() => {
  const BASE_URL = 'https://dummyjson.com';
  const LIMIT = 12;

  /**
   * Fetcher genérico con manejo de errores.
   * @param {string} url
   * @param {object} options
   * @returns {Promise<object>}
   */
  async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }
    return response.json();
  }

  /**
   * GET — Listar posts con paginación.
   * Endpoint: GET /posts?limit=N&skip=N
   * @param {number} page - Página actual (1-based)
   * @returns {Promise<{posts, total, limit, skip}>}
   */
  async function getPosts(page = 1) {
    const skip = (page - 1) * LIMIT;
    const url = `${BASE_URL}/posts?limit=${LIMIT}&skip=${skip}`;
    return request(url);
  }

  /**
   * GET — Buscar posts por texto usando query params.
   * Endpoint: GET /posts/search?q=texto
   * @param {string} query - Texto de búsqueda
   * @returns {Promise<{posts, total, limit, skip}>}
   */
  async function searchPosts(query) {
    const url = `${BASE_URL}/posts/search?q=${encodeURIComponent(query)}`;
    return request(url);
  }

  /**
   * POST — Crear un nuevo post enviando JSON en el body.
   * Endpoint: POST /posts/add
   * @param {object} postData - { title, body, tags, userId }
   * @returns {Promise<object>} Post creado
   */
  async function createPost(postData) {
    const url = `${BASE_URL}/posts/add`;
    return request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
  }

  return { getPosts, searchPosts, createPost, LIMIT };
})();