# Dominó Pernambucano — plano mobile e monetização

## 1. Melhor caminho técnico

O projeto atual já é um app web React/Vite com PWA e servidor multiplayer Socket.IO. O caminho mais rápido para publicar em Android e iOS é empacotar o frontend com Capacitor, mantendo o multiplayer hospedado no servidor.

### Comandos no Replit/local

Na raiz do projeto:

```bash
pnpm install
pnpm --filter @workspace/domino run build
pnpm --filter @workspace/domino run mobile:init
```

Depois da primeira vez, use:

```bash
pnpm --filter @workspace/domino run mobile:sync
```

Para abrir o projeto nativo:

```bash
pnpm --filter @workspace/domino run mobile:android
pnpm --filter @workspace/domino run mobile:ios
```

Observação: iOS exige macOS + Xcode para gerar e publicar na App Store. Android exige Android Studio para gerar e assinar o AAB/APK.

## 2. Correções feitas no motor do jogo

Pontuação validada nos dois motores:

- Batida simples: 1 ponto
- Carroçada: 2 pontos
- Lá e Lô: 3 pontos
- Cruzada: 4 pontos
- Trancado: 1 ponto para o time com menor soma de pedras

Bug corrigido no multiplayer:

- Antes, toda rodada com mesa vazia obrigava quem começava a jogar a maior carroça da própria mão.
- Agora isso só acontece na primeira rodada, como manda a regra combinada: primeira rodada começa pela maior carroça; rodadas seguintes começam pelo vencedor/time vencedor sem obrigação de carroça.

Arquivos alterados:

- `artifacts/api-server/src/lib/multiplayerEngine.ts`
- `artifacts/domino/package.json`
- `artifacts/domino/capacitor.config.ts`

## 3. Ajustes recomendados antes de publicar

- Definir nome final do app: `Dominó Pernambucano` ou `Dominó Nordeste`.
- Criar ícone 1024x1024 e splash screen.
- Revisar tela em celular pequeno, principalmente mesa, mão do jogador, botão passar e placar.
- Adicionar política de privacidade.
- Criar tela “Como jogar” com as regras: Lá e Lô, Cruzada, Carroçada, Trancado, Dorme, primeira rodada e times.
- Criar botão “Restaurar compras” caso use assinatura ou compra interna no iOS.
- Hospedar o servidor multiplayer em URL estável, não apenas ambiente de teste.

## 4. Monetização recomendada

Modelo inicial mais seguro:

1. Gratuito com anúncios leves.
2. Compra única “Remover anúncios”.
3. Opcional: assinatura barata com itens cosméticos, estatísticas, ranking e mesas/temas especiais.

Evite pagar para vencer. Para jogo casual, a melhor aceitação costuma vir de cosméticos e remoção de anúncios.

### Produtos sugeridos

- Remover anúncios: R$ 9,90 a R$ 14,90 compra única.
- Pacote de temas: R$ 4,90 a R$ 9,90.
- Premium mensal: R$ 4,90 a R$ 7,90.
- Premium anual: R$ 39,90 a R$ 59,90.

### Anúncios sugeridos

- Banner pequeno no lobby.
- Intersticial apenas após o fim da partida, nunca no meio da rodada.
- Recompensado opcional para ganhar tema visual, emblema ou estatística extra.

## 5. Ferramentas sugeridas

- Capacitor: empacotar React/Vite para Android e iOS.
- AdMob: anúncios.
- RevenueCat: gerenciar compra única e assinatura entre iOS/Android.
- Firebase ou Supabase: ranking, login, estatísticas e analytics.

## 6. Checklist de publicação

### Android

- Criar conta Google Play Console.
- Gerar AAB assinado.
- Configurar política de privacidade.
- Configurar classificação indicativa.
- Configurar AdMob e app-ads.txt se usar anúncios.
- Enviar para teste fechado antes de produção.

### iOS

- Criar conta Apple Developer.
- Gerar build no Xcode.
- Criar app no App Store Connect.
- Configurar In-App Purchases/assinaturas se usar monetização interna.
- Criar tela de privacidade e rastreamento quando necessário.
- Enviar pelo TestFlight antes de produção.

## 7. Próximas melhorias no jogo

- Ranking online por temporada.
- Modo treino contra CPU.
- Modo 2x2 com convite por código.
- Skins de mesa: madeira, boteco, praia, sertão, São João.
- Emotes rápidos: “Lá!”, “Lô!”, “Passei!”, “Bora!”.
- Tutorial visual animado.
- Histórico de partidas.
- Reconexão mais clara em caso de queda de internet.
