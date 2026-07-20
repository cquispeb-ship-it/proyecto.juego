// === 1. CONFIGURACIÓN DE SUPABASE Y LOCALSTORAGE ===
const SUPABASE_URL = "https://buwhrscaxqlopqmrnjiy.supabase.co";
const SUPABASE_KEY = "sb_publishable_0koEgBnZ0kgqx3cYmJVH1Q_0GYHi_7x"; 

const salaId = localStorage.getItem('salaId');
const username = localStorage.getItem('username') || 'Piloto';
const playerRole = localStorage.getItem('playerRole') || 'p1'; 

// === REPARACIÓN DE FACCIÓN (DEBE IR ANTES DE CREAR AL JUGADOR) ===
let rawFaction = (localStorage.getItem('faction') || 'gato').toLowerCase();
let faction = 'gato'; 

if (rawFaction.includes('mago') || rawFaction.includes('astral')) faction = 'mago';
else if (rawFaction.includes('perro') || rawFaction.includes('inu')) faction = 'perro';
else if (rawFaction.includes('gato') || rawFaction.includes('neko')) faction = 'gato';
else if (rawFaction.includes('mecha') || rawFaction.includes('robot')) faction = 'mecha';
else if (rawFaction.includes('ninja') || rawFaction.includes('shinobi')) faction = 'ninja';
else if (rawFaction.includes('saiyan') || rawFaction.includes('guerrero')) faction = 'saiyan';
else if (rawFaction.includes('cyber') || rawFaction.includes('samurai')) faction = 'cyber';

let supabaseClient; 
let channel;
const remotePlayers = {};
const bullets = []; 
const remoteBullets = []; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Configurar estadísticas únicas por facción gamer
let speedSetup = 5;
let colorSetup = '#00f2ff';

if (faction === 'gato') { speedSetup = 7; colorSetup = '#ffb703'; }
else if (faction === 'perro') { speedSetup = 5; colorSetup = '#219ebc'; }
else if (faction === 'mecha') { speedSetup = 4; colorSetup = '#00ffcc'; }
else if (faction === 'ninja') { speedSetup = 8; colorSetup = '#666666'; }
else if (faction === 'saiyan') { speedSetup = 6; colorSetup = '#ff007f'; }
else if (faction === 'mago') { speedSetup = 5; colorSetup = '#7928ca'; }
else if (faction === 'cyber') { speedSetup = 7; colorSetup = '#ff3333'; }

// === 2. PROPIEDADES DE JUGADORES ===
const localPlayer = {
    id: playerRole,
    name: username,
    faction: faction, // Ahora sí guardará 'mago', 'saiyan', etc. ya limpio.
    x: playerRole === 'p1' ? 100 : window.innerWidth - 150,
    y: window.innerHeight / 2,
    size: 50,
    speed: speedSetup, 
    hp: 100,
    maxHp: 100,
    color: colorSetup
};

try {
    if (SUPABASE_KEY && !SUPABASE_KEY.includes("PEGA_AQUÍ")) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
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
                  channel.send({ type: 'broadcast', event: 'movimiento', payload: localPlayer });
              }
          });
    }
} catch (e) {
    console.error("Error de conexión:", e);
}

// === 4. DISEÑO DE PERSONAJES ANIME MODIFICADO PARA TODAS LAS FACCIONES ===
function dibujarAvionAnime(ctx, x, y, size, bando, name) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    
    if (playerRole === 'p2' && bando === faction || playerRole === 'p1' && bando !== faction) {
        ctx.scale(-1, 1);
    }

    if (bando === 'gato') {
        ctx.fillStyle = '#f8ad9d';
        ctx.beginPath(); ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#f4978e';
        ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-15, -25); ctx.lineTo(0, -14); ctx.fill();
        ctx.beginPath(); ctx.moveTo(5, -12); ctx.lineTo(0, -25); ctx.lineTo(12, -12); ctx.fill();

        ctx.fillStyle = '#ffb703';
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-30, -35); ctx.lineTo(-20, -35); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-30, 35); ctx.lineTo(-20, 35); ctx.fill();

        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11, -4, 1.2, 0, Math.PI * 2); ctx.fill();

    } else if (bando === 'perro') {
        ctx.fillStyle = '#8ecae6';
        ctx.beginPath(); ctx.rect(-20, -15, 40, 30); ctx.fill();

        ctx.fillStyle = '#219ebc';
        ctx.beginPath(); ctx.arc(20, 0, 15, -Math.PI/2, Math.PI/2); ctx.fill();

        ctx.fillStyle = '#023047';
        ctx.beginPath(); ctx.ellipse(-15, 0, 8, 20, Math.PI/6, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#023047';
        ctx.beginPath(); ctx.moveTo(-5, -15); ctx.lineTo(-15, -45); ctx.lineTo(5, -15); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 15); ctx.lineTo(-15, 45); ctx.lineTo(5, 15); ctx.fill();

    } else if (bando === 'mecha') {
        // NAVE ROBÓTICA MECHA (Láser y Neón Cian)
        ctx.fillStyle = '#1f2d3d';
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, -15); ctx.lineTo(25, 0); ctx.lineTo(-25, 15); ctx.lineTo(-15, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Propulsores traseros neón
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(-22, -6, 5, 12);

    } else if (bando === 'ninja') {
        // SHINOBI DE LAS NUBES (Sigilo Gris Oscuro y Shuriken)
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#6666ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Cintas de la máscara ninja
        ctx.fillStyle = '#6666ff';
        ctx.fillRect(-25, -4, 10, 4);
        ctx.fillRect(-23, 2, 10, 4);

    } else if (bando === 'saiyan') {
        // GUERRERO SAIYAJIN (Aura de Energía Neón Fucsia/Dorado)
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-15, -20); ctx.lineTo(25, 0); ctx.lineTo(-15, 20); ctx.closePath(); ctx.fill();
        // Pelo puntiagudo/Aura
        ctx.fillStyle = '#ffb703';
        ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(-30, 0); ctx.lineTo(-15, 15); ctx.fill();
        ctx.shadowBlur = 0; // Resetear sombras para rendimiento

    } else if (bando === 'mago') {
        // MAGO ASTRAL (Cuerpo de Cristal Púrpura)
        ctx.fillStyle = '#3a1d5d';
        ctx.strokeStyle = '#bd93f9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -22); ctx.lineTo(20, 0); ctx.lineTo(0, 22); ctx.lineTo(-20, 0);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Núcleo brillante esfera mágica
        ctx.fillStyle = '#ff79c6';
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI*2); ctx.fill();

    } else if (bando === 'cyber') {
        // CYBER SAMURÁI (Cazador Tecnológico Rojo y Negro)
        ctx.fillStyle = '#111111';
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.fillRect(-20, -10, 35, 20);
        // Filas angulares/Cuchillas de plasma traseras
        ctx.fillStyle = '#ff3333';
        ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-25, -25); ctx.lineTo(-15, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 10); ctx.lineTo(-25, 25); ctx.lineTo(-15, 10); ctx.fill();
    }

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x + size/2, y - 15);
}

// === 5. CONTROLES Y DISPAROS ===
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        // Asignar colores de balas personalizados según la facción
        let bulletColor = '#ffb703';
        if (faction === 'perro') bulletColor = '#00f2ff';
        else if (faction === 'mecha') bulletColor = '#00ffcc';
        else if (faction === 'ninja') bulletColor = '#a0a0a0';
        else if (faction === 'saiyan') bulletColor = '#ff007f';
        else if (faction === 'mago') bulletColor = '#bd93f9';
        else if (faction === 'cyber') bulletColor = '#ff3333';

        const bullet = {
            id: Math.random().toString(),
            x: localPlayer.x + localPlayer.size/2,
            y: localPlayer.y + localPlayer.size/2,
            vx: playerRole === 'p1' ? 14 : -14, // Balas un poco más veloces y competitivas
            vy: 0,
            color: bulletColor
        };
        
        bullets.push(bullet);

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

    // Mapear emojis para la barra superior
    const emojis = { gato: '🐱', perro: '🐶', mecha: '🤖', ninja: '🥷', saiyan: '🔥', mago: '🔮', cyber: '⚡' };
    const miEmoji = emojis[faction] || '🎮';

    labelLocal.innerText = `${miEmoji} ${localPlayer.name}`;
    barLocal.style.width = `${localPlayer.hp}%`;

    const rivalId = playerRole === 'p1' ? 'p2' : 'p1';
    const rival = remotePlayers[rivalId];

    if (rival) {
        const rivalEmoji = emojis[rival.faction] || '🎮';
        labelEnemigo.innerText = `${rivalEmoji} ${rival.name}`;
        barEnemigo.style.width = `${rival.hp}%`;
    }
}

// === 7. CONDICIONES DE VICTORIA Y DERROTA ===
function comprobarFinDeJuego() {
    if (localPlayer.hp <= 0) {
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
    
    if (keys['w'] || keys['arrowup']) { localPlayer.y -= localPlayer.speed; moved = true; }
    if (keys['s'] || keys['arrowdown']) { localPlayer.y += localPlayer.speed; moved = true; }
    if (keys['a'] || keys['arrowleft']) { localPlayer.x -= localPlayer.speed; moved = true; }
    if (keys['d'] || keys['arrowright']) { localPlayer.x += localPlayer.speed; moved = true; }

    if (localPlayer.y < 90) localPlayer.y = 90; 
    if (localPlayer.y > canvas.height - localPlayer.size) localPlayer.y = canvas.height - localPlayer.size;
    if (localPlayer.x < 0) localPlayer.x = 0;
    if (localPlayer.x > canvas.width - localPlayer.size) localPlayer.x = canvas.width - localPlayer.size;

    const rivalId = playerRole === 'p1' ? 'p2' : 'p1';
    const rival = remotePlayers[rivalId];

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;

        if (rival && b.x > rival.x && b.x < rival.x + rival.size && b.y > rival.y && b.y < rival.y + rival.size) {
            bullets.splice(i, 1);
            if (channel) {
                channel.send({ type: 'broadcast', event: 'danio', payload: { targetId: rivalId, amount: 10 } });
            }
            continue;
        }

        if (b.x < 0 || b.x > canvas.width) {
            bullets.splice(i, 1);
        }
    }

    for (let i = remoteBullets.length - 1; i >= 0; i--) {
        const rb = remoteBullets[i];
        rb.x += rb.vx;
        if (rb.x < 0 || rb.x > canvas.width) {
            remoteBullets.splice(i, 1);
        }
    }

    if (moved && channel) {
        channel.send({ type: 'broadcast', event: 'movimiento', payload: localPlayer });
    }

    comprobarVictoria();
}

// === 9. RENDERIZACIÓN ===
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo Gamer de cuadrícula de neón de alta tecnología
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Dibujar mis balas (Proyectiles láser de neón)
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0; // Limpiar sombra

    // Dibujar balas enemigas
    remoteBullets.forEach(rb => {
        ctx.fillStyle = rb.color;
        ctx.shadowColor = rb.color;
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(rb.x, rb.y, 6, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Dibujar jugador local
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

loop();
