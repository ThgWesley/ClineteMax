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
    atualizarStatusBackup(); // Atualiza o indicador toda vez que salva
}

// ==========================================
// ATUALIZAR STATUS VISUAL DO BACKUP
// ==========================================
function atualizarStatusBackup() {
    const statusEl = document.getElementById('status-backup');
    const btnRecuperar = document.getElementById('btn-recuperar');
    
    if (!statusEl) return; // Se não está na página, não faz nada
    
    if (db.backupUltimaLista && db.backupUltimaLista.atendimentos) {
        const qtdClientes = db.backupUltimaLista.clientes ? db.backupUltimaLista.clientes.length : 0;
        const qtdAtendimentos = db.backupUltimaLista.atendimentos ? db.backupUltimaLista.atendimentos.length : 0;
        const data = db.backupUltimaLista.data || 'data desconhecida';
        
        statusEl.className = 'mb-4 p-3 rounded-2xl text-center text-[9px] font-bold bg-green-50 text-green-700 border border-green-200';
        statusEl.innerHTML = `✅ BACKUP GUARDADO<br>${qtdClientes} clientes | ${qtdAtendimentos} atendimentos<br>Data: ${data}`;
        
        if (btnRecuperar) {
            btnRecuperar.disabled = false;
            btnRecuperar.style.opacity = '1';
            btnRecuperar.style.cursor = 'pointer';
        }
    } else {
        statusEl.className = 'mb-4 p-3 rounded-2xl text-center text-[9px] font-bold bg-red-50 text-red-700 border border-red-200';
        statusEl.innerHTML = '❌ Nenhum backup guardado';
        
        if (btnRecuperar) {
            btnRecuperar.disabled = true;
            btnRecuperar.style.opacity = '0.5';
            btnRecuperar.style.cursor = 'not-allowed';
        }
    }
}

// ==========================================
// VERIFICAR E EXIBIR DETALHES DO BACKUP
// ==========================================
function verificarBackupDetalhes() {
    if (!db.backupUltimaLista || !db.backupUltimaLista.atendimentos) {
        mostrarModalSucesso(
            '❌ Nenhum Backup',
            'Não há dados guardados no cache para visualizar.'
        );
        return;
    }
    
    const backup = db.backupUltimaLista;
    const qtdClientes = backup.clientes ? backup.clientes.length : 0;
    const qtdAtendimentos = backup.atendimentos ? backup.atendimentos.length : 0;
    const qtdProdutos = backup.produtos ? backup.produtos.length : 0;
    const qtdServiços = backup.servicosExtras ? backup.servicosExtras.length : 0;
    
    let listaClientes = '';
    if (backup.clientes && backup.clientes.length > 0) {
        listaClientes = backup.clientes.slice(0, 5).map(c => {
            // Procura a forma de pagamento mais recente deste cliente no backup de atendimentos
            let formaPagto = 'sem pagamento';
            
            if (backup.atendimentos && backup.atendimentos.length > 0) {
                // Filtra atendimentos deste cliente
                const atendimentosCliente = backup.atendimentos.filter(a => a.cliente === c.nome || a.nome === c.nome);
                
                if (atendimentosCliente.length > 0) {
                    // Pega o ÚLTIMO atendimento (mais recente)
                    const ultimoAtendimento = atendimentosCliente.sort((a, b) => {
                        const dataA = new Date(a.dataHora || 0).getTime();
                        const dataB = new Date(b.dataHora || 0).getTime();
                        return dataB - dataA;
                    })[0];
                    
                    // Extrai forma de pagamento
                    if (ultimoAtendimento) {
                        formaPagto = ultimoAtendimento.pagamento || 'sem pagamento';
                    }
                }
            }
            
            return `• ${c.nome || 'Sem nome'} (${formaPagto})`;
        }).join('<br>');
        if (backup.clientes.length > 5) {
            listaClientes += `<br>... e mais ${backup.clientes.length - 5}`;
        }
    }
    
    const modal = document.createElement('div');
    modal.id = 'modal-backup-detalhes';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 24px;
            max-width: 550px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-height: 80vh;
            overflow-y: auto;
        ">
            <h2 style="
                margin: 0 0 16px 0;
                font-size: 18px;
                font-weight: 900;
                color: #1e293b;
            ">📊 Detalhes do Backup</h2>
            
            <div style="
                background: #f1f5f9;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 16px;
                font-size: 12px;
                color: #475569;
            ">
                <strong>📅 Data:</strong> ${backup.data}<br>
                <strong>⏰ Hora:</strong> ${backup.hora || 'não registrada'}
            </div>
            
            <div style="
                background: #f0fdf4;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 12px;
                font-size: 13px;
                color: #166534;
                border-left: 4px solid #22c55e;
            ">
                <strong>✅ ${qtdClientes} Clientes - Forma de Pagamento</strong><br>
                <div style="font-size: 11px; margin-top: 8px; color: #15803d;">
                    ${listaClientes.split('<br>').map(item => {
                        if (item.includes('...')) return item;
                        return `<div style="padding: 4px 0; margin: 2px 0;">${item}</div>`;
                    }).join('') || '<em>(nenhum)</em>'}
                </div>
            </div>
            
            <div style="
                background: #fef3c7;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 12px;
                font-size: 13px;
                color: #92400e;
                border-left: 4px solid #f59e0b;
            ">
                <strong>📋 ${qtdAtendimentos} Atendimentos Registrados</strong>
            </div>
            
            <div style="
                background: #f3e8ff;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 12px;
                font-size: 13px;
                color: #6b21a8;
                border-left: 4px solid #d946ef;
            ">
                <strong>🛍️ ${qtdProdutos} Produtos Registrados</strong>
            </div>
            
            <div style="
                background: #dbeafe;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 16px;
                font-size: 13px;
                color: #0c4a6e;
                border-left: 4px solid #0ea5e9;
            ">
                <strong>⭐ ${qtdServiços} Serviços Extras</strong>
            </div>
            
            <div style="
                display: flex;
                gap: 12px;
            ">
                <button id="btn-fechar-backup" style="
                    flex: 1;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    background: white;
                    border-radius: 12px;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 12px;
                    text-transform: uppercase;
                ">Fechar</button>
                <button id="btn-recuperar-agora" style="
                    flex: 1;
                    padding: 12px;
                    background: #0ea5e9;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 12px;
                    text-transform: uppercase;
                ">Recuperar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('btn-fechar-backup').onclick = () => {
        modal.remove();
    };
    
    document.getElementById('btn-recuperar-agora').onclick = () => {
        modal.remove();
        confirmarRecuperacaoLista();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}