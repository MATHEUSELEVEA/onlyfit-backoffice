import {
  AlertTriangle,
  Apple,
  ArrowDown,
  ArrowUp,
  Check,
  Dumbbell,
  Footprints,
  GripVertical,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Swords,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  useActivateAffinityGroup,
  useAffinityGroupAudit,
  useAffinityGroupImpact,
  useAffinityGroups,
  useCreateAffinityGroup,
  useDeactivateAffinityGroup,
  useReorderAffinityGroups,
  useUpdateAffinityGroup,
} from '../hooks/useAffinityGroups';
import { useCurrentStaffRole } from '../hooks/useStaffManagement';
import {
  affinityAccents,
  affinityGroupErrorMessage,
  affinityIcons,
  isAffinityGroupImpactChanged,
  type AffinityAccent,
  type AffinityGroup,
  type AffinityGroupInput,
  type AffinityIcon,
  type AffinityImpact,
} from '../lib/affinityGroups';
import { formatDateTime, formatNumber } from '../lib/format';

const iconByName: Record<AffinityIcon, LucideIcon> = {
  Dumbbell,
  Sparkles,
  Swords,
  Footprints,
  Medal,
  Apple,
};

const iconLabel: Record<AffinityIcon, string> = {
  Dumbbell: 'Halter',
  Sparkles: 'Destaque',
  Swords: 'Lutas',
  Footprints: 'Passos',
  Medal: 'Medalha',
  Apple: 'Nutrição',
};

const accentOptions: Array<{ value: AffinityAccent; label: string; color: string }> = [
  { value: 'from-amber-500/30', label: 'Âmbar', color: '#f59e0b' },
  { value: 'from-rose-500/30', label: 'Rosa', color: '#f43f5e' },
  { value: 'from-red-500/30', label: 'Vermelho', color: '#ef4444' },
  { value: 'from-orange-500/30', label: 'Laranja', color: '#f97316' },
  { value: 'from-violet-500/30', label: 'Violeta', color: '#8b5cf6' },
  { value: 'from-lime-500/30', label: 'Lime', color: '#84cc16' },
];

const emptyForm: AffinityGroupInput = {
  label: '',
  icon: affinityIcons[1],
  accent: affinityAccents[5],
  aliases: [],
};

const auditActionLabel = {
  create: 'Criou',
  update: 'Editou',
  reorder: 'Reordenou',
  activate: 'Ativou',
  deactivate: 'Desativou',
} as const;

export function AffinityGroupsPage() {
  const groupsQuery = useAffinityGroups();
  const auditQuery = useAffinityGroupAudit();
  const { data: role } = useCurrentStaffRole();
  const canEdit = role === 'admin' || role === 'super_admin';
  const createMutation = useCreateAffinityGroup();
  const updateMutation = useUpdateAffinityGroup();
  const activateMutation = useActivateAffinityGroup();
  const reorderMutation = useReorderAffinityGroups();
  const [orderedKeys, setOrderedKeys] = useState<string[] | null>(null);
  const [editing, setEditing] = useState<AffinityGroup | null | 'new'>(null);
  const [form, setForm] = useState<AffinityGroupInput>(emptyForm);
  const [aliasesText, setAliasesText] = useState('');
  const [deactivating, setDeactivating] = useState<AffinityGroup | null>(null);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedGroups = useMemo(() => {
    const groups = groupsQuery.data ?? [];
    if (!orderedKeys) return groups;
    const byKey = new Map(groups.map((group) => [group.key, group]));
    return [
      ...orderedKeys.map((key) => byKey.get(key)).filter((group): group is AffinityGroup => Boolean(group)),
      ...groups.filter((group) => !orderedKeys.includes(group.key)),
    ];
  }, [groupsQuery.data, orderedKeys]);

  const activeCount = orderedGroups.filter((group) => group.active).length;
  const totalLinks = orderedGroups.reduce((sum, group) => sum + group.total_links, 0);

  const openEditor = (group: AffinityGroup | 'new') => {
    setError(null);
    setMessage(null);
    setEditing(group);
    if (group === 'new') {
      setForm(emptyForm);
      setAliasesText('');
      return;
    }
    setForm({ label: group.label, icon: group.icon, accent: group.accent, aliases: group.aliases });
    setAliasesText(group.aliases.join(', '));
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !canEdit) return;
    setError(null);
    setMessage(null);
    const input = {
      ...form,
      label: form.label.trim(),
      aliases: aliasesText.split(',').map((value) => value.trim()).filter(Boolean),
    };
    const mutation = editing === 'new' ? createMutation : updateMutation;
    const payload = editing === 'new' ? input : { ...input, key: editing.key };
    mutation.mutate(payload as AffinityGroupInput & { key: string }, {
      onSuccess: (group) => {
        setEditing(null);
        setMessage(editing === 'new'
          ? `${group.label} foi cadastrado como inativo.`
          : `${group.label} foi atualizado.`);
      },
      onError: (mutationError) => setError(affinityGroupErrorMessage(mutationError)),
    });
  };

  const activate = (group: AffinityGroup) => {
    setError(null);
    setMessage(null);
    activateMutation.mutate(group.key, {
      onSuccess: () => setMessage(`${group.label} está disponível no sistema.`),
      onError: (mutationError) => setError(affinityGroupErrorMessage(mutationError)),
    });
  };

  const persistOrder = (next: AffinityGroup[]) => {
    if (!canEdit || reorderMutation.isPending) return;
    const previous = orderedKeys;
    setOrderedKeys(next.map((group) => group.key));
    setError(null);
    reorderMutation.mutate(next.map((group) => group.key), {
      onSuccess: () => setMessage('Ordem atualizada.'),
      onError: (mutationError) => {
        setOrderedKeys(previous);
        setError(affinityGroupErrorMessage(mutationError));
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedGroups.length) return;
    const next = [...orderedGroups];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  };

  const dropBefore = (targetKey: string) => {
    if (!draggedKey || draggedKey === targetKey) return;
    const next = [...orderedGroups];
    const from = next.findIndex((group) => group.key === draggedKey);
    const to = next.findIndex((group) => group.key === targetKey);
    if (from < 0 || to < 0) return;
    const [dragged] = next.splice(from, 1);
    next.splice(to, 0, dragged);
    setDraggedKey(null);
    persistOrder(next);
  };

  const refresh = () => {
    setOrderedKeys(null);
    void groupsQuery.refetch();
    void auditQuery.refetch();
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="section-label">Taxonomia global</p>
          <h1>Grupos de afinidade</h1>
          <span>Cadastro, disponibilidade e impacto dos grupos usados em toda a plataforma.</span>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={refresh} disabled={groupsQuery.isFetching}>
            <RefreshCw className={groupsQuery.isFetching ? 'spin' : ''} size={16} /> Atualizar
          </button>
          {canEdit && (
            <button className="button primary" type="button" onClick={() => openEditor('new')}>
              <Plus size={16} /> Novo grupo
            </button>
          )}
        </div>
      </header>

      <section className="content affinity-page">
        {error && <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />{error}</div>}
        {message && <div className="inline-alert" role="status"><Check size={18} />{message}</div>}

        <div className="affinity-summary" aria-label="Resumo dos grupos">
          <span><strong>{formatNumber(activeCount)}</strong> ativos</span>
          <span><strong>{formatNumber(orderedGroups.length - activeCount)}</strong> inativos</span>
          <span><strong>{formatNumber(totalLinks)}</strong> vínculos mapeados</span>
        </div>

        <div className={`affinity-workspace ${editing ? 'has-editor' : ''}`}>
          <section className="affinity-list-panel" aria-label="Grupos cadastrados">
            {groupsQuery.isLoading ? (
              <div className="affinity-loading" aria-label="Carregando grupos">
                <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
              </div>
            ) : groupsQuery.isError ? (
              <div className="inline-alert danger" role="alert">
                <AlertTriangle size={18} /> Não foi possível carregar os grupos.
              </div>
            ) : orderedGroups.length === 0 ? (
              <div className="affinity-empty"><Sparkles size={24} /><strong>Nenhum grupo cadastrado</strong></div>
            ) : (
              <div className="affinity-list">
                {orderedGroups.map((group, index) => (
                  <AffinityGroupRow
                    key={group.key}
                    group={group}
                    index={index}
                    count={orderedGroups.length}
                    canEdit={canEdit}
                    canDeactivate={group.active && activeCount > 1}
                    busy={activateMutation.isPending || reorderMutation.isPending}
                    dragged={draggedKey === group.key}
                    onEdit={() => openEditor(group)}
                    onActivate={() => activate(group)}
                    onDeactivate={() => setDeactivating(group)}
                    onMove={move}
                    onDragStart={() => setDraggedKey(group.key)}
                    onDragEnd={() => setDraggedKey(null)}
                    onDrop={() => dropBefore(group.key)}
                  />
                ))}
              </div>
            )}
          </section>

          {editing && (
            <AffinityEditor
              editing={editing}
              form={form}
              aliasesText={aliasesText}
              saving={createMutation.isPending || updateMutation.isPending}
              onChange={setForm}
              onAliasesChange={setAliasesText}
              onCancel={() => setEditing(null)}
              onSubmit={save}
            />
          )}
        </div>

        <section className="affinity-audit-panel">
          <div className="affinity-section-heading">
            <div><h2>Histórico administrativo</h2><span>Últimas 50 operações registradas.</span></div>
          </div>
          {auditQuery.isLoading ? <div className="skeleton affinity-audit-skeleton" /> : auditQuery.isError ? (
            <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />Não foi possível carregar a auditoria.</div>
          ) : (auditQuery.data?.length ?? 0) === 0 ? (
            <p className="affinity-muted">Nenhuma operação registrada.</p>
          ) : (
            <ol className="affinity-audit-list">
              {auditQuery.data?.map((entry) => (
                <li key={entry.id}>
                  <span className={`affinity-audit-dot ${entry.action}`} aria-hidden="true" />
                  <div>
                    <strong>{auditActionLabel[entry.action]} {entry.group_key ? `“${entry.group_key}”` : 'os grupos'}</strong>
                    <span>{entry.actor_name ?? 'Conta interna'} · {formatDateTime(new Date(entry.created_at))}</span>
                    {entry.action === 'deactivate' && (
                      <small>{formatNumber(entry.impact.total_links ?? 0)} vínculo(s) removido(s)</small>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>

      {deactivating && (
        <DeactivateAffinityDialog
          group={deactivating}
          onCancel={() => setDeactivating(null)}
          onSuccess={(impact) => {
            setDeactivating(null);
            setMessage(`${deactivating.label} foi desativado e ${formatNumber(impact.total_links)} vínculo(s) foram removidos.`);
          }}
        />
      )}
    </>
  );
}

function AffinityGroupRow({
  group,
  index,
  count,
  canEdit,
  canDeactivate,
  busy,
  dragged,
  onEdit,
  onActivate,
  onDeactivate,
  onMove,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  group: AffinityGroup;
  index: number;
  count: number;
  canEdit: boolean;
  canDeactivate: boolean;
  busy: boolean;
  dragged: boolean;
  onEdit: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const Icon = iconByName[group.icon];
  const accent = accentOptions.find((option) => option.value === group.accent)?.color ?? '#84cc16';
  return (
    <article
      className={`affinity-row ${group.active ? '' : 'inactive'} ${dragged ? 'dragging' : ''}`}
      draggable={canEdit && !busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <div className="affinity-order-actions">
        <GripVertical size={17} aria-hidden="true" />
        {canEdit && (
          <div>
            <button type="button" aria-label={`Mover ${group.label} para cima`} disabled={busy || index === 0} onClick={() => onMove(index, -1)}><ArrowUp size={13} /></button>
            <button type="button" aria-label={`Mover ${group.label} para baixo`} disabled={busy || index === count - 1} onClick={() => onMove(index, 1)}><ArrowDown size={13} /></button>
          </div>
        )}
      </div>
      <span className="affinity-icon" style={{ '--affinity-accent': accent } as React.CSSProperties}><Icon size={20} /></span>
      <div className="affinity-row-main">
        <div><strong>{group.label}</strong><code>{group.key}</code></div>
        <span>{group.aliases.length ? group.aliases.join(' · ') : 'Sem aliases'}</span>
      </div>
      <div className="affinity-impact-compact" aria-label={`${group.total_links} vínculos`}>
        <strong>{formatNumber(group.total_links)}</strong><span>vínculos</span>
      </div>
      <span className={`affinity-status ${group.active ? 'active' : ''}`}>{group.active ? 'Ativo' : 'Inativo'}</span>
      <div className="affinity-row-actions">
        {canEdit && <button className="icon-button" type="button" aria-label={`Editar ${group.label}`} onClick={onEdit}><Pencil size={16} /></button>}
        {canEdit && (group.active ? (
          <button className="button danger compact" type="button" disabled={busy || !canDeactivate} onClick={onDeactivate} title={!canDeactivate ? 'O último grupo ativo não pode ser desativado' : undefined}>Desativar</button>
        ) : (
          <button className="button secondary compact" type="button" disabled={busy} onClick={onActivate}>Ativar</button>
        ))}
      </div>
    </article>
  );
}

function AffinityEditor({ editing, form, aliasesText, saving, onChange, onAliasesChange, onCancel, onSubmit }: {
  editing: AffinityGroup | 'new';
  form: AffinityGroupInput;
  aliasesText: string;
  saving: boolean;
  onChange: (value: AffinityGroupInput) => void;
  onAliasesChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <aside className="affinity-editor">
      <div className="affinity-section-heading">
        <div><h2>{editing === 'new' ? 'Novo grupo' : 'Editar grupo'}</h2><span>{editing === 'new' ? 'O cadastro ficará inativo.' : editing.key}</span></div>
        <button className="icon-button" type="button" aria-label="Fechar editor" onClick={onCancel}><X size={18} /></button>
      </div>
      <form onSubmit={onSubmit}>
        <label className="affinity-field"><span>Nome</span><input required minLength={2} maxLength={60} value={form.label} onChange={(event) => onChange({ ...form, label: event.target.value })} /></label>
        <fieldset className="affinity-choice-field">
          <legend>Ícone</legend>
          <div className="affinity-icon-options">
            {affinityIcons.map((icon) => {
              const Icon = iconByName[icon];
              return <button key={icon} className={form.icon === icon ? 'selected' : ''} type="button" aria-label={iconLabel[icon]} aria-pressed={form.icon === icon} onClick={() => onChange({ ...form, icon })}><Icon size={19} /></button>;
            })}
          </div>
        </fieldset>
        <fieldset className="affinity-choice-field">
          <legend>Cor</legend>
          <div className="affinity-color-options">
            {accentOptions.map((option) => <button key={option.value} className={form.accent === option.value ? 'selected' : ''} type="button" aria-label={option.label} aria-pressed={form.accent === option.value} style={{ '--swatch': option.color } as React.CSSProperties} onClick={() => onChange({ ...form, accent: option.value })}><span /></button>)}
          </div>
        </fieldset>
        <label className="affinity-field"><span>Aliases, separados por vírgula</span><textarea rows={5} value={aliasesText} onChange={(event) => onAliasesChange(event.target.value)} /></label>
        {editing !== 'new' && <p className="affinity-key-note">A chave técnica <code>{editing.key}</code> permanece inalterada.</p>}
        <div className="affinity-editor-actions">
          <button className="button secondary" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
          <button className="button primary" type="submit" disabled={saving || form.label.trim().length < 2}>{saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}{editing === 'new' ? 'Cadastrar' : 'Salvar'}</button>
        </div>
      </form>
    </aside>
  );
}

function DeactivateAffinityDialog({ group, onCancel, onSuccess }: {
  group: AffinityGroup;
  onCancel: () => void;
  onSuccess: (impact: AffinityImpact) => void;
}) {
  const impactQuery = useAffinityGroupImpact(group.key);
  const deactivateMutation = useDeactivateAffinityGroup();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmation.trim() === group.label;
  const impact = impactQuery.data;
  const details = useMemo(() => impact ? [
    ['Pessoas interessadas', impact.interested_users],
    ['Profissionais', impact.professionals],
    ['Publicações', impact.posts],
    ['Comunidades', impact.communities],
    ['Organizações', impact.organizations],
    ['Outros vínculos', impact.places + impact.featured_ambassadors + impact.organization_events + impact.operation_cohorts + impact.user_goals + impact.saved_preferences + impact.offerings],
  ] as const : [], [impact]);

  const submit = () => {
    if (!impact || !confirmed || deactivateMutation.isPending) return;
    setError(null);
    deactivateMutation.mutate({ key: group.key, confirmation: confirmation.trim(), expectedToken: impact.token }, {
      onSuccess: (result) => onSuccess(result.impact),
      onError: (mutationError) => {
        const message = affinityGroupErrorMessage(mutationError);
        setError(message);
        if (isAffinityGroupImpactChanged(mutationError)) {
          setConfirmation('');
          void impactQuery.refetch();
        }
      },
    });
  };

  return <>
    <button className="scrim" type="button" aria-label="Fechar" onClick={() => !deactivateMutation.isPending && onCancel()} />
    <div className="user-dialog affinity-dialog" role="dialog" aria-modal="true" aria-labelledby="affinity-deactivate-title">
      <header className="user-dialog-head">
        <div className="status-icon danger"><AlertTriangle size={22} /></div>
        <div><h2 id="affinity-deactivate-title">Desativar “{group.label}”?</h2><p>O grupo desaparecerá do aplicativo e do desktop. Os registros continuam ativos, mas os vínculos removidos não serão restaurados numa reativação.</p></div>
        <button className="icon-button" type="button" aria-label="Fechar" onClick={onCancel} disabled={deactivateMutation.isPending}><X size={18} /></button>
      </header>
      <section className="user-dialog-body">
        {impactQuery.isLoading ? <div className="skeleton affinity-impact-skeleton" /> : impactQuery.isError ? (
          <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />Não foi possível calcular o impacto. A desativação está bloqueada.</div>
        ) : impact ? <>
          <p className="user-dialog-total"><strong>{formatNumber(impact.total_links)}</strong> vínculo(s) serão removidos permanentemente.</p>
          <ul className="user-footprint-list">{details.map(([label, value]) => <li key={label}><span>{label}</span><strong>{formatNumber(value)}</strong></li>)}</ul>
        </> : null}
        <label className="user-dialog-field"><span>Digite <b>{group.label}</b> para confirmar</span><input autoFocus autoComplete="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} /></label>
        {error && <div className="inline-alert danger" role="alert"><AlertTriangle size={18} />{error}</div>}
      </section>
      <footer className="user-dialog-actions">
        <button className="button secondary" type="button" onClick={onCancel} disabled={deactivateMutation.isPending}>Cancelar</button>
        <button className="button danger" type="button" onClick={submit} disabled={!confirmed || !impact || impactQuery.isError || deactivateMutation.isPending}>{deactivateMutation.isPending ? <RefreshCw className="spin" size={16} /> : <AlertTriangle size={16} />}Desativar e desvincular</button>
      </footer>
    </div>
  </>;
}
