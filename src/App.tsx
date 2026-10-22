
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import Painel from './pages/Painel'
import Processos from './pages/Processos'
import './App.css'

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

export default function App() {
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [exercicioId, setExercicioId] = useState('')
  const [paginaAtiva, setPaginaAtiva] = useState('Painel')

  const [processos, setProcessos] = useState<Processo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoProcessos, setCarregandoProcessos] = useState(false)

  const [erro, setErro] = useState<string | null>(null)
  const [erroProcessos, setErroProcessos] = useState<string | null>(null)

  const [atualizacaoProcessos, setAtualizacaoProcessos] = useState(0)

  useEffect(() => {
    async function carregarExercicios() {
      const { data, error } = await supabase
        .from('exercicios_orcamentarios')
        .select('id, ano, status')
        .order('ano', { ascending: false })

      if (error) {
        setErro(error.message)
      } else {
        const lista = data ?? []
        setExercicios(lista)

        if (lista.length > 0) {
          setExercicioId(lista[0].id)
        }
      }

      setCarregando(false)
    }

    void carregarExercicios()
  }, [])

  useEffect(() => {
    if (!exercicioId || paginaAtiva !== 'Processos') return

    let ativo = true

    async function carregarProcessos() {
      setCarregandoProcessos(true)
      setErroProcessos(null)

      const { data, error } = await supabase
        .from('v_processos_pca_totais')
        .select('*')
        .eq('exercicio_id', exercicioId)
        .order('data_abertura', { ascending: false })

      if (!ativo) return

      if (error) {
        setErroProcessos(error.message)
        setProcessos([])
      } else {
        setProcessos((data ?? []) as Processo[])
      }

      setCarregandoProcessos(false)
    }

    void carregarProcessos()

    return () => {
      ativo = false
    }
  }, [exercicioId, paginaAtiva, atualizacaoProcessos])

  const exercicioSelecionado = exercicios.find(
    (exercicio) => exercicio.id === exercicioId,
  )

  return (
    <div className="app-shell">
      <Sidebar
        paginaAtiva={paginaAtiva}
        onSelecionarPagina={(pagina) => {
          setPaginaAtiva(pagina)
        }}
      />

      <main className="main-area">
        <Header
          paginaAtiva={paginaAtiva}
          exercicioId={exercicioId}
          exercicios={exercicios}
          carregando={carregando}
          onSelecionarExercicio={setExercicioId}
        />

        <section className="page-content">
          {paginaAtiva === 'Painel' ? (
            <Painel
              exercicios={exercicios}
              exercicioSelecionado={exercicioSelecionado}
              carregando={carregando}
              erro={erro}
              onSelecionarPagina={setPaginaAtiva}
            />
          ) : paginaAtiva === 'Processos' ? (
            <Processos
              exercicioId={exercicioId}
              exercicioSelecionado={exercicioSelecionado}
              processos={processos}
              carregandoProcessos={carregandoProcessos}
              erroProcessos={erroProcessos}
              onAtualizarProcessos={() => {
                setAtualizacaoProcessos((valor) => valor + 1)
              }}
            />
          ) : (
            <div className="page-heading">
              <div>
                <h1>{paginaAtiva}</h1>
              </div>

              {exercicioSelecionado && (
                <span className="year-badge">
                  PCA {exercicioSelecionado.ano}
                </span>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
