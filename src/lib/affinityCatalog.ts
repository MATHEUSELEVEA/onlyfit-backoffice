/**
 * Catálogo de ícones e cores que um grupo de afinidade pode assumir.
 *
 * As três pontas precisam concordar com esta lista:
 *  - `control_create_affinity_group` / `control_update_affinity_group` (onlyfit-supabase)
 *    rejeitam qualquer valor fora dela;
 *  - `ICON_BY_NAME` e o `safelist` do Tailwind no `onlyfit-desktop` decidem se o
 *    ícone e o gradiente escolhidos aqui realmente aparecem para o usuário final.
 *
 * Ampliar o catálogo é mudança de código nas três, nunca só aqui.
 */

/** Nome do componente `lucide-react`. Existe em 0.462 (desktop) e 0.474 (backoffice). */
export type AffinityIcon = typeof affinityIconGroups[number]['icons'][number];

/** Classe literal do gradiente Tailwind consumida pelo desktop. */
export type AffinityAccent = typeof affinityAccentOptions[number]['value'];

export const affinityIconGroups = [
  {
    id: 'forca',
    label: 'Treino e força',
    icons: ['Dumbbell', 'Weight', 'Anvil', 'Activity', 'Flame', 'Zap', 'TrendingUp', 'Target'],
  },
  {
    id: 'endurance',
    label: 'Corrida e endurance',
    icons: ['Footprints', 'Bike', 'Waves', 'Mountain', 'MountainSnow', 'Route', 'Timer', 'Wind'],
  },
  {
    id: 'esportes',
    label: 'Esportes e competição',
    icons: ['Swords', 'Trophy', 'Medal', 'Volleyball', 'Goal', 'Shield', 'Crosshair', 'Award'],
  },
  {
    id: 'nutricao',
    label: 'Saúde e nutrição',
    icons: ['Apple', 'Salad', 'Carrot', 'Egg', 'Beef', 'Fish', 'Wheat', 'Milk', 'HeartPulse', 'Pill'],
  },
  {
    id: 'bemestar',
    label: 'Bem-estar e mente',
    icons: ['Sparkles', 'Sun', 'Moon', 'Leaf', 'Flower', 'Brain', 'Smile', 'BedDouble'],
  },
  {
    id: 'comunidade',
    label: 'Comunidade e marca',
    icons: ['Users', 'Star', 'Crown', 'Rocket', 'Gem', 'PersonStanding', 'Heart', 'Compass'],
  },
] as const;

export const affinityIcons: readonly AffinityIcon[] = affinityIconGroups.flatMap((group) => group.icons);

/** Termos de busca em português para cada ícone. O nome lucide é sempre pesquisável. */
export const affinityIconSearchTerms: Record<AffinityIcon, string> = {
  Dumbbell: 'halter musculação academia peso',
  Weight: 'anilha carga peso levantamento',
  Anvil: 'bigorna força bruta strongman',
  Activity: 'atividade pulso batimento movimento',
  Flame: 'chama fogo calorias intensidade',
  Zap: 'raio explosão potência energia',
  TrendingUp: 'progressão evolução gráfico carga',
  Target: 'alvo meta objetivo foco',
  Footprints: 'passos corrida caminhada pegadas',
  Bike: 'bicicleta ciclismo pedal bike',
  Waves: 'ondas natação água swim',
  Mountain: 'montanha trilha trail escalada',
  MountainSnow: 'montanha neve alpinismo esqui',
  Route: 'rota percurso trajeto distância',
  Timer: 'cronômetro tempo pace ritmo',
  Wind: 'vento velocidade aeróbico fôlego',
  Swords: 'espadas lutas luta marcial combate',
  Trophy: 'troféu campeonato vitória prêmio',
  Medal: 'medalha pódio conquista prova',
  Volleyball: 'vôlei bola esporte coletivo',
  Goal: 'gol meta futebol pontuação',
  Shield: 'escudo defesa proteção time',
  Crosshair: 'mira precisão tiro pontaria',
  Award: 'prêmio reconhecimento selo distintivo',
  Apple: 'maçã fruta nutrição dieta alimentação',
  Salad: 'salada comida saudável vegetariano',
  Carrot: 'cenoura vegetal legume horta',
  Egg: 'ovo proteína café da manhã',
  Beef: 'carne proteína churrasco carnívoro',
  Fish: 'peixe ômega pescado frutos do mar',
  Wheat: 'trigo grão carboidrato cereal glúten',
  Milk: 'leite laticínio cálcio whey',
  HeartPulse: 'cardio batimento saúde frequência',
  Pill: 'suplemento cápsula remédio vitamina',
  Sparkles: 'brilho destaque wellness geral',
  Sun: 'sol manhã energia vitamina d',
  Moon: 'lua noite sono descanso',
  Leaf: 'folha natureza vegano plant based',
  Flower: 'flor yoga leveza equilíbrio',
  Brain: 'cérebro mente foco mental',
  Smile: 'sorriso humor felicidade bem-estar',
  BedDouble: 'cama sono recuperação descanso',
  Users: 'pessoas grupo comunidade turma',
  Star: 'estrela favorito destaque premium',
  Crown: 'coroa elite realeza vip',
  Rocket: 'foguete lançamento performance evolução',
  Gem: 'joia gema premium exclusivo',
  PersonStanding: 'pessoa postura mobilidade corpo',
  Heart: 'coração amor cuidado paixão',
  Compass: 'bússola direção exploração aventura',
};

export const affinityAccentOptions = [
  { value: 'from-rose-500/30', label: 'Rosa', color: '#f43f5e' },
  { value: 'from-red-500/30', label: 'Vermelho', color: '#ef4444' },
  { value: 'from-orange-500/30', label: 'Laranja', color: '#f97316' },
  { value: 'from-amber-500/30', label: 'Âmbar', color: '#f59e0b' },
  { value: 'from-yellow-500/30', label: 'Amarelo', color: '#eab308' },
  { value: 'from-lime-500/30', label: 'Lime', color: '#84cc16' },
  { value: 'from-green-500/30', label: 'Verde', color: '#22c55e' },
  { value: 'from-emerald-500/30', label: 'Esmeralda', color: '#10b981' },
  { value: 'from-teal-500/30', label: 'Turquesa', color: '#14b8a6' },
  { value: 'from-cyan-500/30', label: 'Ciano', color: '#06b6d4' },
  { value: 'from-sky-500/30', label: 'Azul-céu', color: '#0ea5e9' },
  { value: 'from-blue-500/30', label: 'Azul', color: '#3b82f6' },
  { value: 'from-indigo-500/30', label: 'Índigo', color: '#6366f1' },
  { value: 'from-violet-500/30', label: 'Violeta', color: '#8b5cf6' },
  { value: 'from-purple-500/30', label: 'Roxo', color: '#a855f7' },
  { value: 'from-fuchsia-500/30', label: 'Fúcsia', color: '#d946ef' },
  { value: 'from-pink-500/30', label: 'Pink', color: '#ec4899' },
  { value: 'from-slate-500/30', label: 'Ardósia', color: '#64748b' },
  { value: 'from-zinc-500/30', label: 'Zinco', color: '#71717a' },
  { value: 'from-stone-500/30', label: 'Pedra', color: '#78716c' },
] as const;

export const affinityAccents: readonly AffinityAccent[] = affinityAccentOptions.map((option) => option.value);

const accentColorByValue = new Map<string, string>(
  affinityAccentOptions.map((option) => [option.value, option.color]),
);

/** Cor sólida equivalente ao accent, para pintar o ícone na lista e no seletor. */
export function affinityAccentColor(accent: string): string {
  return accentColorByValue.get(accent) ?? '#84cc16';
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Filtra o catálogo pelo nome lucide ou pelos termos em português. */
export function matchesAffinityIconQuery(icon: AffinityIcon, query: string): boolean {
  const term = normalize(query.trim());
  if (!term) return true;
  return normalize(`${icon} ${affinityIconSearchTerms[icon]}`).includes(term);
}
