# Miau & Au

Puzzle de juntar bichos para celular. Deslize o quintal inteiro: dois bichos iguais viram o próximo da linha (filhotinho → … → leão, ou → … → lobo).

Regras próprias do jogo:

- Gato só junta com gato, cachorro só com cachorro.
- Um bicho 2 níveis (ou mais) maior espanta o da outra espécie em que encostar.
- Dois bichos de nível máximo são adotados: somem e dão 5.000 pontos.
- O álbum guarda todo bicho que você já conseguiu.

## Rodar

```
npm start   # abre em http://localhost:8000
npm test    # testa as regras
```

Não há dependências nem etapa de build: é HTML, CSS e JavaScript puros.

- `js/game.js`: regras (sem tela, testadas em `test/`)
- `js/art.js`: desenho dos bichos em SVG
- `js/main.js`: tela, toque, teclado e salvamento
