
type Processo = {
  id: string
  setor_demandante: string | null
  objeto: string
  numero_processo_eletronico: string | null
  numero_processo_compras: string | null
  modalidade_id: string | null
  numero_modalidade: string | null
  data_abertura: string | null
  data_prevista_encerramento: string | null
  data_conclusao: string | null
  quantidade_itens: number | null
  valor_estimado: number | null
  valor_atualizado: number | null
}

type ProcessoTableProps = {
  processos: Processo[]
  busca: string
  carregando: boolean
  erro: string | null
  onBuscaChange: (busca: string) => void
  onEditar: (processo: Processo) => void
  onExcluir: (processo: Processo) => void
}

function formatarData(data: string | null) {
  if (!data) return '—'

  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatarMoeda(valor: number | null | undefined) {
  if (valor == null) return '—'

  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProcessoTable({
  processos,
  busca,
  carregando,
  erro,
  onBuscaChange,
  onEditar,
  onExcluir,
}: ProcessoTableProps) {
  const termo = busca.toLocaleLowerCase('pt-BR').trim()

  const processosFiltrados = processos.filter((processo) => {
    if (!termo) return true

    return [
      processo.objeto,
      processo.setor_demandante ?? '',
      processo.numero_processo_eletronico ?? '',
      processo.numero_processo_compras ?? '',
      processo.numero_modalidade ?? '',
    ].some((valor) => valor.toLocaleLowerCase('pt-BR').includes(termo))
  })

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por objeto, setor ou número..."
          value={busca}
          onChange={(event) => onBuscaChange(event.target.value)}
          aria-label="Buscar processos"
        />
      </div>

      {carregando ? (
        <div className="empty-state">Carregando processos...</div>
      ) : erro ? (
        <div className="empty-state error">
          Não foi possível carregar os processos: {erro}
        </div>
      ) : processosFiltrados.length === 0 ? (
        <div className="empty-state">
          <strong>
            {busca
              ? 'Nenhum processo encontrado'
              : 'Nenhum processo cadastrado'}
          </strong>
          {busca && <p>Tente buscar usando outro termo.</p>}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="process-table">
            <thead>
              <tr>
                <th>Processo de compras</th>
                <th>Processo eletrônico</th>
                <th>Objeto</th>
                <th>Demandante</th>
                <th>Itens</th>
                <th>Modalidade</th>
                <th>Valor estimado</th>
                <th>Valor atualizado</th>
                <th>Autuação</th>
                <th>Previsão de encerramento</th>
                <th>Conclusão</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {processosFiltrados.map((processo) => (
                <tr key={processo.id}>
                  <td>{processo.numero_processo_compras || '—'}</td>
                  <td>{processo.numero_processo_eletronico || '—'}</td>
                  <td>
                    <strong>{processo.objeto}</strong>
                  </td>
                  <td>{processo.setor_demandante || '—'}</td>
                  <td>{processo.quantidade_itens ?? 0}</td>
                  <td>{processo.numero_modalidade || '—'}</td>
                  <td>{formatarMoeda(processo.valor_estimado)}</td>
                  <td>{formatarMoeda(processo.valor_atualizado)}</td>
                  <td>{formatarData(processo.data_abertura)}</td>
                  <td>
                    {formatarData(processo.data_prevista_encerramento)}
                  </td>
                  <td>{formatarData(processo.data_conclusao)}</td>
                  
<td>
  <div className="table-actions">
    <button
      type="button"
      className="icon-action-button"
      onClick={() => onEditar(processo)}
      aria-label={`Editar processo ${processo.numero_processo_compras || processo.objeto}`}
      title="Editar processo"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    </button>

    <button
      type="button"
      className="icon-action-button delete-icon-button"
      onClick={() => onExcluir(processo)}
      aria-label={`Excluir processo ${processo.numero_processo_compras || processo.objeto}`}
      title="Excluir processo"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </svg>
    </button>
  </div>
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
