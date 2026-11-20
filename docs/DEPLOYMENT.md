# Deploy

Este projeto corre num processo Node.js e usa uma ligação MySQL TCP. Pode ser alojado num servidor com Docker ou numa plataforma que suporte Node e MySQL. O site estático anterior é independente e não foi atualizado com este backend.

## Configuração de produção

1. Cria uma instância MySQL 8.4 persistente, com backups e utilizadores próprios. A aplicação não deve usar root.
2. Define `NODE_ENV=production`, `APP_ORIGIN=https://teu-dominio.pt`, `ALLOW_REGISTRATION=false` e as variáveis DB. A aplicação recusa produção com origem HTTP.
3. Configura HTTPS no reverse proxy. Se houver exatamente um proxy e só ele puder chegar a Node, usa `TRUST_PROXY=1`; caso contrário mantém 0. Expor Node diretamente com trust proxy permite falsificar IPs usados pelo rate limiter.
4. Se MySQL for remoto, ativa `DB_SSL=true` e usa um certificado CA de confiança. Não desatives a validação do certificado. Para uma CA privada, configura `NODE_EXTRA_CA_CERTS` com a CA emitente.
5. Compila a imagem, aplica as migrações com uma credencial de migração, depois inicia a aplicação com a credencial operacional.
6. Verifica `/api/health`, login/logout, persistência e criação de uma reserva antes de aceitar dados reais.

Para criar a primeira escola, abre o registo temporariamente de forma controlada, cria a conta e volta a desativá-lo. Não uses o seed de demonstração em produção. Usa um gestor de segredos; não copies `.env` para o GitHub.

O `compose.yaml` incluído é pensado para desenvolvimento local. A porta da app e a da BD estão limitadas a 127.0.0.1 do host. Para produção, coloca um reverse proxy na frente e mantém a BD inacessível pela Internet. O override de `migrate` usa NODE_ENV development para poder correr a partir do exemplo local; as migrações não criam sessões nem credenciais. Configura os serviços explicitamente no deploy real.

## Segurança implementada

- Passwords com scrypt e salt aleatório; sessão opaca aleatória, hash SHA-256 na BD.
- Cookies HttpOnly e SameSite Strict; Secure em produção.
- Expiração de sessão em 8 horas e revogação no logout.
- Sem CORS aberto; escritas exigem cabeçalho não simples e verificação de Origin.
- Helmet e Content Security Policy; sem scripts de terceiros.
- SQL parametrizado, validação de DTO e rejeição de campos inesperados.
- Todas as operações protegidas por escola; FKs compostas reforçam a integridade.
- Limites por IP: 120 pedidos/minuto; login 10/minuto; registo 5/minuto, em memória por processo.

Isto não substitui uma revisão de segurança antes de abrir o serviço ao público. Verificação de email, recuperação de password, rotação de sessões, MFA e permissões de staff não estão implementadas.

## Operação

Programa a remoção de sessões expiradas: `DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP(3)`. A autorização já as rejeita mesmo antes dessa limpeza. Não elimines logs de auditoria sem definir uma política de retenção adequada.

Mantém backups do MySQL fora da máquina de aplicação e testa o restauro. Os volumes locais não substituem backups. A base de dados guarda dados pessoais; define acessos, retenção e procedimentos de exportação/eliminação antes de usar com alunos reais.

A receita no dashboard soma reservas confirmadas marcadas como pagas no dia da aula; não é contabilidade, não emite faturas e não representa um ledger de caixa. Cancelamentos pagos ficam no histórico para reconciliação manual.

Com várias instâncias de Node será necessário partilhar o rate limiting e adicionar monitorização, métricas, alertas e política de recuperação. Os locks de escola são na BD e já funcionam entre instâncias que usem a mesma BD.
