import { useState } from 'react'
import ProcessoTable from '../components/processos/ProcessoTable'
import ProcessoForm from '../components/processos/ProcessoForm'

type Exercicio = {
  id: string
  ano: number
  status: string
}

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

type ProcessosProps = {
  exercicioId: string
  exercicioSelecionado: Exercicio | undefined
  processos: Processo[]
  carregandoProcessos: boolean
  erroProcessos: string | null
  onAtualizarProcessos: () => void
}

export default function Processos({
  exercicioId,
  processos,
  carregandoProcessos,
  erroProcessos,
  onAtualizarProcessos,
}: ProcessosProps) {
  const [busca, setBusca] = useState('')
  const [formularioAberto, setFormularioAberto] = useState(false)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const totalProcessos = processos.length

  const processosConcluidos = processos.filter(
    (processo) => Boolean(processo.data_conclusao),
  )

  const processosEmAtraso = processos.filter((processo) => {
    if (processo.data_conclusao || !processo.data_prevista_encerramento) {
      return false
    }

    const dataPrevista = new Date(
      `${processo.data_prevista_encerramento.slice(0, 10)}T00:00:00`,
    )

    return !Number.isNaN(dataPrevista.getTime()) && dataPrevista < hoje
  })

  const totalConcluidos = processosConcluidos.length
  const totalEmAtraso = processosEmAtraso.length
  const totalEmAndamento = totalProcessos - totalConcluidos

  const percentual = (quantidade: number) =>
    totalProcessos === 0
      ? '0,0%'
      : `${((quantidade / totalProcessos) * 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}%`

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Processos</h1>
        </div>

        {!formularioAberto && (
          <button
            className="primary-button"
            onClick={() => setFormularioAberto(true)}
            disabled={!exercicioId}
          >
            <span aria-hidden="true">＋</span> Novo processo
          </button>
        )}
      </div>

      {formularioAberto ? (
        <ProcessoForm
          exercicioId={exercicioId}
          onCancel={() => setFormularioAberto(false)}
          onSaved={() => {
            setFormularioAberto(false)
            onAtualizarProcessos()
          }}
        />
      ) : (
        <>
          <div className="process-summary">
            <div className="summary-card">
              <span>Total de processos</span>
              <strong>{totalProcessos}</strong>
              <small>100% do total</small>
            </div>

            <div className="summary-card">
              <span>Em andamento</span>
              <strong>{totalEmAndamento}</strong>
              <small>{percentual(totalEmAndamento)} do total</small>
            </div>

            <div className="summary-card">
              <span>Concluídos</span>
              <strong>{totalConcluidos}</strong>
              <small>{percentual(totalConcluidos)} do total</small>
            </div>

            <div className="summary-card">
              <span>Em atraso</span>
              <strong>{totalEmAtraso}</strong>
              <small>{percentual(totalEmAtraso)} do total</small>
            </div>
          </div>

          <ProcessoTable
            processos={processos}
            busca={busca}
            carregando={carregandoProcessos}
            erro={erroProcessos}
            onBuscaChange={setBusca}
          />
        </>
      )}
    </>
  )
}
