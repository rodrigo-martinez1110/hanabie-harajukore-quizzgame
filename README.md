# HANABIE. Mosh Pit Quiz

Fan quiz estatico e nao oficial sobre HANABIE.

## Rodar localmente

Na pasta do jogo:

```powershell
& 'C:\Users\drigo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8765
```

Abra:

```text
http://localhost:8765
```

## Editar perguntas

Edite:

```text
data/questions.json
```

Cada pergunta usa este formato:

```json
{
  "id": "music-example",
  "category": "music",
  "difficulty": 1,
  "prompt": {
    "pt-BR": "Sua pergunta aqui?",
    "en": "Your question here?",
    "es": "Tu pregunta aqui?",
    "ja": "ここに質問を書く?"
  },
  "choices": {
    "pt-BR": ["A", "B", "C", "D"],
    "en": ["A", "B", "C", "D"],
    "es": ["A", "B", "C", "D"],
    "ja": ["A", "B", "C", "D"]
  },
  "answerIndex": 0,
  "explanation": {
    "pt-BR": "Explicacao curta.",
    "en": "Short explanation.",
    "es": "Explicacion corta.",
    "ja": "短い解説。"
  },
  "sourceUrl": "https://hanabie.jp/"
}
```

Categorias validas:

- `music`
- `video`
- `members`
- `history`
- `hardcore`

Regras importantes:

- `choices` precisa ter exatamente 4 alternativas.
- `prompt`, `choices` e `explanation` usam `pt-BR`, `en`, `es` e `ja`.
- `answerIndex` comeca em zero: `0` e a primeira alternativa, `1` a segunda, e assim por diante.
- `difficulty` vai de `1` a `5`; use `4` e `5` para perguntas de fã mais específicas.
- Use `tags: ["song-meaning"]` para perguntas sobre o tema de uma música.
- Evite letras de musicas, audio, imagens oficiais, capas e frames de clipes sem licenca.

## Audio local

O botao `Carregar minha musica` usa um arquivo do proprio dispositivo do jogador. O app toca esse arquivo localmente no navegador e usa o sinal para animar a interface. O arquivo nao e enviado, salvo ou redistribuido pelo jogo.

## Faixa demo original

O botao `Tocar faixa demo` usa uma faixa instrumental original gerada em tempo real pelo Web Audio API. Ela nao depende de MP3 no repositorio e nao usa audio de terceiros. Isso evita expor um arquivo de musica baixavel, mas nao deve ser tratado como DRM para musicas reais.
