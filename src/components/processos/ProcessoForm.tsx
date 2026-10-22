
import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type ProcessoFormProps = {
  exercicioId: string
  onCancel: () => void
  onSaved: () => void
}

export default function ProcessoForm({
  exercicioId,
  onCancel,
  onSaved,
}: ProcessoFormProps) {
  const [setorDemandante, setSetorDemandante] = useState('')
  const [objeto, setObjeto] = useState('')
  const [numeroEletronico, setNumeroEletronico] = useState('')
  const [numeroCompras, setNumeroCompras] = useState('')
  const [modalidade, setModalidade] = useState('')
  const [dataAbertura, setDataAbertura] = useState('')
  const [dataEncerramento, setDataEncerramento] = useState('')
  const [dotacao, setDotacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvarProcesso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSalvando(true)
    setErro(null)

    const { error } = await supabase.from('processos_pca').insert({
      exercicio_id: exercicioId,
      setor_demandante: setorDemandante.trim(),
      objeto: objeto.trim(),
      numero_processo_eletronico: numeroEletronico.trim() || null,
      numero_processo_compras: numeroCompras.trim() || null,
      modalidade,
      data_abertura: dataAbertura || null,
      data_prevista_encerramento: dataEncerramento || null,
      dotacao_orcamentaria: dotacao.trim() || null,
      observacoes: observacoes.trim() || null,
      concluído: false,
    })

    setSalvando(false)

    if (error) {
      setErro(`Não foi possível salvar o processo: ${error.message}`)
      return
    }

    onSaved()
  }

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <div>
          <h2>Novo processo do PCA</h2>
          <span>Preencha os dados do processo de contratação.</span>
        </div>
      </div>

      <form onSubmit={salvarProcesso} className="process-form">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="setorDemandante">Setor demandante *</label>
            <input
              id="setorDemandante"
              value={setorDemandante}
              onChange={(event) => setSetorDemandante(event.target.value)}
              required
              maxLength={200}
              placeholder="Nome do setor"
            />
          </div>

          <div className="form-field">
            <label htmlFor="modalidade">Modalidade *</label>
            <select
              id="modalidade"
              value={modalidade}
              onChange={(event) => setModalidade(event.target.value)}
              required
            >
              <option value="">Selecione a modalidade</option>
              <option value="Licitação">Licitação</option>
              <option value="Contratação direta">
                Contratação direta
              </option>
            </select>
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="objeto">Objeto da contratação *</label>
            <textarea
              id="objeto"
              value={objeto}
              onChange={(event) => setObjeto(event.target.value)}
              required
              rows={3}
              placeholder="Descreva o objeto da contratação"
            />
          </div>

          <div className="form-field">
            <label htmlFor="numeroEletronico">
              Número do processo eletrônico
            </label>
            <input
              id="numeroEletronico"
              value={numeroEletronico}
              onChange={(event) => setNumeroEletronico(event.target.value)}
              maxLength={100}
              placeholder="Número, se houver"
            />
          </div>

          <div className="form-field">
            <label htmlFor="numeroCompras">
              Número do processo de compras
            </label>
            <input
              id="numeroCompras"
              value={numeroCompras}
              onChange={(event) => setNumeroCompras(event.target.value)}
              maxLength={100}
              placeholder="Número, se houver"
            />
          </div>

          <div className="form-field">
            <label htmlFor="dataAbertura">Data de abertura</label>
            <input
              id="dataAbertura"
              type="date"
              value={dataAbertura}
              onChange={(event) => setDataAbertura(event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="dataEncerramento">
              Data prevista para encerramento
            </label>
            <input
              id="dataEncerramento"
              type="date"
              min={dataAbertura || undefined}
              value={dataEncerramento}
              onChange={(event) => setDataEncerramento(event.target.value)}
            />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="dotacao">Dotação orçamentária</label>
            <input
              id="dotacao"
              value={dotacao}
              onChange={(event) => setDotacao(event.target.value)}
              maxLength={500}
              placeholder="Informe a dotação, se já definida"
            />
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              rows={3}
              placeholder="Informações complementares"
            />
          </div>
        </div>

        {erro && (
          <div className="message-card error" role="alert">
            {erro}
          </div>
        )}

        <p className="form-required-note">* Campos obrigatórios</p>

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
            disabled={salvando || !exercicioId}
          >
            {salvando ? 'Salvando...' : 'Salvar processo'}
          </button>
        </div>
      </form>
    </div>
  )
}
