// === 1. CONFIGURACIÓN DE SUPABASE Y LOCALSTORAGE ===
const SUPABASE_URL = "https://buwhrscaxqlopqmrnjiy.supabase.co";

const SUPABASE_KEY = "sb_publishable_0koEgBnZ0kgqx3cYmJVH1Q_0GYHi_7x"; 

const salaId = localStorage.getItem('salaId');
const username = localStorage.getItem('username') || 'Piloto';
const faction = localStorage.getItem('faction') || 'gato'; // gato o perro
const playerRole = localStorage.getItem('playerRole') || 'p1'; // p1 o p2

let supabaseClient; 
let channel;
const remotePlayers = {};
const bullets = []; // Mis balas locales
const remoteBullets = []; // Balas del oponente

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// === 2. PROPIEDADES DE JUGADORES ===
const localPlayer = {
    id: playerRole,
    name: username,
    faction: faction,
    x: playerRole === 'p1' ? 100 : window.innerWidth - 150,
    y: window.innerHeight / 2,
    size: 50,
    speed: faction === 'gato' ? 7 : 5, // Gato vuela más rápido
    hp: 100,
    maxHp: 100,
    color: faction === 'gato' ? '#ffb703' : '#219ebc'
};

// === 3. CONEXIÓN EN RED ===
try {
    if (SUPABASE_KEY && !SUPABASE_KEY.includes("PEGA_AQUÍ")) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Canal dinámico único para la sala actual
        channel = supabaseClient.channel(`sala-${salaId}`, { 
            config: { broadcast: { self: false } } 
        });
        
        channel
          .on('broadcast', { event: 'movimiento' }, ({ payload }) => { 
              remotePlayers[payload.id] = payload; 
              actualizarUI();
          })
          .on('broadcast', { event: 'disparo' }, ({ payload }) => { 
              remoteBullets.push(payload); 
          })
          .on('broadcast', { event: 'danio' }, ({ payload }) => { 
              if (payload.targetId === localPlayer.id) {
                  localPlayer.hp = Math.max(0, localPlayer.hp - payload.amount);
                  actualizarUI();
                  comprobarFinDeJuego();
              }
          })
          .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                  // Notificar presencia al entrar
                  channel.send({ type: 'broadcast', event: 'movimiento', payload: localPlayer });
              }
          });
    }
} catch (e) {
    console.error("Error de conexión:", e);
}

// === 4. DISEÑO DE PERSONAJES ANIME (DIBUJO VECTORIAL) ===
function dibujarAvionAnime(ctx, x, y, size, bando, name) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    
    // Si es jugador 2, mirará hacia la izquierda
    if (playerRole === 'p2' && bando === faction || playerRole === 'p1' && bando !== faction) {
        ctx.scale(-1, 1);
    }

    if (bando === 'gato') {
        // Cabina/Cuerpo Avión Neko
        ctx.fillStyle = '#f8ad9d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Orejas de gato anime en el fuselaje
        ctx.fillStyle = '#f4978e';
        ctx.beginPath();
        ctx.moveTo(-10, -12); ctx.lineTo(-15, -25); ctx.lineTo(0, -14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -12); ctx.lineTo(0, -25); ctx.lineTo(12, -12);
        ctx.fill();

        // Alas propulsoras amarillas
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(-30, -35); ctx.lineTo(-20, -35);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(-30, 35); ctx.lineTo(-20, 35);
        ctx.fill();

        // Ojitos anime tiernos
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(10, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(11, -4, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {
        // Avión Militar Perro (Inu)
        ctx.fillStyle = '#8ecae6';
        ctx.beginPath();
        ctx.rect(-20, -15, 40, 30);
        ctx.fill();

        // Nariz del avión redondeada
        ctx.fillStyle = '#219ebc';
        ctx.beginPath();
        ctx.arc(20, 0, 15, -Math.PI/2, Math.PI/2);
        ctx.fill();

        // Orejas caídas de cachorro
        ctx.fillStyle = '#023047';
        ctx.beginPath();
        ctx.ellipse(-15, 0, 8, 20, Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        // Alas de avión caza pesadas
        ctx.fillStyle = '#023047';
        ctx.beginPath();
        ctx.moveTo(-5, -15); ctx.lineTo(-15, -45); ctx.lineTo(5, -15);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, 15); ctx.lineTo(-15, 45); ctx.lineTo(5, 15);
        ctx.fill();
    }

    ctx.restore();

    // Dibujar Nombre sobre el avión
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + size/2, y - 15);
}

// === 5. CONTROLES Y DISPAROS ===
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Disparar con Clic Izquierdo
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        const angle = playerRole === 'p1' ? 0 : Math.PI; // p1 dispara a la derecha, p2 a la izquierda
        const bullet = {
            id: Math.random().toString(),
            x: localPlayer.x + localPlayer.size/2,
            y: localPlayer.y + localPlayer.size/2,
            vx: playerRole === 'p1' ? 12 : -12,
            vy: 0,
            color: faction === 'gato' ? '#ffb703' : '#e63946'
        };
        
        bullets.push(bullet);

        // Enviar disparo a través de la red
        if (channel) {
            channel.send({ type: 'broadcast', event: 'disparo', payload: bullet });
        }
    }
});

// === 6. INTERFAZ GRÁFICA (UI) ===
function actualizarUI() {
    const labelLocal = document.getElementById('playerLabel');
    const labelEnemigo = document.getElementById('enemyLabel');
    const barLocal = document.getElementById('playerHp');
    const barEnemigo = document.getElementById('enemyHp');

    labelLocal.innerText = `${faction === 'gato' ? '🐱' : '🐶'} ${localPlayer.name}`;
    barLocal.style.width = `${localPlayer.hp}%`;

    // Buscar si hay rival conectado
    const rivalId = playerRole === 'p1' ? 'p2' : 'p1';
    const rival = remotePlayers[rivalId];

    if (rival) {
        labelEnemigo.innerText = `${rival.faction === 'gato' ? '🐱' : '🐶'} ${rival.name}`;
        barEnemigo.style.width = `${rival.hp}%`;
    }
}

// === 7. CONDICIONES DE VICTORIA Y DERROTA ===
function comprobarFinDeJuego() {
    if (localPlayer.hp <= 0) {
        // Enviar señal final y guardar derrota
        localStorage.setItem('gameResult', 'DERROTA');
        window.location.href = "resultado.html";
    }
}

function comprobarVictoria() {
    const rivalId = playerRole === 'p1' ? 'p2' : 'p1';
    const rival = remotePlayers[rivalId];
    if (rival && rival.hp <= 0) {
        localStorage.setItem('gameResult', 'VICTORIA');
        window.location.href = "resultado.html";
    }
}

// === 8. BUCLE DE ACTUALIZACIÓN Y FÍSICAS ===
function update() {
    let moved = false;
    
    // Movimiento
    if (keys['w'] || keys['arrowup']) { localPlayer.y -= localPlayer.speed; moved = true; }
    if (keys['s'] || keys['arrowdown']) { localPlayer.y += localPlayer.speed; moved = true; }
    if (keys['a'] || keys['arrowleft']) { localPlayer.x -= localPlayer.speed; moved = true; }
    if (keys['d'] || keys['arrowright']) { localPlayer.x += localPlayer.speed; moved = true; }

    // Limites de pantalla
    if (localPlayer.y < 80) localPlayer.y = 80; // No tapar barra de arriba
    if (localPlayer.y > canvas.height - localPlayer.size) localPlayer.y = canvas.height - localPlayer.size;
    if (localPlayer.x < 0) localPlayer.x = 0;
    if (localPlayer.x > canvas.width - localPlayer.size) localPlayer.x = canvas.width - localPlayer.size;

    // Actualizar mis balas y detectar colisiones en el rival
    const rivalId = playerRole === 'p1' ? 'p2' : 'p1';
    const rival = remotePlayers[rivalId];

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;

        // Si mi bala golpea al enemigo remoto
        if (rival && b.x > rival.x && b.x < rival.x + rival.size && b.y > rival.y && b.y < rival.y + rival.size) {
            bullets.splice(i, 1);
            // Avisar por red que le quitamos 10 HP al oponente
            if (channel) {
                channel.send({ type: 'broadcast', event: 'danio', payload: { targetId: rivalId, amount: 10 } });
            }
            continue;
        }

        // Limpiar balas fuera de pantalla
        if (b.x < 0 || b.x > canvas.width) {
            bullets.splice(i, 1);
        }
    }

    // Actualizar balas remotas (gráficamente)
    for (let i = remoteBullets.length - 1; i >= 0; i--) {
        const rb = remoteBullets[i];
        rb.x += rb.vx;
        if (rb.x < 0 || rb.x > canvas.width) {
            remoteBullets.splice(i, 1);
        }
    }

    // Transmitir posición y estado
    if (moved && channel) {
        channel.send({ type: 'broadcast', event: 'movimiento', payload: localPlayer });
    }

    comprobarVictoria();
}

// === 9. RENDERIZACIÓN ===
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Espacial Anime de cuadrículas futuristas
    ctx.strokeStyle = '#1f1f2e';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Dibujar mis balas (Proyectiles de Energía)
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Dibujar balas enemigas
    remoteBullets.forEach(rb => {
        ctx.fillStyle = rb.color;
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Dibujar jugador local (Gato o Perro)
    dibujarAvionAnime(ctx, localPlayer.x, localPlayer.y, localPlayer.size, localPlayer.faction, localPlayer.name);

    // Dibujar rivales remotos
    for (let id in remotePlayers) {
        let rp = remotePlayers[id];
        if (rp.hp > 0) {
            dibujarAvionAnime(ctx, rp.x, rp.y, rp.size, rp.faction, rp.name);
        }
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Iniciar Loop del juego
loop();
