// ==========================================
// SERVIÇOS EXTRAS - servicos.js
// ==========================================

function renderServicosExtras() {
    const l = document.getElementById('lista-servicos');
    const servicos = db.servicosExtras || [];
    
    l.innerHTML = servicos.map((s, i) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div>
                <p class="font-black text-sm uppercase">${s.nome}</p>
                <p class="text-[10px] text-rose-500 font-bold">R$ ${parseFloat(s.valor).toFixed(2)}</p>
            </div>
            <div class="flex gap-4">
                <button onclick="editarServico(${i})" class="text-slate-300"><i class="fas fa-edit"></i></button>
                <button onclick="excluirServico(${i})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('') || '<p class="text-center text-slate-300 text-[10px] py-10 font-bold uppercase">Nenhum serviço extra cadastrado</p>';
}

function modalServico(ehNovo) {
    if (ehNovo) itemSendoEditado = null;
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').innerText = ehNovo ? "Novo Serviço Extra" : "Editar Serviço Extra";
    btnConfirmar.innerText = "Salvar Serviço";
    btnConfirmar.style.display = '';
    
    container.innerHTML = `
        <label class="modal-label">Nome do Serviço</label>
        <input type="text" id="s-nome" placeholder="Ex: Limpeza de Pele">
        <label class="modal-label">Valor R$</label>
        <input type="number" id="s-valor" placeholder="Ex: 80.00" step="0.01">`;
    
    abaAtual = 'servicos';
}

function toggleExtrasAccordion() {
    const body = document.getElementById('extras-body-edicao') || document.getElementById('extras-body');
    const icone = document.getElementById('icone-seta-extras');
    if (body) body.classList.toggle('aberto');
    if (icone) icone.classList.toggle('girado');
}

function editarServico(i) {
    itemSendoEditado = i;
    modalServico(false);
    const s = db.servicosExtras[i];
    setTimeout(() => {
        document.getElementById('s-nome').value = s.nome;
        document.getElementById('s-valor').value = s.valor;
    }, 50);
}

function excluirServico(i) {
    if (confirm('Excluir este serviço extra?')) {
        db.servicosExtras.splice(i, 1);
        salvarDB();
        renderServicosExtras();
    }
}