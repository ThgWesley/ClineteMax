// ==========================================
// AGENDA - agenda.js
// ==========================================

function renderSemana() {
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    const hoje = new Date().getDay();
    const container = document.getElementById('tab-semanal');
    container.innerHTML = '';
    let faturamentoTotal = 0;

    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - 7);

    ordem.forEach(idx => {
        const atends = db.atendimentos.filter(a => a.diaIndex === idx && new Date(a.dataHora || 0) >= limiteData);
        const totalDia = atends.reduce((acc, a) => acc + parseFloat(a.total || 0), 0);
        faturamentoTotal += totalDia;
        
        container.innerHTML += `
            <button onclick="toggleDia(${idx})" class="dia-btn">
                <span>${dias[idx].toUpperCase()}</span>
                <span class="text-[10px] bg-slate-100 px-2 py-1 rounded-full font-bold">${atends.length}</span>
            </button>
            <div id="lista-dia-${idx}" class="lista-atendimentos ${idx === hoje ? 'aberta' : ''}">
                ${atends.map((a) => {
                    const idxOriginal = db.atendimentos.indexOf(a);
                    
                    let totalProdutos = 0;
                    let produtosExibicao = [];
                    if (a.produtos && a.produtos.length > 0) {
                        a.produtos.forEach(p => {
                            const produtoAtual = db.produtos.find(prod => prod.nome === p.nome);
                            const preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
                            const subtotal = preco * p.qtd;
                            totalProdutos += subtotal;
                            produtosExibicao.push(`${p.qtd}x ${p.nome}`);
                        });
                    }
                    
                    const temRecebedor = a.recebedor && a.recebedor !== 'Não informado';
                    
                    return `
                    <div class="card-atendimento ${a.pendente ? 'border-l-4 border-rose-500' : ''}">
                        <div>
                            <p class="font-black text-xs uppercase">${a.nome} ${a.pendente ? '<span class="text-rose-600 text-[8px]">[PENDENTE]</span>' : ''}</p>
                            <p class="text-[9px] text-slate-400 font-bold uppercase">${a.servicos.join(' + ')}</p>
                            ${a.desconto > 0 ? `<p class="text-[8px] text-rose-400 font-bold">Desconto: -R$ ${parseFloat(a.desconto).toFixed(2)}</p>` : ''}
                            ${temRecebedor ? `<p class="text-[8px] text-slate-400 italic">${a.pendente ? 'Dinheiro com: ' : 'Recebido por: '} ${a.recebedor}</p>` : ''}
                            ${produtosExibicao.length > 0 ? `<p class="text-[9px] text-blue-500 font-black mt-1">🛍️ ${produtosExibicao.join(', ')}: R$ ${totalProdutos.toFixed(2)}</p>` : ''}
                            ${a.gorjeta > 0 ? `<p class="text-[9px] text-amber-500 font-black mt-1">💵 Gorjeta: R$ ${parseFloat(a.gorjeta).toFixed(2)}</p>` : ''}
                            ${a.barbeiroNome ? `<p class="text-[9px] text-purple-500 font-black mt-1">+ ${a.barbeiroNome}: R$ ${parseFloat(a.barbeiroValor || 0).toFixed(2)}</p>` : ''}
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-black text-rose-600">R$ ${parseFloat(a.total).toFixed(2)}</p>
                            <p class="text-[9px] font-bold text-slate-500 uppercase">${a.pendente ? '' : (a.pagamento || '')}</p>
                            <div class="flex gap-2 justify-end mt-1">
                                <button onclick="editarAtendimento(${idxOriginal})" class="text-[8px] font-bold text-blue-400 uppercase">Editar</button>
                                <button onclick="removerAtend(${idxOriginal})" class="text-[8px] font-bold text-slate-300 uppercase">Remover</button>
                            </div>
                        </div>
                    </div>
                `}).join('') || '<p class="text-center text-slate-300 text-[10px] py-4 font-bold">SEM REGISTROS RECENTES</p>'}
            </div>
        `;
    });
    document.getElementById('total-semanal').innerText = `R$ ${faturamentoTotal.toFixed(2)}`;
}

function editarAtendimento(idx) {
    const atend = db.atendimentos[idx];
    itemSendoEditado = idx;
    abrirModalEdicao(atend);
}

function abrirModalEdicao(atend) {
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-title').innerText = "Editar Atendimento";
    document.getElementById('btn-confirmar').innerText = "Salvar Alterações";
    document.getElementById('btn-confirmar').style.display = '';
    document.body.style.overflow = 'hidden';
    
    const container = document.getElementById('campos-dinamicos');
    const cliente = db.clientes.find(c => c.nome.toLowerCase() === atend.nome.toLowerCase());
    const fotoCliente = cliente?.foto || '';
    
    // Produtos
    let htmlProds = '';
    if (db.produtos && db.produtos.length > 0) {
        htmlProds = `
            <p class="text-[10px] font-black uppercase text-blue-500 mt-4 mb-2">Produtos Vendidos</p>
            <div class="grid grid-cols-3 gap-2">
                ${db.produtos.map((p, i) => {
                    const produtoNoAtend = atend.produtos ? atend.produtos.find(pr => pr.nome === p.nome) : null;
                    let qty = 1;
                    let checked = '';
                    if (produtoNoAtend) {
                        checked = 'checked';
                        qty = produtoNoAtend.qtd;
                    }
                    return `
                    <div class="flex flex-col">
                        <input type="checkbox" id="prod-${i}" name="prod" value="${p.nome}" class="service-chip" ${checked}>
                        <label for="prod-${i}" class="service-label">${p.nome.toUpperCase()}</label>
                        <div class="qty-wrapper" style="${checked ? 'display:flex' : ''}">
                            <input type="number" id="qty-prod-${i}" value="${qty}" min="1" class="qty-input">
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    }
    
    // Serviços marcados
    const servicosMarcados = {};
    ['Corte', 'Barba'].forEach(s => {
        servicosMarcados[s] = atend.servicos.includes(s) ? 'checked' : '';
    });
    
    // Extras HTML
    let htmlExtras = '';
    if (db.servicosExtras && db.servicosExtras.length > 0) {
        const temExtraMarcado = db.servicosExtras.some(s => atend.servicos.includes(s.nome));
        htmlExtras = `
            <div class="card-extras">
                <button type="button" onclick="toggleExtrasAccordion()" class="card-extras-header">
                    <span>📦 Serviços Extras</span>
                    <i class="fas fa-chevron-down icone-seta ${temExtraMarcado ? 'girado' : ''}" id="icone-seta-extras"></i>
                </button>
                <div class="card-extras-body ${temExtraMarcado ? 'aberto' : ''}" id="extras-body-edicao">
                    <div class="grid grid-cols-2 gap-2">
                        ${db.servicosExtras.map((s, i) => `
                            <div class="flex flex-col">
                                <input type="checkbox" id="ext-${i}" name="serv" value="${s.nome}" class="service-chip" ${atend.servicos.includes(s.nome) ? 'checked' : ''}>
                                <label for="ext-${i}" class="service-label">${s.nome.toUpperCase()}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    }
    
    container.innerHTML = `
        <div class="flex items-center gap-3 mb-4">
            ${fotoCliente ? `<img src="${fotoCliente}" class="w-12 h-12 rounded-full object-cover border-2 border-rose-200">` : '<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>'}
            <div class="flex-1 relative">
                <input type="text" id="m-nome-sem" list="clientes-list" placeholder="Nome do Cliente" value="${atend.nome}" onkeyup="filtrarClientesDropdown(this.value)" onfocus="filtrarClientesDropdown(this.value)" class="font-black text-sm">
                <div id="dropdown-clientes" class="hidden"></div>
            </div>
        </div>
        <datalist id="clientes-list">${db.clientes.map(c => `<option value="${c.nome}">`).join('')}</datalist>
        
        <p class="text-[10px] font-black uppercase text-slate-400 mb-2">Serviços</p>
        <div class="grid grid-cols-2 gap-2">
            <input type="checkbox" id="s-c" name="serv" value="Corte" class="service-chip" ${servicosMarcados['Corte']}>
            <label for="s-c" class="service-label">CORTE</label>
            <input type="checkbox" id="s-b" name="serv" value="Barba" class="service-chip" ${servicosMarcados['Barba']}>
            <label for="s-b" class="service-label">BARBA</label>
        </div>
        
        ${htmlExtras}
        ${htmlProds}
        
        <div class="card-pagamento">
            <span class="card-titulo">💳 Forma de Pagamento</span>
            <div class="flex gap-2">
                <select id="m-pg" class="flex-1" style="margin-bottom:0">
                    <option ${atend.pagamento === 'Pix' ? 'selected' : ''}>Pix</option>
                    <option ${atend.pagamento === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                    <option ${atend.pagamento === 'Cartão' ? 'selected' : ''}>Cartão</option>
                </select>
                <input type="number" id="m-desc" placeholder="Desconto R$" class="w-28" value="${atend.desconto || 0}" style="margin-bottom:0">
            </div>
        </div>
        
        <div class="card-pendente">
            <span class="card-titulo">⚠️ Pagamento Pendente</span>
            <input type="text" id="m-recebedor" placeholder="Com quem ficou o dinheiro?" value="${atend.recebedor || ''}" style="margin-bottom:0">
        </div>
        
        <div class="card-barbeiro">
            <span class="card-titulo">+ Barbeiro</span>
            <div class="flex gap-2">
                <input type="text" id="m-barbeiro-nome" placeholder="Nome" class="flex-1" value="${atend.barbeiroNome || ''}" style="margin-bottom:0">
                <input type="number" id="m-barbeiro-valor" placeholder="R$ 0,00" class="w-28" value="${atend.barbeiroValor || ''}" step="0.01" style="margin-bottom:0">
            </div>
            <p class="card-descricao">Valor de outro barbeiro que está com você</p>
        </div>
        
        <div class="card-gorjeta">
            <span class="card-titulo">💵 Gorjeta (Sua Parte)</span>
            <input type="number" id="m-gorjeta" placeholder="R$ 0,00" class="w-full" value="${atend.gorjeta || ''}" step="0.01" style="margin-bottom:0">
            <p class="card-descricao">Este valor é 100% seu, não divide com a loja</p>
        </div>`;
}

function toggleDia(idx) { 
    document.getElementById(`lista-dia-${idx}`).classList.toggle('aberta'); 
}

function removerAtend(idx) { 
    if(confirm('Remover este atendimento?')) { 
        db.atendimentos.splice(idx, 1); 
        salvarDB(); 
        renderSemana(); 
    } 
}