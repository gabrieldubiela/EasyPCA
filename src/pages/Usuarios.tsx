
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import UsuarioTable from '../components/usuarios/UsuarioTable'
import UsuarioForm, {
  type UsuarioFormData,
} from '../components/usuarios/UsuarioForm'

export type PerfilUsuario = 'administrador' | 'servidor'

export type Usuario = {
  id: string
  nome: string
  sobrenome: string | null
  cargo: string | null
  email: string
  perfil: PerfilUsuario
  criado_em: string
  email_confirmado?: boolean
}

type RespostaUsuarios = {
  usuarios?: Usuario[]
  mensagem?: string
  erro?: string
}

const URL_FUNCAO = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerenciar-usuarios`

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Usuario | null>(null)

  const chamarFuncao = useCallback(
    async (dados: Record<string, unknown>) => {
      const { data: sessaoData, error: erroSessao } =
        await supabase.auth.getSession()

      if (erroSessao) throw erroSessao

      const token = sessaoData.session?.access_token

      if (!token) {
        throw new Error('Sua sessão expirou. Entre novamente no sistema.')
      }

      const resposta = await fetch(URL_FUNCAO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dados),
      })

      let resultado: RespostaUsuarios

      try {
        resultado = (await resposta.json()) as RespostaUsuarios
      } catch {
        throw new Error('O servidor retornou uma resposta inválida.')
      }

      if (!resposta.ok || resultado.erro) {
        throw new Error(
          resultado.erro ||
            resultado.mensagem ||
            'Não foi possível concluir a operação.',
        )
      }

      return resultado
    },
    [],
  )

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true)
    setErro(null)

    try {
      const resultado = await chamarFuncao({ acao: 'listar' })
      setUsuarios(resultado.usuarios ?? [])
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os usuários.',
      )
    } finally {
      setCarregando(false)
    }
  }, [chamarFuncao])

  useEffect(() => {
    void carregarUsuarios()
  }, [carregarUsuarios])

  function abrirCadastro() {
    setUsuarioEmEdicao(null)
    setErro(null)
    setMensagem(null)
    setFormularioAberto(true)
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioEmEdicao(usuario)
    setErro(null)
    setMensagem(null)
    setFormularioAberto(true)
  }

  function cancelarFormulario() {
    setFormularioAberto(false)
    setUsuarioEmEdicao(null)
    setErro(null)
  }

  async function salvarUsuario(dados: UsuarioFormData) {
    setSalvando(true)
    setErro(null)
    setMensagem(null)

    try {
      if (usuarioEmEdicao) {
        await chamarFuncao({
          acao: 'editar',
          id: usuarioEmEdicao.id,
          nome: dados.nome.trim(),
          sobrenome: dados.sobrenome.trim() || null,
          cargo: dados.cargo.trim() || null,
          email: dados.email.trim(),
          senha: dados.senha,
          perfil: dados.perfil,
        })
      } else {
        await chamarFuncao({
          acao: 'cadastrar',
          nome: dados.nome.trim(),
          sobrenome: dados.sobrenome.trim() || null,
          cargo: dados.cargo.trim() || null,
          email: dados.email.trim(),
          senha: dados.senha,
          perfil: dados.perfil,
        })
      }

      setFormularioAberto(false)
      setUsuarioEmEdicao(null)
      setMensagem(
        usuarioEmEdicao
          ? 'Usuário atualizado com sucesso.'
          : 'Usuário cadastrado com sucesso.',
      )

      await carregarUsuarios()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o usuário.',
      )
    } finally {
      setSalvando(false)
    }
  }

  async function excluirUsuario(usuario: Usuario) {
    setSalvando(true)
    setErro(null)
    setMensagem(null)

    try {
      const resultado = await chamarFuncao({
        acao: 'excluir',
        id: usuario.id,
      })

      setMensagem(resultado.mensagem ?? 'Usuário excluído com sucesso.')
      await carregarUsuarios()
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o usuário.',
      )
    } finally {
      setSalvando(false)
    }
  }

  const totalAdministradores = usuarios.filter(
    (usuario) => usuario.perfil === 'administrador',
  ).length

  const totalServidores = usuarios.filter(
    (usuario) => usuario.perfil === 'servidor',
  ).length

  return (
    <section className="painel-pagina">
      <div className="page-heading">
        <div>
          <h1>Gestão de usuários</h1>
        </div>

        {!formularioAberto && (
          <button
            type="button"
            className="primary-button"
            onClick={abrirCadastro}
          >
            Novo usuário
          </button>
        )}
      </div>

      {mensagem && !formularioAberto && (
        <div className="message-card" role="status">
          {mensagem}
        </div>
      )}

      {erro && !formularioAberto && (
        <div className="message-card error" role="alert">
          <strong>Não foi possível concluir a operação.</strong>
          <p>{erro}</p>
        </div>
      )}

      {formularioAberto ? (
        <UsuarioForm
          usuario={usuarioEmEdicao}
          salvando={salvando}
          erro={erro}
          onCancel={cancelarFormulario}
          onSubmit={salvarUsuario}
        />
      ) : (
        <>
          <div className="process-summary">
            <div className="summary-card">
              <span>Total de usuários</span>
              <strong>{usuarios.length}</strong>
              <small>Usuários cadastrados</small>
            </div>

            <div className="summary-card">
              <span>Administradores</span>
              <strong>{totalAdministradores}</strong>
              <small>
                {usuarios.length
                  ? `${((totalAdministradores / usuarios.length) * 100).toLocaleString(
                      'pt-BR',
                      { maximumFractionDigits: 1 },
                    )}% do total`
                  : '0% do total'}
              </small>
            </div>

            <div className="summary-card">
              <span>Servidores</span>
              <strong>{totalServidores}</strong>
              <small>
                {usuarios.length
                  ? `${((totalServidores / usuarios.length) * 100).toLocaleString(
                      'pt-BR',
                      { maximumFractionDigits: 1 },
                    )}% do total`
                  : '0% do total'}
              </small>
            </div>
          </div>

          <UsuarioTable
            usuarios={usuarios}
            carregando={carregando || salvando}
            onEditar={abrirEdicao}
            onExcluir={excluirUsuario}
            onAtualizar={() => void carregarUsuarios()}
          />
        </>
      )}
    </section>
  )
}
