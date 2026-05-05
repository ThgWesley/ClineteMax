// ==========================================
// BANCO DE DADOS - database.js
// ==========================================
let db = JSON.parse(localStorage.getItem('barber_v6')) || { 
    clientes: [], 
    atendimentos: [], 
    produtos: [], 
    servicosExtras: [],
    ultimaSemanaResetada: null,
    backupUltimaLista: null
};

// Migra EXTRAS_ANTIGOS para db.servicosExtras (primeira execução)
const EXTRAS_ANTIGOS = { "Sobrancelha": 10, "Limpeza": 15, "Pezinho": 10, "Botox": 100 };
if (!db.servicosExtras) db.servicosExtras = [];
if (db.servicosExtras.length === 0) {
    Object.keys(EXTRAS_ANTIGOS).forEach(nome => {
        db.servicosExtras.push({ nome, valor: EXTRAS_ANTIGOS[nome] });
    });
    salvarDB();
}

// Inicializar campos de reset se não existirem
if (!db.ultimaSemanaResetada) db.ultimaSemanaResetada = null;
if (!db.backupUltimaLista) db.backupUltimaLista = null;

// ==========================================
// VERIFICAR E REINICIAR AUTOMATICAMENTE A CADA SEGUNDA-FEIRA
// ==========================================
function verificarResetSemanal() {
    const agora = new Date();
    const diaAtual = agora.getDay(); // 0 = domingo, 1 = segunda, 2 = terça, etc
    const semanaAtual = obterNumeroSemana(agora);
    
    // Se é segunda-feira E é uma semana diferente da última resetada
    if (diaAtual === 1 && db.ultimaSemanaResetada !== semanaAtual) {
        // Fazer backup de TODOS os dados ANTES de resetar
        db.backupUltimaLista = {
            clientes: JSON.parse(JSON.stringify(db.clientes)),
            atendimentos: JSON.parse(JSON.stringify(db.atendimentos)),
            produtos: JSON.parse(JSON.stringify(db.produtos)),
            servicosExtras: JSON.parse(JSON.stringify(db.servicosExtras)),
            semana: db.ultimaSemanaResetada,
            data: new Date().toLocaleDateString('pt-BR'),
            hora: new Date().toLocaleTimeString('pt-BR')
        };
        
        // Agora reseta APENAS os atendimentos
        db.atendimentos = [];
        db.ultimaSemanaResetada = semanaAtual;
        salvarDB();
    }
}

// ==========================================
// CALCULAR NÚMERO DA SEMANA DO ANO
// ==========================================
function obterNumeroSemana(data) {
    const umJaneiro = new Date(data.getFullYear(), 0, 1);
    const primeirosDias = (data - umJaneiro) / 86400000;
    return Math.ceil((primeirosDias + umJaneiro.getDay() + 1) / 7);
}

// ==========================================
// FUNÇÃO PARA REINICIAR A LISTA SEMANAL (MANUAL)
// ==========================================
function resetarListaSemanal(silencioso = false) {
    if (silencioso) {
        // Executa silenciosamente (automático de segunda-feira)
        // Já foi feito em verificarResetSemanal()
        return;
    } else {
        // Abre modal de confirmação para reset manual
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
    const semanaAtual = obterNumeroSemana(new Date());
    
    // Fazer backup de TODOS os dados ANTES de resetar
    db.backupUltimaLista = {
        clientes: JSON.parse(JSON.stringify(db.clientes)),
        atendimentos: JSON.parse(JSON.stringify(db.atendimentos)),
        produtos: JSON.parse(JSON.stringify(db.produtos)),
        servicosExtras: JSON.parse(JSON.stringify(db.servicosExtras)),
        semana: db.ultimaSemanaResetada,
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR')
    };
    
    // Reseta APENAS os atendimentos
    db.atendimentos = [];
    db.ultimaSemanaResetada = semanaAtual;
    salvarDB();
    
    if (abaAtual === 'semanal') {
        renderSemana();
    }
    if (document.getElementById('dash-meu')) {
        renderAjustes();
    }
    
    mostrarModalSucesso('✅ Sucesso!', 'Lista semanal reiniciada com sucesso!');
}

// ==========================================
// RECUPERAR ÚLTIMO BACKUP COMPLETO
// ==========================================
function recuperarUltimaLista() {
    if (!db.backupUltimaLista || !db.backupUltimaLista.atendimentos) {
        mostrarModalSucesso('❌ Nenhum backup', 'Não há lista anterior para recuperar.');
        return;
    }
    
    const msgData = db.backupUltimaLista.data;
    const msgHora = db.backupUltimaLista.hora ? ` às ${db.backupUltimaLista.hora}` : '';
    
    mostrarModalConfirmacao(
        '⚠️ Recuperar Lista Anterior?',
        `Isso vai restaurar TODOS os dados de ${msgData}${msgHora}:\n\n• Clientes\n• Atendimentos\n• Produtos\n• Serviços\n\nTem certeza?`,
        'Recuperar',
        'Cancelar',
        confirmarRecuperacaoLista
    );
}

// ==========================================
// CONFIRMAR RECUPERAÇÃO - RESTAURA TUDO
// ==========================================
function confirmarRecuperacaoLista() {
    if (!db.backupUltimaLista) return;
    
    // Restaura TODOS os dados do backup
    if (db.backupUltimaLista.clientes) {
        db.clientes = JSON.parse(JSON.stringify(db.backupUltimaLista.clientes));
    }
    if (db.backupUltimaLista.atendimentos) {
        db.atendimentos = JSON.parse(JSON.stringify(db.backupUltimaLista.atendimentos));
    }
    if (db.backupUltimaLista.produtos) {
        db.produtos = JSON.parse(JSON.stringify(db.backupUltimaLista.produtos));
    }
    if (db.backupUltimaLista.servicosExtras) {
        db.servicosExtras = JSON.parse(JSON.stringify(db.backupUltimaLista.servicosExtras));
    }
    
    salvarDB();
    
    // Atualiza todas as telas
    if (abaAtual === 'semanal') {
        renderSemana();
    }
    if (abaAtual === 'clientes') {
        renderClientes();
    }
    if (document.getElementById('dash-meu')) {
        renderAjustes();
    }
    
    mostrarModalSucesso(
        '✅ Recuperado!', 
        `Lista completa de ${db.backupUltimaLista.data} foi restaurada!\n\nClientes, atendimentos e serviços voltaram.`
    );
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