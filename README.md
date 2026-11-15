
# ♻️ EcoLevel

**Tecnologia, sustentabilidade e inovação conectadas à reciclagem.**

O **EcoLevel** é uma plataforma de incentivo à reciclagem que conecta cidadãos, máquinas de recebimento de resíduos, equipes de triagem e empresas parceiras. Sua proposta é tornar o descarte de materiais recicláveis mais simples, acessível e recompensador, incentivando a participação da população por meio de tecnologia e gamificação.

O projeto busca solucionar um problema cotidiano: muitas pessoas deixam de reciclar porque separar os materiais individualmente exige tempo e conhecimento, além da dificuldade de encontrar pontos adequados para descarte e da falta de incentivos para manter esse hábito.

Por meio de um aplicativo, o cidadão poderá localizar máquinas de coleta, iniciar uma sessão utilizando seu identificador pessoal e depositar um saco fechado de resíduos, sem precisar separar previamente cada material.

A máquina realiza a pesagem do saco e emite uma etiqueta de identificação. Posteriormente, uma equipe responsável realiza a triagem dos resíduos, validando o peso efetivamente reciclável. Somente após essa validação o usuário recebe moedas e XP proporcionais à quantidade de material aprovado.

## 💻 Sobre o protótipo

O protótipo desenvolvido representa a implementação tecnológica da camada IoT da solução EcoLevel, integrando um dispositivo de pesagem, comunicação em nuvem e uma aplicação de monitoramento.

Para demonstrar o funcionamento da máquina, foi desenvolvido um **protótipo totalmente simulado na plataforma Wokwi**, sem utilização de hardware físico. A simulação utiliza um ESP32 e o módulo HX711, que representa o sistema de pesagem da máquina.

O dispositivo realiza a leitura simulada do peso, processa as informações e publica os registros por meio do protocolo MQTT em um broker na nuvem. Esses dados são recebidos por um dashboard desenvolvido em React, que permite acompanhar as pesagens e consultar os registros armazenados no Supabase.

Dessa forma, o protótipo demonstra a integração entre dispositivo IoT, infraestrutura em nuvem e aplicação de monitoramento, validando o fluxo de informações da máquina EcoLevel.

**Importante:** a simulação demonstra a lógica de pesagem e a comunicação entre os componentes, mas não substitui testes com uma balança física, impressora térmica ou máquina de coleta real.

## 🎯 Objetivos

- Demonstrar uma solução IoT aplicada à sustentabilidade.
- Simular a pesagem de resíduos utilizando ESP32 e HX711.
- Processar os dados diretamente no dispositivo.
- Transmitir os registros por meio do protocolo MQTT.
- Integrar o dispositivo a serviços em nuvem.
- Armazenar e consultar os registros de pesagem.
- Disponibilizar informações por meio de um dashboard interativo.
- Demonstrar como dados coletados em campo podem auxiliar no acompanhamento das operações de reciclagem.

## 🏗️ Arquitetura do sistema

O EcoLevel utiliza uma arquitetura dividida em três camadas:

### 1. Device IoT — Dispositivo

Responsável pela coleta e pelo processamento inicial dos dados.

**Componentes utilizados:**

- **ESP32:** microcontrolador responsável pela execução da lógica da máquina.
- **HX711:** módulo de conversão e amplificação do sinal do sensor de peso.
- **Célula de carga simulada:** representa a balança responsável pela medição do peso do saco de resíduos.
- **Display:** apresenta mensagens e estados da operação.

O usuário informa seu identificador para iniciar uma sessão. Em seguida, o dispositivo realiza a leitura do peso, apresenta o resultado e organiza as informações para transmissão.

### 2. Back-end — Comunicação e armazenamento

Responsável pela comunicação entre o dispositivo e a aplicação, além da persistência dos registros.

**Serviços utilizados:**

- **EMQX Cloud:** broker responsável pela comunicação MQTT.
- **Supabase:** banco de dados utilizado para armazenar e consultar os registros de pesagem.

A comunicação MQTT permite que o dispositivo publique os dados e que o dashboard receba as mensagens por meio de uma conexão WebSocket Secure (WSS).

Após receber uma mensagem, o dashboard registra as informações no Supabase, permitindo a consulta dos dados mesmo depois que a sessão de pesagem é encerrada.

### 3. Dashboard

Responsável pela apresentação e visualização das informações coletadas pelo dispositivo.

O dashboard foi desenvolvido com React e publicado na Vercel.

A aplicação apresenta:

- Indicadores gerais de pesagem.
- Peso total registrado.
- Quantidade de pesagens.
- Última pesagem recebida.
- Gráfico de evolução das pesagens.
- Histórico dos registros.
- Informações das máquinas identificadas.
- Status das conexões MQTT e Supabase.

## 🔄 Funcionamento do sistema

O fluxo operacional do EcoLevel segue as seguintes etapas:

1. O usuário cria uma conta no aplicativo e recebe um identificador único.
2. No mapa, localiza uma máquina EcoLevel disponível.
3. Na máquina, informa seu identificador para iniciar uma sessão.
4. O dispositivo recebe as informações necessárias para identificar a sessão.
5. O usuário posiciona o saco de resíduos na balança.
6. O sensor realiza a leitura do peso bruto.
7. O ESP32 processa a leitura e apresenta as informações no display.
8. O dispositivo organiza os dados em formato JSON e publica a mensagem no broker MQTT.
9. O dashboard recebe a mensagem e registra a pesagem no Supabase.
10. A equipe responsável realiza a triagem dos resíduos.
11. O peso efetivamente reciclável é validado.
12. O sistema principal calcula as recompensas e atualiza a conta do usuário.

**Atenção:** o protótipo registra o peso bruto recebido pela máquina. A aprovação dos materiais acontece posteriormente, por meio de triagem humana. O dispositivo não identifica os materiais, não valida a reciclabilidade dos resíduos e não concede moedas ou XP.

## 📡 Comunicação MQTT

A comunicação entre o ESP32 e o dashboard utiliza o protocolo MQTT, por meio da infraestrutura EMQX Cloud.

**Configurações utilizadas:**

| Configuração | Valor |
|---|---|
| Broker | EMQX Cloud |
| Protocolo do ESP32 | MQTT sobre TLS |
| Porta MQTT/TLS | 8883 |
| Protocolo do dashboard | WebSocket Secure (WSS) |
| Porta WebSocket Secure | 8084 |
| Tópico | `ecolevel/maquinas/ECO-MAQ-001/pesagens` |

### Estrutura das mensagens

As informações são transmitidas em formato JSON.

Exemplo de mensagem:

```json
{
  "usuarioId": "USR-001",
  "sessaoId": "SESSAO-001",
  "maquinaId": "ECO-MAQ-001",
  "pesoBruto": 43.0,
  "status": "AGUARDANDO_TRIAGEM"
}
```

Descrição dos campos:

| Campo | Descrição |
|---|---|
| `usuarioId` | Identificador do usuário que realizou a pesagem. |
| `sessaoId` | Identificador único da sessão. |
| `maquinaId` | Identificador da máquina utilizada. |
| `pesoBruto` | Peso registrado pelo sensor. |
| `status` | Situação atual do registro. |

O status `AGUARDANDO_TRIAGEM` indica que a pesagem foi registrada e aguarda a análise da equipe responsável.

## 🖥️ Dashboard EcoLevel

O dashboard foi desenvolvido para transformar os dados recebidos do dispositivo IoT em informações visuais e organizadas.

A interface possui quatro seções principais:

### 📊 Pesagens

Apresenta uma visão geral das operações, com indicadores, gráficos e tabela das pesagens mais recentes.

### 📋 Histórico

Permite consultar os registros de pesagem armazenados no Supabase, facilitando o acompanhamento das operações anteriores.

### ⚖️ Máquinas

Apresenta as máquinas identificadas nos registros, incluindo quantidade de pesagens, peso acumulado e última atividade registrada.

### ⚙️ Configurações

Apresenta informações sobre as conexões, os serviços utilizados e os parâmetros de comunicação do sistema.

## 🌐 Acesso ao dashboard

O dashboard do EcoLevel é uma aplicação web desenvolvida com React e disponibilizada por meio da plataforma Vercel.

**Acesse a aplicação:**

[EcoLevel — Dashboard](https://gs2ecolevel.vercel.app/)

[EcoLevel - Repositório](https://github.com/LAB-404-1ESPI/GS2-EDGE-ECOLEVEL)


## 🛠️ Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| ESP32 | Microcontrolador do dispositivo IoT. |
| HX711 | Módulo utilizado na simulação de pesagem. |
| Wokwi | Simulação do circuito eletrônico e do ESP32. |
| MQTT | Protocolo de comunicação entre os dispositivos. |
| EMQX Cloud | Broker MQTT em nuvem. |
| Supabase | Banco de dados para armazenamento das pesagens. |
| React | Desenvolvimento da interface do dashboard. |
| Vite | Ferramenta de desenvolvimento e build do React. |
| Recharts | Construção dos gráficos. |
| Lucide React | Biblioteca de ícones. |
| Vercel | Hospedagem e publicação do dashboard. |

## 🗄️ Banco de dados

O projeto utiliza o Supabase para armazenar os registros de pesagem.

A tabela principal é:

`pesagens`

Estrutura dos dados:

| Campo | Descrição |
|---|---|
| `id` | Identificador do registro. |
| `usuario_id` | Identificador do usuário. |
| `sessao_id` | Identificador único da sessão. |
| `maquina_id` | Identificador da máquina. |
| `peso_bruto` | Peso registrado. |
| `status` | Situação da pesagem. |
| `data_registro` | Data e horário do registro. |

O identificador único da sessão evita que uma mesma sessão seja registrada mais de uma vez.

## 🌱 Relação com a proposta CitizenTech

O EcoLevel está alinhado à proposta CitizenTech ao utilizar tecnologia para contribuir com um problema coletivo: o descarte inadequado de resíduos recicláveis.

A solução conecta cidadãos, dispositivos IoT e serviços em nuvem, permitindo registrar e acompanhar as pesagens realizadas nas máquinas de coleta.

O projeto também se relaciona com os Objetivos de Desenvolvimento Sustentável:

- **ODS 11 — Cidades e Comunidades Sustentáveis:** incentivo a práticas que contribuam para cidades mais sustentáveis.
- **ODS 12 — Consumo e Produção Responsáveis:** estímulo ao descarte adequado e à destinação correta de resíduos.

## 🔐 Segurança e observações técnicas

Este projeto foi desenvolvido em contexto acadêmico e utiliza serviços em nuvem para demonstrar uma arquitetura IoT integrada.

Algumas considerações:

- As credenciais de acesso devem ser mantidas em variáveis de ambiente.
- A simulação no Wokwi não substitui testes com componentes físicos.
- O registro de peso não substitui a triagem humana dos resíduos.

## 👥 Equipe

**Desenvolvimento:** LAB-404

Integrantes:

- Arthur Caram Fiorese Herrada - RM569578
- Matheus Medeiros da Cunha - RM572780
- Matheus Sequeira Franco da Silva - RM571127
- Gustavo Ferreira Silva - RM571675
- Felipe Ricardo Moreira Aguiar - RM573410
