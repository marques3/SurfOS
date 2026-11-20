# API HTTP · v0.1

Prefixo `/api`. JSON. Frontend e API no mesmo domínio; não existe CORS aberto. Não é necessário JWT: a sessão opaca fica num cookie HttpOnly `surfos_session`; só o hash SHA-256 é guardado na BD. O utilizador pertence a uma escola nesta versão.

Todas as escritas exigem `X-SurfOS: 1`. Quando o pedido contém `Origin`, este deve ser igual a `APP_ORIGIN`. No navegador, usa `credentials: 'same-origin'`. Não guardes tokens de sessão em localStorage.

## Endpoints

| Método         | Caminho               | Ação                                                             |
| -------------- | --------------------- | ---------------------------------------------------------------- |
| GET            | /health               | Testa ligação à BD; público                                      |
| GET            | /config               | Indica se registo está aberto e previsões são demo; público      |
| POST           | /auth/register        | Cria escola e administrador; condicionado por ALLOW_REGISTRATION |
| POST           | /auth/login           | Autentica e cria sessão de 8 horas                               |
| POST           | /auth/logout          | Revoga sessão atual e limpa cookie                               |
| GET            | /auth/me              | Identidade autenticada                                           |
| GET            | /workspace            | Snapshot coerente da escola, equipa, alunos, aulas e reservas    |
| GET / PATCH    | /school               | Lê/atualiza nome da escola                                       |
| GET / POST     | /teachers             | Lista/cria instrutores                                           |
| PATCH / DELETE | /teachers/:id         | Atualiza/arquiva instrutor                                       |
| GET / POST     | /students             | Lista/cria alunos                                                |
| PATCH / DELETE | /students/:id         | Atualiza/arquiva aluno                                           |
| GET / POST     | /lessons              | Lista/cria aulas ativas                                          |
| PATCH / DELETE | /lessons/:id          | Atualiza/cancela aula                                            |
| GET / POST     | /bookings             | Lista/cria reservas confirmadas                                  |
| PATCH          | /bookings/:id/payment | Marca pagamento recebido/pendente                                |
| DELETE         | /bookings/:id         | Cancela reserva preservando histórico                            |
| GET            | /bookings/cancelled   | Até 500 cancelamentos recentes                                   |
| GET            | /audit                | Até 200 alterações recentes                                      |

Todos os caminhos, exceto os explicitamente públicos e o login/registo/logout, exigem sessão. POST retorna 201; GET/PATCH/DELETE retornam 200. DELETE é cancelamento/arquivo lógico, não remoção física. PATCH dos recursos usa o objeto completo indicado abaixo; não é um JSON Merge Patch.

## Exemplos

Registo (mínimo 12 caracteres na password):

```bash
curl -c cookies.txt http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' -H 'X-SurfOS: 1' \
  -d '{"name":"Ricardo","school":"A minha escola","email":"ricardo@example.com","password":"substitui-esta-palavra-passe"}'
```

Login:

```bash
curl -c cookies.txt http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -H 'X-SurfOS: 1' \
  -d '{"email":"ricardo@example.com","password":"substitui-esta-palavra-passe"}'
curl -b cookies.txt http://localhost:3000/api/auth/me
```

O ficheiro `cookies.txt` é uma credencial de acesso: usa-o só localmente, remove-o depois do teste e não o adiciones ao Git.

Os corpos seguintes usam UUIDs devolvidos pelos endpoints. Nunca envies `schoolId`, `id`, `status` ou campos adicionais no corpo; a API rejeita campos desconhecidos.

```json
// POST /teachers, PATCH /teachers/:id
{"name":"Miguel Costa","role":"Surf coach","color":"#dce7d6"}

// POST /students, PATCH /students/:id
{"name":"Emma Wilson","email":"emma@example.com","level":"beginner"}

// POST /lessons, PATCH /lessons/:id
{
  "teacher":"UUID_DO_INSTRUTOR",
  "date":"2030-06-15",
  "time":"09:00",
  "duration":90,
  "beach":"Arrifana",
  "level":"beginner",
  "capacity":6,
  "priceCents":4500
}

// POST /bookings — o preço vem da aula, não do cliente
{"student":"UUID_DO_ALUNO","lesson":"UUID_DA_AULA","paid":false}

// PATCH /bookings/:id/payment
{"paid":true}

// PATCH /school
{"name":"A minha escola"}
```

Os comentários acima são explicativos; remove-os para enviar JSON real.

Níveis de aluno: `beginner`, `intermediate`. Níveis de aula: os anteriores e `private`. Aula privada exige lotação 1. Praias aceites nesta versão: Arrifana, Monte Clérigo, Amoreira, Odeceixe. Preços: 0 a 99900 cêntimos; lotação 1–12.

`GET /lessons?from=2030-06-01&to=2030-06-30` aceita um intervalo inclusivo. As datas do corpo são `YYYY-MM-DD`; horas `HH:mm`, relativas a Europe/Lisbon.

A resposta da reserva inclui `priceCents`, `paid`, `student`, `lesson`, `status`. IDs de escola presentes na resposta são informativos; não são aceites como seleção de escola nas escritas.

## Erros

| Código | Significado                                                               |
| ------ | ------------------------------------------------------------------------- |
| 400    | DTO inválido, campo desconhecido, data/horário/lotação inválidos          |
| 401    | Sessão em falta, inválida ou expirada; credenciais inválidas              |
| 403    | Origem/cabeçalho de segurança inválido ou registo fechado                 |
| 404    | Entidade não existe na escola autenticada                                 |
| 409    | Lotação, duplicado, conflito de horário ou compromisso que impede arquivo |
| 429    | Limite de pedidos/IP excedido                                             |
| 500    | Erro interno; detalhes da BD não são expostos                             |

```json
{
  "statusCode": 409,
  "message": "Esta aula está completa.",
  "requestId": "UUID"
}
```

Os erros do middleware de origem/cabeçalho podem não incluir requestId. A validação de DTO pode devolver `message` como array. Os clientes devem tratar ambos. O frontend mostra erros da API em vez de assumir que o pedido teve sucesso.
