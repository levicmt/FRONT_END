/* Minha Agenda – tarefas com prazo. JavaScript puro, dados no localStorage. */
const CHAVE = 'agenda-tarefas-v1';
let tarefas = carregarTarefas();
let abaAtual = 'todas';
let editandoId = null;
const $ = id => document.getElementById(id);

/* ---------- Persistência ---------- */
function carregarTarefas() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch (e) { return []; }
}
function salvarTarefas() {
  try { localStorage.setItem(CHAVE, JSON.stringify(tarefas)); }
  catch (e) { console.error('Não foi possível salvar.', e); }
}

/* ---------- Prazo ---------- */
// concluida | atrasada | hoje | no-prazo
function statusDaTarefa(t) {
  if (t.concluida) return 'concluida';
  const prazo = new Date(t.prazo);
  const agora = new Date();
  if (prazo < agora) return 'atrasada';
  if (prazo.toDateString() === agora.toDateString()) return 'hoje';
  return 'no-prazo';
}
function duracao(minutos) {
  const m = Math.abs(minutos);
  if (m < 60) return m + ' min';
  if (m < 1440) return Math.floor(m / 60) + ' h';
  const d = Math.floor(m / 1440);
  return d + (d === 1 ? ' dia' : ' dias');
}
function textoDoStatus(t) {
  const status = statusDaTarefa(t);
  if (status === 'concluida') return 'Concluída';
  const tempo = duracao(Math.round((new Date(t.prazo) - new Date()) / 60000));
  if (status === 'atrasada') return 'Atrasada há ' + tempo;
  if (status === 'hoje') return 'Vence hoje, em ' + tempo;
  return 'Faltam ' + tempo;
}
function formatarPrazo(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/* ---------- Ações ---------- */
function mostrarErro(msg) {
  $('erro').textContent = msg;
  $('erro').hidden = !msg;
}
function lerFormulario() {
  const data = $('data').value;
  return {
    titulo: $('titulo').value.trim(),
    prazo: data ? data + 'T' + ($('hora').value || '23:59') : '',
    prioridade: $('prioridade').value,
  };
}
function validar(dados) {
  if (!dados.titulo) return 'Informe o nome da tarefa.';
  if (!dados.prazo) return 'Informe o prazo para concluir.';
  if (!editandoId && new Date(dados.prazo) < new Date()) return 'O prazo precisa estar no futuro.';
  return '';
}
function salvarFormulario(ev) {
  ev.preventDefault();
  const dados = lerFormulario();
  const erro = validar(dados);
  if (erro) return mostrarErro(erro);
  if (editandoId) {
    Object.assign(tarefas.find(t => t.id === editandoId), dados);
  } else {
    tarefas.push({ id: Date.now().toString(36), concluida: false, lixeira: false, ...dados });
  }
  sairDaEdicao();
  salvarTarefas();
  renderizarTarefas();
}
function iniciarEdicao(t) {
  editandoId = t.id;
  $('titulo').value = t.titulo;
  $('data').value = t.prazo.slice(0, 10);
  $('hora').value = t.prazo.slice(11, 16);
  $('prioridade').value = t.prioridade;
  $('btnSalvar').textContent = 'Salvar';
  $('btnCancelar').hidden = false;
  mostrarErro('');
  $('titulo').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function sairDaEdicao() {
  editandoId = null;
  $('form').reset();
  $('btnSalvar').textContent = 'Adicionar';
  $('btnCancelar').hidden = true;
  mostrarErro('');
}
function alterar(id, campos) {
  Object.assign(tarefas.find(t => t.id === id), campos);
  salvarTarefas();
  renderizarTarefas();
}
function excluirDefinitivo(t) {
  if (!confirm('Excluir "' + t.titulo + '" para sempre?')) return;
  tarefas = tarefas.filter(x => x.id !== t.id);
  salvarTarefas();
  renderizarTarefas();
}
function limparLista() {
  if (abaAtual === 'lixeira') {
    if (!tarefas.some(t => t.lixeira) || !confirm('Esvaziar a lixeira? Não dá para desfazer.')) return;
    tarefas = tarefas.filter(t => !t.lixeira);
  } else {
    tarefas.forEach(t => { if (t.concluida && !t.lixeira) t.lixeira = true; });
  }
  salvarTarefas();
  renderizarTarefas();
}

/* ---------- Filtros ---------- */
function tarefasVisiveis() {
  const texto = $('buscaTexto').value.trim().toLowerCase();
  const data = $('buscaData').value;
  const prio = $('buscaPrio').value;
  return tarefas
    .filter(t => {
      if (abaAtual === 'lixeira') return t.lixeira;
      if (t.lixeira) return false;
      if (abaAtual === 'pendentes') return !t.concluida;
      if (abaAtual === 'concluidas') return t.concluida;
      return true;
    })
    .filter(t => !texto || t.titulo.toLowerCase().includes(texto))
    .filter(t => !data || t.prazo.slice(0, 10) === data)
    .filter(t => !prio || t.prioridade === prio)
    .sort((a, b) => (a.concluida - b.concluida) || (new Date(a.prazo) - new Date(b.prazo)));
}

/* ---------- Renderização ---------- */
function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}
function botao(texto, classe, aoClicar, rotulo) {
  const b = criar('button', classe, texto);
  b.type = 'button';
  b.setAttribute('aria-label', rotulo);
  b.onclick = aoClicar;
  return b;
}
function criarItem(t) {
  const status = statusDaTarefa(t);
  const li = criar('li', 'tarefa ' + (t.lixeira ? 'concluida' : status));

  if (t.lixeira) {
    li.append(criar('span'));
  } else {
    const check = botao('', 'check', () => alterar(t.id, { concluida: !t.concluida }),
      (t.concluida ? 'Desmarcar ' : 'Concluir ') + t.titulo);
    check.setAttribute('aria-pressed', String(t.concluida));
    check.append(criar('span', '', '✓'));
    li.append(check);
  }

  const corpo = criar('div');
  corpo.append(criar('div', 't-titulo', t.titulo));
  const meta = criar('div', 't-meta');
  meta.append(criar('span', 'selo', textoDoStatus(t)), criar('span', '', formatarPrazo(t.prazo)));
  meta.append(criar('span', t.prioridade === 'alta' ? 'prio-alta' : '', 'Prioridade ' + t.prioridade));
  corpo.append(meta);
  li.append(corpo);

  const acoes = criar('div', 't-acoes');
  if (t.lixeira) {
    acoes.append(
      botao('Restaurar', 'mini', () => alterar(t.id, { lixeira: false }), 'Restaurar ' + t.titulo),
      botao('Excluir de vez', 'mini perigo', () => excluirDefinitivo(t), 'Excluir de vez ' + t.titulo));
  } else {
    acoes.append(
      botao('Editar', 'mini', () => iniciarEdicao(t), 'Editar ' + t.titulo),
      botao('Excluir', 'mini perigo', () => alterar(t.id, { lixeira: true }), 'Mover para a lixeira ' + t.titulo));
  }
  li.append(acoes);
  return li;
}
const MSG_VAZIO = {
  todas: 'Sua agenda está vazia. Adicione uma tarefa para começar.',
  pendentes: 'Nenhuma tarefa pendente.',
  concluidas: 'Nenhuma tarefa concluída ainda.',
  lixeira: 'A lixeira está vazia.',
};
function renderizarTarefas() {
  const visiveis = tarefasVisiveis();
  $('lista').replaceChildren(...visiveis.map(criarItem));

  const ativas = tarefas.filter(t => !t.lixeira);
  const filtrando = $('buscaTexto').value || $('buscaData').value || $('buscaPrio').value;
  $('vazio').hidden = visiveis.length > 0;
  $('vazio').textContent = filtrando && tarefas.length ? 'Nenhuma tarefa encontrada com esses filtros.' : MSG_VAZIO[abaAtual];

  const noLixo = tarefas.length - ativas.length;
  $('resumo').textContent = abaAtual === 'lixeira'
    ? noLixo + ' na lixeira'
    : ativas.filter(t => !t.concluida).length + ' pendentes · ' + ativas.length + ' tarefas';
  $('btnLimpar').textContent = abaAtual === 'lixeira' ? 'Esvaziar lixeira' : 'Limpar concluídas';
}

/* ---------- Eventos ---------- */
$('form').addEventListener('submit', salvarFormulario);
$('btnCancelar').onclick = sairDaEdicao;
$('btnLimpar').onclick = limparLista;
['buscaTexto', 'buscaData', 'buscaPrio'].forEach(id => $(id).addEventListener('input', renderizarTarefas));
document.querySelectorAll('.aba').forEach(btn => {
  btn.onclick = () => {
    abaAtual = btn.dataset.aba;
    document.querySelectorAll('.aba').forEach(b => {
      b.classList.toggle('ativa', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    renderizarTarefas();
  };
});
$('data').min = hojeISO();
renderizarTarefas();
setInterval(renderizarTarefas, 60000); // reavalia prazos a cada minuto
