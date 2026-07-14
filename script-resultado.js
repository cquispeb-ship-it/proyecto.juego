// Cargar estadísticas guardadas del LocalStorage local de la partida actual
function cargarResultados() {
    const listContainer = document.getElementById('statsList');
    
    const p1Blocks = localStorage.getItem('p1_blocks') || 0;
    const p2Blocks = localStorage.getItem('p2_blocks') || 0;
    
    listContainer.innerHTML = `
        <div class="stat-row">
            <span style="color: #ef4444; font-weight: bold;">Jugador 1</span>
            <span>${p1Blocks} bloques colocados</span>
        </div>
        <div class="stat-row">
            <span style="color: #3b82f6; font-weight: bold;">Jugador 2</span>
            <span>${p2Blocks} bloques colocados</span>
        </div>
    `;
}

// Actualizar al abrir
cargarResultados();