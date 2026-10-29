
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

import Sidebar from './components/layout/Sidebar'
import Painel from './pages/Painel'
import Processos from './pages/Processos'
import Itens from './pages/Itens'
import Usuarios from './pages/Usuarios'
import Login from './pages/Login'

import './App.css'

const paginas = [
  { nome: 'Painel' },
  { nome: 'Processos' },
  { nome: 'Itens' },
  { nome: 'Orçamento' },
  { nome: 'Demandantes' },
  { nome: 'Relatórios' },
  { nome: 'Usuários' },
] as const

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

type PerfilUsuario = {
  nome: string
  perfil: 'administrador' | 'servidor'
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [verificandoSessao, setVerificandoSessao] = useState(true)

  const [perfilUsuario, setPerfilUsuario] =
    useState<PerfilUsuario | null>(null)

  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [exercicioId, setExercicioId] = useState('')
  const [paginaAtiva, setPaginaAtiva] = useState<string>('Painel')

  const [processos, setProcessos] = useState<Processo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoProcessos, setCarregandoProcessos] = useState(false)

  const [erro, setErro] = useState<string | null>(null)
  const [erroProcessos, setErroProcessos] = useState<string | null>(null)
  const [atualizacaoProcessos, setAtualizacaoProcessos] = useState(0)

  useEffect(() => {
    let ativo = true

    async function verificarSessao() {
      const { data, error } = await supabase.auth.getSession()

      if (!ativo) return

      if (error) {
        console.error('Erro ao verificar sessão:', error.message)
      }

      setSessao(data.session)
      setVerificandoSessao(false)
    }

    void verificarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function carregarPerfil() {
      setPerfilUsuario(null)

      if (!sessao) return

      const { data, error } = await supabase
        .from('perfis_usuarios')
        .select('nome, perfil')
        .eq('id', sessao.user.id)
        .maybeSingle()

      if (!ativo) return

      if (error) {
        console.error('Erro ao carregar perfil do usuário:', error.message)
        return
      }

      if (data) {
        setPerfilUsuario(data as PerfilUsuario)
      }
    }

    void carregarPerfil()

    return () => {
      ativo = false
    }
  }, [sessao])

  useEffect(() => {
    if (verificandoSessao) return

    let ativo = true

    async function carregarExercicios() {
      setCarregando(true)

      const { data, error } = await supabase
        .from('exercicios_orcamentarios')
        .select('id, ano, status')
        .order('ano', { ascending: false })

      if (!ativo) return

      if (error) {
        setErro(error.message)
      } else {
        setErro(null)
        const lista = data ?? []
        setExercicios(lista)

        if (lista.length > 0) {
          setExercicioId((atual) =>
            lista.some((item) => item.id === atual)
              ? atual
              : lista[0].id,
          )
        } else {
          setExercicioId('')
        }
      }

      setCarregando(false)
    }

    void carregarExercicios()

    return () => {
      ativo = false
    }
  }, [verificandoSessao])

  useEffect(() => {
    if (
      verificandoSessao ||
      !exercicioId ||
      paginaAtiva !== 'Processos'
    ) {
      return
    }

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
  }, [
    verificandoSessao,
    exercicioId,
    paginaAtiva,
    atualizacaoProcessos,
  ])

  useEffect(() => {
    if (sessao && paginaAtiva === 'Login') {
      setPaginaAtiva('Painel')
    }
  }, [sessao, paginaAtiva])

  if (verificandoSessao) {
    return <div className="login-container">Carregando...</div>
  }

  const exercicioSelecionado = exercicios.find(
    (exercicio) => exercicio.id === exercicioId,
  )

  const acessoPaginaUsuarios =
    sessao !== null && perfilUsuario?.perfil === 'administrador'

  const paginasPublicas: string[] = ['Painel', 'Processos']

  function selecionarPagina(pagina: string) {
    if (pagina === 'Entrar') {
      setPaginaAtiva('Login')
      return
    }

    if (!sessao) {
      setPaginaAtiva(
        paginasPublicas.includes(pagina) ? pagina : 'Login',
      )
      return
    }

    if (pagina === 'Usuários' && !acessoPaginaUsuarios) {
      setPaginaAtiva('Painel')
      return
    }

    const paginaExiste = paginas.some(
      (item) => item.nome === pagina,
    )

    setPaginaAtiva(paginaExiste ? pagina : 'Painel')
  }

  const paginaExibida =
    paginaAtiva === 'Login' && !sessao
      ? 'Login'
      : !sessao && !paginasPublicas.includes(paginaAtiva)
        ? 'Painel'
        : paginaAtiva === 'Usuários' && !acessoPaginaUsuarios
          ? 'Painel'
          : paginaAtiva

  function renderizarPagina() {
    if (paginaExibida === 'Painel') {
      return (
        <Painel
          exercicios={exercicios}
          exercicioSelecionado={exercicioSelecionado}
          carregando={carregando}
          erro={erro}
          onSelecionarPagina={selecionarPagina}
        />
      )
    }

    if (paginaExibida === 'Processos') {
      return (
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
      )
    }

    if (paginaExibida === 'Itens' && sessao) {
      return <Itens exercicioId={exercicioId} />
    }

    if (paginaExibida === 'Usuários' && acessoPaginaUsuarios) {
      return <Usuarios />
    }

    return (
      <div className="page-heading">
        <div>
          <h1>{paginaExibida}</h1>
          <p>
            {paginas.some((pagina) => pagina.nome === paginaExibida)
              ? 'Esta página está preparada para implementação.'
              : 'Selecione uma página no menu.'}
          </p>
        </div>

        {exercicioSelecionado && (
          <span className="year-badge">
            PCA {exercicioSelecionado.ano}
          </span>
        )}
      </div>
    )
  }

  if (paginaExibida === 'Login' && !sessao) {
  return <Login />
}

return (
  <div className="app-shell">
    <Sidebar
        paginaAtiva={paginaExibida}
        onSelecionarPagina={selecionarPagina}
        exercicioId={exercicioId}
        exercicios={exercicios}
        carregando={carregando}
        onSelecionarExercicio={setExercicioId}
        sessao={sessao}
        nomeUsuario={perfilUsuario?.nome ?? ''}
        perfilUsuario={perfilUsuario?.perfil ?? ''}
        onEntrar={() => setPaginaAtiva('Login')}
        onSair={async () => {
          const { error } = await supabase.auth.signOut()

          if (error) {
            console.error('Erro ao sair:', error.message)
          } else {
            setPaginaAtiva('Painel')
            setPerfilUsuario(null)
          }
        }}
      />

      <main className="main-area">
        <section className="page-content">
          {renderizarPagina()}
        </section>
      </main>
    </div>
  )
}
