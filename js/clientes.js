// ==========================================
// CLIENTES - clientes.js
// ==========================================

function renderClientes() {
    const l = document.getElementById('lista-clientes');
    const f = document.getElementById('filtro-cliente').value.toLowerCase();
    const tagContainer = document.getElementById('container-tags');
    
    let tags = [];
    db.clientes.forEach(c => {
        if (c.tags) c.tags.split(',').forEach(t => {
            const tag = t.trim().toLowerCase();
            if (tag && !tags.includes(tag)) tags.push(tag);
        });
    });
    tagContainer.innerHTML = tags.map(t => `<button onclick="aplicarFiltroTag('${t}')" class="whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase text-slate-500">#${t}</button>`).join('');
    
    l.innerHTML = db.clientes.filter(c => (c.nome + (c.tags || '')).toLowerCase().includes(f)).map(c => {
        const idx = db.clientes.indexOf(c);
        const totalAtendimentos = db.atendimentos.filter(a => a.nome.toLowerCase() === c.nome.toLowerCase()).length;
        return `<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform" onclick="verHistorico('${c.nome.replace(/'/g, "\\'")}')">
            <div class="flex items-center gap-3">
                ${c.foto ? `<img src="${c.foto}" class="w-12 h-12 rounded-full object-cover">` : `<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>`}
                <div>
                    <p class="font-black text-sm uppercase">${c.nome}</p>
                    <p class="text-[10px] text-slate-400 font-bold">${c.contato || 'S/ CONTATO'}</p>
                </div>
            </div>
            <div class="flex items-center gap-3" onclick="event.stopPropagation()">
                <span class="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">${totalAtendimentos} atend.</span>
                <button onclick="prepararEdicaoCliente(${idx})" class="text-slate-300"><i class="fas fa-edit"></i></button>
                <button onclick="excluirCliente(${idx})" class="text-slate-200"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }).join('');
}

function prepararEdicaoCliente(i) {
    itemSendoEditado = i;
    abrirModal(false);
    abaAtual = 'clientes';
    const c = db.clientes[i];
    setTimeout(() => {
        document.getElementById('m-nome').value = c.nome;
        document.getElementById('m-contato').value = c.contato || '';
        document.getElementById('m-tags').value = c.tags || '';
    }, 50);
}

function excluirCliente(i) {
    if (confirm('Excluir este cliente?')) {
        db.clientes.splice(i, 1);
        salvarDB();
        renderClientes();
    }
}

function aplicarFiltroTag(t) {
    document.getElementById('filtro-cliente').value = t;
    renderClientes();
}

// ==========================================
// DROPDOWN DE CLIENTES (BUSCA COM FOTO)
// ==========================================

function filtrarClientesDropdown(termo) {
    const dropdown = document.getElementById('dropdown-clientes');
    if (!dropdown) return;
    
    if (!termo || termo.trim().length < 1) {
        dropdown.classList.add('hidden');
        return;
    }
    
    const filtrados = db.clientes.filter(c => c.nome.toLowerCase().includes(termo.toLowerCase()));
    
    if (filtrados.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    dropdown.innerHTML = filtrados.map(c => {
        const ultimoAtend = db.atendimentos
            .filter(a => a.nome.toLowerCase() === c.nome.toLowerCase())
            .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))[0];
        const ultimoTexto = ultimoAtend ?
            `${ultimoAtend.servicos.join(' + ')} (${new Date(ultimoAtend.dataHora).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'})})` :
            'Nenhum atendimento';
        
        return `
        <div onclick="selecionarClienteDropdown('${c.nome.replace(/'/g, "\\'")}')">
            ${c.foto ? `<img src="${c.foto}" class="w-10 h-10 rounded-full object-cover">` : '<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>'}
            <div>
                <p class="font-black text-xs uppercase">${c.nome}</p>
                <p class="text-[8px] text-slate-400 font-bold">Último: ${ultimoTexto}</p>
            </div>
        </div>`;
    }).join('');
    
    dropdown.classList.remove('hidden');
}

function selecionarClienteDropdown(nome) {
    const inputNome = document.getElementById('m-nome-sem');
    const dropdown = document.getElementById('dropdown-clientes');
    
    if (inputNome) inputNome.value = nome;
    if (dropdown) dropdown.classList.add('hidden');
    
    const cliente = db.clientes.find(c => c.nome === nome);
    const fotoContainer = document.getElementById('foto-cliente-preview');
    
    if (fotoContainer) {
        if (cliente?.foto) {
            fotoContainer.innerHTML = `<img src="${cliente.foto}" class="w-12 h-12 rounded-full object-cover border-2 border-rose-200">`;
        } else {
            fotoContainer.innerHTML = '<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>';
        }
    }
}

// ==========================================
// HISTÓRICO DO CLIENTE (COM CICLOS DE FIDELIDADE)
// ==========================================

function verHistorico(nomeCliente) {
    const atendimentosDoCliente = db.atendimentos
        .filter(a => a.nome.toLowerCase() === nomeCliente.toLowerCase())
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
    
    const container = document.getElementById('campos-dinamicos');
    const btnConfirmar = document.getElementById('btn-confirmar');
    
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').innerText = `📋 ${nomeCliente}`;
    btnConfirmar.style.display = 'none';
    
    if (atendimentosDoCliente.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-[12px] font-black uppercase text-slate-300">Nenhum atendimento encontrado</p>
                <p class="text-[10px] text-slate-400 mt-2">Os atendimentos aparecerão aqui quando registrados</p>
                <button onclick="novoAtendimentoDoCliente('${nomeCliente.replace(/'/g, "\\'")}')" class="mt-4 bg-rose-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform">
                    ✂️ Novo Atendimento
                </button>
            </div>`;
        return;
    }
    
    const totalGasto = atendimentosDoCliente.reduce((acc, a) => acc + parseFloat(a.total || 0), 0);
    const totalAtendimentos = atendimentosDoCliente.length;
    
    const servicosFavoritos = {};
    atendimentosDoCliente.forEach(a => {
        a.servicos.forEach(s => {
            servicosFavoritos[s] = (servicosFavoritos[s] || 0) + 1;
        });
    });
    const servicoTop = Object.entries(servicosFavoritos).sort((a, b) => b[1] - a[1])[0];
    
    const ciclosCompletos = Math.floor(totalAtendimentos / CICLO_FIDELIDADE);
    const progressoCicloAtual = totalAtendimentos % CICLO_FIDELIDADE;
    const faltamParaProximo = CICLO_FIDELIDADE - progressoCicloAtual;
    
    function montarCard(a) {
        const data = new Date(a.dataHora);
        const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][data.getDay()];
        
        let totalProdutos = 0;
        let produtosExibicao = [];
        if (a.produtos && a.produtos.length > 0) {
            a.produtos.forEach(p => {
                const produtoAtual = db.produtos.find(prod => prod.nome === p.nome);
                const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
                totalProdutos += preco * p.qtd;
                produtosExibicao.push(`${p.qtd}x ${p.nome}`);
            });
        }
        
        const temRecebedor = a.recebedor && a.recebedor !== 'Não informado';
        
        return `
            <div class="bg-white p-3 rounded-xl border-l-4 ${a.pendente ? 'border-rose-500' : 'border-emerald-500'}">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-[9px] font-black uppercase text-slate-500">${diaSemana}, ${dataFormatada}</p>
                        <p class="text-[11px] font-black uppercase mt-1">${a.servicos.join(' + ')}</p>
                        ${a.desconto > 0 ? `<p class="text-[8px] text-rose-400 font-bold">Desconto: -R$ ${parseFloat(a.desconto).toFixed(2)}</p>` : ''}
                        ${produtosExibicao.length > 0 ? `<p class="text-[9px] text-blue-500 font-bold mt-1">🛍️ ${produtosExibicao.join(', ')}: R$ ${totalProdutos.toFixed(2)}</p>` : ''}
                        ${a.gorjeta > 0 ? `<p class="text-[9px] text-amber-500 font-bold">💵 Gorjeta: R$ ${parseFloat(a.gorjeta).toFixed(2)}</p>` : ''}
                        ${a.barbeiroNome ? `<p class="text-[9px] text-purple-500 font-bold">+ ${a.barbeiroNome}: R$ ${parseFloat(a.barbeiroValor || 0).toFixed(2)}</p>` : ''}
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-black text-rose-600">R$ ${parseFloat(a.total).toFixed(2)}</p>
                        <p class="text-[8px] font-bold uppercase ${a.pendente ? 'text-rose-500' : 'text-emerald-500'}">
                            ${a.pendente ? '⚠️ PENDENTE' : '✅ PAGO'}
                            ${temRecebedor ? ` • ${a.recebedor}` : ''}
                        </p>
                        <p class="text-[7px] text-slate-400 mt-1">${a.pagamento || ''}</p>
                    </div>
                </div>
            </div>`;
    }
    
    const inicioCiclo = ciclosCompletos * CICLO_FIDELIDADE;
    const fimCiclo = inicioCiclo + CICLO_FIDELIDADE;
    const atendimentosCicloAtual = atendimentosDoCliente.slice(inicioCiclo, fimCiclo);
    
    let html = `
        <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="bg-rose-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-rose-400">Atendimentos</p>
                <p class="text-lg font-black text-rose-600">${totalAtendimentos}</p>
            </div>
            <div class="bg-emerald-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-emerald-400">Total Gasto</p>
                <p class="text-lg font-black text-emerald-600">R$ ${totalGasto.toFixed(2)}</p>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl text-center">
                <p class="text-[8px] font-black uppercase text-blue-400">Favorito</p>
                <p class="text-[10px] font-black text-blue-600">${servicoTop ? servicoTop[0] : 'N/A'}</p>
            </div>
        </div>
        
        <button onclick="novoAtendimentoDoCliente('${nomeCliente.replace(/'/g, "\\'")}')" class="w-full mb-4 bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform">
            ✂️ Novo Atendimento
        </button>
        
        <div class="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl mb-4 border border-amber-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase text-amber-700">🏆 Fidelidade: ${ciclosCompletos} ${ciclosCompletos === 1 ? 'ciclo' : 'ciclos'}</span>
                ${ciclosCompletos > 0 ? `<span class="text-[8px] font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">${ciclosCompletos * CICLO_FIDELIDADE} atend.</span>` : ''}
            </div>
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-black uppercase text-amber-600">📊 Ciclo atual: ${progressoCicloAtual}/${CICLO_FIDELIDADE}</span>
                ${faltamParaProximo > 0 ? `<span class="text-[8px] text-amber-500 font-bold">(faltam ${faltamParaProximo})</span>` : '<span class="text-[8px] text-emerald-500 font-bold">🎉 Completo!</span>'}
            </div>
            <div class="mt-2 bg-amber-200 rounded-full h-2 overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${(progressoCicloAtual / CICLO_FIDELIDADE) * 100}%"></div>
            </div>
        </div>
        
        <div class="bg-slate-100 rounded-2xl overflow-hidden">
            <button onclick="toggleHistorico(this)" class="w-full p-4 flex justify-between items-center font-black uppercase text-[10px] text-slate-600 active:bg-slate-200 transition-colors">
                <span>📜 Últimos atendimentos (${atendimentosCicloAtual.length})</span>
                <i class="fas fa-chevron-down text-slate-400 transition-transform duration-300" id="icone-seta"></i>
            </button>
            <div id="historico-lista" class="hidden px-4 pb-4 space-y-2">
                ${atendimentosCicloAtual.map(a => montarCard(a)).join('')}
            </div>
        </div>`;
    
    container.innerHTML = html;
}

function toggleHistorico(btn) {
    const lista = document.getElementById('historico-lista');
    const icone = document.getElementById('icone-seta');
    
    if (lista.classList.contains('hidden')) {
        lista.classList.remove('hidden');
        if (icone) icone.style.transform = 'rotate(180deg)';
    } else {
        lista.classList.add('hidden');
        if (icone) icone.style.transform = 'rotate(0deg)';
    }
}

function novoAtendimentoDoCliente(nomeCliente) {
    abaAtual = 'semanal';
    itemSendoEditado = null;
    abrirModal(true);
    
    setTimeout(() => {
        const inputNome = document.getElementById('m-nome-sem');
        if (inputNome) {
            inputNome.value = nomeCliente;
            selecionarClienteDropdown(nomeCliente);
        }
        document.getElementById('modal-title').innerText = "Novo Atendimento";
    }, 100);
}