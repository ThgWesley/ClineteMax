// ==========================================
// BANCO DE DADOS - database.js
// ==========================================
let db = JSON.parse(localStorage.getItem('barber_v6')) || { clientes: [], atendimentos: [], produtos: [], servicosExtras: [], ultimaResetSemana: null };

// Migra EXTRAS_ANTIGOS para db.servicosExtras (primeira execução)
const EXTRAS_ANTIGOS = { "Sobrancelha": 10, "Limpeza": 15, "Pezinho": 10, "Botox": 100 };
if (!db.servicosExtras) db.servicosExtras = [];
if (db.servicosExtras.length === 0) {
    Object.keys(EXTRAS_ANTIGOS).forEach(nome => {
        db.servicosExtras.push({ nome, valor: EXTRAS_ANTIGOS[nome] });
    });
    salvarDB();
}

// ==========================================
// VERIFICAR E REINICIAR AUTOMATICAMENTE A CADA SEGUNDA-FEIRA
// ==========================================
function verificarResetSemanal() {
    const agora = new Date();
    const diaAtual = agora.getDay(); // 0 = domingo, 1 = segunda
    const dataAtual = agora.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    // Se não existe registro de reset ou é segunda-feira e não foi resetado hoje
    if (!db.ultimaResetSemana) {
        if (diaAtual === 1) { // Segunda-feira
            resetarListaSemanal(true); // true = silencioso
        }
    } else {
        const ultimoResetData = db.ultimaResetSemana.split(' ')[0]; // Pega só a data
        // Se passou de semana (segunda-feira e último reset foi em outra data)
        if (diaAtual === 1 && ultimoResetData !== dataAtual) {
            resetarListaSemanal(true); // true = silencioso
        }
    }
}

// ==========================================
// FUNÇÃO PARA REINICIAR A LISTA SEMANAL
// ==========================================
function resetarListaSemanal(silencioso = false) {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    
    // Limpa os atendimentos
    db.atendimentos = [];
    db.ultimaResetSemana = dataAtual;
    salvarDB();
    
    // Atualiza a tela
    if (abaAtual === 'semanal') {
        renderSemana();
    }
    if (document.getElementById('dash-meu')) {
        renderAjustes();
    }
    
    if (!silencioso) {
        alert('✅ Lista semanal reiniciada! Todos os atendimentos foram apagados.');
    }
}

function salvarDB() {
    localStorage.setItem('barber_v6', JSON.stringify(db));
}