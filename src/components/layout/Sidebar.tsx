
import type { Session } from '@supabase/supabase-js'

type Exercicio = {
  id: string
  ano: number
  status: string
}

type SidebarProps = {
  paginaAtiva: string
  onSelecionarPagina: (pagina: string) => void
  exercicioId: string
  exercicios: Exercicio[]
  carregando: boolean
  onSelecionarExercicio: (id: string) => void
  sessao: Session | null
  nomeUsuario: string
  perfilUsuario: string
  onEntrar: () => void
  onSair: () => void
}

const paginas = [
  { nome: 'Painel' },
  { nome: 'Processos' },
  { nome: 'Itens' },
  { nome: 'Orçamento' },
  { nome: 'Demandantes' },
  { nome: 'Relatórios' },
  { nome: 'Usuários' },
]

export default function Sidebar({
  paginaAtiva,
  onSelecionarPagina,
  exercicioId,
  exercicios,
  carregando,
  onSelecionarExercicio,
  sessao,
  nomeUsuario,
  perfilUsuario,
  onEntrar,
  onSair,
}: SidebarProps) {
  const paginasVisiveis = !sessao
  ? paginas.filter(
      (pagina) =>
        pagina.nome === 'Painel' || pagina.nome === 'Processos',
    )
  : perfilUsuario === 'administrador'
    ? paginas
    : paginas.filter((pagina) => pagina.nome !== 'Usuários')

  const perfilFormatado =
    perfilUsuario === 'administrador'
      ? 'Administrador'
      : perfilUsuario === 'servidor'
        ? 'Servidor'
        : 'Perfil não cadastrado'

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>EasyPCA</strong>
      </div>

      <div className="sidebar-exercise">
        <label htmlFor="exercicio">Exercício</label>

        <select
          id="exercicio"
          value={exercicioId}
          onChange={(event) => onSelecionarExercicio(event.target.value)}
          disabled={carregando || exercicios.length === 0}
        >
          {exercicios.length === 0 && (
            <option value="">Nenhum exercício</option>
          )}

          {exercicios.map((exercicio) => (
            <option key={exercicio.id} value={exercicio.id}>
              {exercicio.ano}
            </option>
          ))}
        </select>
      </div>

      <nav className="navigation">
        {paginasVisiveis.map((pagina) => (
          <button
            key={pagina.nome}
            type="button"
            className={`nav-item ${
              paginaAtiva === pagina.nome ? 'active' : ''
            }`}
            onClick={() => onSelecionarPagina(pagina.nome)}
          >
            <span>{pagina.nome}</span>
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-user"
        onClick={sessao ? onSair : onEntrar}
        title={sessao ? 'Sair da conta' : 'Entrar no sistema'}
      >
        <span className="sidebar-user-info">
          <span className="sidebar-user-name">
            {sessao
              ? nomeUsuario || 'Carregando usuário...'
              : 'Visitante'}
          </span>

          <span className="sidebar-user-role">
            {sessao ? perfilFormatado : 'Acesso público'}
          </span>
        </span>

        <span className="sidebar-user-action" aria-hidden="true">
          {sessao ? 'Sair' : 'Entrar'}
        </span>
      </button>

      <div className="sidebar-footer">
        <div>
          <span>Desenvolvido por</span>
          <span>Gabriel Dubiela</span>
        </div>
      </div>
    </aside>
  )
}
