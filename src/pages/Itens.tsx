
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Item = {
  id: string
  exercicio_id: string
  elemento_despesa_id: string
  codigo: string | null
  descricao: string
  valor_estimado: number
  valor_atualizado: number
}

type ElementoDespesa = {
  id: string
  codigo: string
  descricao: string
}

type ItensProps = {
  exercicioId: string
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function Itens({ exercicioId }: ItensProps) {
  const [itens, setItens] = useState<Item[]>([])
  const [elementos, setElementos] = useState<ElementoDespesa[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [elementoId, setElementoId] = useState('')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  async function carregarDados() {
    if (!exercicioId) {
      setItens([])
      setElementos([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro(null)

    const [itensResult, elementosResult] = await Promise.all([
      supabase
        .from('v_itens_pca_totais')
        .select('*')
        .eq('exercicio_id', exercicioId)
        .order('descricao'),

      supabase
        .from('elementos_despesa')
        .select('id, codigo, descricao')
        .eq('exercicio_id', exercicioId)
        .eq('ativo', true)
        .order('codigo'),
    ])

    if (itensResult.error) {
      setErro(itensResult.error.message)
      setItens([])
    } else {
      setItens((itensResult.data ?? []) as Item[])
    }

    if (elementosResult.error) {
      setErro((atual) =>
        atual
          ? `${atual} | ${elementosResult.error.message}`
          : elementosResult.error.message,
      )
      setElementos([])
    } else {
      setElementos(elementosResult.data ?? [])
    }

    setCarregando(false)
  }

  useEffect(() => {
    void carregarDados()
  }, [exercicioId])

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    if (!termo) return itens

    return itens.filter((item) => {
      const elemento = elementos.find(
        (e) => e.id === item.elemento_despesa_id,
      )

      return [
        item.codigo ?? '',
        item.descricao,
        elemento?.codigo ?? '',
        elemento?.descricao ?? '',
      ].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      )
    })
  }, [itens, elementos, busca])

  const totalEstimado = itens.reduce(
    (total, item) => total + Number(item.valor_estimado || 0),
    0,
  )

  const totalAtualizado = itens.reduce(
    (total, item) => total + Number(item.valor_atualizado || 0),
    0,
  )

  function limparFormulario() {
    setCodigo('')
    setDescricao('')
    setElementoId('')
    setMensagemErro(null)
  }

  async function salvarItem(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensagemErro(null)

    if (!exercicioId) {
      setMensagemErro('Selecione um exercício orçamentário.')
      return
    }

    setSalvando(true)

    const { error: erroCadastro } = await supabase
      .from('itens_pca')
      .insert({
        exercicio_id: exercicioId,
        elemento_despesa_id: elementoId,
        codigo: codigo.trim() || null,
        descricao: descricao.trim(),
      })

    if (erroCadastro) {
      setMensagemErro(erroCadastro.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setFormularioAberto(false)
    limparFormulario()
    await carregarDados()
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Itens</h1>
        </div>

        {!formularioAberto && (
          <button
            className="primary-button"
            onClick={() => setFormularioAberto(true)}
            disabled={!exercicioId}
          >
            <span aria-hidden="true">＋</span> Novo item
          </button>
        )}
      </div>

      {formularioAberto ? (
        <div className="form-card">
          <div className="form-heading">
            <h2>Novo item do PCA</h2>
          </div>

          <form onSubmit={salvarItem}>
            <div className="form-grid">
              <label className="form-field">
                <span>Código</span>
                <input
                  value={codigo}
                  onChange={(evento) => setCodigo(evento.target.value)}
                  placeholder="Opcional"
                  maxLength={50}
                />
              </label>

              <label className="form-field">
                <span>Elemento de despesa</span>
                <select
                  value={elementoId}
                  onChange={(evento) => setElementoId(evento.target.value)}
                  required
                >
                  <option value="">Selecione um elemento</option>
                  {elementos.map((elemento) => (
                    <option key={elemento.id} value={elemento.id}>
                      {elemento.codigo} — {elemento.descricao}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field form-field-full">
                <span>Descrição do item</span>
                <input
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  placeholder="Informe a descrição do item"
                  required
                  maxLength={500}
                />
              </label>
            </div>

            {elementos.length === 0 && (
              <p className="form-hint">
                Não há elementos de despesa ativos cadastrados neste exercício.
              </p>
            )}

            {mensagemErro && (
              <p className="form-error" role="alert">
                {mensagemErro}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setFormularioAberto(false)
                  limparFormulario()
                }}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={salvando || elementos.length === 0}
              >
                {salvando ? 'Salvando...' : 'Salvar item'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="process-summary">
            <div className="summary-card">
              <span>Total de itens</span>
              <strong>{itens.length}</strong>
            </div>

            <div className="summary-card">
              <span>Valor estimado</span>
              <strong>{formatarMoeda(totalEstimado)}</strong>
            </div>

            <div className="summary-card">
              <span>Valor atualizado</span>
              <strong>{formatarMoeda(totalAtualizado)}</strong>
            </div>
          </div>

          <div className="table-card">
            <div className="table-toolbar">
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Pesquisar itens..."
                aria-label="Pesquisar itens"
              />
            </div>

            {carregando ? (
              <div className="table-state">Carregando itens...</div>
            ) : erro ? (
              <div className="table-state error-state">
                Erro ao carregar itens: {erro}
              </div>
            ) : itensFiltrados.length === 0 ? (
              <div className="table-state">
                {busca
                  ? 'Nenhum item encontrado para essa pesquisa.'
                  : 'Nenhum item cadastrado neste exercício.'}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Elemento de despesa</th>
                      <th>Valor estimado</th>
                      <th>Valor atualizado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {itensFiltrados.map((item) => {
                      const elemento = elementos.find(
                        (e) => e.id === item.elemento_despesa_id,
                      )

                      return (
                        <tr key={item.id}>
                          <td>{item.codigo || '—'}</td>
                          <td>{item.descricao}</td>
                          <td>
                            {elemento
                              ? `${elemento.codigo} — ${elemento.descricao}`
                              : '—'}
                          </td>
                          <td>
                            {formatarMoeda(Number(item.valor_estimado || 0))}
                          </td>
                          <td>
                            {formatarMoeda(Number(item.valor_atualizado || 0))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
