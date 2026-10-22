
type SidebarProps = {
  paginaAtiva: string
  onSelecionarPagina: (pagina: string) => void
}

const paginas = [
  { nome: 'Painel'},
  { nome: 'Processos'},
  { nome: 'Itens'},
  { nome: 'Orçamento'},
  { nome: 'Demandantes'},
  { nome: 'Relatórios'},
]

export default function Sidebar({
  paginaAtiva,
  onSelecionarPagina,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>EasyPCA</strong>
      </div>

      <nav className="navigation">
        {paginas.map((pagina) => (
          <button
            key={pagina.nome}
            className={`nav-item ${
              paginaAtiva === pagina.nome ? 'active' : ''
            }`}
            onClick={() => onSelecionarPagina(pagina.nome)}
          >
            <span>{pagina.nome}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        Desenvolvido por Gabriel Dubiela
      </div>
    </aside>
  )
}
