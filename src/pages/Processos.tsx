
import { useState } from 'react'
import { supabase } from '../lib/supabase'
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
  const [processoEmEdicao, setProcessoEmEdicao] = useState<string | null>(
    null,
  )
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)

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

  function abrirNovoProcesso() {
    setProcessoEmEdicao(null)
    setFormularioAberto(true)
  }

  function editarProcesso(processo: Processo) {
    setErroExclusao(null)
    setProcessoEmEdicao(processo.id)
    setFormularioAberto(true)
  }

  function cancelarFormulario() {
    setFormularioAberto(false)
    setProcessoEmEdicao(null)
  }

  function concluirSalvamento() {
    setFormularioAberto(false)
    setProcessoEmEdicao(null)
    onAtualizarProcessos()
  }

  async function excluirProcesso(processo: Processo) {
    const identificacao =
      processo.numero_processo_compras || processo.objeto

    const confirmado = window.confirm(
      `Tem certeza de que deseja excluir o processo "${identificacao}"?\n\nOs vínculos desse processo com os itens do PCA também serão removidos. Esta operação não poderá ser desfeita.`,
    )

    if (!confirmado) return

    setErroExclusao(null)
    setExcluindoId(processo.id)

    try {
      const { error: erroVinculos } = await supabase
        .from('processos_pca_itens')
        .delete()
        .eq('processo_id', processo.id)
        .eq('exercicio_id', exercicioId)

      if (erroVinculos) {
        throw erroVinculos
      }

      const { error: erroProcesso } = await supabase
        .from('processos_pca')
        .delete()
        .eq('id', processo.id)
        .eq('exercicio_id', exercicioId)

      if (erroProcesso) {
        throw erroProcesso
      }

      onAtualizarProcessos()
    } catch (erro) {
      console.error('Erro ao excluir processo:', erro)

      setErroExclusao(
        erro instanceof Error
          ? erro.message
          : 'Não foi possível excluir o processo. Verifique se existem outros registros vinculados.',
      )
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Processos</h1>
        </div>

        {!formularioAberto && (
          <button
            type="button"
            className="primary-button"
            onClick={abrirNovoProcesso}
            disabled={!exercicioId}
          >
            Novo processo
          </button>
        )}
      </div>

      {formularioAberto ? (
        <ProcessoForm
          exercicioId={exercicioId}
          processoId={processoEmEdicao ?? undefined}
          onCancel={cancelarFormulario}
          onSaved={concluirSalvamento}
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

          {erroExclusao && (
            <div className="message-card error" role="alert">
              <strong>Não foi possível excluir o processo.</strong>
              <p>{erroExclusao}</p>
            </div>
          )}

          {excluindoId && (
            <p role="status">Excluindo processo...</p>
          )}

          <ProcessoTable
            processos={processos}
            busca={busca}
            carregando={carregandoProcessos}
            erro={erroProcessos}
            onBuscaChange={setBusca}
            onEditar={editarProcesso}
            onExcluir={excluirProcesso}
          />
        </>
      )}
    </>
  )
}
