# Miau & Au

Jogo de soltar e juntar bichos para celular. Você mira, solta um bicho no quintal e ele cai e rola; dois iguais que se encostam viram o próximo da linha (filhotinho → … → leão, ou → … → lobo).

- Escolha jogar com gatos ou com cachorros; cada espécie tem 10 bichos.
- Fases: 30 fases com um objetivo (juntar, chegar a um bicho, fazer pontos ou espantar intrusos) e um limite de bichos; até 3 estrelas por fase, conforme sobrem bichos. Cada fase tem sorteio fixo, igual a cada tentativa.
- Modos: Clássico (com relógio, intrusos e eventos), Zen (sem relógio nem intrusos, rende metade das moedas) e Contra o tempo (90 segundos), cada um com o seu recorde.
- Só os 4 menores são soltos; os maiores você consegue juntando.
- Cada bicho tem poucos segundos para ser solto, senão cai sozinho; o tempo encurta ao longo da partida.
- De tempos em tempos cai um intruso da espécie rival. Ele não junta com nada e só vai embora quando há uma junção encostada nele.
- Junções em sequência valem combo e multiplicam os pontos.
- Dois bichos de nível máximo são adotados: somem e dão 5.000 pontos.
- Se um bicho ficar parado acima da linha tracejada, o quintal lotou e a partida acaba.
- O álbum guarda todo bicho que você já conseguiu, com uma ficha para cada um: quantas vezes apareceu no seu quintal e uma curiosidade real sobre a raça.
- Cada partida rende moedas (1 a cada 50 pontos), e as 3 missões do dia rendem mais.
- Na loja, as moedas compram cenários novos: praia, neve, cidade e espaço.
- A loja também vende acessórios que todos os seus bichos passam a usar: laço, cachecol, óculos escuros, chapéu de festa e coroa.
- De vez em quando cai um bicho especial: curinga (junta com qualquer um), dourado (rende moedas), barulhento (empurra os vizinhos) e dorminhoco (só junta depois de acordar).
- A partir do 18º bicho, eventos com aviso mudam o quintal por alguns segundos: ventania (empurra a pilha para um lado), chuva (o pelo molhado encolhe os bichos) e tremor (sacode a pilha).
- Abrir o jogo em dias seguidos rende um bônus que cresce até o 7º dia.
- O desafio do dia tem a mesma sequência de bichos para todo mundo e paga 150 moedas na primeira partida.
- No fim da partida, "Compartilhar resultado" gera uma imagem do quintal com os pontos e o maior bicho, para salvar ou mandar.
- Em português, inglês e espanhol: o jogo abre no idioma do aparelho, e dá para trocar em Ajustes.
- Em Ajustes (no menu e na pausa): idioma, volume da música, volume dos efeitos, vibração e rever o tutorial.
- Há 19 troféus com recompensa em moedas e uma tela com os números da conta.
- Durante a partida, as moedas também pagam poderes: sacudir o quintal, tirar um bicho e espantar todos os intrusos. O preço sobe a cada uso na mesma partida.

## Rodar

```
npm start   # abre em http://localhost:8000
npm test    # testa as regras e a física
```

Não há dependências nem etapa de build: é HTML, CSS e JavaScript puros.

## Instalar e jogar sem internet

Hospedado num endereço `https` próprio, o jogo é instalável: o navegador do celular oferece "Adicionar à tela inicial" e ele abre em tela cheia, com ícone, sem barra de endereço. Depois da primeira visita funciona sem internet (as fontes vêm junto com o jogo e os arquivos ficam guardados pelo `sw.js`).

- `manifest.webmanifest`: nome, cores e ícones do app
- `sw.js`: guarda os arquivos para uso sem internet; ao mudar a lista de arquivos do jogo, atualize `FILES` e o número em `CACHE`
- `icons/`: ícone em SVG e PNG; `node scripts/build-icons.mjs` refaz o SVG a partir dos desenhos do jogo
- `fonts/`: as duas fontes do jogo (licença em `fonts/README.md`)

Esse é também o caminho mais curto para a Play Store: um app Android do tipo "Trusted Web Activity" só embrulha o endereço onde o jogo está hospedado, e pode ser gerado a partir dele (por exemplo com o PWABuilder ou o Bubblewrap), sem reescrever nada.

- `js/game.js`: regras e física (sem tela, testadas em `test/`)
- `js/art.js`: desenho dos bichos em SVG, com expressões
- `js/levels.js`: as 30 fases e o progresso nelas (sem tela, testado em `test/`)
- `js/album.js`: curiosidades das fichas do álbum e a contagem de aparições
- `js/i18n.js` e `js/i18n-dict.js`: tradução. O texto em português do código é a chave: `_('Recorde: {n} pontos', { n })` busca o inglês e o espanhol no dicionário. O teste `test/i18n.test.js` falha se algum texto novo ficar sem tradução.
- `js/meta.js`: moedas, missões diárias e loja (sem tela, testado em `test/`)
- `js/scene.js`: cenários (quintal, praia, neve, cidade e espaço; dia e noite)
- `js/fx.js`: partículas e efeitos visuais
- `js/main.js`: tela (canvas), toque, teclado e salvamento
- `js/sound.js`: efeitos sonoros e música de fundo, sintetizados, com volume ajustável
