// ============ TMDB CONFIG ============
// Put your TMDB API key here (get one at https://www.themoviedb.org/settings/api)
const TMDB_API_KEY = "b5263f2fb34918b98c5a99c2574cf247"; // TODO: add your key
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

// ============ STATE ============
const state = {
  movies: [],
  interested: [], // { id, Title, Year, Poster }
};

// ============ DOM ELEMENTS ============
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");
const interestedCountEl = document.getElementById("interestedCount");
const interestedListEl = document.getElementById("interestedList");

const movieModal = document.getElementById("movieModal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");



// ============ LOCAL STORAGE HELPERS ============
function loadInterestedFromStorage() {
  try {
    const raw = localStorage.getItem("interestedMovies");
    const arr = raw ? JSON.parse(raw) : [];
    // migrate old shape (imdbID) -> new shape (id)
    state.interested = arr
      .map((item) => {
        if (!item) return null;
        if (item.imdbID) {
          return {
            id: String(item.imdbID),
            Title: item.Title,
            Year: item.Year,
            Poster: item.Poster,
          };
        }
        return {
          id: String(item.id || item.imdbID || ""),
          Title: item.Title,
          Year: item.Year,
          Poster: item.Poster,
        };
      })
      .filter(Boolean);
  } catch {
    state.interested = [];
  }
  updateInterestedCount();
}

function saveInterestedToStorage() {
  localStorage.setItem("interestedMovies", JSON.stringify(state.interested));
  updateInterestedCount();
}

function updateInterestedCount() {
  interestedCountEl.textContent = state.interested.length;
}

// ============ FETCH MOVIES ============
async function fetchMovies(title) {
  if (!title.trim()) {
    alert("Please enter a movie title");
    return;
  }

  if (!TMDB_API_KEY) {
    alert("TMDB API key not set. Add TMDB_API_KEY to script.js");
    return;
  }

  resultsContainer.innerHTML = "<p>Loading...</p>";

  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
    title
  )}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.results && data.results.length) {
      // Normalize to shape used by the app: id, Title, Year, Poster
      state.movies = data.results.map((m) => ({
        id: String(m.id),
        Title: m.title,
        Year: m.release_date ? m.release_date.slice(0, 4) : "",
        Poster: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : null,
      }));
      renderMovies(state.movies);
    } else {
      resultsContainer.innerHTML =
        '<p class="no-results">No movies found. Try another search!</p>';
    }
  } catch (error) {
    console.error("Error fetching movies:", error);
    resultsContainer.innerHTML =
      '<p class="no-results">Error loading movies. Check your API key and network!</p>';
  }
} 

// ============ FETCH MOVIE DETAILS ============
async function fetchMovieDetails(id) {
  try {
    if (!TMDB_API_KEY) {
      alert("TMDB API key not set. Add TMDB_API_KEY to script.js");
      return null;
    }
    const url = `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=similar,credits`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && !data.status_code) {
      // map TMDB fields to those expected elsewhere in the app
      data.Poster = data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : "";
      data.Title = data.title || "";
      data.Year = data.release_date ? (data.release_date.slice(0, 4)) : "";
      data.Genre = data.genres ? data.genres.map((g) => g.name).join(', ') : "";
      data.Plot = data.overview || "";
      data.Actors = data.credits && data.credits.cast ? data.credits.cast.slice(0, 6).map(c => c.name).join(', ') : "";
      data.Director = data.credits && data.credits.crew ? (data.credits.crew.find(c => c.job === 'Director') || {}).name : "N/A";
      data.imdbRating = data.vote_average ? String(data.vote_average) : "N/A";
      return data;
    }
    return null;
  } catch (err) {
    console.error("Error fetching movie details:", err);
    return null;
  }
} 

// ============ RENDER MOVIES (SEARCH TAB) ============
function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    resultsContainer.innerHTML =
      '<p class="no-results">No movies to display</p>';
    return;
  }

  resultsContainer.innerHTML = movies
    .map((movie) => {
      const isInterested = state.interested.some((m) => String(m.id) === String(movie.id));
      const interestedLabel = isInterested ? "Interested ✓" : "Interested";

      return `
      <div class="movie-card" data-tmdb-id="${movie.id}">
        <div class="movie-poster">
          ${
            movie.Poster
              ? `<img src="${movie.Poster}" alt="${movie.Title}" loading="lazy" />`
              : "No Image"
          }
        </div>
        <div class="movie-info">
          <div class="movie-title">${movie.Title}</div>
          <div class="movie-year">${movie.Year}</div>
          <div class="movie-actions">
            <button class="btn btn-primary btn-details">Details</button>
            <button class="btn btn-interested">${interestedLabel}</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");


}

// ============ RENDER INTERESTED TAB ============
function renderInterestedMovies() {
  if (!state.interested.length) {
    interestedListEl.innerHTML =
      '<p class="no-results">No interested movies yet.</p>';
    return;
  }

  interestedListEl.innerHTML = state.interested
    .map((movie) => {
      return `
      <div class="movie-card" data-tmdb-id="${movie.id}">
        <div class="movie-poster">
          ${
            movie.Poster
              ? `<img src="${movie.Poster}" alt="${movie.Title}" loading="lazy" />`
              : "No Image"
          }
        </div>
        <div class="movie-info">
          <div class="movie-title">${movie.Title}</div>
          <div class="movie-year">${movie.Year}</div>
          <div class="movie-actions">
            <button class="btn btn-primary btn-details">Details</button>
            <button class="btn btn-interested">Remove</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");


}

// ============ INTERESTED TOGGLE ============
function toggleInterested(id) {
  const index = state.interested.findIndex((m) => String(m.id) === String(id));
  if (index === -1) {
    const movie = state.movies.find((m) => String(m.id) === String(id));
    if (!movie) return;
    state.interested.push({
      id: String(movie.id),
      Title: movie.Title,
      Year: movie.Year,
      Poster: movie.Poster,
    });
  } else {
    state.interested.splice(index, 1);
  }
  saveInterestedToStorage();
} 

// ============ MODAL HANDLERS ============
async function showMovieDetails(id) {
  const details = await fetchMovieDetails(id);
  if (!details) {
    alert("Could not load movie details");
    return;
  }

  const rating = details.imdbRating && details.imdbRating !== "N/A" ? `${details.imdbRating}/10` : "Not rated";

  const posterHtml = details.Poster ? `<img src="${details.Poster}" alt="${details.Title}" class="modal-movie-poster" />` : "";

  const html = `
    ${posterHtml}
    <div class="modal-title">${details.Title}</div>
    <div class="modal-year">${details.Year} • ${details.Runtime || ""}</div>
    <div class="modal-rating">Rating: ${rating}</div>
    <div class="modal-genre"><strong>Genre:</strong> ${details.Genre || "N/A"}</div>
    <div class="modal-plot"><strong>Plot:</strong> ${details.Plot || "No description available"}</div>
    <div class="modal-plot"><strong>Cast:</strong> ${details.Actors || "N/A"}</div>
    <div class="modal-plot"><strong>Director:</strong> ${details.Director || "N/A"}</div>

    <div class="modal-actions" style="margin-top:12px;">
      <button class="btn btn-primary btn-show-similar">Show Similar</button>
    </div>

    <div id="similarContainer" style="margin-top:14px;"></div>
  `;

  modalBody.innerHTML = html;
  movieModal.classList.add("active");

  // attach handler for the show similar button
  const similarBtn = modalBody.querySelector('.btn-show-similar');
  if (similarBtn) {
    similarBtn.addEventListener('click', () => {
      const sim = details.similar && details.similar.results ? details.similar.results : [];
      renderSimilar(sim);
    });
  }
} 

function closeModal() {
  movieModal.classList.remove("active");
}

// Render a list of similar movies inside the modal
function renderSimilar(similarArray) {
  const container = document.getElementById('similarContainer');
  if (!container) return;
  if (!similarArray || similarArray.length === 0) {
    container.innerHTML = '<p class="no-results">No similar movies found.</p>';
    return;
  }

  container.innerHTML = similarArray
    .map((m) => `
      <div class="similar-card" data-tmdb-id="${m.id}" style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
        <div style="width:48px;height:72px;overflow:hidden;border-radius:6px;background:#111;">
          ${m.poster_path ? `<img src="${TMDB_IMAGE_BASE}${m.poster_path}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;" />` : ''}
        </div>
        <div style="flex:1;">
          <div style="font-weight:700">${m.title}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary)">${m.release_date ? m.release_date.slice(0,4) : ''}</div>
        </div>
        <div>
          <button class="btn btn-primary btn-details-similar">Details</button>
        </div>
      </div>
    `)
    .join('');
}

// Modal body delegated click handler for similar details
modalBody.addEventListener('click', (e) => {
  const simBtn = e.target.closest('.btn-details-similar');
  if (simBtn) {
    const card = simBtn.closest('.similar-card');
    const id = card?.getAttribute('data-tmdb-id');
    if (!id) return;
    showMovieDetails(id);
  }
});

modalClose.addEventListener("click", closeModal);
window.addEventListener("click", (e) => {
  if (e.target === movieModal) closeModal();
});

// ============ TABS LOGIC ============
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((section) => section.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(target).classList.add("active");

    if (target === "tab-interested") {
      renderInterestedMovies();
    }
  });
});

// ============ EVENT LISTENERS ============
searchBtn.addEventListener("click", () => fetchMovies(searchInput.value));

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    fetchMovies(searchInput.value);
  }
});

// Event delegation for dynamic buttons (details & interested)
resultsContainer.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".btn-details");
  if (detailsBtn) {
    const card = detailsBtn.closest(".movie-card");
    const id = card?.getAttribute("data-tmdb-id");
    if (!id) return;
    showMovieDetails(id);
    return;
  }
  const interestedBtn = e.target.closest(".btn-interested");
  if (interestedBtn) {
    const card = interestedBtn.closest(".movie-card");
    const id = card?.getAttribute("data-tmdb-id");
    if (!id) return;
    toggleInterested(id);
    renderMovies(state.movies);
    renderInterestedMovies();
  }
});

interestedListEl.addEventListener("click", (e) => {
  const detailsBtn = e.target.closest(".btn-details");
  if (detailsBtn) {
    const card = detailsBtn.closest(".movie-card");
    const id = card?.getAttribute("data-tmdb-id");
    if (!id) return;
    showMovieDetails(id);
    return;
  }
  const removeBtn = e.target.closest(".btn-interested");
  if (removeBtn) {
    const card = removeBtn.closest(".movie-card");
    const id = card?.getAttribute("data-tmdb-id");
    if (!id) return;
    toggleInterested(id);
    renderInterestedMovies();
    renderMovies(state.movies);
  }
});

// ============ INIT ============
window.addEventListener("DOMContentLoaded", () => {
  // background (guarded — helpers may not be defined in this build)
  try {
    if (typeof backgroundImages !== "undefined" && backgroundImages && backgroundImages.length) {
      if (typeof applyBackgroundImage === "function") applyBackgroundImage(backgroundImages[0]);
      if (typeof cycleBackground === "function") setInterval(cycleBackground, 8000);
    } else {
      // No dynamic backgrounds available — use a static local background image
      const defaultBg = "../must-watch-bollywood-movies-41715340086.webp";
      document.documentElement.style.setProperty("--current-bg", `url("${defaultBg}")`);
    }
  } catch (err) {
    console.error("Background init error:", err);
    // Graceful fallback to static background
    const defaultBg = "../must-watch-bollywood-movies-41715340086.webp";
    document.documentElement.style.setProperty("--current-bg", `url("${defaultBg}")`);
  }

  // interested
  loadInterestedFromStorage();
  renderInterestedMovies();
});
