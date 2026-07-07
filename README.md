# HANABIE. HarajuQuizz

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

## Ranking com Supabase

O ranking usa endpoints da Vercel em `api/` e uma tabela Supabase.

1. No Supabase SQL Editor, rode:

```text
supabase/leaderboard.sql
```

2. No Vercel, configure as variaveis:

```text
SUPABASE_URL=https://seu-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Nao coloque `SUPABASE_SERVICE_ROLE_KEY` no codigo, no GitHub ou no navegador. Ela deve ficar apenas nas Environment Variables do Vercel.

3. O jogo salva localmente:

```text
hanabie-player-id
hanabie-player-nickname
hanabie-player-country
```

O jogador envia nickname e pais manualmente. A tela de ranking mostra Top 10 global/pais, filtros de hoje/semana/tudo, melhor score do navegador e a explicacao de cada rank tematico.

### Checklist de seguranca do ranking

- A tabela `leaderboard_scores` nao deve ficar legivel direto para `anon` ou `authenticated`.
- O app le e grava scores apenas pelas rotas da Vercel em `api/`.
- A rota de envio limita payloads grandes e muitas tentativas em pouco tempo.
- Erros internos do Supabase sao logados no servidor, mas nao aparecem para jogadores.
- O score ainda e um anti-cheat leve: alguem tecnico pode simular requests. Para ranking competitivo, use token de partida, seed de perguntas salvo no servidor e validacao server-side do resultado.

Depois de mudar `supabase/leaderboard.sql`, rode o arquivo de novo no Supabase SQL Editor para aplicar as policies na producao.
