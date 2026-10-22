
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Exercicio = {
  id: string
  ano: number
  status: string
}

type ProcessoPainel = {
  id: string
  exercicio_id: string
  setor_demandante_id: string | null
  setor_demandante: string | null
  objeto: string | null
  modalidade_id: string | null
  numero_modalidade: string | null
  data_prevista_encerramento: string | null
  data_conclusao: string | null
  valor_estimado: number | string | null
  valor_atualizado: number | string | null
}

type ItemTotal = {
  id: string
  exercicio_id: string
  valor_estimado: number | string | null
  valor_atualizado: number | string | null
}

type Modalidade = {
  id: string
  modalidade: string | null
}

type Props = {
  exercicios: Exercicio[]
  exercicioSelecionado: Exercicio | undefined
  carregando: boolean
  erro: string | null
  onSelecionarPagina: (pagina: string) => void
}

type Distribuicao = {
  nome: string
  quantidade: number
  percentual: number
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const formatarPercentual = (valor: number) =>
  `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`

const converterNumero = (
  valor: number | string | null | undefined,
): number => {
  if (valor === null || valor === undefined || valor === '') {
    return 0
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

const calcularPercentual = (parte: number, total: number) =>
  total > 0 ? (parte / total) * 100 : 0

const estaConcluido = (processo: ProcessoPainel) =>
  Boolean(processo.data_conclusao)

const estaAtrasado = (processo: ProcessoPainel, hoje: string) =>
  !estaConcluido(processo) &&
  Boolean(processo.data_prevista_encerramento) &&
  processo.data_prevista_encerramento! < hoje

function CartaoIndicador({
  titulo,
  valor,
  descricao,
}: {
  titulo: string
  valor: string
  descricao?: string
}) {
  return (
    <div className="painel-indicador">
      <span className="painel-indicador-titulo">{titulo}</span>
      <strong className="painel-indicador-valor">{valor}</strong>
      {descricao && (
        <span className="painel-indicador-descricao">
          {descricao}
        </span>
      )}
    </div>
  )
}

function DistribuicaoLista({
  titulo,
  dados,
}: {
  titulo: string
  dados: Distribuicao[]
}) {
  return (
    <section className="painel-secao">
      <h2>{titulo}</h2>

      {dados.length === 0 ? (
        <p className="painel-vazio">Nenhum processo cadastrado.</p>
      ) : (
        <div className="painel-distribuicao">
          {dados.map((item) => (
            <div className="painel-distribuicao-item" key={item.nome}>
              <div className="painel-distribuicao-cabecalho">
                <span>{item.nome}</span>
                <span>
                  {item.quantidade}{' '}
                  {item.quantidade === 1 ? 'processo' : 'processos'}{' '}
                  · {formatarPercentual(item.percentual)}
                </span>
              </div>

              <div className="painel-barra-fundo">
                <div
                  className="painel-barra"
                  style={{
                    width: `${Math.min(item.percentual, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Painel({
  exercicios,
  exercicioSelecionado,
  carregando,
  erro,
}: Props) {
  const [processos, setProcessos] = useState<ProcessoPainel[]>([])
  const [itens, setItens] = useState<ItemTotal[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [carregandoDados, setCarregandoDados] = useState(false)
  const [erroDados, setErroDados] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregarDados() {
      if (!exercicioSelecionado?.id) {
        setProcessos([])
        setItens([])
        setModalidades([])
        setErroDados(null)
        setCarregandoDados(false)
        return
      }

      setCarregandoDados(true)
      setErroDados(null)

      const exercicioId = exercicioSelecionado.id

      const [
        resultadoProcessos,
        resultadoItens,
        resultadoModalidades,
      ] = await Promise.all([
        supabase
          .from('v_processos_pca_totais')
          .select(
            'id, exercicio_id, setor_demandante_id, setor_demandante, objeto, modalidade_id, numero_modalidade, data_prevista_encerramento, data_conclusao, valor_estimado, valor_atualizado',
          )
          .eq('exercicio_id', exercicioId),

        supabase
          .from('v_itens_pca_totais')
          .select('id, exercicio_id, valor_estimado, valor_atualizado')
          .eq('exercicio_id', exercicioId),

        supabase
          .from('limites_licitacao')
          .select('id, modalidade')
          .eq('exercicio_id', exercicioId)
          .eq('tipo', 'modalidade'),
      ])

      if (!ativo) return

      const erroConsulta =
        resultadoProcessos.error ??
        resultadoItens.error ??
        resultadoModalidades.error

      if (erroConsulta) {
        setErroDados(
          `Não foi possível carregar os indicadores: ${erroConsulta.message}`,
        )
        setProcessos([])
        setItens([])
        setModalidades([])
      } else {
        setProcessos(
          (resultadoProcessos.data ?? []) as ProcessoPainel[],
        )
        setItens((resultadoItens.data ?? []) as ItemTotal[])
        setModalidades(
          (resultadoModalidades.data ?? []) as Modalidade[],
        )
      }

      setCarregandoDados(false)
    }

    void carregarDados()

    return () => {
      ativo = false
    }
  }, [exercicioSelecionado?.id])

  const hoje = new Date()
  const hojeISO = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, '0'),
    String(hoje.getDate()).padStart(2, '0'),
  ].join('-')

  const totalProcessos = processos.length
  const processosConcluidos = processos.filter(estaConcluido)
  const processosAtrasados = processos.filter((processo) =>
    estaAtrasado(processo, hojeISO),
  )

  const percentualConcluidos = calcularPercentual(
    processosConcluidos.length,
    totalProcessos,
  )

  const percentualAtrasados = calcularPercentual(
    processosAtrasados.length,
    totalProcessos,
  )

  // Os valores gerais do PCA vêm da visão dos itens para evitar
  // contar o mesmo item mais de uma vez quando ligado a processos.
  const valorEstimadoTotal = itens.reduce(
    (total, item) => total + converterNumero(item.valor_estimado),
    0,
  )

  const valorAtualizadoTotal = itens.reduce(
    (total, item) => total + converterNumero(item.valor_atualizado),
    0,
  )

  // Valor estimado dos processos concluídos em relação ao total do PCA.
  const valorEstimadoConcluido = processosConcluidos.reduce(
    (total, processo) =>
      total + converterNumero(processo.valor_estimado),
    0,
  )

  const percentualFinanceiro = calcularPercentual(
    valorEstimadoConcluido,
    valorEstimadoTotal,
  )

  // Economia dos processos concluídos:
  // valor estimado menos valor atualizado.
  const economia = processosConcluidos.reduce(
    (total, processo) =>
      total +
      converterNumero(processo.valor_estimado) -
      converterNumero(processo.valor_atualizado),
    0,
  )

  const distribuicaoModalidades: Distribuicao[] = (() => {
    const contagem = new Map<string, number>()

    const nomesModalidades = new Map(
      modalidades.map((modalidade) => [
        modalidade.id,
        modalidade.modalidade?.trim() || 'Não informado',
      ]),
    )

    for (const processo of processos) {
      const nome = processo.modalidade_id
        ? nomesModalidades.get(processo.modalidade_id) ??
          'Não informado'
        : 'Não informado'

      contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
    }

    return Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: calcularPercentual(quantidade, totalProcessos),
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
  })()

  const distribuicaoSetores: Distribuicao[] = (() => {
    const contagem = new Map<string, number>()

    for (const processo of processos) {
      const nome =
        processo.setor_demandante?.trim() || 'Não informado'

      contagem.set(nome, (contagem.get(nome) ?? 0) + 1)
    }

    return Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: calcularPercentual(quantidade, totalProcessos),
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
  })()

  return (
    <main className="painel-pagina">
      <header className="painel-cabecalho">
        <h1>Painel</h1>
      </header>

      {(carregando || carregandoDados) && (
        <p className="painel-mensagem">Carregando indicadores...</p>
      )}

      {(erro || erroDados) && (
        <p className="painel-erro">{erroDados || erro}</p>
      )}

      {!exercicioSelecionado && !carregando && (
        <p className="painel-mensagem">
          Selecione ou cadastre um exercício para visualizar o PCA.
        </p>
      )}

      {exercicioSelecionado && !erroDados && (
        <>
          <section className="painel-secao">
            <h2>Processos</h2>

            <div className="painel-grade">
              <CartaoIndicador
                titulo="Total de processos"
                valor={String(totalProcessos)}
                descricao="Processos do exercício selecionado"
              />

              <CartaoIndicador
                titulo="Processos concluídos"
                valor={formatarPercentual(percentualConcluidos)}
                descricao={`${processosConcluidos.length} de ${totalProcessos} processos`}
              />

              <CartaoIndicador
                titulo="Processos em atraso"
                valor={formatarPercentual(percentualAtrasados)}
                descricao={`${processosAtrasados.length} processo(s) com prazo vencido`}
              />
            </div>

            <div className="painel-grade-distribuicoes">
              <DistribuicaoLista
                titulo="Processos por demandante"
                dados={distribuicaoSetores}
              />

              <DistribuicaoLista
                titulo="Processos por modalidade"
                dados={distribuicaoModalidades}
              />
            </div>
          </section>

          <section className="painel-secao">
            <h2>Valores do PCA</h2>

            <div className="painel-grade">
              <CartaoIndicador
                titulo="Valor total do PCA"
                valor={formatarMoeda(valorEstimadoTotal)}
                descricao="Referência pelo valor estimado"
              />

              <CartaoIndicador
                titulo="Valor estimado"
                valor={formatarMoeda(valorEstimadoTotal)}
                descricao="Soma dos valores estimados dos itens"
              />

              <CartaoIndicador
                titulo="Valor atualizado"
                valor={formatarMoeda(valorAtualizadoTotal)}
                descricao="Soma dos valores atualizados dos itens"
              />

              <CartaoIndicador
                titulo="Economia dos processos concluídos"
                valor={formatarMoeda(economia)}
                descricao="Estimado menos atualizado dos concluídos"
              />

              <CartaoIndicador
                titulo="Conclusão financeira do PCA"
                valor={formatarPercentual(percentualFinanceiro)}
                descricao={`${formatarMoeda(valorEstimadoConcluido)} em processos concluídos`}
              />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
