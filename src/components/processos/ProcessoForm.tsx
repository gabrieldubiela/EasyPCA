
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { montarCodigoOrcamentario } from '../../utils/classificacaoOrcamentaria'
import { supabase } from '../../lib/supabase'

type ProcessoFormProps = {
  exercicioId: string
  processoId?: string
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
  funcao_id: string
  subfuncao_id: string
  programa_id: string
  acao_orcamentaria_id: string
  categoria_economica_id: string
  grupo_natureza_id: string
  modalidade_aplicacao_id: string
  elemento_despesa_id: string
  subelemento_id: string
  classificacao_objeto_id: string | null
  valor_estimado: number | string
  valor_atualizado: number | string
}

type OpcaoOrcamentaria = {
  id: string
  codigo: string
  descricao: string
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
  processoId,
  onCancel,
  onSaved,
}: ProcessoFormProps) {
  const [setores, setSetores] = useState<Setor[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [limites, setLimites] = useState<LimiteLicitacao[]>([])
  const [itens, setItens] = useState<ItemCalculado[]>([])
  const [itensVinculados, setItensVinculados] = useState<string[]>([])
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
          funcoesResult,
          subfuncoesResult,
          programasResult,
          acoesResult,
          categoriasResult,
          gruposResult,
          modalidadesAplicacaoResult,
          vinculosResult,
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
            .select('id, modalidade, fundamento_legal, descricao, tipo, valor')
            .eq('exercicio_id', exercicioId)
            .eq('tipo', 'limite'),

          supabase
            .from('itens_pca')
            .select('id, codigo, descricao, elemento_despesa_id')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('itens_pca_dotacoes')
            .select(
              'item_pca_id, funcao_id, subfuncao_id, programa_id, acao_orcamentaria_id, categoria_economica_id, grupo_natureza_id, modalidade_aplicacao_id, elemento_despesa_id, subelemento_id, classificacao_objeto_id, valor_estimado, valor_atualizado',
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

          supabase
            .from('funcoes_governo')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('subfuncoes_governo')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('programas')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('acoes_orcamentarias')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('categorias_economicas')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('grupos_natureza_despesa')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('modalidades_aplicacao')
            .select('id, codigo, descricao')
            .eq('exercicio_id', exercicioId),

          supabase
            .from('processos_pca_itens')
            .select('item_pca_id')
            .eq('exercicio_id', exercicioId),
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
        if (funcoesResult.error) throw funcoesResult.error
        if (subfuncoesResult.error) throw subfuncoesResult.error
        if (programasResult.error) throw programasResult.error
        if (acoesResult.error) throw acoesResult.error
        if (categoriasResult.error) throw categoriasResult.error
        if (gruposResult.error) throw gruposResult.error
        if (modalidadesAplicacaoResult.error) throw modalidadesAplicacaoResult.error
        if (vinculosResult.error) throw vinculosResult.error

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

        const funcoesCarregadas =
          (funcoesResult.data ?? []) as OpcaoOrcamentaria[]
        const subfuncoesCarregadas =
          (subfuncoesResult.data ?? []) as OpcaoOrcamentaria[]
        const programasCarregados =
          (programasResult.data ?? []) as OpcaoOrcamentaria[]
        const acoesCarregadas =
          (acoesResult.data ?? []) as OpcaoOrcamentaria[]
        const categoriasCarregadas =
          (categoriasResult.data ?? []) as OpcaoOrcamentaria[]
        const gruposCarregados =
          (gruposResult.data ?? []) as OpcaoOrcamentaria[]
        const modalidadesAplicacaoCarregadas =
          (modalidadesAplicacaoResult.data ?? []) as OpcaoOrcamentaria[]

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

        const funcoesPorId = new Map(
          funcoesCarregadas.map((opcao) => [opcao.id, opcao]),
        )

        const subfuncoesPorId = new Map(
          subfuncoesCarregadas.map((opcao) => [opcao.id, opcao]),
        )

        const programasPorId = new Map(
          programasCarregados.map((opcao) => [opcao.id, opcao]),
        )

        const acoesPorId = new Map(
          acoesCarregadas.map((opcao) => [opcao.id, opcao]),
        )

        const categoriasPorId = new Map(
          categoriasCarregadas.map((opcao) => [opcao.id, opcao]),
        )

        const gruposPorId = new Map(
          gruposCarregados.map((opcao) => [opcao.id, opcao]),
        )

        const modalidadesAplicacaoPorId = new Map(
          modalidadesAplicacaoCarregadas.map((opcao) => [
            opcao.id,
            opcao,
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

            const codigosDotacao = [
              ...new Set(
                dotacoesItem.map((registro) =>
                  montarCodigoOrcamentario([
                    {
                      codigo: funcoesPorId.get(registro.funcao_id)?.codigo,
                    },
                    {
                      codigo: subfuncoesPorId.get(registro.subfuncao_id)
                        ?.codigo,
                    },
                    {
                      codigo: programasPorId.get(registro.programa_id)?.codigo,
                    },
                    {
                      codigo: acoesPorId.get(registro.acao_orcamentaria_id)
                        ?.codigo,
                    },
                    {
                      codigo: categoriasPorId.get(
                        registro.categoria_economica_id,
                      )?.codigo,
                    },
                    {
                      codigo: gruposPorId.get(registro.grupo_natureza_id)
                        ?.codigo,
                    },
                    {
                      codigo: modalidadesAplicacaoPorId.get(
                        registro.modalidade_aplicacao_id,
                      )?.codigo,
                    },
                    {
                      codigo: elementosPorId.get(registro.elemento_despesa_id)
                        ?.codigo,
                    },
                    {
                      codigo: subelementosPorId.get(registro.subelemento_id)
                        ?.codigo,
                    },
                  ]),
                ),
              ),
            ]

            const dotacao = codigosDotacao.join('; ')

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
              dotacao:
                dotacao || 'Classificação orçamentária não disponível',
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
        setItensVinculados([
          ...new Set(
          (vinculosResult.data ?? []).map((vinculo) => vinculo.item_pca_id),
          ),
        ])
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
    }

    return () => {
      ativo = false
    }
  }, [exercicioId])


  useEffect(() => {
    let ativo = true

    async function carregarProcessoParaEdicao() {
      if (!processoId) return

      setCarregando(true)
      setErro(null)

      try {
        const [
          processoResult,
          vinculosResult,
        ] = await Promise.all([
          supabase
            .from('processos_pca')
            .select(
              'id, setor_demandante_id, objeto, numero_processo_eletronico, numero_processo_compras, modalidade_id, numero_modalidade, data_abertura, data_prevista_encerramento, data_conclusao',
            )
            .eq('id', processoId)
            .eq('exercicio_id', exercicioId)
            .single(),

          supabase
            .from('processos_pca_itens')
            .select('item_pca_id')
            .eq('processo_id', processoId)
            .eq('exercicio_id', exercicioId),
        ])

        if (processoResult.error) throw processoResult.error
        if (vinculosResult.error) throw vinculosResult.error
        if (!ativo) return

        const processo = processoResult.data

        setSetorDemandante(String(processo.setor_demandante_id))
        setObjeto(processo.objeto ?? '')
        setNumeroEletronico(processo.numero_processo_eletronico ?? '')
        setNumeroCompras(processo.numero_processo_compras ?? '')
        setModalidadeId(processo.modalidade_id ?? '')
        setNumeroModalidade(processo.numero_modalidade ?? '')
        setDataAbertura(processo.data_abertura?.slice(0, 10) ?? '')
        setDataEncerramento(
          processo.data_prevista_encerramento?.slice(0, 10) ?? '',
        )
        setDataConclusao(processo.data_conclusao?.slice(0, 10) ?? '')

        setItensSelecionados(
          (vinculosResult.data ?? []).map((vinculo) => vinculo.item_pca_id),
        )
      } catch (error) {
        if (!ativo) return

        setErro(
          `Não foi possível carregar o processo para edição: ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }`,
        )
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    void carregarProcessoParaEdicao()

    return () => {
      ativo = false
    }
  }, [processoId, exercicioId])


  const itensOrdenados = useMemo(() => {
    const itensDisponiveis = itens.filter(
      (item) =>
        !itensVinculados.includes(item.id) ||
        (processoId && itensSelecionados.includes(item.id)),
    )

    return [...itensDisponiveis].sort(compararCodigoNumerico)
  }, [itens, itensVinculados, processoId, itensSelecionados])

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
            ? 'Dispensa de licitação'
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
  }, [processoId, sugestaoModalidade, modalidades])

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
      const dadosProcesso = {
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
      }

      let idProcesso = processoId

      if (processoId) {
        const { error: erroAtualizacao } = await supabase
          .from('processos_pca')
          .update(dadosProcesso)
          .eq('id', processoId)
          .eq('exercicio_id', exercicioId)

        if (erroAtualizacao) throw erroAtualizacao
      } else {
        const { data: processo, error: erroProcesso } = await supabase
          .from('processos_pca')
          .insert(dadosProcesso)
          .select('id')
          .single()

        if (erroProcesso) throw erroProcesso

        idProcesso = processo.id
      }

      if (!idProcesso) {
        throw new Error('Não foi possível identificar o processo salvo.')
      }

      const { data: vinculosAtuais, error: erroConsultaVinculos } =
        await supabase
          .from('processos_pca_itens')
          .select('item_pca_id')
          .eq('processo_id', idProcesso)
          .eq('exercicio_id', exercicioId)

      if (erroConsultaVinculos) throw erroConsultaVinculos

      const idsAtuais = (vinculosAtuais ?? []).map(
        (vinculo) => vinculo.item_pca_id,
      )

      const idsParaAdicionar = itensSelecionados.filter(
        (id) => !idsAtuais.includes(id),
      )

      const idsParaRemover = idsAtuais.filter(
        (id) => !itensSelecionados.includes(id),
      )

      if (idsParaAdicionar.length > 0) {
        const { error: erroAdicao } = await supabase
          .from('processos_pca_itens')
          .insert(
            idsParaAdicionar.map((itemId) => ({
              exercicio_id: exercicioId,
              processo_id: idProcesso,
              item_pca_id: itemId,
            })),
          )

        if (erroAdicao) throw erroAdicao
      }

      if (idsParaRemover.length > 0) {
        const { error: erroRemocao } = await supabase
          .from('processos_pca_itens')
          .delete()
          .eq('processo_id', idProcesso)
          .eq('exercicio_id', exercicioId)
          .in('item_pca_id', idsParaRemover)

        if (erroRemocao) {
          throw new Error(
            `Os dados do processo foram salvos, mas não foi possível remover alguns vínculos de itens: ${erroRemocao.message}`,
          )
        }
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
            <h3>Itens</h3>
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
              <label htmlFor="valorAtualizadoTotal">
                Valor atualizado total
              </label>
              <input
                id="valorAtualizadoTotal"
                value={moeda(valorAtualizadoTotal)}
                readOnly
                aria-label="Valor atualizado total dos itens selecionados"
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
                    modalidades.some((item) => item.id === modalidadeId) &&
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
                placeholder="Ex: 12/2027"
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
