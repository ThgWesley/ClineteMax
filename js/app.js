// ==========================================
// APP PRINCIPAL - app.js
// ==========================================
let abaAtual = 'semanal';
let croppieInstance = null;
let itemSendoEditado = null;

const CICLO_FIDELIDADE = 5;
const dataAtual = new Date();
document.getElementById('data-topo').innerText = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// ==========================================
// NAVEGAÇÃO
// ==========================================
function mudarAba(aba, el) {
    abaAtual = aba;
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`tab-${aba}`).classList.remove('hidden');
    
    const botoes = [
        document.getElementById('nav-semanal'),
        document.getElementById('nav-clientes'),
        document.getElementById('nav-servicos'),
        document.getElementById('nav-produtos'),
        document.getElementById('nav-ajustes')
    ];
    
    botoes.forEach(btn => {
        if (!btn) return;
        btn.className = "flex-1 min-w-[70px] bg-slate-50 border-2 border-transparent p-3 rounded-2xl flex flex-col items-center transition-all text-slate-400";
        const span = btn.querySelector('span');
        const icon = btn.querySelector('i');
        if (span) span.className = "text-[9px] font-black uppercase";
        if (icon) {
            if (btn.id === 'nav-semanal') icon.className = "fas fa-calendar-alt mb-1";
            if (btn.id === 'nav-clientes') icon.className = "fas fa-users mb-1";
            if (btn.id === 'nav-servicos') icon.className = "fas fa-star mb-1";
            if (btn.id === 'nav-produtos') icon.className = "fas fa-box-open mb-1";
            if (btn.id === 'nav-ajustes') icon.className = "fas fa-cog mb-1";
        }
    });
    
    if (el) {
        el.className = "flex-1 min-w-[70px] bg-rose-50 border-2 border-rose-500 p-3 rounded-2xl flex flex-col items-center transition-all";
        const icon = el.querySelector('i');
        const span = el.querySelector('span');
        if (icon) icon.classList.add('text-rose-600');
        if (span) span.classList.add('text-rose-600');
    }
    
    const titulos = {
        'semanal': 'Lista Semanal',
        'clientes': 'Clientes',
        'servicos': 'Serviços Extras',
        'produtos': 'Produtos',
        'ajustes': 'Ajustes'
    };
    document.getElementById('page-title').innerText = titulos[aba] || '';
    
    const fat = document.getElementById('faturamento-container');
    if (fat) {
        aba === 'semanal' ? fat.classList.remove('hidden') : fat.classList.add('hidden');
    }
    
    if (aba === 'semanal') renderSemana();
    if (aba === 'clientes') renderClientes();
    if (aba === 'servicos') renderServicosExtras();
    if (aba === 'produtos') renderProdutos();
    if (aba === 'ajustes') renderAjustes();
}

// ==========================================
// BOTÃO + DO HEADER (abre modal conforme aba)
// ==========================================
function acaoBotaoPlus() {
    if (abaAtual === 'servicos') {
        modalServico(true);
    } else {
        abrirModal(true);
    }
}

// ==========================================
// FECHA DROPDOWN AO CLICAR FORA
// ==========================================
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('dropdown-clientes');
    const input = document.getElementById('m-nome-sem');
    if (dropdown && input && !input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
renderSemana();