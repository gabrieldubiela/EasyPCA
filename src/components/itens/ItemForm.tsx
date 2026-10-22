
import { useState, type FormEvent } from 'react'

export type Opcao = {
  id: string
  codigo: string
  descricao: string
  elemento_id?: string
}

export type SetorDemandante = {
  id: number
  nome: string
}

export type DotacaoForm = {
  chave: string
  funcao: string
  subfuncao: string
  programa: string
  acao: string
  categoria: string
  grupo: string
  modalidade: string
  elemento: string
  subelemento: string
  valorEstimado: string
  valorAtualizado: string
}

export type OpcoesDotacao = {
  funcoes: Opcao[]
  subfuncoes: Opcao[]
  programas: Opcao[]
  acoes: Opcao[]
  categorias: Opcao[]
  grupos: Opcao[]
  modalidades: Opcao[]
  elementos: Opcao[]
  subelementos: Opcao[]
}

type Props = {
  setores: SetorDemandante[]
  opcoes: OpcoesDotacao
  salvando: boolean
  erro: string | null
  onCancel: () => void
  onSave: (dados: {
    codigo: string
    descricao: string
    setorId: string
    dotacoes: DotacaoForm[]
  }) => Promise<void>
}

const campos = [
  { campo: 'funcao', titulo: 'Função', grupo: 'funcoes' },
  { campo: 'subfuncao', titulo: 'Subfunção', grupo: 'subfuncoes' },
  { campo: 'programa', titulo: 'Programa', grupo: 'programas' },
  { campo: 'acao', titulo: 'Ação orçamentária', grupo: 'acoes' },
  { campo: 'categoria', titulo: 'Categoria econômica', grupo: 'categorias' },
  { campo: 'grupo', titulo: 'Grupo de natureza da despesa', grupo: 'grupos' },
  { campo: 'modalidade', titulo: 'Modalidade de aplicação', grupo: 'modalidades' },
  { campo: 'elemento', titulo: 'Elemento de despesa', grupo: 'elementos' },
  { campo: 'subelemento', titulo: 'Subelemento', grupo: 'subelementos' },
] as const

function novaDotacao(): DotacaoForm {
  return {
    chave: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    funcao: '',
    subfuncao: '',
    programa: '',
    acao: '',
    categoria: '',
    grupo: '',
    modalidade: '',
    elemento: '',
    subelemento: '',
    valorEstimado: '0.00',
    valorAtualizado: '0.00',
  }
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ItemForm({
  setores,
  opcoes,
  salvando,
  erro,
  onCancel,
  onSave,
}: Props) {
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [setorId, setSetorId] = useState('')
  const [dotacoes, setDotacoes] = useState<DotacaoForm[]>([
    novaDotacao(),
  ])
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)

  function alterarDotacao(
    chave: string,
    campo: keyof Omit<DotacaoForm, 'chave'>,
    valor: string,
  ) {
    setDotacoes((atuais) =>
      atuais.map((dotacao) => {
        if (dotacao.chave !== chave) return dotacao

        const proxima = { ...dotacao, [campo]: valor }

        if (campo === 'elemento') {
          proxima.subelemento = ''
        }

        return proxima
      }),
    )
    setErroValidacao(null)
  }

  function codigoDotacao(dotacao: DotacaoForm) {
    return campos
      .map(
        ({ campo, grupo }) =>
          opcoes[grupo].find(
            (opcao) => opcao.id === dotacao[campo],
          )?.codigo ?? '—',
      )
      .join('.')
  }

  function validar(): string | null {
    if (!setorId) return 'Selecione o setor demandante.'
    if (!descricao.trim()) return 'Informe o objeto do item.'

    for (let i = 0; i < dotacoes.length; i++) {
      const d = dotacoes[i]
      const numero = i + 1

      if (campos.some(({ campo }) => !d[campo])) {
        return `Preencha todos os componentes da dotação ${numero}.`
      }

      const subelementoValido = opcoes.subelementos.some(
        (s) =>
          s.id === d.subelemento &&
          String(s.elemento_id) === String(d.elemento),
      )

      if (!subelementoValido) {
        return `O subelemento da dotação ${numero} não pertence ao elemento selecionado.`
      }

      for (const [campo, nome] of [
        ['valorEstimado', 'estimado'],
        ['valorAtualizado', 'atualizado'],
      ] as const) {
        const texto = d[campo].trim()
        const valor = Number(texto)

        if (texto === '' || !Number.isFinite(valor) || valor < 0) {
          return `Informe um valor ${nome} válido e não negativo para a dotação ${numero}.`
        }
      }
    }

    return null
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const mensagem = validar()

    if (mensagem) {
      setErroValidacao(mensagem)
      return
    }

    setErroValidacao(null)

    await onSave({
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      setorId,
      dotacoes,
    })
  }

  return (
    <div className="form-panel">
      <div className="form-section-heading">
        <h3>Novo item do PCA</h3>
        <p>
          Informe os dados do item e suas dotações orçamentárias.
        </p>
      </div>

      <form className="process-form" onSubmit={enviar}>
        <div className="form-section">
          <div className="form-section-heading">
            <h3>Dados do item</h3>
            <p>Identifique o item e o setor responsável pela demanda.</p>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Número</span>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Opcional"
                maxLength={50}
              />
            </label>

            <label className="form-field">
              <span>Demandante</span>
              <select
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                required
              >
                <option value="">Selecione o setor</option>
                {setores.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-field-full">
              <span>Objeto</span>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Informe o objeto do item"
                maxLength={500}
                required
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-heading">
            <h3>Dotações orçamentárias</h3>
            <p>
              Cada dotação possui classificação e valores próprios.
            </p>
          </div>

          {dotacoes.map((dotacao, indice) => {
            const subelementosDisponiveis = opcoes.subelementos.filter(
              (s) =>
                String(s.elemento_id) === String(dotacao.elemento),
            )

            return (
              <section
                className="dotacao-card"
                key={dotacao.chave}
              >
                <div className="form-heading">
                  <h3>Dotação {indice + 1}</h3>

                  {dotacoes.length > 1 && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setDotacoes((atuais) =>
                          atuais.filter(
                            (d) => d.chave !== dotacao.chave,
                          ),
                        )
                      }
                      disabled={salvando}
                    >
                      Remover dotação
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  {campos.map(
                    ({ campo, titulo, grupo }, posicao) => {
                      const lista =
                        campo === 'subelemento'
                          ? subelementosDisponiveis
                          : opcoes[grupo]

                      return (
                        <label className="form-field" key={campo}>
                          <span>
                            {posicao + 1}. {titulo}
                          </span>

                          <select
                            value={dotacao[campo]}
                            onChange={(e) =>
                              alterarDotacao(
                                dotacao.chave,
                                campo,
                                e.target.value,
                              )
                            }
                            required
                            disabled={
                              campo === 'subelemento' &&
                              !dotacao.elemento
                            }
                          >
                            <option value="">Selecione...</option>
                            {lista.map((opcao) => (
                              <option
                                key={opcao.id}
                                value={opcao.id}
                              >
                                {opcao.codigo} — {opcao.descricao}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    },
                  )}
                </div>

                {dotacao.elemento &&
                  subelementosDisponiveis.length === 0 && (
                    <p className="form-hint">
                      Não há subelementos ativos cadastrados para
                      este elemento no exercício selecionado.
                    </p>
                  )}

                <div className="dotacao-codigo">
                  <span>Código da dotação orçamentária</span>
                  <strong>{codigoDotacao(dotacao)}</strong>
                  <small>
                    Código composto automaticamente a partir da
                    classificação selecionada.
                  </small>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span>Valor estimado (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dotacao.valorEstimado}
                      onChange={(e) =>
                        alterarDotacao(
                          dotacao.chave,
                          'valorEstimado',
                          e.target.value,
                        )
                      }
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>Valor atualizado (R$)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dotacao.valorAtualizado}
                      onChange={(e) =>
                        alterarDotacao(
                          dotacao.chave,
                          'valorAtualizado',
                          e.target.value,
                        )
                      }
                      required
                    />
                  </label>
                </div>
              </section>
            )
          })}

          <div className="dotacao-adicionar">
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setDotacoes((atuais) => [
                  ...atuais,
                  novaDotacao(),
                ])
              }
              disabled={salvando}
            >
              + Adicionar outra dotação
            </button>
          </div>
        </div>

        <div className="process-summary">
          <div className="summary-card">
            <span>Quantidade de dotações</span>
            <strong>{dotacoes.length}</strong>
          </div>

          <div className="summary-card">
            <span>Total estimado</span>
            <strong>
              {moeda(
                dotacoes.reduce(
                  (soma, d) =>
                    soma +
                    Math.max(0, Number(d.valorEstimado) || 0),
                  0,
                ),
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>Total atualizado</span>
            <strong>
              {moeda(
                dotacoes.reduce(
                  (soma, d) =>
                    soma +
                    Math.max(0, Number(d.valorAtualizado) || 0),
                  0,
                ),
              )}
            </strong>
          </div>
        </div>

        {(erroValidacao || erro) && (
          <p className="message-card error" role="alert">
            {erroValidacao || erro}
          </p>
        )}

        <div className="form-footer">
          <p className="form-required-note">
            Preencha todos os campos obrigatórios antes de salvar.
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
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar item'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
