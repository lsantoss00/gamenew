# Miau & Au

Jogo de soltar e juntar bichos para celular. Você mira, solta um bicho no quintal e ele cai e rola; dois iguais que se encostam viram o próximo da linha (filhotinho → … → leão, ou → … → lobo).

- Escolha jogar com gatos ou com cachorros; cada espécie tem 10 bichos.
- Só os 4 menores são soltos; os maiores você consegue juntando.
- Cada bicho tem poucos segundos para ser solto, senão cai sozinho; o tempo encurta ao longo da partida.
- De tempos em tempos cai um intruso da espécie rival. Ele não junta com nada e só vai embora quando há uma junção encostada nele.
- Junções em sequência valem combo e multiplicam os pontos.
- Dois bichos de nível máximo são adotados: somem e dão 5.000 pontos.
- Se um bicho ficar parado acima da linha tracejada, o quintal lotou e a partida acaba.
- O álbum guarda todo bicho que você já conseguiu.

## Rodar

```
npm start   # abre em http://localhost:8000
npm test    # testa as regras e a física
```

Não há dependências nem etapa de build: é HTML, CSS e JavaScript puros.

- `js/game.js`: regras e física (sem tela, testadas em `test/`)
- `js/art.js`: desenho dos bichos em SVG, com expressões
- `js/scene.js`: cenário do quintal (dia e noite)
- `js/fx.js`: partículas e efeitos visuais
- `js/main.js`: tela (canvas), toque, teclado e salvamento
- `js/sound.js`: efeitos sonoros sintetizados
