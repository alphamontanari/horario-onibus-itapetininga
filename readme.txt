=== Horário Ônibus Itapetininga ===
Contributors: alphamontanari
Tags: ônibus, transporte público, itapetininga, horários, mobilidade
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 8.0
Stable tag: 1.3.1
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Plugin para melhorar a visualização de horários de ônibus pela população de Itapetininga-SP.  
Desenvolvido por André Luiz Montanari, servidor público da área de comunicação da Prefeitura Municipal de Itapetininga.

== Description ==
Este plugin permite que cidadãos consultem, de forma rápida e fluída, os horários das linhas de ônibus municipais.

**Principais características:**
- Desenvolvido em **JavaScript, HTML, CSS e PHP**, instalável em WordPress.
- Base de dados estruturada em arquivos constantes `Linha__`, localizados no diretório `linhas/`.
- O PHP renderiza as linhas consumindo funções do `main.js`.
- A navegação é **em tempo real e síncrona**, sem refresh da página, proporcionando uma experiência fluida.

**Três níveis de interface:**
1. **Linhas**: lista geral de todas as linhas disponíveis.  
2. **Horários por linha**: ao selecionar uma linha, os horários são exibidos em abas: *Dia de semana*, *Sábado*, *Domingo e feriados*.  
3. **Detalhe do horário**: ao selecionar um horário, o usuário vê o itinerário completo com os horários previstos.

O plugin também controla o **estado da navegação via URL**, permitindo compartilhar links diretos para linhas e horários específicos.  
Exemplo em produção: [https://9itape.com.br/horario-onibus-itapetininga](https://9itape.com.br/horario-onibus-itapetininga)

== Versionamento ==
O plugin utiliza **4 níveis de controle de versão**:

1. **MAJOR** – Mudanças de paradigma, arquitetura, nomenclatura de arquivos principais (pode gerar quebra de compatibilidade).  
2. **MINOR** – Criação de novas features ou alterações significativas em telas.  
3. **PATCH** – Ajustes em funcionalidades dentro das telas, melhorias incrementais.  
4. **BUILD** – Inclusão, alteração ou manutenção de pequenos detalhes (CSS, cores, tamanhos, inclusão de novas linhas etc).  

Exemplo: `1.3.2.4`  
- `1` = mudança estrutural  
- `3` = nova feature/tela  
- `2` = mudança funcional dentro da tela  
- `4` = ajuste fino ou hotfix  

== Installation ==
1. Baixe o ZIP do repositório ou da release.  
2. No WordPress, acesse **Plugins > Adicionar novo > Enviar plugin**.  
3. Faça upload do arquivo `.zip` e clique em **Instalar agora**.  
4. Ative o plugin em **Plugins > Instalados**.  

== Screenshots ==
1. Lista de todas as linhas.  
2. Exibição dos horários em abas (Dia de semana, Sábado, Domingo/Feriado).  
3. Detalhe do itinerário e horários previstos.  

== Changelog ==
= 1.3.1 =
* Versão estável com renderização em três níveis (Linhas → Horários → Itinerário).
* Controle de estado via URL para compartilhamento direto.
* Estrutura pronta para atualização via Git Updater.

== Upgrade Notice ==
= 1.3.1 =
Recomenda-se atualização para manter a compatibilidade e a experiência de navegação fluída.

