document.addEventListener('DOMContentLoaded', () => {

// --- NOVA FUNÇÃO PARA DEFINIR O ESTADO INICIAL DA SEÇÃO ---
function setInitialPersonalizedSection(userName) {
    const container = document.getElementById('journey-container');
    const subtitle = document.getElementById('journey-subtitle');
    const highlight = document.getElementById('journey-highlight');

    if (subtitle) subtitle.textContent = 'Sua Jornada de Humor';
    if (highlight) highlight.textContent = userName;

    if (container) {
        container.innerHTML = `
            <p style="color: var(--cinza-claro); font-size: 1rem; text-align: center; grid-column: 1 / -1;">
                Clique no ícone de humor no topo da página para começar sua jornada sonora.
            </p>
        `;
    }
}

// GATEKEEPER: VERIFICAÇÃO DE LOGIN E CARREGAMENTO DE DADOS DO USUÁRIO
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
    return; 
}

fetch('http://localhost:3000/perfil', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => {
    if (!response.ok) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        throw new Error('Token inválido ou expirado.');
    }
    return response.json();
})
.then(userData => {
    console.log('Usuário autenticado:', userData.nome_usuario);

    // --- INÍCIO DA MODIFICAÇÃO ---
    const profileNameElement = document.querySelector('.user-profile h4');
    if (profileNameElement) profileNameElement.textContent = `Olá, ${userData.nome_usuario}`;

    const userHighlightElement = document.querySelector('.user-highlight');
    if (userHighlightElement) userHighlightElement.textContent = userData.nome_usuario;

    const profileUsernameDisplay = document.getElementById('profile-username-display');
    if (profileUsernameDisplay) {
        profileUsernameDisplay.textContent = userData.nome_usuario;
    }

    const editUsernameDisplay = document.getElementById('edit-username-display');
    if (editUsernameDisplay) editUsernameDisplay.textContent = userData.nome_usuario;

    // Lógica para carregar o avatar
    if (userData.url_avatar) {
        const avatarUrl = `http://localhost:3000${userData.url_avatar}`;
        document.querySelector('.user-profile .profile-pic').src = avatarUrl;
        document.getElementById('profile-avatar-preview').src = avatarUrl;
    }

    const editEmailInput = document.getElementById('edit-email');
    if (editEmailInput) editEmailInput.value = userData.email;

    const editTelefoneInput = document.getElementById('edit-telefone');
    if (editTelefoneInput && userData.telefone) editTelefoneInput.value = userData.telefone;

    const genderSelect = document.getElementById('edit-gender');
    if (genderSelect && userData.sexo) genderSelect.value = userData.sexo;

    const countrySelect = document.getElementById('edit-country');
    if (countrySelect && userData.pais) countrySelect.value = userData.pais;

    const marketingCheckbox = document.getElementById('marketing-consent');
    if (marketingCheckbox) marketingCheckbox.checked = userData.consentimento_marketing;

    // Lógica para separar a data de nascimento
    if (userData.data_nascimento) {
        const dob = new Date(userData.data_nascimento);
        const day = dob.getUTCDate();
        const monthIndex = dob.getUTCMonth(); // Janeiro é 0
        const year = dob.getUTCFullYear();

        const formDateInputs = document.querySelector('.date-inputs');
        if(formDateInputs) {
            formDateInputs.querySelector('input[placeholder="Dia"]').value = day;
            formDateInputs.querySelector('select').selectedIndex = monthIndex;
            formDateInputs.querySelector('input[placeholder="Ano"]').value = year;
        }
    }

    setInitialPersonalizedSection(userData.nome_usuario);

    fetch('http://localhost:3000/musicas/curtidas/ids', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(ids => {
            initializePageFunctionality(new Set(ids));
        });
})
.catch(error => {
    console.error('Erro de autenticação:', error.message);
    if (!window.location.href.endsWith('login.html')) {
        window.location.href = 'login.html';
    }
});

function initializePageFunctionality(initialLikedIds) {
    let debounceTimer;
    let currentMusicId = null;
    let currentOpenPlaylistId = null;
    let currentPlaylistSongIds = new Set();
    let likedSongIds = initialLikedIds;

    // Variáveis para controlar a fila de reprodução
    let currentQueue = [];
    let currentQueueIndex = -1;

    const playlistViewSection = document.getElementById('playlist-view-section');
    const backFromPlaylistViewBtn = document.getElementById('back-from-playlist-view');
    const btnDeletePlaylist = document.getElementById('btn-delete-playlist');
    const searchInput = document.querySelector('.search-bar-container input');
    const voiceSearchBtn = document.querySelector('.voice-search-btn');
    const mainSections = document.querySelectorAll('.main-content-section');
    const searchContainer = document.getElementById('search-container');
    const backToHomeBtn = document.querySelector('.back-to-home-btn');
    const playlistsGrid = document.querySelector('.playlists-grid');
    const mainContent = document.getElementById('main-content');
    const sidebar = document.querySelector('.sidebar-navigation');
    const menuToggleButton = document.getElementById('menu-toggle-btn');
    const musicPlayerFixed = document.querySelector('.music-player-fixed');
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.querySelector('.play-btn');
    const backBtn = document.querySelector('.player-controls-small .back-btn');
    const nextBtn = document.querySelector('.player-controls-small .next-btn');
    const playImg = document.querySelector('#play-pause-btn img');
    const volumeSlider = document.querySelector('.volume-slider');
    const muteBtn = document.querySelector('.mute-btn');
    const volumeIcon = document.querySelector('.volume-icon');
    const seekSlider = document.getElementById('seek-slider');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalDurationDisplay = document.getElementById('total-duration');
    const modalOverlayAddSongs = document.getElementById('add-songs-modal');
    const btnCancelAddSongs = modalOverlayAddSongs.querySelector('.btn-cancel');
    const btnAddSelected = document.querySelector('.btn-add-selected');
    const newPlaylistBtn = document.querySelector('.new-playlist-btn');
    const modalCreatePlaylist = document.getElementById('create-playlist-modal');
    const btnCancelCreate = document.querySelector('.btn-cancel-create');
    const createPlaylistForm = document.getElementById('create-playlist-form');
    const playlistCoverInput = document.getElementById('playlist-cover-input');
    const coverPreview = document.getElementById('cover-preview');
    const userProfileCard = document.querySelector('.user-profile');
    const profileMenu = document.getElementById('profile-menu');
    const profileLink = document.getElementById('profile-link');
    const profileSection = document.getElementById('profile-section');
    const logoutBtn = document.querySelector('.logout-btn');
    const accountLink = document.getElementById('account-link');
    const accountSection = document.getElementById('account-section');
    const editInfoLink = document.querySelector('.account-list-item[data-action="edit-info"]');
    const editInfoSection = document.getElementById('edit-info-section');
    const backToAccountBtns = document.querySelectorAll('.back-to-account-btn');
    const personalInfoForm = document.getElementById('personal-info-form');
    const changePasswordLink = document.querySelector('.account-list-item[data-action="change-password"]');
    const changePasswordSection = document.getElementById('change-password-section');
    const passwordChangeForm = document.getElementById('password-change-form');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const editProfileForm = document.getElementById('edit-profile-form');
    const profileAvatarInput = document.getElementById('profile-avatar-input');
    const profileAvatarPreview = document.getElementById('profile-avatar-preview');
    const copyLinkBtn = document.querySelector('.copy-link-btn');
    const homeButton = document.getElementById('home-btn');
    const sidebarLinks = document.querySelectorAll('.sidebar-navigation ul li a');
    const selectPlaylistModal = document.getElementById('select-playlist-modal');
    const btnCancelSelectPlaylist = document.getElementById('btn-cancel-select-playlist');
    const playlistSelectionList = document.getElementById('playlist-selection-list');
    let songIdToAddToPlaylist = null;
    const exploreSongsLink = document.getElementById('explore-songs-link');
    const allSongsSection = document.getElementById('all-songs-section');
    const allSongsContainer = document.getElementById('all-songs-container');
    const homeLink = document.getElementById('home-link');
    const sidebarGenresList = document.querySelector('.genres-list');
    const genreViewSection = document.getElementById('genre-view-section');
    const genreViewTitle = document.getElementById('genre-view-title');
    const genreViewContainer = document.getElementById('genre-view-container');
    const moodOrigin = document.getElementById('mood-origin');
    const moodDestination = document.getElementById('mood-destination');
    const moodBackBtn = document.getElementById('mood-back-btn');
    let moodOriginSelection = null;
    const searchResultsArea = document.getElementById('search-results-area');
    const deleteAccountLink = document.getElementById('delete-account-link');
    const deleteAccountModal = document.getElementById('delete-account-modal');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    // Contêineres de resultados
    const resultsAllView = document.getElementById('results-all-view');
    const resultsSongsView = document.getElementById('results-songs-view');
    const resultsPlaylistsView = document.getElementById('results-playlists-view');

    // Elementos da aba "Tudo"
    const resultsAllSongsSection = document.getElementById('results-all-songs-section');
    const resultsAllPlaylistsSection = document.getElementById('results-all-playlists-section');
    const resultsAllSongsList = document.getElementById('results-all-songs-list');
    const resultsAllPlaylistsGrid = document.getElementById('results-all-playlists-grid');

    // Elementos das outras abas
    const resultsSongsList = document.getElementById('results-songs-list');
    const resultsPlaylistsGrid = document.getElementById('results-playlists-grid');

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const paddedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
        return `${minutes}:${paddedSeconds}`;
    }

    const likedSongsLink = document.getElementById('liked-songs-link');
    const likedSongsSection = document.getElementById('liked-songs-section');
    const navGenresLink = document.getElementById('nav-genres-link');
    const sidebarGenresTitle = document.getElementById('sidebar-genres-title');

    if (backFromPlaylistViewBtn) {
        backFromPlaylistViewBtn.addEventListener('click', () => showMainContent());
    }

    const searchInputPlaylist = document.getElementById('playlist-view-search-input');
    if (searchInputPlaylist) {
        searchInputPlaylist.addEventListener('keyup', () => {
            const searchTerm = searchInputPlaylist.value.toLowerCase();
            fetch('http://localhost:3000/musicas')
                .then(res => res.json())
                .then(todasAsMusicas => {
                    const filteredMusicas = todasAsMusicas.filter(m =>
                        m.titulo.toLowerCase().includes(searchTerm) ||
                        m.nome_autor.toLowerCase().includes(searchTerm)
                    );
                    const searchResultsContainer = document.getElementById('playlist-view-search-results');
                    renderizarMusicasComoLista(searchResultsContainer, filteredMusicas, new Set(), filteredMusicas);
                });
        });
    }

    document.body.addEventListener('click', (event) => {
        const addOrRemoveBtn = event.target.closest('.add-song-to-playlist-btn');
        if (addOrRemoveBtn && currentOpenPlaylistId) {
            const musicaId = addOrRemoveBtn.dataset.musicId;
            const action = addOrRemoveBtn.dataset.action;
            const token = localStorage.getItem('token');
            let fetchOptions;
            let url;
            if (action === 'add') {
                url = `http://localhost:3000/playlists/${currentOpenPlaylistId}/musicas`;
                fetchOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ musicaId: musicaId })
                };
            } else {
                if (!confirm("Tem certeza que deseja remover esta música da playlist?")) {
                    return;
                }
                url = `http://localhost:3000/playlists/${currentOpenPlaylistId}/musicas/${musicaId}`;
                fetchOptions = {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                };
            }
            fetch(url, fetchOptions)
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) {
                        abrirPlaylistView(currentOpenPlaylistId);
                    }
                });
        }
    });

    if (likedSongsLink && likedSongsSection) {
        likedSongsLink.addEventListener('click', (e) => {
            e.preventDefault();
            likedSongsSection.scrollIntoView({ behavior: 'smooth' });
            setActiveLink(likedSongsLink);
        });
    }

    function updateAllStarIcons(musicId, isLiked) {
        const allLikeButtons = document.querySelectorAll(`.like-btn[data-music-id="${musicId}"]`);
        allLikeButtons.forEach(button => {
            const starIcon = button.querySelector('img');
            if (starIcon) {
                starIcon.src = isLiked ? 'img/estrela_preenchida.png' : 'img/estrela_vazia.png';
            }
        });
    }

    function handlePlayerLikeToggle() {
        if (currentMusicId) {
            const token = localStorage.getItem('token');
            fetch(`http://localhost:3000/musicas/${currentMusicId}/curtir`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.curtido) {
                        playerLikeBtn.classList.add('active-like');
                        likedSongIds.add(currentMusicId);
                    } else {
                        playerLikeBtn.classList.remove('active-like');
                        likedSongIds.delete(currentMusicId);
                    }
                    updateAllStarIcons(currentMusicId, data.curtido);
                    carregarMusicasCurtidas();
                }
            });
        } else {
            console.log("Nenhuma música tocando para interagir.");
        }
    }

    const playerLikeBtn = document.querySelector('.song-actions .like-btn');
    const playerDislikeBtn = document.querySelector('.song-actions .queue-btn');

    if (playerLikeBtn) {
        playerLikeBtn.addEventListener('click', handlePlayerLikeToggle);
    }
    if (playerDislikeBtn) {
        playerDislikeBtn.addEventListener('click', handlePlayerLikeToggle);
    }

    document.body.addEventListener('click', function(event) {
        const likeBtn = event.target.closest('.like-btn');
        if (likeBtn) {
            const musicaId = likeBtn.dataset.musicId;
            const token = localStorage.getItem('token');
            fetch(`http://localhost:3000/musicas/${musicaId}/curtir`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const musicIdNumber = parseInt(musicaId);
                    if (data.curtido) {
                        likedSongIds.add(musicIdNumber);
                    } else {
                        likedSongIds.delete(musicIdNumber);
                    }
                    if (currentMusicId === musicIdNumber) {
                        if (data.curtido) {
                            playerLikeBtn.classList.add('active-like');
                        } else {
                            playerLikeBtn.classList.remove('active-like');
                        }
                    }
                    updateAllStarIcons(musicIdNumber, data.curtido);
                    carregarMusicasCurtidas();
                }
            });
        }
    });

    function carregarTocadasRecentemente() {
        const container = document.querySelector('.recently-played-section .playlists-grid');
        if (!container) return;
        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/historico/recentes', { 
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.json())
            .then(musicas => {
                container.innerHTML = '';
                musicas.forEach((musica, index) => {
                    const card = document.createElement('div');
                    card.className = 'content-card';
                    const finalCoverUrl = `http://localhost:3000/${musica.url_capa}`;
                    const isLiked = likedSongIds.has(musica.id);
                    const starIcon = isLiked ? 'estrela_preenchida.png' : 'estrela_vazia.png';
                    card.innerHTML = `
                        <div class="like-button-container">
                            <button class="control-btn like-btn" data-music-id="${musica.id}" aria-label="Curtir Música">
                                <img src="img/${starIcon}" alt="Curtir" />
                            </button>
                        </div>
                        <img src="${finalCoverUrl}" alt="Capa da música ${musica.titulo}" />
                        <div class="playlist-info">
                            <h4>${musica.titulo}</h4>
                            <span>${musica.nome_autor}</span>
                        </div>
                    `;
                    card.addEventListener('click', (event) => {
                        if (event.target.closest('.like-btn')) return;
                        playFromQueue(musicas, index);
                    });
                    container.appendChild(card);
                });
            })
            .catch(error => console.error("Erro ao carregar músicas tocadas recentemente:", error));
    }

    function carregarMusicasCurtidas() {
        const container = document.querySelector('#liked-songs-section .playlists-grid');
        if (!container) return;
        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/musicas/curtidas', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(musicasCurtidas => {
                container.innerHTML = '';
                musicasCurtidas.forEach((musica, index) => {
                    const card = document.createElement('div');
                    card.className = 'content-card';
                    const isLiked = likedSongIds.has(musica.id);
                    const starIcon = isLiked ? 'estrela_preenchida.png' : 'estrela_vazia.png';
                    card.innerHTML = `
                        <div class="like-button-container">
                            <button class="control-btn like-btn" data-music-id="${musica.id}" aria-label="Curtir Música">
                                <img src="img/${starIcon}" alt="Curtir" />
                            </button>
                        </div>
                        <img src="http://localhost:3000/${musica.url_capa}" alt="Capa de ${musica.titulo}" />
                        <div class="playlist-info">
                            <h4>${musica.titulo}</h4>
                            <span>${musica.nome_autor}</span>
                        </div>
                    `;
                    card.addEventListener('click', (event) => {
                        if (event.target.closest('.like-btn')) return;
                        playFromQueue(musicasCurtidas, index);
                    });
                    container.appendChild(card);
                });
            });
    }

    function carregarPlaylistsDoUsuario() {
        const containerPlaylists = document.querySelector('.playlists-section .playlists-grid');
        if (!containerPlaylists) return;
        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/playlists', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(playlists => {
                containerPlaylists.innerHTML = '';
                playlists.forEach(playlist => {
                    const card = document.createElement('div');
                    card.className = 'playlist-card';
                    card.dataset.playlistId = playlist.id;
                    card.addEventListener('click', () => abrirPlaylistView(playlist.id));
                    const finalCoverUrl = playlist.url_capa.startsWith('http') ? playlist.url_capa : `http://localhost:3000${playlist.url_capa}`;
                    card.innerHTML = `
                        <img src="${finalCoverUrl}" alt="Capa da Playlist: ${playlist.nome}" />
                        <div class="playlist-info">
                            <h4>${playlist.nome}</h4>
                            <span>Por Você</span>
                        </div>
                    `;
                    containerPlaylists.appendChild(card);
                });
            });
    }

    function setActiveLink(clickedLink) {
        sidebarLinks.forEach(link => {
            link.classList.remove('active-link');
        });
        if (clickedLink) {
            clickedLink.classList.add('active-link');
        }
    }
    
    function performSearch(query) {
        // Se a busca estiver vazia, volta para a tela inicial
        if (!query || query.trim() === '') {
            showMainContent();
            return;
        }

        showSection('search-container');
        
        const activeFilter = document.querySelector('.filter-btn.active').id;
        document.querySelectorAll('.search-results-view').forEach(view => view.classList.add('hidden'));

        if (activeFilter === 'filter-all') {
            resultsAllView.classList.remove('hidden');
            resultsAllSongsList.innerHTML = '<p>Buscando músicas...</p>';
            resultsAllPlaylistsGrid.innerHTML = '<p>Buscando playlists...</p>';
            fetch(`http://localhost:3000/pesquisa/tudo?q=${query}`).then(res => res.json()).then(data => {
                if (data.musicas.length > 0) {
                    resultsAllSongsSection.style.display = 'block';
                    const correctedMusicas = data.musicas.map(song => ({ ...song, nome_autor: song.autores }));
                    renderizarMusicasComoLista(resultsAllSongsList, correctedMusicas, new Set(), correctedMusicas, 'search');
                } else {
                    resultsAllSongsSection.style.display = 'none';
                }
                if (data.playlists.length > 0) {
                    resultsAllPlaylistsSection.style.display = 'block';
                    renderizarPlaylistsComoCard(resultsAllPlaylistsGrid, data.playlists);
                } else {
                    resultsAllPlaylistsSection.style.display = 'none';
                }
            });
        } else if (activeFilter === 'filter-songs') {
            resultsSongsView.classList.remove('hidden');
            resultsSongsList.innerHTML = '<p>Buscando músicas...</p>';
            fetch('http://localhost:3000/musicas').then(res => res.json()).then(todasAsMusicas => {
                const searchTerm = query.toLowerCase();
                const filtered = todasAsMusicas.filter(m => m.titulo.toLowerCase().includes(searchTerm) || (m.nome_autor && m.nome_autor.toLowerCase().includes(searchTerm)));
                renderizarMusicasComoLista(resultsSongsList, filtered, new Set(), filtered, 'search');
            }).catch(error => {
                console.error("Erro ao buscar ou filtrar músicas:", error);
                resultsSongsList.innerHTML = '<p class="no-results-message">Ocorreu um erro ao buscar as músicas.</p>';
            });
        } else if (activeFilter === 'filter-playlists') {
            resultsPlaylistsView.classList.remove('hidden');
            resultsPlaylistsGrid.innerHTML = '<p>Buscando playlists...</p>';
            fetch(`http://localhost:3000/pesquisa/playlists?q=${query}`).then(res => res.json()).then(data => renderizarPlaylistsComoCard(resultsPlaylistsGrid, data));
        }
    }

    function playFromQueue(queue, index) {
        currentQueue = queue;
        currentQueueIndex = index;
        const musicToPlay = currentQueue[currentQueueIndex];
        if (musicToPlay) {
            playMusic(musicToPlay);
        }
    }
    
    function playNextSong() {
        if (currentQueue.length > 0) {
            currentQueueIndex++;
            if (currentQueueIndex >= currentQueue.length) {
                currentQueueIndex = 0;
            }
            playFromQueue(currentQueue, currentQueueIndex);
        }
    }

    function playPreviousSong() {
        if (currentQueue.length > 0) {
            currentQueueIndex--;
            if (currentQueueIndex < 0) {
                currentQueueIndex = currentQueue.length - 1;
            }
            playFromQueue(currentQueue, currentQueueIndex);
        }
    }
    
    function playMusic(musica) {
        if (!musica || !musica.url_musica) {
            console.error("Tentativa de tocar uma música inválida:", musica);
            return;
        }

        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/historico/tocar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ musicaId: musica.id })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                 // --- CORREÇÃO 1: Atualiza a lista de "Tocadas Recentemente" em tempo real ---
                carregarTocadasRecentemente();
            }
        })
        .catch(err => console.error("Falha ao registrar histórico:", err));


        console.log(`Tocando: ${musica.titulo} por ${musica.nome_autor}`);
        const songTitleElement = document.querySelector('.song-info-small .song-title');
        const artistNameElement = document.querySelector('.song-info-small .artist-name');
        const albumArtSmall = document.querySelector('.album-art-small img');

        audioPlayer.src = musica.url_musica;
        const coverUrl = `http://localhost:3000/${musica.url_capa}`;
        albumArtSmall.src = coverUrl;
        songTitleElement.textContent = musica.titulo;
        artistNameElement.textContent = musica.nome_autor;
        audioPlayer.load();
        audioPlayer.addEventListener('canplaythrough', () => audioPlayer.play(), { once: true });
        
        currentMusicId = musica.id;
        if (playImg) playImg.src = 'img/pause.png';

        const isLiked = likedSongIds.has(musica.id);
        playerLikeBtn.classList.toggle('active-like', isLiked);
    }

    function showSection(sectionToShow) {
        const allContentAreas = document.querySelectorAll('.main-content-section, #profile-section, #search-container, #account-section, #edit-info-section, #change-password-section');
        allContentAreas.forEach(section => section.classList.add('hidden'));
        if (sectionToShow) {
            if (sectionToShow instanceof NodeList || Array.isArray(sectionToShow)) {
                sectionToShow.forEach(section => section.classList.remove('hidden'));
            } else if (typeof sectionToShow === 'string') {
                const el = document.getElementById(sectionToShow);
                if (el) el.classList.remove('hidden');
            }
             else {
                sectionToShow.classList.remove('hidden');
            }
        }
    }

    function renderizarMusicasComoLista(container, musicas, songIdsInPlaylist = new Set(), queueSource = musicas, context = 'playlist') {
        if (!container) return;
        container.innerHTML = '';
        musicas.forEach((musica, index) => {
            const musicaElement = document.createElement('div');
            musicaElement.className = 'playlist-song-item';
            const finalCoverUrl = `http://localhost:3000/${musica.url_capa}`;
            
            // <<-- INÍCIO DA ALTERAÇÃO -->>
            // A lógica do botão agora é criada dinamicamente aqui
            let actionButtonHtml = '';
            if (context === 'playlist') {
                const isAdded = songIdsInPlaylist.has(musica.id);
                actionButtonHtml = `
                    <button class="add-song-to-playlist-btn" data-music-id="${musica.id}" data-action="${isAdded ? 'remove' : 'add'}">
                        <img src="img/${isAdded ? 'delete.png' : 'add.png'}" alt="${isAdded ? 'Remover' : 'Adicionar'}">
                    </button>
                `;
            } else { // context === 'search'
                actionButtonHtml = `
                    <button class="add-song-from-search-btn" data-music-id="${musica.id}">
                        <img src="img/add.png" alt="Adicionar à Playlist">
                    </button>
                `;
            }

            // O HTML da música usa a variável para inserir o botão correto
            musicaElement.innerHTML = `
                <img src="${finalCoverUrl}" class="song-cover" alt="Capa de ${musica.titulo}">
                <div class="song-info">
                    <h4>${musica.titulo}</h4>
                    <span>${musica.nome_autor}</span>
                </div>
                ${actionButtonHtml}
            `;
            // <<-- FIM DA ALTERAÇÃO -->>

            musicaElement.addEventListener('click', (event) => {
                // <<-- ALTERAÇÃO AQUI TAMBÉM -->>
                // Atualizado para ignorar o clique nos dois tipos de botão
                if (event.target.closest('.add-song-to-playlist-btn, .add-song-from-search-btn')) return;
                playFromQueue(queueSource, index);
            });
            container.appendChild(musicaElement);
        });
    }

    function abrirPlaylistView(playlistId) {
        currentOpenPlaylistId = playlistId;
        const token = localStorage.getItem('token');
        fetch(`http://localhost:3000/playlists/${playlistId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                currentPlaylistSongIds = new Set(data.songs.map(song => song.id));
                const finalCoverUrl = data.details.url_capa.startsWith('http') ? data.details.url_capa : `http://localhost:3000/${data.details.url_capa}`;
                document.getElementById('playlist-view-name').textContent = data.details.nome;
                document.getElementById('playlist-view-description').textContent = data.details.descricao;
                document.getElementById('playlist-view-cover').src = finalCoverUrl;
                const creatorEl = document.getElementById('playlist-view-creator');
                if(creatorEl) creatorEl.textContent = `Por: ${data.details.criador}`;
                const songsContainer = document.getElementById('playlist-view-songs-container');
                renderizarMusicasComoLista(songsContainer, data.songs, currentPlaylistSongIds, data.songs);
                showSection(playlistViewSection);
            });
    }

    function showSearchResults() {
        showSection('search-container');
        setActiveLink(null);
    }
    
    function showMainContent() {
     // Seleciona TODAS as seções que fazem parte da home
     const homeSections = document.querySelectorAll('.playlists-section, .personalized-section, .recently-played-section, #liked-songs-section');

     // Esconde todas as seções "de tela cheia" primeiro
     showSection(null);
     if(searchContainer) searchContainer.classList.add('hidden'); 

     // Mostra apenas as seções da home
     homeSections.forEach(s => s.classList.remove('hidden'));

     searchInput.value = '';
    }


    if (homeButton) {
        homeButton.addEventListener('click', (e) => {
            e.preventDefault();
            showMainContent();
            setActiveLink(null);
        });
    }

    function renderMusicCards(container, musicas, queueSource) {
    if (!container) return;
    container.innerHTML = '';
    musicas.forEach((musica, index) => {
        const card = document.createElement('div');
        card.className = 'content-card'; // Usaremos o estilo .content-card que já existe
        const finalCoverUrl = `http://localhost:3000/${musica.url_capa}`;
        const isLiked = likedSongIds.has(musica.id);
        const starIcon = isLiked ? 'estrela_preenchida.png' : 'estrela_vazia.png'; // Usaremos a estrela como ícone de curtir

        card.innerHTML = `
            <div class="like-button-container">
                <button class="control-btn like-btn" data-music-id="${musica.id}" aria-label="Curtir Música">
                    <img src="img/${starIcon}" alt="Curtir" />
                </button>
            </div>
            <img src="${finalCoverUrl}" alt="Capa da música ${musica.titulo}" />
            <div class="playlist-info">
                <h4>${musica.titulo}</h4>
                <span>${musica.nome_autor}</span>
            </div>
        `;
        card.addEventListener('click', (event) => {
            if (event.target.closest('.like-btn')) return;
            // Usa a lista original (queueSource) para a fila de reprodução
            playFromQueue(queueSource, queueSource.findIndex(item => item.id === musica.id));
        });
        container.appendChild(card);
    });
}

    function closeSidebarOnClickOutside(event) {
        if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && !menuToggleButton.contains(event.target)) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('shifted');
            musicPlayerFixed.classList.remove('shifted');
        }
    }

    if (menuToggleButton) {
        menuToggleButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('shifted');
            musicPlayerFixed.classList.toggle('shifted');
        });
    }

    document.addEventListener('click', closeSidebarOnClickOutside);

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#') {
                e.preventDefault();
                showMainContent();
            }
            setActiveLink(link);
        });
    });

    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('profile-section');
            carregarPlaylistsNoPerfil(); // <<-- ADICIONE ESTA CHAMADA
            profileMenu.classList.add('hidden');
            setActiveLink(null);
        });
    }

    if (accountLink) {
        accountLink.addEventListener('click', (e) => { e.preventDefault(); showSection('account-section'); profileMenu.classList.add('hidden'); setActiveLink(null); });
    }

    if (editInfoLink) {
        editInfoLink.addEventListener('click', (e) => { e.preventDefault(); showSection('edit-info-section'); });
    }

    if (changePasswordLink) {
        changePasswordLink.addEventListener('click', (e) => { e.preventDefault(); showSection('change-password-section'); });
    }

    if (backToAccountBtns) {
        backToAccountBtns.forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); showSection('account-section'); });
        });
    }
    
    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // ... coleta de email, sexo, pais, etc ...
            const email = document.getElementById('edit-email').value;
            const sexo = document.getElementById('edit-gender').value;
            const pais = document.getElementById('edit-country').value;
            const consentimento_marketing = document.getElementById('marketing-consent').checked;
            const telefoneInput = document.getElementById('edit-telefone');
            const telefoneNumeros = telefoneInput.value.replace(/\D/g, '');

            if (telefoneNumeros.length > 0 && (telefoneNumeros.length < 10 || telefoneNumeros.length > 11)) {
                alert('Por favor, insira um número de telefone válido com DDD (10 ou 11 dígitos).');
                return;
            }
            
            // Monta a data
            const formDateInputs = document.querySelector('.date-inputs');
            const diaInput = formDateInputs.querySelector('input[placeholder="Dia"]');
            const mesSelect = formDateInputs.querySelector('select');
            const anoInput = formDateInputs.querySelector('input[placeholder="Ano"]');

            // --- INÍCIO DA VALIDAÇÃO DE DATA ---
            const dia = parseInt(diaInput.value, 10);
            const mesIndex = mesSelect.selectedIndex;
            const ano = parseInt(anoInput.value, 10);
            
            // Verifica se os campos de data foram preenchidos
            if (diaInput.value && anoInput.value) {
                if (isNaN(dia) || isNaN(ano) || dia < 1 || dia > 31 || mesIndex < 0 || ano < 1900 || ano > new Date().getFullYear()) {
                    alert('Por favor, insira uma data de nascimento válida.');
                    return; // Impede o envio do formulário
                }
            }
            // --- FIM DA VALIDAÇÃO DE DATA ---

            const diaFormatado = diaInput.value.padStart(2, '0');
            const mesFormatado = (mesIndex + 1).toString().padStart(2, '0');
            const data_nascimento = `${ano}-${mesFormatado}-${diaFormatado}`;
            
            const body = { email, sexo, data_nascimento, pais, consentimento_marketing, telefone: telefoneNumeros };

            // Envia para o backend (sem a senha)
            fetch('http://localhost:3000/perfil/info', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
            })
            .catch(error => {
                console.error("Erro ao atualizar perfil:", error);
                alert("Ocorreu um erro ao atualizar o perfil.");
            });
        });
    }

    // Listener para o link "Explorar Músicas"
    if (exploreSongsLink) {
        exploreSongsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(allSongsSection); // Mostra a nova seção
            setActiveLink(exploreSongsLink); // Marca o link como ativo

            // Busca todas as músicas e as renderiza
            fetch('http://localhost:3000/musicas', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(todasAsMusicas => {
                    // Usamos a função renderizarMusicasComoLista que já existe!
                    // O contexto 'search' garante que o botão de adicionar apareça
                    renderizarMusicasComoLista(allSongsContainer, todasAsMusicas, new Set(), todasAsMusicas, 'search');
                });
        });
    }

    // Listener para o novo link "Início" (melhora a navegação)
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            showMainContent();
            setActiveLink(homeLink);
        });
    }

    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Verifica se todos os critérios de senha são válidos
            const allCriteriaValid = Object.values(criteriaList).every(item => item.classList.contains('valid'));

            if (!allCriteriaValid) {
                alert('A nova senha não atende a todos os requisitos de segurança.');
                return; // Impede o envio do formulário
            }

            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;

            if (newPassword !== confirmNewPassword) {
                alert('A nova senha e a confirmação não coincidem.');
                return;
            }

            // O fetch só é executado se todas as validações passarem
            fetch('http://localhost:3000/perfil/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.success) {
                    passwordChangeForm.reset(); // Limpa o formulário
                    // Reseta os indicadores visuais para o estado inicial
                    Object.values(criteriaList).forEach(item => item.classList.remove('valid'));
                    showSection('account-section'); // Volta para a tela da conta
                }
            })
            .catch(error => {
                console.error('Erro ao alterar senha:', error);
                alert('Ocorreu um erro na comunicação com o servidor.');
            });
        });
    }

    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', (e) => { e.preventDefault(); /* ... */ });
    }
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const telefoneInput = document.getElementById('edit-telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            // 1. Remove tudo que não for dígito
            let value = e.target.value.replace(/\D/g, '');

            // 2. Limita o tamanho para 11 dígitos (celular com DDD)
            value = value.substring(0, 11);

            // 3. Aplica a máscara (XX) XXXXX-XXXX
            let formattedValue = '';
            if (value.length > 0) {
                formattedValue = '(' + value.substring(0, 2);
            }
            if (value.length > 2) {
                formattedValue += ') ' + value.substring(2, 7);
            }
            if (value.length > 7) {
                formattedValue += '-' + value.substring(7, 11);
            }

            // 4. Atualiza o valor no campo
            e.target.value = formattedValue;
        });
    }

    userProfileCard.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('hidden'); });

        // Listener para o botão 'Cancelar' do novo modal
    if(btnCancelSelectPlaylist) {
        btnCancelSelectPlaylist.addEventListener('click', () => {
            selectPlaylistModal.classList.add('hidden');
        });
    }

    // Listener principal que abre o modal de seleção
    document.body.addEventListener('click', function(event) {
        const addBtn = event.target.closest('.add-song-from-search-btn');
        if (addBtn) {
            songIdToAddToPlaylist = addBtn.dataset.musicId; // Guarda o ID da música

            // Busca as playlists do usuário
            fetch('http://localhost:3000/playlists', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(playlists => {
                    playlistSelectionList.innerHTML = ''; // Limpa a lista anterior
                    if (playlists.length === 0) {
                        playlistSelectionList.innerHTML = '<p>Você ainda não criou nenhuma playlist.</p>';
                    } else {
                        playlists.forEach(playlist => {
                            const playlistElement = document.createElement('div');
                            playlistElement.className = 'selectable-playlist-item'; // Nova classe para estilização
                            playlistElement.dataset.playlistId = playlist.id;

                            const finalCoverUrl = playlist.url_capa.startsWith('http') ? playlist.url_capa : `http://localhost:3000${playlist.url_capa}`;

                            playlistElement.innerHTML = `
                                <img src="${finalCoverUrl}" alt="Capa da ${playlist.nome}">
                                <span>${playlist.nome}</span>
                            `;
                            playlistSelectionList.appendChild(playlistElement);
                        });
                    }
                    selectPlaylistModal.classList.remove('hidden'); // Mostra o modal
                });
        }
    });

    // Listener para quando o usuário clica em uma playlist no modal
    if(playlistSelectionList) {
        playlistSelectionList.addEventListener('click', function(event) {
            const selectedPlaylist = event.target.closest('.selectable-playlist-item');
            if (selectedPlaylist) {
                const playlistId = selectedPlaylist.dataset.playlistId;

                // Envia a requisição para adicionar a música
                fetch(`http://localhost:3000/playlists/${playlistId}/musicas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ musicaId: songIdToAddToPlaylist })
                })
                .then(res => res.json())
                .then(data => {
                    alert(data.message); // Exibe a mensagem de sucesso ou erro
                    if(data.success) {
                        selectPlaylistModal.classList.add('hidden'); // Fecha o modal
                    }
                });
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (!userProfileCard.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('token'); window.location.href = 'login.html'; });
    }

    if (newPlaylistBtn) {
        newPlaylistBtn.addEventListener('click', () => modalCreatePlaylist.classList.remove('hidden'));
    }

    if (btnCancelCreate) {
        btnCancelCreate.addEventListener('click', () => {
            modalCreatePlaylist.classList.add('hidden');
            createPlaylistForm.reset();
            coverPreview.src = 'img/new.png';
        });
    }

    function carregarPlaylistsNoPerfil() {
        const gridContainer = document.getElementById('profile-playlists-grid');
        const statsElement = document.querySelector('.profile-stats');
        const noPlaylistsMessage = document.getElementById('no-playlists-message');

        fetch('http://localhost:3000/playlists', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(playlists => {
                // Atualiza o contador de playlists
                if (statsElement) {
                    statsElement.textContent = `${playlists.length} playlists públicas • 0 seguindo`;
                }

                // Limpa o grid antes de adicionar novos itens
                gridContainer.innerHTML = '';

                if (playlists.length === 0) {
                    // Mostra a mensagem se não houver playlists
                    if (noPlaylistsMessage) noPlaylistsMessage.classList.remove('hidden');
                } else {
                    if (noPlaylistsMessage) noPlaylistsMessage.classList.add('hidden');

                    playlists.forEach(playlist => {
                        const card = document.createElement('div');
                        card.className = 'profile-playlist-card'; // Estilo já existente no CSS
                        const finalCoverUrl = playlist.url_capa.startsWith('http') ? playlist.url_capa : `http://localhost:3000${playlist.url_capa}`;

                        card.innerHTML = `
                            <img src="${finalCoverUrl}" alt="Capa de ${playlist.nome}" class="playlist-cover">
                            <h4 class="playlist-title">${playlist.nome}</h4>
                            <span class="playlist-creator">Por Você</span>
                        `;

                        // Adiciona o evento de clique para abrir a visualização da playlist
                        card.addEventListener('click', () => abrirPlaylistView(playlist.id));

                        gridContainer.appendChild(card);
                    });
                }
            });
    }

    function criarPlaylist(nome, descricao, urlCapa) {
        const token = localStorage.getItem('token');
        fetch('http://localhost:3000/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nome, descricao, url_capa: urlCapa })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                createPlaylistForm.reset();
                coverPreview.src = 'img/new.png';
                modalCreatePlaylist.classList.add('hidden');
                carregarPlaylistsDoUsuario();
            } else {
                alert(`Erro: ${data.message}`);
            }
        });
    }

    const btnCreateFinal = document.getElementById('btn-create-playlist-final');
    if (btnCreateFinal) {
        btnCreateFinal.addEventListener('click', () => {
            const nome = document.getElementById('playlist-name').value.trim();
            if (!nome) return alert('O nome da playlist é obrigatório.');
            const descricao = document.getElementById('playlist-description').value.trim();
            const coverFile = playlistCoverInput.files[0];

            if (coverFile) {
                const formData = new FormData();
                formData.append('capaPlaylist', coverFile);
                fetch('http://localhost:3000/upload', { method: 'POST', body: formData })
                    .then(res => res.json())
                    .then(uploadData => {
                        if (uploadData.success) criarPlaylist(nome, descricao, uploadData.filePath);
                        else alert('Erro no upload da imagem: ' + uploadData.message);
                    });
            } else {
                criarPlaylist(nome, descricao, '/capas/default_cover.png');
            }
        });
    }

    if (btnDeletePlaylist) {
        btnDeletePlaylist.addEventListener('click', () => {
            if (!currentOpenPlaylistId) return;
            if (confirm("Tem certeza que deseja deletar esta playlist?")) {
                const token = localStorage.getItem('token');
                fetch(`http://localhost:3000/playlists/${currentOpenPlaylistId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) {
                        showMainContent();
                        carregarPlaylistsDoUsuario();
                    }
                });
            }
        });
    }

    const moodTab = document.querySelector('.mood-tab-fixed');
    const moodPopup = document.querySelector('.mood-popup');
    if (moodTab && moodPopup) {
        moodTab.addEventListener('click', (e) => { e.stopPropagation(); moodPopup.classList.toggle('active'); });
        document.addEventListener('click', (event) => {
            if (!moodPopup.contains(event.target) && !moodTab.contains(event.target)) {
                moodPopup.classList.remove('active');
            }
        });
    }

    // --- LÓGICA DE BUSCA AUTOMÁTICA (LIVE SEARCH) COM DEBOUNCE ---
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();

        // Cancela o timer anterior a cada nova tecla digitada
        clearTimeout(debounceTimer);

        // Inicia um novo timer
        debounceTimer = setTimeout(() => {
            // A busca só é executada se a pesquisa tiver 2+ caracteres ou estiver vazia
            if (query.length > 1 || query.length === 0) {
                performSearch(query);
            }
        }, 350); // Atraso de 350 milissegundos após a última tecla
    });
    
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Configurações do reconhecimento de voz
        recognition.lang = 'pt-BR';      // Define o idioma para Português do Brasil
        recognition.interimResults = false; // Retorna apenas o resultado final
        recognition.maxAlternatives = 1;    // Retorna apenas a melhor transcrição

        // Ação ao clicar no botão de microfone
        voiceSearchBtn.addEventListener('click', () => {
            recognition.start(); // Inicia a escuta
        });

        // Evento quando a escuta começa
        recognition.onstart = () => {
            voiceSearchBtn.classList.add('listening'); // Adiciona uma classe para feedback visual
            searchInput.placeholder = 'Ouvindo...';
        };
        
        // Evento quando a escuta termina
        recognition.onend = () => {
            voiceSearchBtn.classList.remove('listening');
            searchInput.placeholder = 'O que você quer ouvir?';
        };

        // Evento principal: quando um resultado é obtido
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            
            // <<-- CORREÇÃO PRINCIPAL -->>
            // Executa a busca automaticamente com o texto capturado
            performSearch(transcript); 
        };

        // Evento em caso de erro
        recognition.onerror = (event) => {
            console.error('Erro de reconhecimento de voz:', event.error);
            searchInput.placeholder = 'Erro! Tente novamente.';
        };

    } catch (e) {
        // Se o navegador não suportar a API, esconde o botão
        console.error("Speech Recognition API não é suportada neste navegador.", e);
        if(voiceSearchBtn) voiceSearchBtn.style.display = 'none';
    }


    let lastVolume = 1;
    let isSeeking = false;

    audioPlayer.addEventListener('loadedmetadata', () => {
        totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
        seekSlider.max = audioPlayer.duration;
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (!isSeeking) {
            seekSlider.value = audioPlayer.currentTime;
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);

            // --- INÍCIO DA ADIÇÃO ---
            // Calcula a porcentagem de progresso
            if (audioPlayer.duration) {
                const progressPercent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                // Atualiza a variável CSS no elemento da barra
                seekSlider.style.setProperty('--seek-before-width', `${progressPercent}%`);
            }
            // --- FIM DA ADIÇÃO ---
        }
    });
    seekSlider.addEventListener('mousedown', () => { isSeeking = true; });
    seekSlider.addEventListener('mouseup', () => {
        isSeeking = false;
        audioPlayer.currentTime = seekSlider.value;
    });
    seekSlider.addEventListener('input', () => {
        currentTimeDisplay.textContent = formatTime(seekSlider.value);
    });
    volumeSlider.addEventListener('input', () => {
        audioPlayer.volume = volumeSlider.value / 100;
        lastVolume = audioPlayer.volume;
        volumeIcon.src = (audioPlayer.volume === 0 || audioPlayer.muted) ? 'img/mute.png' : 'img/volume.png';
    });
    muteBtn.addEventListener('click', () => {
        audioPlayer.muted = !audioPlayer.muted;
        volumeSlider.value = audioPlayer.muted ? 0 : lastVolume * 100;
        volumeIcon.src = audioPlayer.muted ? 'img/mute.png' : 'img/volume.png';
    });
    playBtn.addEventListener('click', () => {
        if (audioPlayer.src && !audioPlayer.src.endsWith('/')) {
            if (audioPlayer.paused) audioPlayer.play();
            else audioPlayer.pause();
        }
    });
    audioPlayer.onplay = () => playImg.src = 'img/pause.png';
    audioPlayer.onpause = () => playImg.src = 'img/play.png';
    
    nextBtn.addEventListener('click', playNextSong);
    backBtn.addEventListener('click', playPreviousSong);
    audioPlayer.addEventListener('ended', playNextSong);
    
    // Simulações de formulários de perfil
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const avatarFile = profileAvatarInput.files[0];

            if (!avatarFile) {
                // Se nenhum arquivo foi selecionado, podemos apenas salvar outras informações no futuro.
                alert("Nenhuma nova imagem selecionada. Outras informações do perfil salvas!");
                return;
            }

            const formData = new FormData();
            formData.append('avatar', avatarFile);

            fetch('http://localhost:3000/perfil/avatar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.success) {
                    // Atualiza as imagens na tela com o novo caminho
                    const newAvatarUrl = `http://localhost:3000${data.filePath}`;
                    document.querySelector('.user-profile .profile-pic').src = newAvatarUrl;
                    document.getElementById('profile-avatar-preview').src = newAvatarUrl;
                }
            })
            .catch(error => {
                console.error("Erro ao enviar avatar:", error);
                alert("Ocorreu um erro ao enviar a imagem.");
            });
        });
    }
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => { /*...*/ });
        }

    if (moodPopup) {
        moodPopup.addEventListener('click', (e) => {
            const clickedItem = e.target;

            // Se clicou em um item de menu (LI)
            if (clickedItem.tagName === 'LI') {
                const selectedMood = clickedItem.textContent.trim();

                // Lógica do primeiro estágio (selecionando o humor atual)
                if (!moodOriginSelection) {
                    moodOriginSelection = selectedMood;
                    
                    // Esconde o estágio 1 e mostra o estágio 2
                    moodOrigin.classList.add('hidden');
                    moodDestination.classList.remove('hidden');

                } else { // Lógica do segundo estágio (selecionando o humor desejado)
                    const moodDestinationSelection = selectedMood;

                    // Chama a nova função para buscar e renderizar a jornada
                    renderizarJornadaDeHumor(moodOriginSelection, moodDestinationSelection);
                    
                    // Reseta e fecha o popup
                    moodPopup.classList.remove('active');
                    setTimeout(() => { // Adiciona um pequeno delay para a transição ficar mais suave
                        moodOriginSelection = null;
                        moodOrigin.classList.remove('hidden');
                        moodDestination.classList.add('hidden');
                    }, 300);
                }
            }
        });
    }
    
    // Adiciona a lógica para o novo botão "Voltar"
    if (moodBackBtn) {
        moodBackBtn.addEventListener('click', () => {
            moodOriginSelection = null;
            moodDestination.classList.add('hidden');
            moodOrigin.classList.remove('hidden');
        });
    }

    function renderizarJornadaDeHumor(de, para) {
        const container = document.getElementById('journey-container'); // Usaremos o novo ID do Passo 2
        const subtitle = document.getElementById('journey-subtitle');
        const highlight = document.getElementById('journey-highlight');

        if (subtitle) subtitle.textContent = `Sua Jornada de`;
        if (highlight) highlight.textContent = `${de} → ${para}`;
        if (container) container.innerHTML = '<p style="color: var(--cinza-claro);">Criando sua jornada...</p>';

        fetch(`http://localhost:3000/recomendacao/jornada?de=${de}&para=${para}`)
            .then(res => res.json())
            .then(musicas => {
                if(!musicas || musicas.length === 0){
                    if (container) container.innerHTML = '<p style="color: var(--cinza-claro);">Não foi possível criar uma jornada com músicas suficientes. Tente outra combinação.</p>';
                    return;
                }

                // --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
                // Adaptamos os dados recebidos para o formato que renderMusicCards espera.
                const correctedMusicas = musicas.map(song => {
                    return {
                        ...song, // Copia todas as propriedades originais da música
                        nome_autor: song.autores // Cria a propriedade 'nome_autor' com o valor de 'autores'
                    };
                });
                
                // Agora passamos os dados corrigidos para a função de renderização
                renderMusicCards(container, correctedMusicas, correctedMusicas);
                // --- FIM DA CORREÇÃO ---

            })
            .catch(error => {
                console.error("Erro ao buscar jornada:", error);
                if (container) container.innerHTML = '<p style="color: var(--cinza-claro);">Ocorreu um erro ao criar sua jornada.</p>';
            });
    }

    if (sidebarGenresList) {
        sidebarGenresList.addEventListener('click', (e) => {
            e.preventDefault();

            // Verifica se o clique foi em um link <a> dentro de um <li>
            const clickedLink = e.target.closest('a');
            if (!clickedLink) return;

            // Pega o nome do gênero a partir do texto do link
            const nomeGenero = clickedLink.textContent.trim();

            // Atualiza o título da seção
            genreViewTitle.textContent = nomeGenero;

            // Mostra a seção de gênero e esconde as outras
            showSection(genreViewSection);
            setActiveLink(clickedLink);

            // Busca as músicas do gênero no backend
            fetch(`http://localhost:3000/musicas/genero/${nomeGenero}`)
                .then(res => res.json())
                .then(musicas => {
                    // Usa a nossa função reutilizável para renderizar os cards
                    renderMusicCards(genreViewContainer, musicas, musicas);
                });
        });
    }

    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMainContent();
            setActiveLink(homeLink); // Reutiliza o link 'Início' para marcar como ativo
        });
    }

    // --- LÓGICA DE VALIDAÇÃO DE SENHA EM TEMPO REAL ---
    const newPasswordInput = document.getElementById('new-password');
    const criteriaList = {
        length: document.getElementById('length-check'),
        lowercase: document.getElementById('lowercase-check'),
        uppercase: document.getElementById('uppercase-check'),
        number: document.getElementById('number-check'),
        special: document.getElementById('special-check')
    };

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value;

            // Critério 1: Comprimento
            const isLengthValid = password.length >= 8;
            criteriaList.length.classList.toggle('valid', isLengthValid);

            // Critério 2: Letra Minúscula
            const hasLowercase = /[a-z]/.test(password);
            criteriaList.lowercase.classList.toggle('valid', hasLowercase);

            // Critério 3: Letra Maiúscula
            const hasUppercase = /[A-Z]/.test(password);
            criteriaList.uppercase.classList.toggle('valid', hasUppercase);

            // Critério 4: Número
            const hasNumber = /[0-9]/.test(password);
            criteriaList.number.classList.toggle('valid', hasNumber);

            // Critério 5: Caractere Especial
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            criteriaList.special.classList.toggle('valid', hasSpecial);
        });
    }

    // --- LÓGICA PARA MOSTRAR/OCULTAR SENHA ---
    const passwordToggleIcons = document.querySelectorAll('.password-toggle-icon');

    passwordToggleIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Encontra o campo de senha associado ao ícone
            const passwordInput = icon.previousElementSibling;

            if (passwordInput.type === 'password') {
                // Mostra a senha
                passwordInput.type = 'text';
                icon.src = 'img/eye-closed.png'; // Altera para o ícone de olho riscado
            } else {
                // Oculta a senha
                passwordInput.type = 'password';
                icon.src = 'img/eye-open.png'; // Altera de volta para o ícone de olho aberto
            }
        });
    });

    // --- NOVA FUNÇÃO PARA RENDERIZAR PLAYLISTS COMO CARDS ---
    function renderizarPlaylistsComoCard(container, playlists) {
        if (!container) return;
        container.innerHTML = '';

        if (playlists.length === 0) {
            container.innerHTML = '<p class="no-results-message">Nenhuma playlist encontrada.</p>';
            return;
        }

        playlists.forEach(playlist => {
            const card = document.createElement('div');
            card.className = 'playlist-card'; // Reutiliza o estilo de card de playlist
            const finalCoverUrl = playlist.url_capa.startsWith('http') ? playlist.url_capa : `http://localhost:3000${playlist.url_capa}`;

            card.innerHTML = `
                <img src="${finalCoverUrl}" alt="Capa da Playlist: ${playlist.nome}" />
                <div class="playlist-info">
                    <h4>${playlist.nome}</h4>
                    <span>De: ${playlist.criador}</span>
                </div>
            `;
            card.addEventListener('click', () => abrirPlaylistView(playlist.id));
            container.appendChild(card);
        });
    }

    // --- LÓGICA DOS BOTÕES DE FILTRO DA BUSCA ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona a classe 'active' apenas ao botão clicado
            button.classList.add('active');

            // Executa a busca novamente com o novo filtro ativo
            performSearch(searchInput.value.trim());
        });
    });

    // --- LÓGICA PARA EXCLUSÃO DE CONTA ---
    if (deleteAccountLink) {
        // Abre o modal de confirmação
        deleteAccountLink.addEventListener('click', (e) => {
            e.preventDefault();
            deleteAccountModal.classList.remove('hidden');
        });
    }

    if (btnCancelDelete) {
        // Fecha o modal ao clicar em "Cancelar"
        btnCancelDelete.addEventListener('click', () => {
            deleteAccountModal.classList.add('hidden');
        });
    }

    if (btnConfirmDelete) {
        // Executa a exclusão ao confirmar
        btnConfirmDelete.addEventListener('click', () => {
            fetch('http://localhost:3000/perfil', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.success) {
                    // Limpa o token e redireciona para o login
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }
            })
            .catch(error => {
                console.error("Erro ao excluir conta:", error);
                alert("Ocorreu um erro ao tentar excluir a conta.");
                deleteAccountModal.classList.add('hidden');
            });
        });
    }

    carregarTocadasRecentemente();
    carregarMusicasCurtidas();
    carregarPlaylistsDoUsuario();
}
});