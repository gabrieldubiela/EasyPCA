
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

type ItemPCA = {
  id: string
  codigo: string | null
  descricao: string
  elemento_despesa_id: string
}

type SubelementoItem = {
  item_pca_id: string
  valor_estimado: number | string
  valor_atualizado: number | string
  subelemento_id: string
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

type ItemCalculado = ItemPCA & {
  valor_estimado: number
  valor_atualizado: number
  dotacao: string
}

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

export default function ProcessoForm({
  exercicioId,
  onCancel,
  onSaved,
}: ProcessoFormProps) {
  const [setores, setSetores] = useState<Setor[]>([])
  const [modalidades, setModalidades] = useState<Modalidade[]>([])
  const [itens, setItens] = useState<ItemCalculado[]>([])
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
          itensResult,
          subelementosResult,
          elementosResult,
          classificacaoResult,
        ] = await Promise.all([
          supabase
            .from('setor_demandante')
            .select('id, nome')
            .order('nome'),

          supabase
            .from('limites_licitacao')
            .select('id, modalidade, fundamento_legal, descricao, tipo')
            .eq('exercicio_id', exercicioId)
            .eq('tipo', 'modalidade')
            .order('modalidade'),

          supabase
            .from('itens_pca')
            .select('id, codigo, descricao, elemento_despesa_id')
            .eq('exercicio_id', exercicioId)
            .order('descricao'),

          supabase
            .from('itens_pca_subelementos')
            .select(
              'item_pca_id, valor_estimado, valor_atualizado, subelemento_id',
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
        ])

        if (setoresResult.error) throw setoresResult.error
        if (modalidadesResult.error) throw modalidadesResult.error
        if (itensResult.error) throw itensResult.error
        if (subelementosResult.error) throw subelementosResult.error
        if (elementosResult.error) throw elementosResult.error
        if (classificacaoResult.error) throw classificacaoResult.error

        if (!ativo) return

        const setoresCarregados = (setoresResult.data ?? []) as Setor[]
        const modalidadesCarregadas =
          (modalidadesResult.data ?? []) as Modalidade[]
        const itensCarregados = (itensResult.data ?? []) as ItemPCA[]
        const valoresCarregados =
          (subelementosResult.data ?? []) as SubelementoItem[]
        const elementosCarregados =
          (elementosResult.data ?? []) as ElementoDespesa[]
        const subelementosCarregados =
          (classificacaoResult.data ?? []) as SubelementoDespesa[]

        const elementosPorId = new Map(
          elementosCarregados.map((elemento) => [
            elemento.id,
            elemento,
          ]),
        )

        const subelementosPorId = new Map(
          subelementosCarregados.map((subelemento) => [
            subelemento.id,
            subelemento,
          ]),
        )

        const itensCalculados: ItemCalculado[] = itensCarregados.map(
          (item) => {
            const valoresItem = valoresCarregados.filter(
              (registro) => registro.item_pca_id === item.id,
            )

            const elemento = elementosPorId.get(item.elemento_despesa_id)

            const codigosSubelementos = [
              ...new Set(
                valoresItem
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

            return {
              ...item,
              valor_estimado: valoresItem.reduce(
                (total, registro) =>
                  total + Number(registro.valor_estimado || 0),
                0,
              ),
              valor_atualizado: valoresItem.reduce(
                (total, registro) =>
                  total + Number(registro.valor_atualizado || 0),
                0,
              ),
              dotacao: dotacao || 'Classificação não disponível',
            }
          },
        )

        setSetores(setoresCarregados)
        setModalidades(modalidadesCarregadas)
        setItens(itensCalculados)
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

  const dotacoesSelecionadas = [
    ...new Set(
      itensSelecionadosDetalhes
        .map((item) => item.dotacao)
        .filter((dotacao) => dotacao !== 'Classificação não disponível'),
    ),
  ]

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

    if (
      dataConclusao &&
      dataAbertura &&
      dataConclusao < dataAbertura
    ) {
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
        // Evita deixar um processo sem os itens selecionados.
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
                    {item.modalidade} — {item.fundamento_legal}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="numeroModalidade">
                Número da modalidade
              </label>
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

        <section className="form-section">
          <div className="form-section-heading">
            <h3>Itens</h3>
            <p>
              Selecione os itens já cadastrados que farão parte deste processo.
              Os valores e a classificação orçamentária são calculados a partir
              dos respectivos cadastros.
            </p>
          </div>

          {carregando ? (
            <p>Carregando itens...</p>
          ) : itens.length === 0 ? (
            <p>
              Não há itens cadastrados para este exercício. Cadastre os itens
              do PCA antes de criar o processo.
            </p>
          ) : (
            <div className="itens-pca-selecao">
              {itens.map((item) => {
                const selecionado = itensSelecionados.includes(item.id)

                return (
                  <label
                    key={item.id}
                    className="item-pca-opcao"
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => alternarItem(item.id)}
                    />

                    <span className="item-pca-detalhes">
                      <strong>
                        {item.codigo ? `${item.codigo} — ` : ''}
                        {item.descricao}
                      </strong>
                      <span>Dotação: {item.dotacao}</span>
                      <span>
                        Estimado: {moeda(item.valor_estimado)} · Atualizado:{' '}
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
              <label>Valor estimado total</label>
              <input
                value={moeda(valorEstimadoTotal)}
                readOnly
                aria-label="Valor estimado total dos itens selecionados"
              />
            </div>

            <div className="form-field">
              <label>Valor atualizado total</label>
              <input
                value={moeda(valorAtualizadoTotal)}
                readOnly
                aria-label="Valor atualizado total dos itens selecionados"
              />
            </div>

            <div className="form-field form-field-full">
              <label>Classificação orçamentária dos itens</label>
              <textarea
                value={
                  dotacoesSelecionadas.length
                    ? dotacoesSelecionadas.join('\n')
                    : 'Selecione itens para visualizar a classificação disponível.'
                }
                readOnly
                rows={Math.min(
                  Math.max(dotacoesSelecionadas.length, 2),
                  6,
                )}
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
