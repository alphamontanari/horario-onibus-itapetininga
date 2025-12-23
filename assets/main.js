/* ====== STATE ====== */
const state = {
  nivel: 1,
  linhaKey: null,
  hora: null,
  periodo: null,
  query: "",
};

const app = document.getElementById("app");
const crumbs = document.getElementById("crumbs");




/* ====== HELPERS ====== */
const periodLabels = {
  dia_de_semana: "Dia de semana",
  terca_e_quinta: "Terça e Quinta",
  quarta: "Quarta-feira",
  segunda_e_quinta : "Segunda e Quinta",
  terca_e_sexta : "Terça e Sexta",
  sabado: "Sábado",
  domingo_feriado: "Domingo/Feriado",
};

function labelPeriodo(k) {
  return periodLabels[k] || k;
};

function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
      m
    ])
  );
};

function btnCrumb(text, fn) {
  return `<button type="button" onclick="(${fn})()">${escapeHtml(
    text
  )}</button>`;
};

function sep() {
  return `<span class="sep">›</span>`;
};

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
function toMin(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

/* ====== HISTORY / BACK BUTTON (MOBILE) ====== */
// Gera um snapshot serializável do seu estado atual (sem funções)
function snapshotState() {
  return {
    nivel: state.nivel,
    linhaKey: state.linhaKey,
    periodo: state.periodo,
    hora: state.hora,
    query: state.query
  };
}

// (Opcional) deixa a URL compartilhável com hash (sem recarregar)
function buildHashFromState(st) {
  const params = new URLSearchParams();
  if (st.nivel) params.set("n", String(st.nivel));
  if (st.linhaKey) params.set("l", st.linhaKey);
  if (st.periodo) params.set("p", st.periodo);
  if (st.hora) params.set("h", st.hora);
  if (st.query) params.set("q", st.query);
  const s = params.toString();
  return s ? `#${s}` : "#";
}

function parseHashToState() {
  const st = { ...snapshotState() };
  if (!location.hash) return st;
  const sp = new URLSearchParams(location.hash.slice(1));
  const n = parseInt(sp.get("n") || "1", 10);
  st.nivel = [1, 2, 3].includes(n) ? n : 1;
  st.linhaKey = sp.get("l") || null;
  st.periodo = sp.get("p") || null;
  st.hora = sp.get("h") || null;
  st.query = sp.get("q") || "";
  return st;
}

let _navigatingFromPop = false;

// Empilha (ou substitui) o histórico com o estado atual
function pushHistory({ replace = false } = {}) {
  const st = snapshotState();
  const url = buildHashFromState(st);
  if (replace) {
    history.replaceState(st, "", url);
  } else {
    history.pushState(st, "", url);
  }
}

// Ao voltar no celular, o navegador dispara popstate.
// Aplicamos o state vindo do histórico e re-renderizamos SEM empilhar de novo.
window.addEventListener("popstate", (evt) => {
  const st = evt.state;
  // Se não veio state (ex.: acesso direto), tenta recuperar do hash
  const next = st ?? parseHashToState();
  _navigatingFromPop = true;
  state.nivel = next.nivel ?? 1;
  state.linhaKey = next.linhaKey ?? null;
  state.periodo = next.periodo ?? null;
  state.hora = next.hora ?? null;
  state.query = next.query ?? "";
  render();
  _navigatingFromPop = false;
});

// Na primeira carga, alinhe o estado com a URL (hash) e gere o histórico base
(function initHistoryOnLoad() {
  // Se já há hash, sincroniza o state a partir dele
  if (location.hash) {
    const initial = parseHashToState();
    state.nivel = initial.nivel;
    state.linhaKey = initial.linhaKey;
    state.periodo = initial.periodo;
    state.hora = initial.hora;
    state.query = initial.query;
  }
  // Empilha estado inicial como replace (não cria um passo “fantasma”)
  pushHistory({ replace: true });
})();


// Extrai todos os locais (para busca) a partir da estrutura de períodos/horários
function locaisFromHorarios(horarios) {
  const set = new Set();
  Object.values(horarios || {}).forEach((periodoObj) => {
    Object.values(periodoObj || {}).forEach((horarioObj) => {
      const atend = horarioObj?.atendimento || {};
      Object.keys(atend).forEach((loc) => set.add(loc));
    });
  });
  return Array.from(set);
}

// Busca por ID, nome, partida, chegada e locais de atendimento
function matchesSearch(linha, q) {
  if (!q) return true;
  const locais = locaisFromHorarios(linha.horarios);
  const bag = [linha.id, linha.nome, linha.partida, linha.chegada, ...locais]
    .map(norm)
    .join(" | ");
  return bag.includes(norm(q));
}

// Retorna par [key, objeto] de uma linha a partir de state.linhaKey
function getLinha() {
  if (!state.linhaKey) return null;
  const l = LINHAS[state.linhaKey];
  if (!l) return null;
  return [state.linhaKey, l];
}

/* ====== RENDER ROOT (sempre limpa) ====== */
/* ====== NÍVEL 1 — lista de linhas + busca ====== */
function render() {
  app.innerHTML = "";

  // breadcrumbs
  const parts = [];
  parts.push(
    btnCrumb("Linhas", () => {
      state.nivel = 1;
      state.linhaKey = null;
      state.hora = null;
      state.periodo = null;
      render();
    })
  );

  const pair = getLinha();
  if (pair) {
    const [, l] = pair;
    parts.push(sep());
    parts.push(
      btnCrumb(`Linha ${l.id}`, () => {
        state.nivel = 2;
        state.hora = null;
        state.periodo = null;
        render();
      })
    );
  }
  if (state.nivel >= 3 && state.periodo) {
    parts.push(sep());
    parts.push(
      btnCrumb(labelPeriodo(state.periodo), () => {
        state.nivel = 2;
        state.hora = null;
        render();
      })
    );
  }
  if (state.nivel === 3 && state.hora) {
    parts.push(sep());
    parts.push(
      `<button class="current" type="button" disabled>Horário ${state.hora}</button>`
    );
  }

  crumbs.innerHTML = parts.join("");



  // Empilha o estado atual no histórico, exceto quando ele veio de um popstate
  if (!_navigatingFromPop) {
    pushHistory(); // cria um passo de histórico por mudança de nível/breadcrumb
  }




  if (state.nivel === 1) return renderNivel1();
  if (state.nivel === 2) return renderNivel2();
  if (state.nivel === 3) return renderNivel3();
}

/* ====== NÍVEL 2 — períodos e horários ====== */

/* cache interno para não recriar input/list a cada chamada */
let _n1Wrap = null,
  _n1List = null,
  _n1Input = null,
  _n1Timer = null;

/* ====== NÍVEL 1 — lista de linhas + busca (sem render() na digitação) ====== */
function renderNivel1() {
  // cria apenas uma vez
  if (!_n1Wrap) {
    _n1Wrap = document.createElement("div");

    // search box (UMA vez)
    const s = document.createElement("div");
    s.className = "search";
    s.innerHTML = `
      <input id="q" type="search"
        placeholder="Pesquisar por ID, nome, partida, chegada ou bairro…"
        value="${escapeHtml(state.query)}"
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="hint">Ex.: 01, Estância, Pacaembu, Rodoviária, Vila Regina…</div>`;
    _n1Wrap.appendChild(s);

    _n1Input = s.querySelector("#q");
    _n1Input.addEventListener("input", (e) => {
      state.query = e.target.value;
      clearTimeout(_n1Timer);
      _n1Timer = setTimeout(updateNivel1Lista, 120);
    });

    // lista fixa
    _n1List = document.createElement("section");
    _n1List.className = "list";
    _n1Wrap.appendChild(_n1List);

    app.appendChild(_n1Wrap);
  } else {
    // <<< LINHA NOVA: se o wrap saiu do DOM (app.innerHTML=''), reapenda >>>
    if (!_n1Wrap.isConnected) app.appendChild(_n1Wrap);

    // Se voltar para o nível 1, garante que o input reflita o state atual
    if (_n1Input.value !== state.query) {
      _n1Input.value = state.query;
      _n1Input.setSelectionRange(state.query.length, state.query.length);
    }
  }

  // <<< LINHA NOVA (opcional): se você usa show/hide entre views >>>
  // if (typeof showView === 'function') showView(1);

  // pinta/repinta apenas os cards
  updateNivel1Lista();
}

/* Atualiza SÓ os cards da lista do nível 1 */
function updateNivel1Lista() {
  if (!_n1List) return;

  _n1List.innerHTML = "";

  const linhasArr = Object.entries(LINHAS).map(([key, l]) => ({
    ...l,
    _key: key,
  }));
  const filtered = linhasArr.filter((l) => matchesSearch(l, state.query));

  if (!filtered.length) {
    _n1List.innerHTML = `<div class="card">Nenhuma linha encontrada.</div>`;
    return;
  }

  filtered.forEach((l) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <button class="line-btn" type="button">
        LINHA ${escapeHtml(l.id)}<span class="sub">${escapeHtml(l.nome)}</span>
      </button>`;
    card.querySelector("button").addEventListener("click", () => {
      state.linhaKey = l._key;
      state.nivel = 2;
      state.hora = null;
      state.periodo = null;

      render(); // ok para trocar de nível
    });
    _n1List.appendChild(card);
  });
}

/* Atualiza SÓ os cards da lista do nível 1 */
function updateNivel1Lista() {
  if (!_n1List) return;

  _n1List.innerHTML = "";

  // LINHAS agora é um OBJETO -> transformamos em array para listar
  const linhasArr = Object.entries(LINHAS).map(([key, l]) => ({
    ...l,
    _key: key,
  }));
  const filtered = linhasArr.filter((l) => matchesSearch(l, state.query));

  if (!filtered.length) {
    _n1List.innerHTML = `<div class="card">Nenhuma linha encontrada.</div>`;
    return;
  }

  filtered.forEach((l) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <button class="line-btn" type="button">
        LINHA ${escapeHtml(l.id)}<span class="sub">${escapeHtml(l.nome)}</span>
      </button>`;
    card.querySelector("button").addEventListener("click", () => {
      state.linhaKey = l._key;
      state.nivel = 2;
      state.hora = null;
      state.periodo = null;
      render(); // ok chamar aqui para trocar de nível
    });
    _n1List.appendChild(card);
  });
}


/* Exibe horários por linha nível 2 */
function renderNivel2() {
  const pair = getLinha();
  if (!pair) return;
  const [, l] = pair;

  // Cabeçalho da linha
  const head = document.createElement("div");
  head.className = "card";
  head.innerHTML = `<strong>LINHA ${escapeHtml(l.id)}</strong>
    <div class="muted">${escapeHtml(l.nome)}</div>`;
  app.appendChild(head);

  const periodKeys = Object.keys(l.horarios || {});
  if (!periodKeys.length) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "Nenhum horário cadastrado para esta linha.";
    app.appendChild(empty);
    return;
  }

  // ordem amigável das abas (se não existir, cai pro final)
  const order = ["dia_de_semana", "segunda_e_quinta", "quarta", "terca_e_quinta", "terca_e_sexta", "sabado", "domingo_feriado"];
  const ordered = periodKeys.slice().sort((a, b) => {
    const ia = order.indexOf(a); const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // Qual aba começa ativa? prioriza o state.periodo se existir
  const initialPk = ordered.includes(state.periodo) ? state.periodo : ordered[0];

  // Card com as abas
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="tabs" role="tablist" aria-label="Períodos">
      ${ordered.map((pk) => `
        <button class="tab${pk === initialPk ? " active" : ""}"
                role="tab"
                aria-selected="${pk === initialPk}"
                data-pk="${pk}">
          ${escapeHtml(labelPeriodo(pk))}
        </button>
      `).join("")}
    </div>
    <div class="tab-panels">
      ${ordered.map((pk) => `
        <div class="tab-panel${pk === initialPk ? " active" : ""}" role="tabpanel" data-pk="${pk}">
          <div class="time-grid" data-pk="${pk}"></div>
        </div>
      `).join("")}
    </div>
  `;
  app.appendChild(card);

  // Preenche cada painel com os horários
  let anyDiferenciado = false;

  ordered.forEach(pk => {
    const bloco = l.horarios[pk] || {};
    const horariosList = Object.keys(bloco).sort((a, b) => toMin(a) - toMin(b));
    const panel = card.querySelector(`.time-grid[data-pk="${pk}"]`);

    horariosList.forEach(h => {
      const info = bloco[h] || {};
      const tipo = (info.trajeto || "normal").toLowerCase();
      const isDiff = tipo !== "normal";

      if (isDiff) anyDiferenciado = true;

      const b = document.createElement("button");
      b.className = "time-btn";
      b.type = "button";
      // adiciona asterisco visual e atributos de acessibilidade
      b.innerHTML = isDiff
        ? `${escapeHtml(h)}<span class="traj-flag" aria-hidden="true">*</span>`
        : `${escapeHtml(h)}`;
      b.title = isDiff ? "Trajeto diferenciado" : "Trajeto normal";
      b.setAttribute("aria-label", isDiff ? `${h}, trajeto diferenciado` : `${h}, trajeto normal`);
      b.dataset.trajeto = tipo; // útil para CSS/JS futuro

      b.addEventListener("click", () => {
        state.periodo = pk;
        state.hora = h;
        state.nivel = 3;
        render();
      });

      panel.appendChild(b);
    });
  });

  // Comportamento das abas
  const tabs = Array.from(card.querySelectorAll(".tab"));
  const panels = Array.from(card.querySelectorAll(".tab-panel"));

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const pk = tab.dataset.pk;

      // guarda período no state (ajuda o histórico/voltar)
      state.periodo = pk;

      tabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });

      panels.forEach(p => {
        p.classList.toggle("active", p.dataset.pk === pk);
      });
    });
  });

  // Rodapé/legenda quando houver ao menos um trajeto diferenciado
  if (anyDiferenciado) {
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `<span class="traj-flag" aria-hidden="true">*</span> horário com <strong>trajeto diferenciado</strong>.`;
    card.appendChild(legend);

    const alert = document.createElement("div");
    alert.className = "alert alert-info";
    alert.innerHTML = `Atenção: esta linha pode conter <strong>trajetos diferenciados</strong> dependendo do horário. Selecione um horário para verificar os detalhes.`;
    app.appendChild(alert);
  }

  addPdfDownloadButton(head, l);
}


/* ====== NÍVEL 3 — atendimento daquele horário (ordenado por HH:MM) ====== */


function renderNivel3() {
  const pair = getLinha();
  if (!pair) return;
  const [, l] = pair;

  // Guardas
  if (!state.periodo || !state.hora) {
    const miss = document.createElement("div");
    miss.className = "card";
    miss.textContent = "Selecione um período e um horário.";
    app.appendChild(miss);
    return;
  }

  const blocoPeriodo = l.horarios?.[state.periodo] || {};
  const registro = blocoPeriodo?.[state.hora] || {};
  const atendimentoObj = registro.atendimento || {};

  /* === CAPTURAR "servico" DO HORÁRIO (com fallbacks) === */
  const servicoRaw =
    registro.servico ??
    l.horarios?.[state.periodo]?.[state.hora]?.servico ??
    l.servico ?? null;

  // Normaliza para rótulo legível
  const mapServico = {
    normal: "Convencional",
    comum: "Convencional",
    expresso: "Expresso",
    rapido: "Rápido",
    semidireto: "Semi-direto",
    semip: "Semi-direto",
    escolar: "Escolar",
    interbairros: "Interbairros",
    experimental: "Experimental",
  };
  const servicoKey = String(servicoRaw || "").trim().toLowerCase();
  const servicoLabel = servicoKey
    ? (mapServico[servicoKey] || servicoRaw)
    : "";

  // tipo de itinerário com fallback para 'normal'
  const tipo = String((registro.trajeto || "normal")).toLowerCase();
  const isDiff = tipo !== "normal";
  const labelTipo = isDiff ? "Itinerário diferenciado" : "Itinerário normal";

  // Converte para array e ordena por horário (HH:MM)
  const traj = Object.entries(atendimentoObj)
    .map(([local, hora]) => ({ local, hora }))
    .sort((a, b) => toMin(a.hora) - toMin(b.hora));

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div>
        <strong>LINHA ${escapeHtml(l.id)}</strong> · ${escapeHtml(l.nome)}
      </div>
      <div class="muted">
        ${escapeHtml(labelPeriodo(state.periodo))} · Saída: <strong>${escapeHtml(state.hora)}</strong>
      </div>
      ${servicoLabel ? `
        <div class="muted">
          Serviço: <span class="chip chip-serv">${escapeHtml(servicoLabel)}</span>
        </div>
      ` : ""}
    </div>

    <div class="meta-row" style="margin-top:.5rem;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div class="meta-title">Tipo de Itinerário:</div>
      <div class="chip ${isDiff ? "chip-diff" : "chip-norm"}"
           title="${escapeHtml(labelTipo)}"
           aria-label="${escapeHtml(labelTipo)}">
        ${escapeHtml(labelTipo)}
      </div>
    </div>

    ${isDiff ? `
      <div class="alert alert-info" role="status" aria-live="polite" style="margin-top:.5rem">
        Atenção: este horário realiza <strong>itinerário diferenciado</strong>. Verifique os pontos atendidos abaixo.
      </div>
    ` : ""}

    <div class="itinerario" style="margin-top:.75rem">
      <strong>Atendimento / Trajeto (estimado)</strong>
      <ol class="trajeto">
        ${traj.map((p, i) => `
          <li>
            <div style="font-weight:600; font-size:0.8rem">${escapeHtml(p.hora)} · ${escapeHtml(p.local)}</div>
            <div class="muted">
              ${i === 0 ? "Saída" : (i === traj.length - 1 ? "Ponto final" : "&nbsp;")}
            </div>
          </li>
        `).join("")}
      </ol>
    </div>
    <div style="font-size:0.85rem; color:#555; margin-top:1rem;">
    <p>Os horários de passagens são estimados com base na distância do trajeto, nas condições de tráfego e no volume médio de passageiros, podendo variar conforme o dia da semana e o horário da operação.</p>
    </div>
  `;
  app.appendChild(card);
}

/* ====== PDF: Helpers de dependências ====== */
function ensureScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(s);
  });
}

async function ensurePdfLibs() {
  await ensureScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js");
  await ensureScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js");
}

/* ====== PDF: Botão no nível 2 ====== */
function addPdfDownloadButton(containerEl, linha) {
  const btn = document.createElement("button");
  btn.textContent = "Baixar PDF";
  btn.className = "btn-pdf";
  btn.style.marginLeft = "8px";
  btn.onclick = () => generateLineSchedulePDF(linha);
  containerEl.appendChild(btn);
}

/* ====== PDF: Utilidades de dados ====== */
const PERIOD_ORDER = ["dia_de_semana", "segunda_e_quinta", "quarta", "terca_e_quinta", "terca_e_sexta", "sabado", "domingo_feriado"];
const PERIOD_LABELS = {
  dia_de_semana: "Dia de semana",
  segunda_e_quinta: "Segunda e Quinta-feira",
  terca_e_quinta: "Terça e Quinta-feira",
  terca_e_sexta: "Terça e Sexta-feira",
  quarta: "Quarta-feira",
  sabado: "Sábado",
  domingo_feriado: "Domingo e Feriado",
};

// limite entre diurno/noturno (21:00)
const NIGHT_THRESHOLD_MINUTES = 21 * 60;

function naturalTimeSort(a, b) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
}

/**
 * Divide um período em dois conjuntos de colunas-hora:
 * - dayHoras: < 21:00
 * - nightHoras: >= 21:00
 */
function splitHoursByNight(periodObj) {
  const all = Object.keys(periodObj || {}).sort(naturalTimeSort);
  const dayHoras = [];
  const nightHoras = [];
  for (const h of all) {
    (timeToMinutes(h) >= NIGHT_THRESHOLD_MINUTES ? nightHoras : dayHoras).push(h);
  }
  return { dayHoras, nightHoras };
}

/**
 * Infere a ordem dos pontos (itinerário) a partir da primeira hora disponível
 * dentro do subconjunto de horas escolhido (subsetHoras).
 * Se não achar, cai para a primeira hora do período inteiro.
 */
/*
function getOrderedStopsForSubset(periodObj, subsetHoras) {
  const horas = (subsetHoras && subsetHoras.length) ? subsetHoras.slice() : Object.keys(periodObj || {});
  if (!horas.length) return [];
  horas.sort(naturalTimeSort);
  const primeiro = periodObj[horas[0]];
  if (primeiro && primeiro.atendimento) {
    return Object.keys(primeiro.atendimento);
  }
  return [];
}*/

function normalizeStopKey(name) {
  return String(name || "")
    .trim()          // tira espaços extras
    .replace(/\.$/, ""); // remove ponto final solto, ex: "MERCADO MUNICIPAL."
}
/*
function getOrderedStopsForSubset(periodObj, subsetHoras) {
  const horas = (subsetHoras && subsetHoras.length)
    ? subsetHoras.slice()
    : Object.keys(periodObj || {});

  horas.sort(naturalTimeSort);

  const seen = new Set();
  const stops = [];

  for (const h of horas) {
    const at = periodObj[h]?.atendimento || {};
    for (const rawName of Object.keys(at)) {
      const norm = normalizeStopKey(rawName);
      if (!seen.has(norm)) {
        seen.add(norm);
        stops.push(norm);
      }
    }
  }

  return stops;
}
  */

function getOrderedStopsForSubset(periodObj, subsetHoras) {
  const horas = (subsetHoras && subsetHoras.length)
    ? subsetHoras.slice()
    : Object.keys(periodObj || {});

  if (!horas.length) return [];

  horas.sort(naturalTimeSort);

  const ordered = [];      // lista final de pontos (normalizados)
  const seen = new Set();  // para não repetir

  const addStopAtEndIfNew = (rawName) => {
    const norm = normalizeStopKey(rawName);
    if (!seen.has(norm)) {
      seen.add(norm);
      ordered.push(norm);
    }
  };

  // 1) Base: usa o primeiro horário (normalmente o mais “completo”) como espinha dorsal
  const firstAt = periodObj[horas[0]]?.atendimento || {};
  for (const rawName of Object.keys(firstAt)) {
    addStopAtEndIfNew(rawName);
  }

  // 2) Percorre os outros horários para inserir pontos novos na posição correta
  for (const h of horas) {
    const at = periodObj[h]?.atendimento || {};

    // Mapa horário -> minuto para este horário específico
    const timeMap = {};
    for (const [rawName, horaStr] of Object.entries(at)) {
      const norm = normalizeStopKey(rawName);
      timeMap[norm] = timeToMinutes(horaStr);
    }

    for (const [rawName, horaStr] of Object.entries(at)) {
      const norm = normalizeStopKey(rawName);
      if (seen.has(norm)) continue; // já está na lista

      const tNew = timeToMinutes(horaStr);

      let bestIndex = -1;
      let bestTime = -Infinity;

      let fallbackBeforeIndex = -1;
      let fallbackAfterTime = Infinity;

      // Procura, dentro dos pontos já ordenados, quem aparece antes/depois desse novo ponto
      ordered.forEach((sNorm, idx) => {
        const t = timeMap[sNorm];
        if (t == null) return; // esse ponto não existe nesta viagem

        if (t <= tNew && t > bestTime) {
          // melhor “antecessor” conhecido
          bestTime = t;
          bestIndex = idx;
        }

        if (t >= tNew && t < fallbackAfterTime) {
          // melhor “sucessor” conhecido
          fallbackAfterTime = t;
          fallbackBeforeIndex = idx;
        }
      });

      let insertIndex;
      if (bestIndex !== -1) {
        // insere logo depois do antecessor
        insertIndex = bestIndex + 1;
      } else if (fallbackBeforeIndex !== -1) {
        // não tem antecessor, mas tem sucessor → entra antes dele
        insertIndex = fallbackBeforeIndex;
      } else {
        // não deu pra comparar com ninguém (caso bem extremo) → vai pro final
        insertIndex = ordered.length;
      }

      ordered.splice(insertIndex, 0, norm);
      seen.add(norm);
    }
  }

  return ordered;
}



/**
 * Monta matriz para a tabela com base em um subconjunto de horas (subsetHoras).
 * O itinerário (stops) é inferido a partir do primeiro horário desse subconjunto.
 */
/*
function buildTableMatrix(periodObj, subsetHoras) {
  const horas = (subsetHoras || []).slice().sort(naturalTimeSort);
  const stops = getOrderedStopsForSubset(periodObj, horas);

  const columns = ["Locais de atendimento", ...horas];
  const body = stops.map((stop) => {
    const row = [stop];
    for (const h of horas) {
      const cel = periodObj[h]?.atendimento?.[stop] ?? "-";
      row.push(cel || "-");
    }
    return row;
  });

  return { columns, body, horas, stops };
}
  

function buildTableMatrix(periodObj, subsetHoras) {
  const horas = (subsetHoras || []).slice().sort(naturalTimeSort);
  const stops = getOrderedStopsForSubset(periodObj, horas);

  const columns = ["Locais de atendimento", ...horas];
  const body = stops.map((stopNorm) => {
    const row = [stopNorm]; // pode exibir o normalizado; se quiser o original, dá pra mapear depois

    for (const h of horas) {
      const at = periodObj[h]?.atendimento || {};
      let cel = "-";

      for (const rawName of Object.keys(at)) {
        const norm = normalizeStopKey(rawName);
        if (norm === stopNorm) {
          cel = at[rawName]; // valor original
          break;
        }
      }

      row.push(cel || "-");
    }

    return row;
  });

  return { columns, body, horas, stops };
}
*/

function buildTableMatrix(periodObj, subsetHoras) {
  const horas = (subsetHoras || []).slice().sort(naturalTimeSort);
  const stops = getOrderedStopsForSubset(periodObj, horas);

  const columns = ["Locais de atendimento", ...horas];

  const body = stops.map((stopNorm) => {
    const row = [stopNorm];

    for (const h of horas) {
      const at = periodObj[h]?.atendimento || {};
      let cel = "-";

      for (const [rawName, horaStr] of Object.entries(at)) {
        const norm = normalizeStopKey(rawName);
        if (norm === stopNorm) {
          cel = horaStr;
          break;
        }
      }

      row.push(cel || "-");
    }

    return row;
  });

  return { columns, body, horas, stops };
}



/* ====== PDF: Gerador ====== */
async function generateLineSchedulePDF(linha) {
  try {
    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const marginX = 36;
    const marginY = 40;

    const title = `LINHA ${linha.id} — ${linha.partida} => ${linha.chegada}`.trim();
    const dateStr = new Date().toLocaleDateString("pt-BR");

    const periodKeys = (Object.keys(linha.horarios || {}))
      .filter((k) => PERIOD_ORDER.includes(k))
      .sort((a, b) => PERIOD_ORDER.indexOf(a) - PERIOD_ORDER.indexOf(b));

    if (!periodKeys.length) {
      alert("Sem horários cadastrados para esta linha.");
      return;
    }

    let firstPage = true;

    periodKeys.forEach((periodKey) => {
      const labelBase = PERIOD_LABELS[periodKey] || periodKey;
      const periodObj = linha.horarios[periodKey] || {};
      const { dayHoras, nightHoras } = splitHoursByNight(periodObj);

      // --- Página DIURNA (se houver) ---
      if (dayHoras.length) {
        if (!firstPage) doc.addPage("a4", "landscape");
        firstPage = false;

        const { columns, body } = buildTableMatrix(periodObj, dayHoras);

        // Cabeçalho
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, marginX, marginY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`${labelBase} • Tabela Diurna • gerado em ${dateStr}`, marginX, marginY + 18);

        // Tabela diurna
        doc.autoTable({
          startY: marginY + 30,
          head: [columns],
          body,
          styles: {
            font: "helvetica",
            fontSize: 6.5,
            cellPadding: 3,
            overflow: "linebreak",
            valign: "middle",
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: 20,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 170 },
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            const footer = `Prefeitura Municipal de Itapetininga • Secretaria de Trânsito • itapetininga.sp.gov.br  •  ${dateStr}`;
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(footer, data.settings.margin.left, doc.internal.pageSize.getHeight() - 18);
          },
        });
      }

      // --- Página NOTURNA (>= 21:00) com ITINERÁRIO PRÓPRIO ---
      if (nightHoras.length) {
        doc.addPage("a4", "landscape");
        const { columns, body } = buildTableMatrix(periodObj, nightHoras);

        // Cabeçalho
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, marginX, marginY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`${labelBase} • Tabela Noturna (itinerário próprio) • gerado em ${dateStr}`, marginX, marginY + 18);

        // Tabela noturna
        doc.autoTable({
          startY: marginY + 30,
          head: [columns],
          body,
          styles: {
            font: "helvetica",
            fontSize: 6.5,
            cellPadding: 3,
            overflow: "linebreak",
            valign: "middle",
          },
          headStyles: {
            fillColor: [224, 230, 255], // leve distinção de cabeçalho (opcional)
            textColor: 20,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 170 },
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: (data) => {
            const footer = `Prefeitura Municipal de Itapetininga • Secretaria de Trânsito • itapetininga.sp.gov.br  •  ${dateStr}`;
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(footer, data.settings.margin.left, doc.internal.pageSize.getHeight() - 18);
          },
        });
      }
    });

    const fileName = `Linha_${linha.id}_horarios.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error(err);
    alert("Não foi possível gerar o PDF.");
  }
}


/* start */
render();
