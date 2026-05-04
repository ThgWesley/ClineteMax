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
    if (silencioso) {
        // Executa silenciosamente (sem confirmação)
        const agora = new Date();
        const dataAtual = agora.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        db.atendimentos = [];
        db.ultimaResetSemana = dataAtual;
        salvarDB();
        
        if (abaAtual === 'semanal') {
            renderSemana();
        }
        if (document.getElementById('dash-meu')) {
            renderAjustes();
        }
    } else {
        // Abre modal de confirmação
        mostrarModalConfirmacao(
            '⚠️ Reiniciar Lista da Semana?',
            'Isso vai apagar TODOS os atendimentos atuais. Tem certeza?',
            'Reiniciar',
            'Cancelar',
            confirmarResetSemanal
        );
    }
}

// ==========================================
// EXECUTAR RESET APÓS CONFIRMAÇÃO
// ==========================================
function confirmarResetSemanal() {
    const agora = new Date();
    const dataAtual = agora.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    
    db.atendimentos = [];
    db.ultimaResetSemana = dataAtual;
    salvarDB();
    
    if (abaAtual === 'semanal') {
        renderSemana();
    }
    if (document.getElementById('dash-meu')) {
        renderAjustes();
    }
    
    // Mostra mensagem de sucesso
    mostrarModalSucesso('✅ Sucesso!', 'Lista semanal reiniciada com sucesso!');
}

// ==========================================
// MODAL DE CONFIRMAÇÃO
// ==========================================
function mostrarModalConfirmacao(titulo, mensagem, botaoPrimario, botaoSecundario, funcaoConfirmar) {
    const modalExistente = document.getElementById('modal-confirmacao');
    if (modalExistente) modalExistente.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modal-confirmacao';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <h2 style="
                margin: 0 0 12px 0;
                font-size: 18px;
                font-weight: 900;
                color: #1e293b;
            ">${titulo}</h2>
            <p style="
                margin: 0 0 24px 0;
                font-size: 14px;
                color: #64748b;
                line-height: 1.5;
            ">${mensagem}</p>
            <div style="
                display: flex;
                gap: 12px;
            ">
                <button id="btn-cancelar" style="
                    flex: 1;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    border-radius: 12px;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 14px;
                    text-transform: uppercase;
                ">${botaoSecundario}</button>
                <button id="btn-confirmar-modal" style="
                    flex: 1;
                    padding: 12px;
                    background: #e11d48;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 14px;
                    text-transform: uppercase;
                ">${botaoPrimario}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-cancelar').onclick = () => {
        modal.remove();
    };
    
    document.getElementById('btn-confirmar-modal').onclick = () => {
        modal.remove();
        funcaoConfirmar();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// ==========================================
// MODAL DE SUCESSO
// ==========================================
function mostrarModalSucesso(titulo, mensagem) {
    const modal = document.createElement('div');
    modal.id = 'modal-sucesso';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 24px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        ">
            <h2 style="
                margin: 0 0 12px 0;
                font-size: 24px;
                font-weight: 900;
                color: #10b981;
            ">${titulo}</h2>
            <p style="
                margin: 0 0 20px 0;
                font-size: 14px;
                color: #64748b;
                line-height: 1.5;
            ">${mensagem}</p>
            <button id="btn-ok-modal" style="
                width: 100%;
                padding: 12px;
                background: #10b981;
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                font-size: 14px;
                text-transform: uppercase;
            ">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-ok-modal').onclick = () => {
        modal.remove();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    // Auto-fechar em 2 segundos
    setTimeout(() => {
        const el = document.getElementById('modal-sucesso');
        if (el) el.remove();
    }, 2000);
}

function salvarDB() {
    localStorage.setItem('barber_v6', JSON.stringify(db));
}