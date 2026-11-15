
import { useEffect, useState } from "react";

import {
  Leaf,
  Scale,
  ClipboardList,
  MapPin,
  Settings,
  Wifi,
  Bell,
  Search,
  Activity,
  PackageCheck,
  Database,
  Server,
  Clock,
  HardDrive,
  Radio,
  Sun,
  Moon
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { conectarMQTT } from "./mqtt";
import { supabase } from "./supabase";


function gerarDadosGrafico(pesagens) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dias = Array.from({ length: 7 }, (_, indice) => {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - (6 - indice));

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return {
      chave: `${ano}-${mes}-${dia}`,
      dia: data.toLocaleDateString("pt-BR", {
        weekday: "short",
      }).replace(".", ""),
    };
  });

  const totais = new Map(
    dias.map((dia) => [dia.chave, 0])
  );

  pesagens.forEach((item) => {
    if (!item.dataRegistro) return;

    const data = new Date(item.dataRegistro);

    if (Number.isNaN(data.getTime())) return;

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    const chave = `${ano}-${mes}-${dia}`;

    if (totais.has(chave)) {
      totais.set(
        chave,
        totais.get(chave) + (Number(item.pesoBruto) || 0)
      );
    }
  });

  return dias.map((dia) => ({
    dia: dia.dia,
    peso: Number(totais.get(dia.chave).toFixed(2)),
  }));
}


function formatarData(data) {
  if (!data) return "Não informado";

  const dataFormatada = new Date(data);

  if (Number.isNaN(dataFormatada.getTime())) {
    return "Não informado";
  }

  return dataFormatada.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function App() {
  const [statusMQTT, setStatusMQTT] = useState("Conectando...");
  const [statusSupabase, setStatusSupabase] = useState("Verificando...");

  const [pesagensRecebidas, setPesagensRecebidas] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [statusSelecionado, setStatusSelecionado] = useState("TODOS");

  const [abaAtiva, setAbaAtiva] = useState("pesagens");

  const titulosAbas = {
    pesagens: "Pesagens",
    historico: "Histórico",
    maquinas: "Máquinas",
    configuracoes: "Configurações",
  };

  const [tema, setTema] = useState(() => {
  return localStorage.getItem("temaEcoLevel") || "escuro";
});

function alternarTema() {
  setTema((temaAtual) =>
    temaAtual === "escuro" ? "claro" : "escuro"
  );
}

useEffect(() => {
  localStorage.setItem("temaEcoLevel", tema);
}, [tema]);

  // CONEXÃO COM SUPABASE E MQTT

  useEffect(() => {
    let cliente;
    let componenteAtivo = true;

    async function iniciarDashboard() {
      const { data, error } = await supabase
        .from("pesagens")
        .select("*")
        .order("data_registro", { ascending: false });

      if (!componenteAtivo) return;

      if (error) {
        console.error("Erro ao carregar histórico:", error);
        setStatusSupabase("Erro");
      } else {
        const historico = data.map((item) => ({
          usuarioId: item.usuario_id,
          sessaoId: item.sessao_id,
          maquinaId: item.maquina_id,
          pesoBruto: item.peso_bruto,
          status: item.status,
          dataRegistro: item.data_registro,
        }));

        setPesagensRecebidas(historico);
        setStatusSupabase("Conectado");

        console.log("Histórico carregado:", historico);
      }

      if (!componenteAtivo) return;

      cliente = conectarMQTT(
        (status) => {
          if (componenteAtivo) {
            setStatusMQTT(status);
          }
        },

        async (dados) => {
          if (!componenteAtivo) return;

          const novaPesagem = {
            ...dados,
            dataRegistro: new Date().toISOString(),
          };

          const { error } = await supabase
            .from("pesagens")
            .insert({
              usuario_id: dados.usuarioId,
              sessao_id: dados.sessaoId,
              maquina_id: dados.maquinaId,
              peso_bruto: Number(dados.pesoBruto),
              status: dados.status || "AGUARDANDO_TRIAGEM",
            });

          if (error) {
            console.error(
              "Erro ao salvar pesagem no Supabase:",
              error
            );

            setStatusSupabase("Erro");
          } else {
            console.log("Pesagem salva no Supabase!");

            setStatusSupabase("Conectado");

            if (componenteAtivo) {
              setPesagensRecebidas((anteriores) => [
                novaPesagem,
                ...anteriores,
              ]);
            }
          }
        }
      );
    }

    iniciarDashboard();

    return () => {
      componenteAtivo = false;

      if (cliente) {
        cliente.end();
      }
    };
  }, []);


  // INDICADORES GERAIS

  const pesoTotal = pesagensRecebidas.reduce(
    (total, item) =>
      total + (Number(item.pesoBruto) || 0),
    0
  );

  const totalPesagens = pesagensRecebidas.length;

  const ultimaPesagem = pesagensRecebidas[0];

  const ultimoPeso = ultimaPesagem
    ? Number(ultimaPesagem.pesoBruto) || 0
    : 0;

  const dadosGrafico = gerarDadosGrafico(pesagensRecebidas);


  // PESQUISA E FILTRO

  const statusDisponiveis = [
    ...new Set(
      pesagensRecebidas
        .map((item) => item.status)
        .filter(Boolean)
    ),
  ];

  const termoPesquisa = pesquisa.trim().toLowerCase();

  const pesagensFiltradas = pesagensRecebidas.filter((item) => {
    const correspondePesquisa =
      String(item.usuarioId || "").toLowerCase().includes(termoPesquisa) ||
      String(item.sessaoId || "").toLowerCase().includes(termoPesquisa) ||
      String(item.maquinaId || "").toLowerCase().includes(termoPesquisa) ||
      String(item.status || "").toLowerCase().includes(termoPesquisa);

    const correspondeStatus =
      statusSelecionado === "TODOS" ||
      item.status === statusSelecionado;

    return correspondePesquisa && correspondeStatus;
  });


  // MÁQUINAS CADASTRADAS NOS REGISTROS

  const maquinasIdentificadas = [
    ...new Set([
      "ECO-MAQ-001",
      ...pesagensRecebidas
        .map((item) => item.maquinaId)
        .filter(Boolean),
    ]),
  ];

  const maquinas = maquinasIdentificadas.map((identificacao) => {
    const registros = pesagensRecebidas.filter(
      (item) => item.maquinaId === identificacao
    );

    const pesoAcumulado = registros.reduce(
      (total, item) =>
        total + (Number(item.pesoBruto) || 0),
      0
    );

    const ultimaAtividade = registros[0];

    return {
      identificacao,
      totalPesagens: registros.length,
      pesoAcumulado,
      ultimaAtividade: ultimaAtividade?.dataRegistro,
    };
  });


  return (
    <div className="aplicativo" data-tema={tema}>

      {/* BARRA LATERAL */}

      <aside className="barra-lateral">

        <div className="logotipo">
          <div className="icone-logotipo">
            <img src="/icone.svg" alt="Logo EcoLevel" />
          </div>

          <span>
            Eco<span className="logotipo-verde">Level</span>
          </span>
        </div>

        <div className="secao-menu">
          <p className="titulo-menu">MENU PRINCIPAL</p>

          <nav className="navegacao-lateral">

            <button
              className={`item-navegacao ${abaAtiva === "pesagens" ? "ativo" : ""}`}
              onClick={() => setAbaAtiva("pesagens")}
            >
              <Scale size={19} />
              <span>Pesagens</span>
            </button>

            <button
              className={`item-navegacao ${abaAtiva === "historico" ? "ativo" : ""}`}
              onClick={() => setAbaAtiva("historico")}
            >
              <ClipboardList size={19} />
              <span>Histórico</span>
            </button>

            <button
              className={`item-navegacao ${abaAtiva === "maquinas" ? "ativo" : ""}`}
              onClick={() => setAbaAtiva("maquinas")}
            >
              <MapPin size={19} />
              <span>Máquinas</span>
            </button>

            <button
              className={`item-navegacao ${abaAtiva === "configuracoes" ? "ativo" : ""}`}
              onClick={() => setAbaAtiva("configuracoes")}
            >
              <Settings size={19} />
              <span>Configurações</span>
            </button>

          </nav>
        </div>

        <div className="rodape-lateral">
          <div className="icone-rodape">
            <Activity size={18} />
          </div>

          <div>
            <strong>EcoLevel</strong>
            <p>Monitoramento IoT</p>
          </div>
        </div>

      </aside>


      {/* CONTEÚDO PRINCIPAL */}

      <main className="conteudo-principal">

        {/* BARRA SUPERIOR */}

        <header className="barra-superior">

          <div>
            <h1>{titulosAbas[abaAtiva]}</h1>
            <p>Monitoramento inteligente de reciclagem</p>
          </div>

          <div className="acoes-superiores">

            <div className="grupo-pesquisa-filtro">

              <div className="campo-pesquisa">
                <Search size={18} />

                <input
                  type="text"
                  placeholder="Pesquisar pesagens..."
                  value={pesquisa}
                  onChange={(evento) => setPesquisa(evento.target.value)}
                  aria-label="Pesquisar pesagens"
                />

                {pesquisa && (
                  <button
                    type="button"
                    className="limpar-pesquisa"
                    onClick={() => setPesquisa("")}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="campo-filtro">
                <select
                  value={statusSelecionado}
                  onChange={(evento) =>
                    setStatusSelecionado(evento.target.value)
                  }
                >
                  <option value="TODOS">Todos os status</option>

                  {statusDisponiveis.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <button className="botao-notificacao">
              <Bell size={19} />
            </button>

            <button
              type="button"
              className="botao-tema"
              onClick={alternarTema}
              aria-label={
                tema === "escuro"
                  ? "Ativar tema claro"
                  : "Ativar tema escuro"
              }
              title={
                tema === "escuro"
                  ? "Ativar tema claro"
                  : "Ativar tema escuro"
              }
            >
              <span className={`icone-tema ${tema}`}>
                {tema === "escuro" ? (
                  <Moon size={19} />
                ) : (
                  <Sun size={19} />
                )}
              </span>
            </button>

            <span
              className={`status-mqtt ${
                statusMQTT === "Conectado"
                  ? "conectado"
                  : "desconectado"
              }`}
            >
              <Wifi size={16} />
              MQTT {statusMQTT}
            </span>

          </div>

        </header>


        {/* ABA PESAGENS */}

        {abaAtiva === "pesagens" && (
          <section className="conteudo-painel">

            <div className="secao-boas-vindas">

              <div>
                <h2>Visão geral da operação</h2>
                <p>
                  Acompanhe os dados e o desempenho das máquinas EcoLevel.
                </p>
              </div>

              <div className="identificacao-maquina">
                <span className="indicador-maquina"></span>
                ECO-MAQ-001
              </div>

            </div>


            {/* INDICADORES */}

            <div className="grade-indicadores">

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Scale size={22} />
                </div>

                <p>Peso total registrado</p>

                <h2>
                  {pesoTotal.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })} kg
                </h2>

                <span>Volume bruto recebido</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <ClipboardList size={22} />
                </div>

                <p>Pesagens realizadas</p>

                <h2>{totalPesagens}</h2>

                <span>Total de registros armazenados</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Wifi size={22} />
                </div>

                <p>Status da conexão MQTT</p>

                <h2
                  className={
                    statusMQTT === "Conectado"
                      ? "status-online"
                      : "status-offline"
                  }
                >
                  {statusMQTT === "Conectado" ? "Online" : "Offline"}
                </h2>

                <span>ECO-MAQ-001</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <PackageCheck size={22} />
                </div>

                <p>Última pesagem</p>

                <h2>
                  {ultimoPeso.toLocaleString("pt-BR")} kg
                </h2>

                <span>
                  {ultimaPesagem?.status || "Nenhuma pesagem recebida"}
                </span>
              </div>

            </div>


            {/* GRÁFICO */}

            <div className="cartao-grafico">

              <div className="cabecalho-grafico">
                <div>
                  <h3>Volume de reciclagem</h3>
                  <p>Peso registrado nos últimos 7 dias</p>
                </div>

                <span>Últimos 7 dias</span>
              </div>

              <div className="area-grafico">

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosGrafico}>

                    <defs>
                      <linearGradient
                        id="degradePeso"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#5ce65c"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="95%"
                          stopColor="#5ce65c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#26372b"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="dia"
                      stroke="#78877c"
                      interval={0}
                      padding={{ left: 10, right: 10 }}
                    />

                    <YAxis stroke="#78877c" />

                    <Tooltip
                      contentStyle={{
                        background: "#111a14",
                        border: "1px solid #26372b",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      formatter={(valor) => [
                        `${valor} kg`,
                        "Peso",
                      ]}
                    />

                    <Area
                      type="monotone"
                      dataKey="peso"
                      stroke="#5ce65c"
                      strokeWidth={3}
                      fill="url(#degradePeso)"
                    />

                  </AreaChart>
                </ResponsiveContainer>

              </div>

            </div>


            {/* ÚLTIMAS PESAGENS */}

            <div className="cartao-tabela">

              <div className="cabecalho-tabela">
                <div>
                  <h3>Últimas pesagens</h3>
                  <p>
                    Registros recebidos pelas máquinas EcoLevel
                  </p>
                </div>

                <span>
                  {pesagensFiltradas.length}{" "}
                  {pesagensFiltradas.length === 1
                    ? "registro"
                    : "registros"}
                </span>
              </div>

              <div className="rolagem-tabela">

                <table className="tabela-pesagens">

                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Sessão</th>
                      <th>Máquina</th>
                      <th>Peso bruto</th>
                      <th>Data e horário</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {pesagensFiltradas.length > 0 ? (
                      pesagensFiltradas.map((item, indice) => (
                        <tr key={item.sessaoId || indice}>

                          <td>{item.usuarioId || "Não informado"}</td>

                          <td>{item.sessaoId || "Não informado"}</td>

                          <td>{item.maquinaId || "Não informado"}</td>

                          <td>
                            {(Number(item.pesoBruto) || 0).toLocaleString(
                              "pt-BR"
                            )} kg
                          </td>

                          <td>{formatarData(item.dataRegistro)}</td>

                          <td>
                            <span className="etiqueta-status pendente">
                              {(item.status || "Aguardando triagem").replaceAll("_", " ")}
                            </span>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="tabela-vazia">
                          {termoPesquisa || statusSelecionado !== "TODOS"
                            ? "Nenhuma pesagem encontrada com os filtros aplicados."
                            : "Nenhuma pesagem registrada."}
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>

            <footer className="rodape-painel">
              EcoLevel · Monitoramento de reciclagem
            </footer>

          </section>
        )}


        {/* ABA HISTÓRICO */}

        {abaAtiva === "historico" && (
          <section className="conteudo-painel">

            <div className="cabecalho-pagina">
              <h2>Histórico de pesagens</h2>
              <p>
                Consulte todos os registros realizados pelas máquinas EcoLevel.
              </p>
            </div>

            <div className="grade-indicadores">

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <ClipboardList size={22} />
                </div>

                <p>Total de registros</p>
                <h2>{totalPesagens}</h2>
                <span>Pesagens armazenadas</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Scale size={22} />
                </div>

                <p>Peso acumulado</p>
                <h2>
                  {pesoTotal.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })} kg
                </h2>
                <span>Peso bruto registrado</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <MapPin size={22} />
                </div>

                <p>Máquinas identificadas</p>
                <h2>{maquinas.length}</h2>
                <span>Equipamentos com identificação</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Clock size={22} />
                </div>

                <p>Último registro</p>
                <h2>
                  {ultimaPesagem
                    ? formatarData(ultimaPesagem.dataRegistro).split(",")[0]
                    : "--"}
                </h2>
                <span>Data da última pesagem</span>
              </div>

            </div>

            <div className="cartao-tabela">

              <div className="cabecalho-tabela">
                <div>
                  <h3>Todos os registros</h3>
                  <p>
                    Histórico completo de pesagens armazenadas no Supabase
                  </p>
                </div>

                <span>
                  {pesagensFiltradas.length}{" "}
                  {pesagensFiltradas.length === 1
                    ? "registro"
                    : "registros"}
                </span>
              </div>

              <div className="rolagem-tabela">

                <table className="tabela-pesagens">

                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Sessão</th>
                      <th>Máquina</th>
                      <th>Peso bruto</th>
                      <th>Data e horário</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    {pesagensFiltradas.length > 0 ? (
                      pesagensFiltradas.map((item, indice) => (
                        <tr key={item.sessaoId || indice}>

                          <td>{item.usuarioId || "Não informado"}</td>

                          <td>{item.sessaoId || "Não informado"}</td>

                          <td>{item.maquinaId || "Não informado"}</td>

                          <td>
                            {(Number(item.pesoBruto) || 0).toLocaleString(
                              "pt-BR"
                            )} kg
                          </td>

                          <td>{formatarData(item.dataRegistro)}</td>

                          <td>
                            <span className="etiqueta-status pendente">
                              {(item.status || "Aguardando triagem").replaceAll("_", " ")}
                            </span>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="tabela-vazia">
                          Nenhuma pesagem encontrada.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>

            <footer className="rodape-painel">
              EcoLevel · Histórico de registros
            </footer>

          </section>
        )}


        {/* ABA MÁQUINAS */}

        {abaAtiva === "maquinas" && (
          <section className="conteudo-painel">

            <div className="cabecalho-pagina">
              <h2>Gerenciamento de máquinas</h2>
              <p>
                Acompanhe os equipamentos identificados e seus dados de operação.
              </p>
            </div>

            <div className="grade-indicadores">

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <HardDrive size={22} />
                </div>

                <p>Máquinas identificadas</p>
                <h2>{maquinas.length}</h2>
                <span>Equipamentos cadastrados</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <ClipboardList size={22} />
                </div>

                <p>Total de pesagens</p>
                <h2>{totalPesagens}</h2>
                <span>Registros recebidos</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Scale size={22} />
                </div>

                <p>Peso total registrado</p>
                <h2>
                  {pesoTotal.toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })} kg
                </h2>
                <span>Volume bruto recebido</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Wifi size={22} />
                </div>

                <p>Conexão MQTT</p>
                <h2
                  className={
                    statusMQTT === "Conectado"
                      ? "status-online"
                      : "status-offline"
                  }
                >
                  {statusMQTT === "Conectado" ? "Online" : "Offline"}
                </h2>
                <span>Conexão do dashboard</span>
              </div>

            </div>

            <div className="cabecalho-pagina">
              <h2>Equipamentos cadastrados</h2>
              <p>
                Informações operacionais de cada máquina identificada.
              </p>
            </div>

            <div className="grade-cartoes-pagina">

              {maquinas.map((maquina) => (
                <div
                  className="cartao-pagina"
                  key={maquina.identificacao}
                >

                  <div className="icone-cartao-pagina">
                    <HardDrive size={22} />
                  </div>

                  <h3>{maquina.identificacao}</h3>

                  <p>
                    Equipamento responsável pelo recebimento e registro das pesagens.
                  </p>

                  <div className="informacoes-maquina">

                    <div>
                      <span>Pesagens realizadas</span>
                      <strong>{maquina.totalPesagens}</strong>
                    </div>

                    <div>
                      <span>Peso acumulado</span>
                      <strong>
                        {maquina.pesoAcumulado.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} kg
                      </strong>
                    </div>

                    <div>
                      <span>Última atividade</span>
                      <strong>
                        {formatarData(maquina.ultimaAtividade)}
                      </strong>
                    </div>

                  </div>

                  <div className="etiqueta-conexao">
                    <Radio size={14} />
                    Identificação registrada
                  </div>

                </div>
              ))}

            </div>

            <div className="cartao-pagina aviso-maquinas">
              <h3>Informação de conectividade</h3>
              <p>
                O status MQTT apresentado indica a conexão do dashboard com o
                broker. A disponibilidade individual de cada máquina ainda
                depende da implementação de um sinal próprio de telemetria.
              </p>
            </div>

            <footer className="rodape-painel">
              EcoLevel · Gerenciamento de máquinas
            </footer>

          </section>
        )}


        {/* ABA CONFIGURAÇÕES */}

        {abaAtiva === "configuracoes" && (
          <section className="conteudo-painel">

            <div className="cabecalho-pagina">
              <h2>Configurações do sistema</h2>
              <p>
                Consulte as informações e o estado das conexões do EcoLevel.
              </p>
            </div>

            <div className="grade-indicadores">

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Wifi size={22} />
                </div>

                <p>Conexão MQTT</p>

                <h2
                  className={
                    statusMQTT === "Conectado"
                      ? "status-online"
                      : "status-offline"
                  }
                >
                  {statusMQTT}
                </h2>

                <span>Comunicação com o broker</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <Database size={22} />
                </div>

                <p>Banco de dados</p>

                <h2
                  className={
                    statusSupabase === "Conectado"
                      ? "status-online"
                      : "status-offline"
                  }
                >
                  {statusSupabase}
                </h2>

                <span>Supabase</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <ClipboardList size={22} />
                </div>

                <p>Registros armazenados</p>

                <h2>{totalPesagens}</h2>

                <span>Total de pesagens</span>
              </div>

              <div className="cartao-estatistica">
                <div className="icone-estatistica">
                  <HardDrive size={22} />
                </div>

                <p>Máquina principal</p>

                <h2>ECO-MAQ-001</h2>

                <span>Identificação do equipamento</span>
              </div>

            </div>

            <div className="cabecalho-pagina">
              <h2>Conexões e integrações</h2>
              <p>
                Informações técnicas dos serviços utilizados pelo sistema.
              </p>
            </div>

            <div className="grade-cartoes-pagina">

              <div className="cartao-pagina">

                <div className="icone-cartao-pagina">
                  <Radio size={22} />
                </div>

                <h3>Broker MQTT</h3>

                <p>
                  Responsável pela comunicação entre o ESP32 e o dashboard.
                </p>

                <div className="informacoes-maquina">
                  <div>
                    <span>Protocolo</span>
                    <strong>MQTT sobre WebSocket seguro</strong>
                  </div>

                  <div>
                    <span>Porta</span>
                    <strong>8084</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>{statusMQTT}</strong>
                  </div>
                </div>

                <span className={`etiqueta-conexao ${statusMQTT !== "Conectado" ? "offline" : ""}`}>
                  <Wifi size={14} />
                  {statusMQTT}
                </span>

              </div>

              <div className="cartao-pagina">

                <div className="icone-cartao-pagina">
                  <Database size={22} />
                </div>

                <h3>Supabase</h3>

                <p>
                  Banco de dados responsável por armazenar o histórico de pesagens.
                </p>

                <div className="informacoes-maquina">
                  <div>
                    <span>Tabela</span>
                    <strong>public.pesagens</strong>
                  </div>

                  <div>
                    <span>Registros</span>
                    <strong>{totalPesagens}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>{statusSupabase}</strong>
                  </div>
                </div>

                <span className={`etiqueta-conexao ${statusSupabase !== "Conectado" ? "offline" : ""}`}>
                  <Database size={14} />
                  {statusSupabase}
                </span>

              </div>

              <div className="cartao-pagina">

                <div className="icone-cartao-pagina">
                  <Server size={22} />
                </div>

                <h3>Identificação do sistema</h3>

                <p>
                  Informações gerais da aplicação de monitoramento EcoLevel.
                </p>

                <div className="informacoes-maquina">
                  <div>
                    <span>Sistema</span>
                    <strong>EcoLevel</strong>
                  </div>

                  <div>
                    <span>Equipamento</span>
                    <strong>ESP32</strong>
                  </div>

                  <div>
                    <span>Comunicação</span>
                    <strong>IoT / MQTT</strong>
                  </div>
                </div>

              </div>

            </div>

            <div className="cartao-pagina aviso-maquinas">
              <h3>Sobre o EcoLevel</h3>
              <p>
                Plataforma de monitoramento das operações de pesagem,
                recebimento de dados das máquinas e armazenamento dos registros.
                A validação dos materiais recicláveis ocorre posteriormente,
                durante a etapa de triagem humana.
              </p>
            </div>

            <footer className="rodape-painel">
              EcoLevel · Configurações do sistema
            </footer>

          </section>
        )}

      </main>

    </div>
      
  );
}

export default App;
