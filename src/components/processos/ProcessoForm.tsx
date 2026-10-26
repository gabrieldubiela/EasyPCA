
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type ProcessoFormProps = {
  exercicioId: string
  onCancel: () => void
  onSaved: () => void
}

type Setor = {
  id: number
  nome: string
}

type Modalidade = {
  id: string
  modalidade: string
  fundamento_legal: string
  descricao: string
  tipo: string
}

type LimiteLicitacao = {
  id: string
  modalidade: string
  fundamento_legal: string
  descricao: string
  tipo: string
  valor: number | string
}

type ItemPCA = {
  id: string
  codigo: string | null
  descricao: string
  elemento_despesa_id: string
}

type DotacaoItem = {
  item_pca_id: string
  elemento_despesa_id: string
  subelemento_id: string
  classificacao_objeto_id: string | null
  valor_estimado: number | string
  valor_atualizado: number | string
}

type TotalSubelemento = {
  exercicio_id: string
  elemento_despesa_id: string
  subelemento_id: string
  valor_estimado_total: number | string
  valor_atualizado_total: number | string
}

type ElementoDespesa = {
  id: string
  codigo: string
  descricao: string
}

type SubelementoDespesa = {
  id: string
  codigo: string
  descricao: string
  elemento_id: string
}

type ClassificacaoObjeto = {
  id: string
  codigo: string
  descricao: string
}

type ItemCalculado = ItemPCA & {
  valor_estimado: number
  valor_atualizado: number
  dotacao: string
  classificacao_objeto_id: string | null
  classificacao_objeto: string
  codigos_classificacao: string[]
  subelementos_ids: string[]
}

type SugestaoModalidade = {
  titulo: string
  limite?: LimiteLicitacao
}

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const normalizar = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()

function compararCodigoNumerico(a: ItemPCA, b: ItemPCA) {
  const codigoA = a.codigo?.trim() ?? ''
  const codigoB = b.codigo?.trim() ?? ''

  const numeroA = /^\d+$/.test(codigoA) ? Number(codigoA) : null
  const numeroB = /^\d+$/.test(codigoB) ? Number(codigoB) : null

  if (numeroA !== null && numeroB !== null) {
    return numeroA - numeroB || a.descricao.localeCompare(b.descricao, 'pt-BR')
  }

  if (numeroA !== null) return -1
  if (numeroB !== null) return 1

  if (!codigoA && codigoB) return 1
  if (codigoA && !codigoB) return -1

  return (
    codigoA.localeCompare(codigoB, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }) || a.descricao.localeCompare(b.descricao, 'pt-BR')
  )
}

export default function ProcessoForm({
  exercicioId,
  onCancel,
  onSaved,
}: ProcessoFormProps) {
  const [setores, setSetores] = useState<Setor[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [limites, setLimites] = useState<LimiteLicitacao[]>([])
  const [itens, setItens] = useState<ItemCalculado[]>([])
  const [totaisSubelementos, setTotaisSubelementos] = useState<
    TotalSubelemento[]
  >([])
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([])

  const [setorDemandante, setSetorDemandante] = useState('')
  const [objeto, setObjeto] = useState('')
  const [numeroEletronico, setNumeroEletronico] = useState('')
  const [numeroCompras, setNumeroCompras] = useState('')
  const [modalidadeId, setModalidadeId] = useState('')
  const [numeroModalidade, setNumeroModalidade] = useState('')
  const [dataAbertura, setDataAbertura] = useState('')
  const [dataEncerramento, setDataEncerramento] = useState('')
  const [dataConclusao, setDataConclusao] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregarDados() {
      setCarregando(true)
      setErro(null)

      try {
        const [
          setoresResult,
          modalidadesResult,
          limitesResult,
          itensResult,
          dotacoesResult,
          totaisSubelementosResult,
          elementosResult,
          subelementosResult,
          classificacoesResult,
        ] = await Promise.all([
          supabase
            .from('setor_demandante')
            .select('id, nome')
            .order('nome'),

          supabase
            .from('limites_licitacao')
            .select('id, modalidade, fundamento_legal, descricao, tipo')
            .eq('exercicio_id', exercicioId)
            .order('modalidade'),

          supabase
            .from('limites_licitacao')
            .select(
              'id, modalidade, fundamento_legal, descricao, tipo, valor',
            )
            .eq('exercicio_id', exercicioId)
            .eq('tipo', 'limite'),

          supabase
            .from('itens_pca')
            .select('id, codigo, descricao, elemento_despesa_id')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('itens_pca_dotacoes')
            .select(
              'item_pca_id, elemento_despesa_id, subelemento_id, classificacao_objeto_id, valor_estimado, valor_atualizado',
            )
            .eq('exercicio_id', exercicioId),

          supabase
            .from('v_totais_subelementos_despesa')
            .select(
              'exercicio_id, elemento_despesa_id, subelemento_id, valor_estimado_total, valor_atualizado_total',
            )
            .eq('exercicio_id', exercicioId),

          supabase
            .from('elementos_despesa')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('subelementos_despesa')
            .select('id, codigo, descricao, elemento_id')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('classificacoes_objeto')
            .select('id, codigo, descricao')
            .order('codigo'),
        ])

        if (setoresResult.error) throw setoresResult.error
        if (modalidadesResult.error) throw modalidadesResult.error
        if (limitesResult.error) throw limitesResult.error
        if (itensResult.error) throw itensResult.error
        if (dotacoesResult.error) throw dotacoesResult.error
        if (totaisSubelementosResult.error) {
          throw totaisSubelementosResult.error
        }
        if (elementosResult.error) throw elementosResult.error
        if (subelementosResult.error) throw subelementosResult.error
        if (classificacoesResult.error) throw classificacoesResult.error

        if (!ativo) return

        const setoresCarregados = (setoresResult.data ?? []) as Setor[]
        const modalidadesCarregadas =
          (modalidadesResult.data ?? []) as Modalidade[]
        const limitesCarregados =
          (limitesResult.data ?? []) as LimiteLicitacao[]
        const itensCarregados = (itensResult.data ?? []) as ItemPCA[]
        const dotacoesCarregadas =
          (dotacoesResult.data ?? []) as DotacaoItem[]
        const totaisSubelementosCarregados =
          (totaisSubelementosResult.data ?? []) as TotalSubelemento[]
        const elementosCarregados =
          (elementosResult.data ?? []) as ElementoDespesa[]
        const subelementosCarregados =
          (subelementosResult.data ?? []) as SubelementoDespesa[]
        const classificacoesCarregadas =
          (classificacoesResult.data ?? []) as ClassificacaoObjeto[]

        const elementosPorId = new Map(
          elementosCarregados.map((elemento) => [elemento.id, elemento]),
        )

        const subelementosPorId = new Map(
          subelementosCarregados.map((subelemento) => [
            subelemento.id,
            subelemento,
          ]),
        )

        const classificacoesPorId = new Map(
          classificacoesCarregadas.map((classificacao) => [
            classificacao.id,
            classificacao,
          ]),
        )

        const dotacoesPorItem = new Map<string, DotacaoItem[]>()

        for (const dotacao of dotacoesCarregadas) {
          const atuais = dotacoesPorItem.get(dotacao.item_pca_id) ?? []
          atuais.push(dotacao)
          dotacoesPorItem.set(dotacao.item_pca_id, atuais)
        }

        const itensCalculados: ItemCalculado[] = itensCarregados.map(
          (item) => {
            const dotacoesItem = dotacoesPorItem.get(item.id) ?? []
            const elemento = elementosPorId.get(item.elemento_despesa_id)

            const codigosSubelementos = [
              ...new Set(
                dotacoesItem
                  .map(
                    (registro) =>
                      subelementosPorId.get(registro.subelemento_id)?.codigo,
                  )
                  .filter((codigo): codigo is string => Boolean(codigo)),
              ),
            ]

            const dotacao = [
              elemento?.codigo,
              codigosSubelementos.length
                ? `Subelemento(s): ${codigosSubelementos.join(', ')}`
                : null,
            ]
              .filter(Boolean)
              .join(' — ')

            const classificacaoIds = [
              ...new Set(
                dotacoesItem
                  .map((registro) => registro.classificacao_objeto_id)
                  .filter((id): id is string => Boolean(id)),
              ),
            ]

            const classificacoesItem = classificacaoIds
              .map((id) => classificacoesPorId.get(id))
              .filter(
                (classificacao): classificacao is ClassificacaoObjeto =>
                  Boolean(classificacao),
              )

            const classificacaoObjeto =
              classificacoesItem.length === 0
                ? 'Não classificado'
                : classificacoesItem.length === 1
                  ? classificacoesItem[0].descricao
                  : 'Mais de uma classificação'

            return {
              ...item,
              valor_estimado: dotacoesItem.reduce(
                (total, registro) =>
                  total + Number(registro.valor_estimado || 0),
                0,
              ),
              valor_atualizado: dotacoesItem.reduce(
                (total, registro) =>
                  total + Number(registro.valor_atualizado || 0),
                0,
              ),
              dotacao: dotacao || 'Classificação orçamentária não disponível',
              classificacao_objeto_id:
                classificacoesItem.length === 1
                  ? classificacoesItem[0].id
                  : null,
              classificacao_objeto: classificacaoObjeto,
              codigos_classificacao: classificacoesItem.map(
                (classificacao) => normalizar(classificacao.codigo),
              ),
              subelementos_ids: [
                ...new Set(
                  dotacoesItem
                    .map((registro) => registro.subelemento_id)
                    .filter(Boolean),
                ),
              ],
            }
          },
        )

        setSetores(setoresCarregados)
        setModalidades(modalidadesCarregadas)
        setLimites(limitesCarregados)
        setItens(itensCalculados)
        setTotaisSubelementos(totaisSubelementosCarregados)
      } catch (error) {
        if (!ativo) return

        setErro(
          `Não foi possível carregar os dados do formulário: ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }`,
        )
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    if (exercicioId) {
      void carregarDados()
    } else {
      setCarregando(false)
      setErro('Nenhum exercício orçamentário foi selecionado.')
    }

    return () => {
      ativo = false
    }
  }, [exercicioId])

  const itensOrdenados = useMemo(
    () => [...itens].sort(compararCodigoNumerico),
    [itens],
  )

  const itensSelecionadosDetalhes = useMemo(
    () => itens.filter((item) => itensSelecionados.includes(item.id)),
    [itens, itensSelecionados],
  )

  const valorEstimadoTotal = itensSelecionadosDetalhes.reduce(
    (total, item) => total + item.valor_estimado,
    0,
  )

  const valorAtualizadoTotal = itensSelecionadosDetalhes.reduce(
    (total, item) => total + item.valor_atualizado,
    0,
  )

  const valorConsolidadoSubelementos = useMemo(() => {
    const chavesSelecionadas = new Set<string>()

    for (const item of itensSelecionadosDetalhes) {
      for (const subelementoId of item.subelementos_ids) {
        chavesSelecionadas.add(
          `${item.elemento_despesa_id}:${subelementoId}`,
        )
      }
    }

    return totaisSubelementos.reduce((total, registro) => {
      const chave = `${registro.elemento_despesa_id}:${registro.subelemento_id}`

      if (!chavesSelecionadas.has(chave)) return total

      return total + Number(registro.valor_estimado_total || 0)
    }, 0)
  }, [itensSelecionadosDetalhes, totaisSubelementos])

  const dotacoesSelecionadas = [
    ...new Set(
      itensSelecionadosDetalhes
        .map((item) => item.dotacao)
        .filter(
          (dotacao) =>
            dotacao !== 'Classificação orçamentária não disponível',
        ),
    ),
  ]

  const classificacoesSelecionadas = [
    ...new Set(
      itensSelecionadosDetalhes.map((item) => item.classificacao_objeto),
    ),
  ]

  const sugestaoModalidade = useMemo<SugestaoModalidade | null>(() => {
    if (itensSelecionadosDetalhes.length === 0) return null

    if (
      itensSelecionadosDetalhes.some(
        (item) => item.codigos_classificacao.length !== 1,
      )
    ) {
      return { titulo: 'Análise manual necessária' }
    }

    const codigos = [
      ...new Set(
        itensSelecionadosDetalhes.flatMap(
          (item) => item.codigos_classificacao,
        ),
      ),
    ]

    if (codigos.length !== 1) {
      return { titulo: 'Análise manual necessária' }
    }

    const codigo = codigos[0]

    const limitePorFundamento = (fundamento: string) =>
      limites.find(
        (limite) =>
          normalizar(limite.fundamento_legal).includes(
            normalizar(fundamento),
          ) && Number(limite.valor) > 0,
      )

    const modalidadePorNome = (nome: string) =>
      modalidades.find((modalidade) =>
        normalizar(modalidade.modalidade).includes(normalizar(nome)),
      )

    const sugerirPorLimite = (
      fundamento: string,
      nomeModalidade: string,
    ): SugestaoModalidade => {
      const limite = limitePorFundamento(fundamento)

      if (!limite) {
        return { titulo: 'Análise manual necessária' }
      }

      return {
        titulo:
          valorConsolidadoSubelementos < Number(limite.valor)
            ? 'Dispensa por valor'
            : nomeModalidade,
        limite,
      }
    }

    if (codigo === 'INVIABILIDADE_COMPETICAO') {
      const inexigibilidade = modalidadePorNome('Inexigibilidade')

      return {
        titulo: inexigibilidade
          ? inexigibilidade.modalidade
          : 'Inexigibilidade de licitação',
      }
    }

    if (codigo === 'ENGENHARIA') {
      return sugerirPorLimite('I', 'Concorrência')
    }

    if (codigo === 'MANUTENCAO_VEICULO') {
      return sugerirPorLimite('I', 'Pregão')
    }

    if (codigo === 'COMUM') {
      return sugerirPorLimite('II', 'Pregão')
    }

    if (codigo === 'ESPECIAL') {
      return { titulo: 'Concorrência' }
    }

    return { titulo: 'Análise manual necessária' }
  }, [
    itensSelecionadosDetalhes,
    limites,
    modalidades,
    valorConsolidadoSubelementos,
  ])

  // Seleciona automaticamente a modalidade correspondente à sugestão.
  // O usuário continua podendo alterá-la manualmente depois.
  useEffect(() => {
    if (!sugestaoModalidade) return

    const titulo = normalizar(sugestaoModalidade.titulo)

    if (titulo === 'ANALISE MANUAL NECESSARIA') return

    let modalidadeCorrespondente = modalidades.find(
      (modalidade) => normalizar(modalidade.modalidade) === titulo,
    )

    if (!modalidadeCorrespondente && titulo === 'DISPENSA POR VALOR') {
      const fundamentoLimite = sugestaoModalidade.limite?.fundamento_legal

      modalidadeCorrespondente = modalidades.find((modalidade) => {
        const nomeCompativel = normalizar(modalidade.modalidade).includes(
          'DISPENSA',
        )

        if (!nomeCompativel) return false
        if (!fundamentoLimite) return true

        return normalizar(modalidade.fundamento_legal).includes(
          normalizar(fundamentoLimite),
        )
      })

      // Se a modalidade de dispensa não estiver vinculada ao mesmo
      // fundamento legal na tabela, procura uma opção de dispensa cadastrada.
      if (!modalidadeCorrespondente) {
        modalidadeCorrespondente = modalidades.find((modalidade) =>
          normalizar(modalidade.modalidade).includes('DISPENSA'),
        )
      }
    }

    if (modalidadeCorrespondente) {
      setModalidadeId(modalidadeCorrespondente.id)
    }
  }, [sugestaoModalidade, modalidades])

  function alternarItem(itemId: string) {
    setItensSelecionados((atuais) =>
      atuais.includes(itemId)
        ? atuais.filter((id) => id !== itemId)
        : [...atuais, itemId],
    )
  }

  async function salvarProcesso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSalvando(true)
    setErro(null)

    if (!setorDemandante || !modalidadeId) {
      setErro('Selecione o setor demandante e a modalidade de contratação.')
      setSalvando(false)
      return
    }

    if (itensSelecionados.length === 0) {
      setErro('Selecione pelo menos um item do PCA para vincular ao processo.')
      setSalvando(false)
      return
    }

    if (
      dataAbertura &&
      dataEncerramento &&
      dataEncerramento < dataAbertura
    ) {
      setErro('A previsão de encerramento não pode ser anterior à autuação.')
      setSalvando(false)
      return
    }

    if (dataConclusao && dataAbertura && dataConclusao < dataAbertura) {
      setErro('A data de conclusão não pode ser anterior à autuação.')
      setSalvando(false)
      return
    }

    try {
      const { data: processo, error: erroProcesso } = await supabase
        .from('processos_pca')
        .insert({
          exercicio_id: exercicioId,
          setor_demandante_id: Number(setorDemandante),
          objeto: objeto.trim(),
          numero_processo_eletronico: numeroEletronico.trim() || null,
          numero_processo_compras: numeroCompras.trim() || null,
          modalidade_id: modalidadeId,
          numero_modalidade: numeroModalidade.trim() || null,
          data_abertura: dataAbertura || null,
          data_prevista_encerramento: dataEncerramento || null,
          data_conclusao: dataConclusao || null,
        })
        .select('id')
        .single()

      if (erroProcesso) throw erroProcesso

      const vinculos = itensSelecionados.map((itemId) => ({
        exercicio_id: exercicioId,
        processo_id: processo.id,
        item_pca_id: itemId,
      }))

      const { error: erroVinculos } = await supabase
        .from('processos_pca_itens')
        .insert(vinculos)

      if (erroVinculos) {
        const { error: erroExclusao } = await supabase
          .from('processos_pca')
          .delete()
          .eq('id', processo.id)
          .eq('exercicio_id', exercicioId)

        if (erroExclusao) {
          throw new Error(
            `O processo foi criado, mas não foi possível vincular os itens. ` +
              `Também não foi possível desfazer a criação. Processo: ${processo.id}. ` +
              `Erro dos vínculos: ${erroVinculos.message}. ` +
              `Erro ao desfazer: ${erroExclusao.message}`,
          )
        }

        throw new Error(
          `Os itens não foram vinculados e o processo foi removido. ` +
            `Detalhes: ${erroVinculos.message}`,
        )
      }

      onSaved()
    } catch (error) {
      setErro(
        error instanceof Error
          ? `Não foi possível salvar o processo: ${error.message}`
          : 'Ocorreu um erro inesperado ao salvar o processo.',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="form-panel">
      <form onSubmit={salvarProcesso} className="process-form">
        {/* Identificação do processo e objeto */}
        <section className="form-section">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="numeroCompras">Processo de compras</label>
              <input
                id="numeroCompras"
                value={numeroCompras}
                onChange={(event) => setNumeroCompras(event.target.value)}
                maxLength={100}
                placeholder="Número do processo de compras"
              />
            </div>

            <div className="form-field">
              <label htmlFor="numeroEletronico">Processo eletrônico</label>
              <input
                id="numeroEletronico"
                value={numeroEletronico}
                onChange={(event) => setNumeroEletronico(event.target.value)}
                maxLength={100}
                placeholder="Número do processo eletrônico"
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="objeto">
                Objeto da contratação <span className="required-mark">*</span>
              </label>
              <textarea
                id="objeto"
                value={objeto}
                onChange={(event) => setObjeto(event.target.value)}
                required
                rows={3}
                placeholder="Descreva o objeto da contratação"
              />
            </div>
          </div>
        </section>

        {/* Itens logo abaixo do objeto */}
        <section className="form-section">
          <div className="form-section-heading">
            <h3>Itens do PCA</h3>
            <p>
              Selecione os itens que farão parte deste processo. A lista está
              ordenada pelo código numérico.
            </p>
          </div>

          {carregando ? (
            <p>Carregando itens...</p>
          ) : itensOrdenados.length === 0 ? (
            <p>
              Não há itens cadastrados para este exercício. Cadastre os itens
              do PCA antes de criar o processo.
            </p>
          ) : (
            <div
              className="itens-pca-selecao"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
              }}
            >
              {itensOrdenados.map((item) => {
                const selecionado = itensSelecionados.includes(item.id)

                return (
                  <label
                    key={item.id}
                    className="item-pca-opcao"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto minmax(0, 1fr)',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => alternarItem(item.id)}
                      aria-label={`Selecionar item ${item.codigo ?? item.descricao}`}
                    />

                    <span
                      className="item-pca-detalhes"
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(240px, 2fr) minmax(180px, 1.2fr) minmax(170px, 1.2fr) minmax(230px, 1.2fr)',
                        alignItems: 'center',
                        gap: '8px 18px',
                        minWidth: 0,
                      }}
                    >
                      <strong style={{ overflowWrap: 'anywhere' }}>
                        {item.codigo ? `${item.codigo} — ` : ''}
                        {item.descricao}
                      </strong>

                      <span style={{ overflowWrap: 'anywhere' }}>
                        <strong>Dotação:</strong> {item.dotacao}
                      </span>

                      <span style={{ overflowWrap: 'anywhere' }}>
                        <strong>Classificação:</strong>{' '}
                        {item.classificacao_objeto}
                      </span>

                      <span>
                        <strong>Estimado:</strong>{' '}
                        {moeda(item.valor_estimado)}
                        <br />
                        <strong>Atualizado:</strong>{' '}
                        {moeda(item.valor_atualizado)}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="valorEstimadoTotal">Valor estimado total</label>
              <input
                id="valorEstimadoTotal"
                value={moeda(valorEstimadoTotal)}
                readOnly
                aria-label="Valor estimado total dos itens selecionados"
              />
            </div>

            <div className="form-field">
              <label htmlFor="valorAtualizadoTotal">Valor atualizado total</label>
              <input
                id="valorAtualizadoTotal"
                value={moeda(valorAtualizadoTotal)}
                readOnly
                aria-label="Valor atualizado total dos itens selecionados"
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="dotacoesSelecionadas">
                Classificação orçamentária dos itens
              </label>
              <textarea
                id="dotacoesSelecionadas"
                value={
                  dotacoesSelecionadas.length
                    ? dotacoesSelecionadas.join('\n')
                    : 'Selecione itens para visualizar a classificação disponível.'
                }
                readOnly
                rows={Math.min(Math.max(dotacoesSelecionadas.length, 2), 6)}
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="classificacoesSelecionadas">
                Classificação dos objetos selecionados
              </label>
              <textarea
                id="classificacoesSelecionadas"
                value={
                  classificacoesSelecionadas.length
                    ? classificacoesSelecionadas.join('\n')
                    : 'Selecione itens para visualizar a classificação dos objetos.'
                }
                readOnly
                rows={Math.min(
                  Math.max(classificacoesSelecionadas.length, 2),
                  6,
                )}
              />
            </div>
          </div>
        </section>

        {/* Demais dados do processo */}
        <section className="form-section">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="setorDemandante">
                Setor demandante <span className="required-mark">*</span>
              </label>
              <select
                id="setorDemandante"
                value={setorDemandante}
                onChange={(event) => setSetorDemandante(event.target.value)}
                required
                disabled={carregando}
              >
                <option value="">Selecione o setor</option>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="modalidade">
                Modalidade de contratação{' '}
                <span className="required-mark">*</span>
              </label>

              <select
                id="modalidade"
                value={modalidadeId}
                onChange={(event) => setModalidadeId(event.target.value)}
                required
                disabled={carregando}
              >
                <option value="">Selecione a modalidade</option>
                {modalidades.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.modalidade} {item.fundamento_legal} - {item.descricao}
                  </option>
                ))}
              </select>

              {sugestaoModalidade && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <span>
                    <strong>Modalidade sugerida:</strong>{' '}
                    {sugestaoModalidade.titulo}
                  </span>

                  {normalizar(sugestaoModalidade.titulo) !==
                    'ANALISE MANUAL NECESSARIA' &&
                    modalidades.some(
                      (item) => item.id === modalidadeId,
                    ) &&
                    normalizar(
                      modalidades.find((item) => item.id === modalidadeId)
                        ?.modalidade ?? '',
                    ) === normalizar(sugestaoModalidade.titulo) && (
                      <span style={{ fontSize: '0.875em' }}>
                        Sugestão selecionada
                      </span>
                    )}
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="numeroModalidade">Número da modalidade</label>
              <input
                id="numeroModalidade"
                value={numeroModalidade}
                onChange={(event) => setNumeroModalidade(event.target.value)}
                maxLength={100}
                placeholder="Ex.: Pregão nº 12/2027"
              />
            </div>

            <div className="form-field">
              <label htmlFor="dataAbertura">Data de autuação</label>
              <input
                id="dataAbertura"
                type="date"
                value={dataAbertura}
                onChange={(event) => {
                  const novaData = event.target.value
                  setDataAbertura(novaData)

                  if (dataEncerramento && novaData > dataEncerramento) {
                    setDataEncerramento('')
                  }

                  if (dataConclusao && novaData > dataConclusao) {
                    setDataConclusao('')
                  }
                }}
              />
            </div>

            <div className="form-field">
              <label htmlFor="dataEncerramento">
                Previsão de encerramento
              </label>
              <input
                id="dataEncerramento"
                type="date"
                min={dataAbertura || undefined}
                value={dataEncerramento}
                onChange={(event) => setDataEncerramento(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="dataConclusao">Data de conclusão</label>
              <input
                id="dataConclusao"
                type="date"
                min={dataAbertura || undefined}
                value={dataConclusao}
                onChange={(event) => setDataConclusao(event.target.value)}
              />
            </div>
          </div>
        </section>

        {erro && (
          <div className="message-card error" role="alert">
            {erro}
          </div>
        )}

        <div className="form-footer">
          <p className="form-required-note">
            <span className="required-mark">*</span> Campos obrigatórios
          </p>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={
                salvando ||
                carregando ||
                !exercicioId ||
                itens.length === 0
              }
            >
              {salvando ? 'Salvando...' : 'Salvar processo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
