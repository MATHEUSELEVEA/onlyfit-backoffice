import { AlertTriangle, CheckCircle2, RefreshCw, Search, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatDateTime, formatNumber } from '../lib/format';
import { displayName, formatDocument, type UserListItem, type UserSearchFilters } from '../lib/users';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import { useUserSearch } from '../hooks/useUsers';
import { UserDetail } from './UserDetail';

const PAGE_SIZE = 25;

function UserRow({ user, onOpen }: { user: UserListItem; onOpen: () => void }) {
  const name = displayName(user);
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <tr className="user-row" onClick={onOpen}>
      <td>
        <div className="user-identity">
          {user.avatar_url
            ? <img className="user-avatar" src={user.avatar_url} alt="" />
            : <div className="user-avatar placeholder" aria-hidden="true">{initials}</div>}
          <div>
            <button className="user-row-open" type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
              {name}
            </button>
            <span>{user.username ? `@${user.username}` : 'sem @usuário'}</span>
          </div>
        </div>
      </td>
      <td>
        <strong>{user.email ?? '—'}</strong>
        <span>{user.phone ?? 'sem telefone'}</span>
      </td>
      <td>{user.has_cpf ? formatDocument(null, user.cpf_last4) : '—'}</td>
      <td>
        <div className="user-badges">
          {user.staff_role && <span className="role-badge role-admin">Equipe</span>}
          {user.app_lockdown && <span className="role-badge alert">Bloqueado</span>}
          {user.is_professional && <span className="role-badge">Profissional</span>}
          {user.is_creator && <span className="role-badge">Criador</span>}
          {!user.is_professional && !user.is_creator && !user.staff_role && <span className="role-badge">Membro</span>}
        </div>
      </td>
      <td>{user.created_at ? formatDateTime(new Date(user.created_at)) : '—'}</td>
      <td>{user.last_sign_in_at ? formatDateTime(new Date(user.last_sign_in_at)) : 'nunca'}</td>
    </tr>
  );
}

export function UsersDirectoryPage() {
  const { data: currentRole, isLoading: roleLoading } = useCurrentStaffRole();
  const canEdit = currentRole === 'super_admin' || currentRole === 'admin';
  const canDelete = currentRole === 'super_admin';

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(0);

  // Busca acompanha a digitação sem disparar uma consulta por tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedQuery(queryInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const filters = useMemo<UserSearchFilters>(() => ({
    query: appliedQuery || null,
    createdFrom: createdFrom || null,
    createdTo: createdTo || null,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [appliedQuery, createdFrom, createdTo, page]);

  const query = useUserSearch(filters, !selectedUserId);
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const hasFilters = Boolean(appliedQuery || createdFrom || createdTo);

  const clearFilters = () => {
    setQueryInput('');
    setAppliedQuery('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
  };

  if (selectedUserId) {
    return (
      <UserDetail
        userId={selectedUserId}
        canEdit={canEdit}
        canDelete={canDelete}
        onBack={() => setSelectedUserId(null)}
        onDeleted={(message) => {
          setSelectedUserId(null);
          setFlash(message);
        }}
      />
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Base de usuários</p>
          <h1>Usuários</h1>
          <span>Consulte, altere o cadastro e, quando necessário, exclua a conta e tudo que ela tem na plataforma.</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? 'spin' : ''} size={16} />
            Atualizar
          </button>
        </div>
      </header>

      <section className="content">
        {flash && (
          <div className="inline-alert" role="status">
            <CheckCircle2 size={18} />
            {flash}
            <button className="icon-button" type="button" aria-label="Fechar aviso" onClick={() => setFlash('')}>
              <X size={16} />
            </button>
          </div>
        )}

        <section className="user-filters" aria-label="Filtros da lista de usuários">
          <div className="search-box user-search">
            <Search size={16} />
            <input
              value={queryInput}
              placeholder="Nome, @usuário, e-mail, CPF ou telefone"
              aria-label="Buscar usuário"
              onChange={(event) => setQueryInput(event.target.value)}
            />
            {queryInput && (
              <button className="icon-button" type="button" aria-label="Limpar busca" onClick={() => setQueryInput('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <label className="user-date-field">
            <span>Cadastro de</span>
            <input
              type="date"
              value={createdFrom}
              max={createdTo || undefined}
              onChange={(event) => { setCreatedFrom(event.target.value); setPage(0); }}
            />
          </label>
          <label className="user-date-field">
            <span>até</span>
            <input
              type="date"
              value={createdTo}
              min={createdFrom || undefined}
              onChange={(event) => { setCreatedTo(event.target.value); setPage(0); }}
            />
          </label>
          {hasFilters && (
            <button className="button ghost compact" type="button" onClick={clearFilters}>
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </section>

        <section className="staff-list-section" aria-labelledby="user-list-title">
          <div className="section-heading">
            <div>
              <h2 id="user-list-title">Contas na base</h2>
              <p>
                {formatNumber(total)} usuário(s){hasFilters ? ' no filtro atual' : ' na plataforma'}
                {total > 0 ? ` · página ${page + 1} de ${maxPage + 1}` : ''}
              </p>
            </div>
          </div>

          {roleLoading || query.isLoading ? (
            <div className="skeleton staff-skeleton" />
          ) : query.isError ? (
            <div className="inline-alert danger" role="alert">
              <AlertTriangle size={18} />
              Não foi possível consultar a base de usuários. Verifique se a migration do diretório de usuários foi aplicada.
            </div>
          ) : items.length === 0 ? (
            <div className="access-panel inline-access" role="status">
              <div className="status-icon"><UsersRound size={24} /></div>
              <div>
                <h2>Nenhum usuário encontrado</h2>
                <p>Ajuste a busca ou o período de cadastro.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="staff-table user-table">
                  <thead>
                    <tr>
                      <th>Pessoa</th>
                      <th>Contato</th>
                      <th>CPF</th>
                      <th>Perfil</th>
                      <th>Cadastro</th>
                      <th>Último acesso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((user) => (
                      <UserRow key={user.id} user={user} onOpen={() => { setFlash(''); setSelectedUserId(user.id); }} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="user-pagination">
                <span>{formatNumber(total)} resultado(s)</span>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
                  Anterior
                </button>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.min(maxPage, current + 1))} disabled={page >= maxPage}>
                  Próxima
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </>
  );
}
