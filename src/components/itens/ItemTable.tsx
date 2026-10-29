
import { useMemo, useState } from 'react'
import type {
  Opcao,
  SetorDemandante,
  OpcoesDotacao,
} from './ItemForm'

export type Item = {
  id: string
  exercicio_id: string
  elemento_despesa_id: string
  setor_demandante_id: number | null
  codigo: string | null
  descricao: string
  valor_estimado: number
  valor_atualizado: number
}

export type Dotacao = {
  id: string
  item_pca_id: string
  funcao_id: string
  subfuncao_id: string
  programa_id: string
  acao_orcamentaria_id: string
  categoria_economica_id: string
  grupo_natureza_id: string
  modalidade_aplicacao_id: string
  elemento_despesa_id: string
  subelemento_id: string
  classificacao_objeto_id: string
  valor_estimado: number
  valor_atualizado: number
}

type Props = {
  itens: Item[]
  setores: SetorDemandante[]
  dotacoes: Record<string, Dotacao[]>
  opcoes: OpcoesDotacao
  carregando: boolean
  erro: string | null
  aoNovoItem: () => void
  permitirNovoItem: boolean
  aoEditar: (item: Item) => void
  aoExcluir: (item: Item) => void
}

function formatarMoeda(valor: number | null | undefined) {
  if (valor == null) return '—'

  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function textoDotacao(
  dotacao: Dotacao,
  opcoes: Record<keyof OpcoesDotacao, Opcao[]>,
) {
  const correspondencias: {
    campo: keyof Dotacao
    grupo: keyof OpcoesDotacao
  }[] = [
    { campo: 'funcao_id', grupo: 'funcoes' },
    { campo: 'subfuncao_id', grupo: 'subfuncoes' },
    { campo: 'programa_id', grupo: 'programas' },
    { campo: 'acao_orcamentaria_id', grupo: 'acoes' },
    { campo: 'categoria_economica_id', grupo: 'categorias' },
    { campo: 'grupo_natureza_id', grupo: 'grupos' },
    { campo: 'modalidade_aplicacao_id', grupo: 'modalidades' },
    { campo: 'elemento_despesa_id', grupo: 'elementos' },
    { campo: 'subelemento_id', grupo: 'subelementos' },
  ]

  return correspondencias
    .map(
      ({ campo, grupo }) =>
        opcoes[grupo].find(
          (opcao) => opcao.id === dotacao[campo],
        )?.codigo ?? '—',
    )
    .join('.')
}

export default function ItemTable({
  itens,
  setores,
  dotacoes,
  opcoes,
  carregando,
  erro,
  aoEditar,
  aoExcluir,
}: Props) {
  const [busca, setBusca] = useState('')

  const termo = busca.toLocaleLowerCase('pt-BR').trim()

  const itensFiltrados = useMemo(() => {
  return itens
    .filter((item) => {
      if (!termo) return true

      const setor = setores.find(
        (s) => s.id === item.setor_demandante_id,
      )

      const codigosDotacoes = (dotacoes[item.id] ?? [])
        .map((dotacao) => textoDotacao(dotacao, opcoes))
        .join(' ')

      return [
        item.codigo ?? '',
        item.descricao,
        setor?.nome ?? '',
        codigosDotacoes,
      ].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      )
    })
    .sort((a, b) => {
      const numeroA = Number(a.codigo)
      const numeroB = Number(b.codigo)

      // Números válidos vêm primeiro, em ordem crescente.
      const aValido = a.codigo?.trim() !== '' && Number.isFinite(numeroA)
      const bValido = b.codigo?.trim() !== '' && Number.isFinite(numeroB)

      if (aValido && bValido) {
        return numeroA - numeroB
      }

      if (aValido) return -1
      if (bValido) return 1

      // Códigos não numéricos ficam em ordem alfabética.
      return (a.codigo ?? '').localeCompare(
        b.codigo ?? '',
        'pt-BR',
        { numeric: true, sensitivity: 'base' },
      )
    })
}, [itens, setores, dotacoes, opcoes, termo])

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por número, objeto, setor ou dotação..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          aria-label="Buscar itens"
        />
      </div>

      {carregando ? (
        <div className="empty-state">
          Carregando itens...
        </div>
      ) : erro ? (
        <div className="empty-state error">
          Não foi possível carregar os itens: {erro}
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="empty-state">
          <strong>
            {busca
              ? 'Nenhum item encontrado'
              : 'Nenhum item cadastrado'}
          </strong>

          {busca && (
            <p>Tente pesquisar usando outro termo.</p>
          )}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="process-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Objeto</th>
                <th>Demandante</th>
                <th>Dotações orçamentárias</th>
                <th>Valor estimado</th>
                <th>Valor atualizado</th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>

            <tbody>
              {itensFiltrados.map((item) => {
                const dotacoesDoItem = dotacoes[item.id] ?? []

                const setorDemandante = setores.find(
                  (setor) =>
                    setor.id === item.setor_demandante_id,
                )

                return (
                  <tr key={item.id}>
                    <td>{item.codigo || '—'}</td>

                    <td>
                      <strong>{item.descricao}</strong>
                    </td>

                    <td>
                      {setorDemandante?.nome || '—'}
                    </td>

                    <td>
                      {dotacoesDoItem.length === 0 ? (
                        '—'
                      ) : (
                        <div className="item-dotacoes">
                          {dotacoesDoItem.map((dotacao) => (
                            <div key={dotacao.id}>
                              {textoDotacao(dotacao, opcoes)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td>
                      {formatarMoeda(item.valor_estimado)}
                    </td>

                    <td>
                      {formatarMoeda(item.valor_atualizado)}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-action-button"
                          onClick={() => aoEditar(item)}
                          title="Editar item"
                          aria-label={`Editar item ${item.codigo || item.descricao}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="icon-action-button delete-icon-button"
                          onClick={() => aoExcluir(item)}
                          title="Excluir item"
                          aria-label={`Excluir item ${item.codigo || item.descricao}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="m19 6-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
