const config = {
    fieldFilter: '',
    listPlayers: [],
    weeklyPlayers: [],
    wipePlayers: [],
    showWeekly: false,
    showWipe: false,
    pagination: {
        perPage: calculatePlayersPerPage(),
        currentPage: 1,
        totalPages: 0
    },
    urls: {
        general: 'https://raw.githubusercontent.com/SC-KOTH/Rank/main/resultado.txt',
        weekly: 'https://raw.githubusercontent.com/SC-KOTH/Rank/main/resultado2.txt',
        wipe: 'https://raw.githubusercontent.com/SC-KOTH/Rank/main/resultadoWipe.txt'
    }
};

async function loadPlayersData() {
    try {
        const [generalResponse, weeklyResponse, wipeResponse] = await Promise.all([
            fetch(config.urls.general).then(res => res.json()),
            fetch(config.urls.weekly).then(res => res.json()),
            fetch(config.urls.wipe).then(res => res.json())
        ]);

        const uidToInitialPlayer = {};
        generalResponse.forEach(player => {
            uidToInitialPlayer[player.uid] = player;
        });

        const processPlayers = (finalPlayers) => {
            return finalPlayers.map(finalPlayer => {
                const initialPlayer = uidToInitialPlayer[finalPlayer.uid];
                if (initialPlayer) {
                    const kills = Math.abs(initialPlayer.kills - finalPlayer.kills, 0);
                    const deaths = Math.abs(initialPlayer.deaths - finalPlayer.deaths, 0);
                    const kd = deaths !== 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
                    if (initialPlayer.name == "BD") {
                        
                    }
                    return {
                        ...finalPlayer,
                        name: initialPlayer.name, // Mantém o nome do ranking geral
                        kills,
                        deaths,
                        longestShot: initialPlayer.longestShot,
                        headshotLongest: initialPlayer.headshotLongest,
                        killStreak: initialPlayer.killStreak,
                        kd
                    };
                }
                return null;
            }).filter(player => player !== null).sort((a, b) => b.kills - a.kills);
        };

        config.listPlayers = generalResponse.sort((a, b) => b.kills - a.kills).map((p, i) => ({
            ...p,
            position: i + 1,
            kd: p.deaths !== 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2)
        }));

        config.weeklyPlayers = processPlayers(weeklyResponse).map((player, index) => ({
            ...player,
            position: index + 1
        }));

        config.wipePlayers = processPlayers(wipeResponse).map((player, index) => ({
            ...player,
            position: index + 1
        }));
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

function calculatePlayersPerPage() {
    const screenHeight = window.innerHeight;
    return Math.floor(screenHeight / 60);
}

const table = document.querySelector('#table-body');
const input = document.querySelector('#search-input');
input.addEventListener('input', filterPlayers);

const pagePrevious = document.querySelector('#prev-page');
pagePrevious.addEventListener('click', () => handlePagination('<'));

const pageNext = document.querySelector('#next-page');
pageNext.addEventListener('click', () => handlePagination('>'));

function paginate(array, pageSize, pageNumber) {
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return array.slice(startIndex, endIndex);
}

function clearTable() {
    table.innerHTML = '';
}

function filterPlayers() {
    config.fieldFilter = input.value.toLowerCase().replace(/\s+/g, '');
    config.pagination.currentPage = 1;
    main();
}

function updatePaginationButtons() {
    pagePrevious.disabled = config.pagination.currentPage <= 1;
    pageNext.disabled = config.pagination.currentPage >= config.pagination.totalPages;
}

function handlePagination(type) {
    if (type === '>' && config.pagination.currentPage < config.pagination.totalPages) {
        config.pagination.currentPage++;
    } else if (type === '<' && config.pagination.currentPage > 1) {
        config.pagination.currentPage--;
    }

    main();
}

async function main() {
    if (!config.listPlayers.length) {
        await loadPlayersData();
    }

    const players = config.showWeekly ? config.weeklyPlayers :
                    config.showWipe ? config.wipePlayers : config.listPlayers;

    const filtered = players.filter(p =>
        (p.name && p.name.toLowerCase().replace(/\s+/g, '').includes(config.fieldFilter)) ||
        (p.uid && p.uid.includes(config.fieldFilter))
    );

    const filteredAndSorted = sortPlayers(filtered);

    // Remover a atribuição de posição se houver um filtro ativo
    if (!config.fieldFilter) {
        // Re-atribuir posições após a ordenação
        filteredAndSorted.forEach((player, index) => {
            player.position = index + 1; // Atualiza a posição apenas se não houver filtro
        });
    }

    config.pagination.totalPages = Math.ceil(filteredAndSorted.length / config.pagination.perPage);
    updatePaginationButtons();

    const paginated = paginate(filteredAndSorted, config.pagination.perPage, config.pagination.currentPage);

    clearTable();
    paginated.forEach(createRow);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        config.pagination.perPage = calculatePlayersPerPage();
        config.pagination.currentPage = 1;
        clearTable();
        main();
    }, 200);
});

main();

const sortData = {
    column: "",
    order: "" // "asc" for crescente, "desc" for decrescente
};
function sortPlayers(players) {
    const { column, order } = sortData;
    if (column && order) { // Excluir 'position' da ordenação
        const sorted = [...players];

        sorted.sort((a, b) => {
            const aValue = a[column] || 0; // Se undefined, assume como 0
            const bValue = b[column] || 0; // Se undefined, assume como 0

            if (order === "asc") {
                return bValue - aValue; // Ordem decrescente
            } else {
                return aValue - bValue; // Ordem crescente
            }
        });

        return sorted;
    }
    return players; // Se nada para ordenar, retorna os jogadores sem alterações
}


const sortIcons = document.querySelectorAll(".sort-icon");
sortIcons.forEach(icon => {
    icon.addEventListener("click", event => {
        const clickedColumn = event.target.getAttribute("data-column");
        if (clickedColumn === sortData.column) {
            sortData.order = sortData.order === "asc" ? "desc" : "asc";
        } else {
            sortData.column = clickedColumn;
            sortData.order = "asc";
        }
        
        const filtered = config.listPlayers.filter(p =>
            p.name.toLowerCase().replace(/\s+/g, '').includes(config.fieldFilter) ||
            p.uid.includes(config.fieldFilter)
        );
        
        sortPlayers(filtered); // Passa a lista filtrada para a função de ordenação
        config.pagination.currentPage = 1;
        main(); // Gera a tabela com jogadores filtrados e ordenados
    });
});

// Adicione um evento de clique ao título para recarregar a página
const title = document.getElementById('title');
title.addEventListener('click', () => {
    location.reload(); // Recarrega a página
});

// Função para alternar entre ranking geral, ranking semanal e ranking Wipe
function toggleRanking(type) {
    config.showWeekly = type === 'weekly';
    config.showWipe = type === 'wipe';
    config.pagination.currentPage = 1;

    toggleGeneralButton.classList.remove('selected');
    toggleWeeklyButton.classList.remove('selected');
    toggleWipeButton.classList.remove('selected');

    if (config.showWeekly) {
        toggleWeeklyButton.classList.add('selected');
    } else if (config.showWipe) {
        toggleWipeButton.classList.add('selected');
    } else {
        toggleGeneralButton.classList.add('selected');
    }

    main();
}

const toggleGeneralButton = document.getElementById('toggle-general');
const toggleWeeklyButton = document.getElementById('toggle-weekly');
const toggleWipeButton = document.getElementById('toggle-wipe');

toggleGeneralButton.addEventListener('click', () => toggleRanking('general'));
toggleWeeklyButton.addEventListener('click', () => toggleRanking('weekly'));
toggleWipeButton.addEventListener('click', () => toggleRanking('wipe'));

// Função para criar linhas da tabela
const createRow = (player) => {
    const row = document.createElement('tr');

    // Inicializa o conteúdo da posição
    let positionContent = '';
    let positionClass = ''; // Variável para a classe da posição

    // Adiciona o ícone se a posição for 1, 2 ou 3
    if (player.position === 1) {
        positionContent = `${player.position}º  <i class="fa fa-trophy" aria-hidden="true" style="color: gold;"></i>`;
        positionClass = 'first'; // Classe para a primeira posição
    } else if (player.position === 2) {
        positionContent = `${player.position}º  <i class="fa fa-trophy" aria-hidden="true" style="color: silver;"></i>`;
        positionClass = 'second'; // Classe para a segunda posição
    } else if (player.position === 3) {
        positionContent = `${player.position}º  <i class="fa fa-trophy" aria-hidden="true" style="color: #cd7f32;"></i>`;
        positionClass = 'third'; // Classe para a terceira posição
    } else {
        positionContent = `${player.position}º     `; // Exibe a numeração normalmente para outras posições
    }

    // Cria o HTML da linha, incluindo a classe na posição
    row.innerHTML = `
        <td class="${positionClass}">${positionContent}</td>
        <td><strong class="player-name" data-uid="${player.uid}">${player.name}</strong></td>
        <td>${player.kills}</td>
        <td>${player.deaths}</td>
        <td>${player.longestShot || '-'}</td>
        <td>${player.headshotLongest || '-'}</td>
        <td>${player.killStreak || '-'}</td>
        <td>${player.kd}</td>
    `;
    table.appendChild(row);
};

// Adicione event listener para copiar o UID ao clicar com o botão direito
document.addEventListener('contextmenu', (event) => {
    const playerNameElement = event.target.closest('.player-name');
    if (playerNameElement) {
        event.preventDefault();
        const uid = playerNameElement.getAttribute('data-uid');
        if (uid) {
            navigator.clipboard.writeText(uid).then(() => {
                alert('UID copiado: ' + uid);
            }).catch(err => {
                console.error('Erro ao copiar UID: ', err);
            });
        }
    }
});