// ==========================================
// PRODUTOS - produtos.js
// ==========================================

function renderProdutos() {
    const l = document.getElementById('lista-produtos');
    const f = document.getElementById('filtro-produto').value.toLowerCase();
    const filtered = (db.produtos || []).filter(p => p.nome.toLowerCase().includes(f));
    l.innerHTML = filtered.map(p => {
        const idx = db.produtos.indexOf(p);
        const isEmoji = p.foto && p.foto.length < 10;
        return `<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
            <div class="flex items-center gap-3">
                ${p.foto ? (isEmoji ? `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl">${p.foto}</div>` : `<img src="${p.foto}" class="w-12 h-12 rounded-full object-cover">`) : `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-box"></i></div>`}
                <div><p class="font-black text-sm uppercase">${p.nome}</p>${p.valor ? `<p class="text-[10px] text-rose-500 font-bold">R$ ${parseFloat(p.valor).toFixed(2)}</p>` : ''}</div>
            </div>
            <div class="flex gap-4">
                <button onclick="prepararEdicaoProd(${idx})" class="text-slate-300"><i class="fas fa-edit"></i></button>
                <button onclick="excluirProd(${idx})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }).join('') || '<p class="text-center text-slate-300 text-[10px] py-10 font-bold uppercase">Sem produtos</p>';
}

function prepararEdicaoProd(i) {
    itemSendoEditado = i;
    abrirModal(false);
    abaAtual = 'produtos';
    const p = db.produtos[i];
    setTimeout(() => {
        document.getElementById('p-nome').value = p.nome;
        document.getElementById('p-valor').value = p.valor;
        document.getElementById('p-emoji').value = (p.foto && p.foto.length < 10) ? p.foto : '';
    }, 50);
}

function excluirProd(i) {
    if (confirm('Excluir este produto?')) {
        db.produtos.splice(i, 1);
        salvarDB();
        renderProdutos();
    }
}