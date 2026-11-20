# Validação do pacote

Executada em 20 de novembro de 2026, com Node 24.22.3.

| Verificação                | Resultado                                                |
| -------------------------- | -------------------------------------------------------- |
| `npm run check`            | Passou: backend e frontend em TypeScript strict          |
| `npm run build`            | Passou: backend compilado e frontend empacotado          |
| `npm test`                 | 5 testes passaram                                        |
| `npm run test:integration` | 11 testes HTTP/BD passaram                               |
| Migração inicial           | Aplicada com sucesso; reexecução sem alterar a estrutura |
| Seed de demonstração       | Executado com sucesso numa BD separada                   |
| `npm audit --omit=dev`     | 0 vulnerabilidades reportadas na consulta efetuada       |

Os testes de integração foram executados num servidor **MariaDB 11.8.6**, através do driver mysql2, com InnoDB e uma base dedicada. Cobrem autenticação e cookies, origem/cabeçalho de segurança, validação, isolamento entre escolas, concorrência de horários, disputa pelo último lugar, preços históricos, conflitos de alunos, cancelamentos, logout, snapshot da escola e expiração da sessão.

**MySQL 8.4 e Docker Compose não foram executados neste ambiente.** O repositório inclui o workflow de GitHub Actions com MySQL 8.4 para correr os mesmos testes no teu repositório. O primeiro resultado desse workflow deve ser verificado antes de um deploy. A versão MariaDB usada para validar não é incluída no ZIP nem é necessária para o arranque documentado com MySQL.

Não foi feito um teste visual ponta a ponta do frontend ligado à BD nesta entrega. A interface foi compilada e o contrato da API foi exercitado pelos testes HTTP. As previsões são dados de demonstração; não houve validação meteorológica.

Isto é validação funcional de um MVP, não certificação de produção, auditoria de segurança ou validação contabilística.
