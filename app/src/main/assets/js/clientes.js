// ==========================================
// CLIENTES - clientes.js
// ==========================================

function renderClientes() {
    var l = document.getElementById('lista-clientes');
    var f = document.getElementById('filtro-cliente').value.toLowerCase();
    var tagContainer = document.getElementById('container-tags');
    
    var tags = [];
    db.clientes.forEach(function(c) {
        if (c.tags) {
            c.tags.split(',').forEach(function(t) {
                var tag = t.trim().toLowerCase();
                if (tag && tags.indexOf(tag) === -1) {
                    tags.push(tag);
                }
            });
        }
    });
    
    tagContainer.innerHTML = tags.map(function(t) {
        return '<button onclick="aplicarFiltroTag(\'' + t + '\')" class="whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase text-slate-500">#' + t + '</button>';
    }).join('');
    
    l.innerHTML = db.clientes.filter(function(c) {
        return (c.nome + (c.tags || '')).toLowerCase().indexOf(f) !== -1;
    }).map(function(c) {
        var idx = db.clientes.indexOf(c);
        var totalSemana = db.atendimentos.filter(function(a) {
            return a.nome.toLowerCase() === c.nome.toLowerCase();
        }).length;
        var totalAtendimentos = (c.totalAtendimentos || 0) + totalSemana;
        
        var fotoHtml = c.foto ? '<img src="' + c.foto + '" class="w-12 h-12 rounded-full object-cover">' : '<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>';
        
        return '<div class="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform" onclick="verHistorico(\'' + c.nome.replace(/'/g, "\\'") + '\')"><div class="flex items-center gap-3">' + fotoHtml + '<div><p class="font-black text-sm uppercase">' + c.nome + '</p><p class="text-[10px] text-slate-400 font-bold">' + (c.contato || 'S/ CONTATO') + '</p></div></div><div class="flex items-center gap-3" onclick="event.stopPropagation()"><span class="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full cursor-pointer\" onclick=\"editarTotalAtendimentos(' + idx + ', event)\">' + totalAtendimentos + ' atend. ✏️</span><button onclick="prepararEdicaoCliente(' + idx + ')" class="text-slate-300"><i class="fas fa-edit"></i></button><button onclick="excluirCliente(' + idx + ')" class="text-slate-200"><i class="fas fa-trash-alt"></i></button></div></div>';
    }).join('');
}

function prepararEdicaoCliente(i) {
    itemSendoEditado = i;
    abaAtual = 'clientes';
    if (croppieInstance) { croppieInstance.destroy(); croppieInstance = null; }
    abrirModal(false);
    var c = db.clientes[i];
    setTimeout(function() {
        document.getElementById('m-nome').value = c.nome;
        document.getElementById('m-contato').value = c.contato || '';
        document.getElementById('m-tags').value = c.tags || '';
        if (c.foto) {
            var cropContainer = document.getElementById('crop-container');
            var cropperWrap = document.getElementById('cropper-wrap');
            if (cropContainer && cropperWrap) {
                cropContainer.style.display = 'block';
                cropperWrap.innerHTML = '<img src="' + c.foto + '" style="max-width:100%; border-radius:8px; margin-top:8px;" title="Foto atual">';
            }
        }
    }, 50);
}

function editarTotalAtendimentos(idx, event) {
    event.stopPropagation();
    var c = db.clientes[idx];
    var totalSemana = db.atendimentos.filter(function(a) {
        return a.nome.toLowerCase() === c.nome.toLowerCase();
    }).length;
    var totalAtual = (c.totalAtendimentos || 0) + totalSemana;

    var modal = document.createElement('div');
    modal.id = 'modal-editar-atend';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;padding:24px;width:260px;box-shadow:0 20px 60px rgba(0,0,0,0.25);text-align:center;">
            <p style="margin:0 0 16px;font-size:11px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Nº de atendimentos</p>
            <input id="input-editar-atend" type="number" min="0" value="${totalAtual}"
                style="width:100%;text-align:center;font-size:28px;font-weight:900;color:#e11d48;border:2px solid #f1f5f9;border-radius:12px;padding:10px 0;outline:none;background:#fafafa;">
            <div style="display:flex;gap:10px;margin-top:16px;">
                <button id="btn-cancel-atend" style="flex:1;padding:11px;border:2px solid #e2e8f0;background:white;border-radius:12px;font-weight:700;font-size:12px;color:#64748b;cursor:pointer;text-transform:uppercase;">Cancelar</button>
                <button id="btn-ok-atend" style="flex:1;padding:11px;background:#e11d48;color:white;border:none;border-radius:12px;font-weight:700;font-size:12px;cursor:pointer;text-transform:uppercase;">Salvar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    var input = document.getElementById('input-editar-atend');
    input.focus();
    input.select();

    document.getElementById('btn-cancel-atend').onclick = function() { modal.remove(); };
    document.getElementById('btn-ok-atend').onclick = function() {
        var novoTotal = parseInt(input.value);
        if (!isNaN(novoTotal) && novoTotal >= 0) {
            db.clientes[idx].totalAtendimentos = Math.max(0, novoTotal - totalSemana);
            salvarDB();
            renderClientes();
        }
        modal.remove();
    };
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
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
    var dropdown = document.getElementById('dropdown-clientes');
    if (!dropdown) return;
    
    if (!termo || termo.trim().length < 1) {
        dropdown.classList.add('hidden');
        return;
    }
    
    var filtrados = db.clientes.filter(function(c) {
        return c.nome.toLowerCase().indexOf(termo.toLowerCase()) !== -1;
    });
    
    if (filtrados.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }
    
    dropdown.innerHTML = filtrados.map(function(c) {
        var ultimoAtend = db.atendimentos.filter(function(a) {
            return a.nome.toLowerCase() === c.nome.toLowerCase();
        }).sort(function(a, b) {
            return new Date(b.dataHora) - new Date(a.dataHora);
        })[0];
        
        var ultimoTexto = ultimoAtend ? ultimoAtend.servicos.join(' + ') + ' (' + new Date(ultimoAtend.dataHora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ')' : 'Nenhum atendimento';
        
        var fotoHtml = c.foto ? '<img src="' + c.foto + '" class="w-10 h-10 rounded-full object-cover">' : '<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>';
        
        return '<div onclick="selecionarClienteDropdown(\'' + c.nome.replace(/'/g, "\\'") + '\')">' + fotoHtml + '<div><p class="font-black text-xs uppercase">' + c.nome + '</p><p class="text-[8px] text-slate-400 font-bold">Último: ' + ultimoTexto + '</p></div></div>';
    }).join('');
    
    dropdown.classList.remove('hidden');
}

function selecionarClienteDropdown(nome) {
    var inputNome = document.getElementById('m-nome-sem');
    var dropdown = document.getElementById('dropdown-clientes');
    
    if (inputNome) inputNome.value = nome;
    if (dropdown) dropdown.classList.add('hidden');
    
    var cliente = db.clientes.find(function(c) { return c.nome === nome; });
    var fotoContainer = document.getElementById('foto-cliente-preview');
    
    if (fotoContainer) {
        if (cliente && cliente.foto) {
            fotoContainer.innerHTML = '<img src="' + cliente.foto + '" class="w-12 h-12 rounded-full object-cover border-2 border-rose-200">';
        } else {
            fotoContainer.innerHTML = '<div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300"><i class="fas fa-user"></i></div>';
        }
    }
}

// ==========================================
// HISTÓRICO DO CLIENTE (COM CICLOS DE FIDELIDADE)
// ==========================================

function verHistorico(nomeCliente) {
    document.body.classList.add('modal-aberto');
    
    var atendimentosDoCliente = db.atendimentos.filter(function(a) {
        return a.nome.toLowerCase() === nomeCliente.toLowerCase();
    }).sort(function(a, b) {
        return new Date(b.dataHora) - new Date(a.dataHora);
    });
    
    var container = document.getElementById('campos-dinamicos');
    var btnConfirmar = document.getElementById('btn-confirmar');
    
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-title').innerText = '📋 ' + nomeCliente;
    btnConfirmar.style.display = 'none';
    
    if (atendimentosDoCliente.length === 0) {
        container.innerHTML = '<div class="text-center py-8"><p class="text-[12px] font-black uppercase text-slate-300">Nenhum atendimento encontrado</p><p class="text-[10px] text-slate-400 mt-2">Os atendimentos aparecerão aqui quando registrados</p><button onclick="novoAtendimentoDoCliente(\'' + nomeCliente.replace(/'/g, "\\'") + '\')" class="mt-4 bg-rose-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform">✂️ Novo Atendimento</button></div>';
        return;
    }
    
    var totalGasto = atendimentosDoCliente.reduce(function(acc, a) { return acc + parseFloat(a.total || 0); }, 0);
    var totalAtendimentos = atendimentosDoCliente.length;
    var cliente = db.clientes.find(function(cl) { return cl.nome.toLowerCase() === nomeCliente.toLowerCase(); });
    var acumulado = cliente ? (cliente.totalAtendimentos || 0) : 0;
    var totalAtendimentosGlobal = acumulado + totalAtendimentos;
    
    var servicosFavoritos = {};
    atendimentosDoCliente.forEach(function(a) {
        a.servicos.forEach(function(s) {
            servicosFavoritos[s] = (servicosFavoritos[s] || 0) + 1;
        });
    });
    var servicoTop = Object.entries(servicosFavoritos).sort(function(a, b) { return b[1] - a[1]; })[0];
    
    var ciclosCompletos = Math.floor(totalAtendimentosGlobal / CICLO_FIDELIDADE);
    var progressoCicloAtual = totalAtendimentosGlobal % CICLO_FIDELIDADE;
    var faltamParaProximo = CICLO_FIDELIDADE - progressoCicloAtual;
    
    function montarCard(a) {
        var data = new Date(a.dataHora);
        var dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        var diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][data.getDay()];
        
        var totalProdutos = 0;
        var produtosExibicao = [];
        if (a.produtos && a.produtos.length > 0) {
            a.produtos.forEach(function(p) {
                var produtoAtual = db.produtos.find(function(prod) { return prod.nome === p.nome; });
                var preco = produtoAtual ? parseFloat(produtoAtual.valor || 0) : 0;
                totalProdutos += preco * p.qtd;
                produtosExibicao.push(p.qtd + 'x ' + p.nome);
            });
        }
        
        var temRecebedor = a.recebedor && a.recebedor !== 'Não informado';
        
        var html = '<div class="bg-white p-3 rounded-xl border-l-4 ' + (a.pendente ? 'border-rose-500' : 'border-emerald-500') + '"><div class="flex justify-between items-start"><div><p class="text-[9px] font-black uppercase text-slate-500">' + diaSemana + ', ' + dataFormatada + '</p><p class="text-[11px] font-black uppercase mt-1">' + a.servicos.join(' + ') + '</p>';
        
        if (a.desconto > 0) html += '<p class="text-[8px] text-rose-400 font-bold">Desconto: -R$ ' + parseFloat(a.desconto).toFixed(2) + '</p>';
        if (produtosExibicao.length > 0) html += '<p class="text-[9px] text-blue-500 font-bold mt-1">🛍️ ' + produtosExibicao.join(', ') + ': R$ ' + totalProdutos.toFixed(2) + '</p>';
        if (a.gorjeta > 0) html += '<p class="text-[9px] text-amber-500 font-bold">💵 Gorjeta: R$ ' + parseFloat(a.gorjeta).toFixed(2) + '</p>';
        if (a.barbeiroNome) html += '<p class="text-[9px] text-purple-500 font-bold">+ ' + a.barbeiroNome + ': R$ ' + parseFloat(a.barbeiroValor || 0).toFixed(2) + '</p>';
        
        html += '</div><div class="text-right"><p class="text-sm font-black text-rose-600">R$ ' + parseFloat(a.total).toFixed(2) + '</p><p class="text-[8px] font-bold uppercase ' + (a.pendente ? 'text-rose-500' : 'text-emerald-500') + '">' + (a.pendente ? '⚠️ PENDENTE' : '✅ PAGO') + (temRecebedor ? ' • ' + a.recebedor : '') + '</p><p class="text-[7px] text-slate-400 mt-1">' + (a.pagamento || '') + '</p></div></div></div>';
        
        return html;
    }
    
    var inicioCiclo = ciclosCompletos * CICLO_FIDELIDADE;
    var fimCiclo = inicioCiclo + CICLO_FIDELIDADE;
    var atendimentosCicloAtual = atendimentosDoCliente.slice(inicioCiclo, fimCiclo);
    
    var html = '<div class="grid grid-cols-3 gap-2 mb-4"><div class="bg-rose-50 p-3 rounded-xl text-center"><p class="text-[8px] font-black uppercase text-rose-400">Atendimentos</p><p class="text-lg font-black text-rose-600">' + totalAtendimentosGlobal + '</p></div><div class="bg-emerald-50 p-3 rounded-xl text-center"><p class="text-[8px] font-black uppercase text-emerald-400">Total Gasto</p><p class="text-lg font-black text-emerald-600">R$ ' + totalGasto.toFixed(2) + '</p></div><div class="bg-blue-50 p-3 rounded-xl text-center"><p class="text-[8px] font-black uppercase text-blue-400">Favorito</p><p class="text-[10px] font-black text-blue-600">' + (servicoTop ? servicoTop[0] : 'N/A') + '</p></div></div>';
    
    html += '<button onclick="novoAtendimentoDoCliente(\'' + nomeCliente.replace(/'/g, "\\'") + '\')" class="w-full mb-4 bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform">✂️ Novo Atendimento</button>';
    
    html += '<div class="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl mb-4 border border-amber-200"><div class="flex items-center justify-between mb-2"><span class="text-[10px] font-black uppercase text-amber-700">🏆 Fidelidade: ' + ciclosCompletos + ' ' + (ciclosCompletos === 1 ? 'ciclo' : 'ciclos') + '</span>' + (ciclosCompletos > 0 ? '<span class="text-[8px] font-bold text-amber-500 bg-amber-100 px-2 py-1 rounded-full">' + (ciclosCompletos * CICLO_FIDELIDADE) + ' atend. ✏️</span>' : '') + '</div><div class="flex items-center gap-3"><span class="text-[10px] font-black uppercase text-amber-600">📊 Ciclo atual: ' + progressoCicloAtual + '/' + CICLO_FIDELIDADE + '</span>' + (faltamParaProximo > 0 ? '<span class="text-[8px] text-amber-500 font-bold">(faltam ' + faltamParaProximo + ')</span>' : '<span class="text-[8px] text-emerald-500 font-bold">🎉 Completo!</span>') + '</div><div class="mt-2 bg-amber-200 rounded-full h-2 overflow-hidden"><div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ' + (progressoCicloAtual / CICLO_FIDELIDADE) * 100 + '%"></div></div></div>';
    
    html += '<div class="bg-slate-100 rounded-2xl overflow-hidden"><button onclick="toggleHistorico(this)" class="w-full p-4 flex justify-between items-center font-black uppercase text-[10px] text-slate-600 active:bg-slate-200 transition-colors"><span>📜 Últimos atendimentos (' + atendimentosCicloAtual.length + ')</span><i class="fas fa-chevron-down text-slate-400 transition-transform duration-300" id="icone-seta"></i></button><div id="historico-lista" class="hidden px-4 pb-4 space-y-2">';
    
    atendimentosCicloAtual.forEach(function(a) {
        html += montarCard(a);
    });
    
    html += '</div></div>';
    
    container.innerHTML = html;
}

function toggleHistorico(btn) {
    var lista = document.getElementById('historico-lista');
    var icone = document.getElementById('icone-seta');
    
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
    
    setTimeout(function() {
        var inputNome = document.getElementById('m-nome-sem');
        if (inputNome) {
            inputNome.value = nomeCliente;
            selecionarClienteDropdown(nomeCliente);
        }
        document.getElementById('modal-title').innerText = "Novo Atendimento";
    }, 100);
}