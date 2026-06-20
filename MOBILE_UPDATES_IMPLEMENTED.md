# Melhorias mobile implementadas

## Interface inicial
- Novo lobby com identidade visual mais forte para mobile.
- Destaque "Beta Mobile" e indicação do modo online como beta.
- Botões principais maiores para toque em celular.

## Tutorial de regras
- Menu "Regras" com resumo dentro do app.
- Pontuação documentada no próprio jogo:
  - Batida simples: 1 ponto
  - Carroçada: 2 pontos
  - Lá e Lô: 3 pontos
  - Cruzada: 4 pontos

## Jogar novamente
- O jogo solo já tinha botões de "Próxima Rodada" e "Nova Partida".
- Mantidos e destacados no modal de fim de rodada/partida.

## Placar acumulado e ranking local
- Estatísticas persistidas no `localStorage`:
  - vitórias
  - derrotas
  - aproveitamento
  - sequência atual
  - melhor sequência
- Novo menu "Ranking" com opção de zerar dados locais.

## Monetização preparada
- Novo menu "Premium" com simulação de compra "remover_anuncios".
- Flag local `domino_ads_removed` para esconder anúncios quando premium estiver ativo.
- Espaço reservado para anúncio AdMob no fim de partidas solo e multiplayer.
- Observação: a integração real ainda precisa chamar Google Play Billing/App Store In-App Purchase.

## Privacidade
- Novo menu "Privacidade" explicando dados locais e alertando para política oficial antes de publicar.

## Modo online beta
- O lobby agora sinaliza que o multiplayer online está em beta, adequado para teste fechado antes da publicação.

## Observação de validação
- Não foi possível instalar dependências ou rodar o build completo neste ambiente porque o acesso ao registry npm falhou.
- A validação TypeScript local também ficou limitada porque não há `@types/node` e `vite/client` instalados no ambiente.
