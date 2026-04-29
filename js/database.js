// ==========================================
// BANCO DE DADOS - database.js
// ==========================================
let db = JSON.parse(localStorage.getItem('barber_v6')) || { clientes: [], atendimentos: [], produtos: [], servicosExtras: [] };

// Migra EXTRAS_ANTIGOS para db.servicosExtras (primeira execução)
const EXTRAS_ANTIGOS = { "Sobrancelha": 10, "Limpeza": 15, "Pezinho": 10, "Botox": 100 };
if (!db.servicosExtras) db.servicosExtras = [];
if (db.servicosExtras.length === 0) {
    Object.keys(EXTRAS_ANTIGOS).forEach(nome => {
        db.servicosExtras.push({ nome, valor: EXTRAS_ANTIGOS[nome] });
    });
    salvarDB();
}

function salvarDB() {
    localStorage.setItem('barber_v6', JSON.stringify(db));
}