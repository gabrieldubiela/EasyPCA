
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ItemForm, {
  type DotacaoForm,
  type ItemFormData,
  type OpcoesDotacao,
  type SetorDemandante,
  type ClassificacaoObjeto,
} from '../components/itens/ItemForm'
import ItemTable, {
  type Item,
  type Dotacao,
} from '../components/itens/ItemTable'

type ItensProps = {
  exercicioId: string
}

type TotalElemento = {
  exercicio_id: string
  elemento_despesa_id: string
  valor_estimado_total: number | string
  valor_atualizado_total: number | string
}

const tabelas = {
  funcoes: 'funcoes_governo',
  subfuncoes: 'subfuncoes_governo',
  programas: 'programas',
  acoes: 'acoes_orcamentarias',
  categorias: 'categorias_economicas',
  grupos: 'grupos_natureza_despesa',
  modalidades: 'modalidades_aplicacao',
  elementos: 'elementos_despesa',
  subelementos: 'subelementos_despesa',
} as const

const opcoesVazias: OpcoesDotacao = {
  funcoes: [],
  subfuncoes: [],
  programas: [],
  acoes: [],
  categorias: [],
  grupos: [],
  modalidades: [],
  elementos: [],
  subelementos: [],
  classificacoesObjeto: [],
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function Itens({ exercicioId }: ItensProps) {
  const [itens, setItens] = useState<Item[]>([])
  const [setores, setSetores] = useState<SetorDemandante[]>([])
  const [opcoes, setOpcoes] = useState<OpcoesDotacao>(opcoesVazias)
  const [dotacoes, setDotacoes] = useState<Record<string, Dotacao[]>>({})
  const [totaisElementos, setTotaisElementos] = useState<TotalElemento[]>([])

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [itemEmEdicao, setItemEmEdicao] = useState<ItemFormData | null>(null)
  const [mensagemExclusao, setMensagemExclusao] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    if (!exercicioId) {
      setItens([])
      setSetores([])
      setOpcoes(opcoesVazias)
      setDotacoes({})
      setTotaisElementos([])
      setCarregando(false)
      return
    }

    setCarregando(true)
    setErro(null)

    try {
      const [
        itensResult,
        setoresResult,
        funcoesResult,
        subfuncoesResult,
        programasResult,
        acoesResult,
        categoriasResult,
        gruposResult,
        modalidadesResult,
        elementosResult,
        subelementosResult,
        classificacoesObjetoResult,
        dotacoesResult,
        vinculosResult,
        totaisElementosResult,
      ] = await Promise.all([
        supabase
          .from('v_itens_pca_totais')
          .select('*')
          .eq('exercicio_id', exercicioId)
          .order('descricao'),

        supabase
          .from('setor_demandante')
          .select('id, nome')
          .order('nome'),

        supabase
          .from(tabelas.funcoes)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.subfuncoes)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.programas)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.acoes)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.categorias)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.grupos)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.modalidades)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.elementos)
          .select('id, codigo, descricao')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from(tabelas.subelementos)
          .select('id, codigo, descricao, elemento_id')
          .eq('exercicio_id', exercicioId)
          .eq('ativo', true)
          .order('codigo'),

        supabase
          .from('classificacoes_objeto')
          .select('id, codigo, descricao')
          .order('codigo'),

        supabase
          .from('itens_pca_dotacoes')
          .select(
            'id, item_pca_id, funcao_id, subfuncao_id, programa_id, acao_orcamentaria_id, categoria_economica_id, grupo_natureza_id, modalidade_aplicacao_id, elemento_despesa_id, subelemento_id, classificacao_objeto_id, valor_estimado, valor_atualizado',
          )
          .eq('exercicio_id', exercicioId),

        supabase
          .from('itens_pca')
          .select('id, setor_demandante_id')
          .eq('exercicio_id', exercicioId),

        supabase
          .from('v_totais_elementos_despesa')
          .select(
            'exercicio_id, elemento_despesa_id, valor_estimado_total, valor_atualizado_total',
          )
          .eq('exercicio_id', exercicioId),
      ])

      const resultados = [
        itensResult,
        setoresResult,
        funcoesResult,
        subfuncoesResult,
        programasResult,
        acoesResult,
        categoriasResult,
        gruposResult,
        modalidadesResult,
        elementosResult,
        subelementosResult,
        classificacoesObjetoResult,
        dotacoesResult,
        vinculosResult,
        totaisElementosResult,
      ]

      const erros = resultados
        .filter((resultado) => resultado.error)
        .map((resultado) => resultado.error!.message)

      if (erros.length > 0) {
        throw new Error(erros.join(' | '))
      }

      const setoresPorItem = new Map<string, number | null>(
        (vinculosResult.data ?? []).map((v) => [
          v.id,
          v.setor_demandante_id,
        ]),
      )

      const itensCarregados = (itensResult.data ?? []).map((item) => ({
        ...item,
        setor_demandante_id: setoresPorItem.get(item.id) ?? null,
      })) as Item[]

      setItens(itensCarregados)
      setSetores((setoresResult.data ?? []) as SetorDemandante[])
      setTotaisElementos(
        (totaisElementosResult.data ?? []) as TotalElemento[],
      )

      setOpcoes({
        funcoes: funcoesResult.data ?? [],
        subfuncoes: subfuncoesResult.data ?? [],
        programas: programasResult.data ?? [],
        acoes: acoesResult.data ?? [],
        categorias: categoriasResult.data ?? [],
        grupos: gruposResult.data ?? [],
        modalidades: modalidadesResult.data ?? [],
        elementos: elementosResult.data ?? [],
        subelementos: (subelementosResult.data ?? []).map((s) => ({
          ...s,
          elemento_id: String(s.elemento_id),
        })),
        classificacoesObjeto:
          (classificacoesObjetoResult.data ?? []) as ClassificacaoObjeto[],
      })

      const dotacoesPorItem: Record<string, Dotacao[]> = {}

      for (const dotacao of (dotacoesResult.data ?? []) as Dotacao[]) {
        if (!dotacoesPorItem[dotacao.item_pca_id]) {
          dotacoesPorItem[dotacao.item_pca_id] = []
        }

        dotacoesPorItem[dotacao.item_pca_id].push(dotacao)
      }

      setDotacoes(dotacoesPorItem)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os dados dos itens.',
      )
    } finally {
      setCarregando(false)
    }
  }, [exercicioId])

  useEffect(() => {
    void carregarDados()
  }, [carregarDados])

  
  async function salvarItem(dados: {
    codigo: string
    descricao: string
    setorId: string
    dotacoes: DotacaoForm[]
  }) {
    setMensagemErro(null)

    if (!exercicioId) {
      setMensagemErro('Selecione um exercício orçamentário.')
      return
    }

    if (dados.dotacoes.length === 0) {
      setMensagemErro('Adicione pelo menos uma dotação orçamentária.')
      return
    }

    setSalvando(true)

    try {
      const { data, error } = await supabase.rpc('salvar_item_pca', {
        p_exercicio_id: exercicioId,
        p_item_id: itemEmEdicao?.id ?? null,
        p_codigo: dados.codigo.trim() || null,
        p_descricao: dados.descricao.trim(),
        p_setor_demandante_id: Number(dados.setorId),
        p_dotacoes: dados.dotacoes.map((dotacao) => ({
          funcao: dotacao.funcao,
          subfuncao: dotacao.subfuncao,
          programa: dotacao.programa,
          acao: dotacao.acao,
          categoria: dotacao.categoria,
          grupo: dotacao.grupo,
          modalidade: dotacao.modalidade,
          elemento: dotacao.elemento,
          subelemento: dotacao.subelemento,
          classificacaoObjeto: dotacao.classificacaoObjeto || null,
          valorEstimado: Number(dotacao.valorEstimado),
          valorAtualizado: Number(dotacao.valorAtualizado),
        })),
      })

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error('O banco de dados não retornou o ID do item salvo.')
      }

      setFormularioAberto(false)
      setItemEmEdicao(null)
      setMensagemErro(null)

      await carregarDados()
    } catch (error) {
      setMensagemErro(
        error instanceof Error
          ? `Não foi possível salvar o item: ${error.message}`
          : 'Não foi possível salvar o item.',
      )
    } finally {
      setSalvando(false)
    }
  }

  function editarItem(item: Item) {
    const dotacoesDoItem = dotacoes[item.id] ?? []

    setMensagemErro(null)

    setItemEmEdicao({
      id: item.id,
      codigo: item.codigo,
      descricao: item.descricao,
      setor_demandante_id: item.setor_demandante_id,
      dotacoes: dotacoesDoItem.map((dotacao) => ({
        chave: dotacao.id,
        funcao: dotacao.funcao_id,
        subfuncao: dotacao.subfuncao_id,
        programa: dotacao.programa_id,
        acao: dotacao.acao_orcamentaria_id,
        categoria: dotacao.categoria_economica_id,
        grupo: dotacao.grupo_natureza_id,
        modalidade: dotacao.modalidade_aplicacao_id,
        elemento: dotacao.elemento_despesa_id,
        subelemento: dotacao.subelemento_id,
        classificacaoObjeto: dotacao.classificacao_objeto_id,
        valorEstimado: String(dotacao.valor_estimado),
        valorAtualizado: String(dotacao.valor_atualizado),
      })),
    })

    setFormularioAberto(true)
  }

  async function excluirItem(item: Item) {
  const confirmacao = window.confirm(
    `Deseja realmente excluir o item ${item.codigo || item.descricao}? Esta ação não poderá ser desfeita.`,
  )

  if (!confirmacao) return

  setMensagemErro(null)
  setErro(null)
  setCarregando(true)

  try {
    const { error } = await supabase.rpc('excluir_item_pca', {
      p_exercicio_id: exercicioId,
      p_item_id: item.id,
    })

    if (error) {
      throw error
    }

    await carregarDados()
  } catch (error) {
  const mensagem =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : 'Ocorreu um erro inesperado.'

  if (
    mensagem.toLowerCase().includes('vinculado a um processo do pca')
  ) {
    setMensagemExclusao(
      'Este item está vinculado a um processo de compra e não pode ser excluído. Remova o vínculo com o processo antes de tentar novamente.',
    )
  } else {
    setMensagemExclusao(
      `Não foi possível excluir o item: ${mensagem}`,
    )
  }
} finally {
  setCarregando(false)
}
}

  const totalItens = itens.length

  const valorEstimadoTotal = itens.reduce(
    (total, item) => total + Number(item.valor_estimado || 0),
    0,
  )

  const valorAtualizadoTotal = itens.reduce(
    (total, item) => total + Number(item.valor_atualizado || 0),
    0,
  )

  const valoresPorElemento = opcoes.elementos
    .map((elemento) => {
      const totais = totaisElementos.find(
        (total) =>
          String(total.elemento_despesa_id) === String(elemento.id),
      )

      const estimado = Number(totais?.valor_estimado_total || 0)
      const atualizado = Number(totais?.valor_atualizado_total || 0)

      return {
        id: elemento.id,
        codigo: elemento.codigo,
        descricao: elemento.descricao,
        estimado,
        atualizado,
      }
    })
    .filter((elemento) => elemento.estimado > 0 || elemento.atualizado > 0)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'))

  return (
  <>
    {mensagemExclusao && (
      <div className="modal-overlay">
        <div
          className="modal-content"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-exclusao"
        >
          <h2 id="titulo-exclusao">
            Não é possível excluir este item
          </h2>

          <p>{mensagemExclusao}</p>

          <div className="modal-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setMensagemExclusao(null)}
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="page-heading">
      <div>
        <h1>Itens</h1>
      </div>

        {!formularioAberto && (
          <button
            className="primary-button"
            onClick={() => {
              setMensagemErro(null)
              setItemEmEdicao(null)
              setFormularioAberto(true)
            }}
            disabled={!exercicioId || carregando}
          >
            Novo item
          </button>
        )}
      </div>

      {mensagemErro && !formularioAberto && (
        <div className="empty-state error" role="alert">
          {mensagemErro}
        </div>
      )}

      {formularioAberto ? (
        <ItemForm
          setores={setores}
          opcoes={opcoes}
          salvando={salvando}
          erro={mensagemErro}
          itemInicial={itemEmEdicao}
          onCancel={() => {
            setFormularioAberto(false)
            setItemEmEdicao(null)
            setMensagemErro(null)
          }}
          onSave={salvarItem}
        />
      ) : (
        <>
          <div className="process-summary">
            <div className="summary-card">
              <span>Total de itens</span>
              <strong>{totalItens}</strong>
            </div>

            <div className="summary-card">
              <span>Valor total estimado</span>
              <strong>{formatarMoeda(valorEstimadoTotal)}</strong>
            </div>

            <div className="summary-card">
              <span>Valor total atualizado</span>
              <strong>{formatarMoeda(valorAtualizadoTotal)}</strong>
            </div>
          </div>

          <div className="process-summary">
            <div className="summary-card summary-card-elementos">
              <span>Estimado por elemento de despesa</span>

              {valoresPorElemento.length === 0 ? (
                <strong>R$ 0,00</strong>
              ) : (
                <div className="resumo-elementos">
                  {valoresPorElemento.map((elemento) => (
                    <div key={elemento.id} className="resumo-elemento">
                      <span>
                        {elemento.codigo} — {elemento.descricao}
                      </span>
                      <strong>{formatarMoeda(elemento.estimado)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="summary-card summary-card-elementos">
              <span>Atualizado por elemento de despesa</span>

              {valoresPorElemento.length === 0 ? (
                <strong>R$ 0,00</strong>
              ) : (
                <div className="resumo-elementos">
                  {valoresPorElemento.map((elemento) => (
                    <div key={elemento.id} className="resumo-elemento">
                      <span>
                        {elemento.codigo} — {elemento.descricao}
                      </span>
                      <strong>{formatarMoeda(elemento.atualizado)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ItemTable
            itens={itens}
            setores={setores}
            dotacoes={dotacoes}
            opcoes={opcoes}
            carregando={carregando}
            erro={erro}
            aoNovoItem={() => {
              setMensagemErro(null)
              setItemEmEdicao(null)
              setFormularioAberto(true)
            }}
            permitirNovoItem={Boolean(exercicioId) && !carregando}
            aoEditar={editarItem}
            aoExcluir={excluirItem}
          />
        </>
      )}
    </>
  )
}
