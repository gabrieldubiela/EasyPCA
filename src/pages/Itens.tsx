
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ItemForm, {
  type DotacaoForm,
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
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function Itens({ exercicioId }: ItensProps) {
  const [itens, setItens] = useState<Item[]>([])
  const [setores, setSetores] = useState<SetorDemandante[]>([])
  const [opcoes, setOpcoes] = useState<OpcoesDotacao>(opcoesVazias)
  const [dotacoes, setDotacoes] = useState<Record<string, Dotacao[]>>({})

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!exercicioId) {
      setItens([])
      setSetores([])
      setOpcoes(opcoesVazias)
      setDotacoes({})
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
            'id, item_pca_id, funcao_id, subfuncao_id, programa_id, acao_orcamentaria_id, categoria_economica_id, grupo_natureza_id, modalidade_aplicacao_id, elemento_despesa_id, subelemento_id, valor_estimado, valor_atualizado',
          )
          .eq('exercicio_id', exercicioId),

        supabase
          .from('itens_pca')
          .select('id, setor_demandante_id')
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

    let itemId: string | null = null

    try {
      const primeiraDotacao = dados.dotacoes[0]

      const { data: itemCriado, error: erroCadastro } = await supabase
        .from('itens_pca')
        .insert({
          exercicio_id: exercicioId,
          elemento_despesa_id: primeiraDotacao.elemento,
          setor_demandante_id: Number(dados.setorId),
          codigo: dados.codigo || null,
          descricao: dados.descricao,
        })
        .select('id')
        .single()

      if (erroCadastro) throw erroCadastro

      if (!itemCriado) {
        throw new Error('O banco de dados não retornou o item criado.')
      }

      itemId = itemCriado.id

      const registrosDotacao = dados.dotacoes.map((dotacao) => ({
        exercicio_id: exercicioId,
        item_pca_id: itemCriado.id,
        funcao_id: dotacao.funcao,
        subfuncao_id: dotacao.subfuncao,
        programa_id: dotacao.programa,
        acao_orcamentaria_id: dotacao.acao,
        categoria_economica_id: dotacao.categoria,
        grupo_natureza_id: dotacao.grupo,
        modalidade_aplicacao_id: dotacao.modalidade,
        elemento_despesa_id: dotacao.elemento,
        subelemento_id: dotacao.subelemento,
        classificacao_objeto_id: dotacao.classificacaoObjeto,
        valor_estimado: Number(dotacao.valorEstimado),
        valor_atualizado: Number(dotacao.valorAtualizado),
      }))

      const { error: erroDotacao } = await supabase
        .from('itens_pca_dotacoes')
        .insert(registrosDotacao)

      if (erroDotacao) throw erroDotacao

      setFormularioAberto(false)
      setMensagemErro(null)

      await carregarDados()
    } catch (error) {
      const erroSupabase = error as {
  message?: string
  code?: string
  details?: string
  hint?: string
}

const mensagem = [
  erroSupabase.message || 'Ocorreu um erro desconhecido.',
  erroSupabase.code ? `Código: ${erroSupabase.code}` : '',
  erroSupabase.details ? `Detalhes: ${erroSupabase.details}` : '',
  erroSupabase.hint ? `Orientação: ${erroSupabase.hint}` : '',
]
  .filter(Boolean)
  .join(' | ')

      if (itemId) {
        const { error: erroRemocao } = await supabase
          .from('itens_pca')
          .delete()
          .eq('id', itemId)

        if (erroRemocao) {
          setMensagemErro(
            `Não foi possível salvar o item: ${mensagem}. Também não foi possível remover o cadastro incompleto: ${erroRemocao.message}`,
          )
        } else {
          setMensagemErro(
            `Não foi possível salvar as dotações: ${mensagem}. O item criado foi removido para evitar um cadastro incompleto.`,
          )
        }
      } else {
        setMensagemErro(`Não foi possível salvar o item: ${mensagem}`)
      }
    } finally {
      setSalvando(false)
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
    const dotacoesElemento = Object.values(dotacoes)
      .flat()
      .filter(
        (dotacao) =>
          String(dotacao.elemento_despesa_id) === String(elemento.id),
      )

    const estimado = dotacoesElemento.reduce(
      (total, dotacao) => total + Number(dotacao.valor_estimado || 0),
      0,
    )

    const atualizado = dotacoesElemento.reduce(
      (total, dotacao) => total + Number(dotacao.valor_atualizado || 0),
      0,
    )

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
      <div className="page-heading">
        <div>
          <h1>Itens</h1>
        </div>

        {!formularioAberto && (
          <button
            className="primary-button"
            onClick={() => {
              setMensagemErro(null)
              setFormularioAberto(true)
            }}
            disabled={!exercicioId || carregando}
          >
            Novo item
          </button>
        )}
      </div>

      {formularioAberto ? (
        <ItemForm
          setores={setores}
          opcoes={opcoes}
          salvando={salvando}
          erro={mensagemErro}
          onCancel={() => {
            setFormularioAberto(false)
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
              setFormularioAberto(true)
            }}
            permitirNovoItem={Boolean(exercicioId) && !carregando}
          />
        </>
      )}
    </>
  )
}
