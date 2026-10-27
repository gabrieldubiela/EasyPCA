
import { useEffect, useState, type FormEvent } from 'react'
import type { PerfilUsuario, Usuario } from '../../pages/Usuarios'

export type UsuarioFormData = {
  nome: string
  sobrenome: string
  cargo: string
  email: string
  senha: string
  perfil: PerfilUsuario
}

type UsuarioFormProps = {
  usuario: Usuario | null
  salvando: boolean
  erro: string | null
  onCancel: () => void
  onSubmit: (dados: UsuarioFormData) => void
}

export default function UsuarioForm({
  usuario,
  salvando,
  erro,
  onCancel,
  onSubmit,
}: UsuarioFormProps) {
  const editando = Boolean(usuario)

  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [cargo, setCargo] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] = useState<PerfilUsuario>('servidor')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)

  useEffect(() => {
    setNome(usuario?.nome ?? '')
    setSobrenome(usuario?.sobrenome ?? '')
    setCargo(usuario?.cargo ?? '')
    setEmail(usuario?.email ?? '')
    setSenha('')
    setPerfil(usuario?.perfil ?? 'servidor')
    setErroValidacao(null)
  }, [usuario])

  function enviarFormulario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErroValidacao(null)

    if (!nome.trim()) {
      setErroValidacao('Informe o nome do usuário.')
      return
    }

    if (!email.trim()) {
      setErroValidacao('Informe o e-mail do usuário.')
      return
    }

    if (senha && senha.length < 8) {
      setErroValidacao('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    onSubmit({
      nome: nome.trim(),
      sobrenome: sobrenome.trim(),
      cargo: cargo.trim(),
      email: email.trim(),
      senha,
      perfil,
    })
  }

  return (
    <div className="form-panel">
      <form className="process-form" onSubmit={enviarFormulario}>
        <section className="form-section">
          <div className="form-section-heading">
            <h3>{editando ? 'Editar usuário' : 'Cadastrar usuário'}</h3>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="usuarioNome">
                Nome <span className="required-mark">*</span>
              </label>
              <input
                id="usuarioNome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={100}
                autoComplete="given-name"
                required
                disabled={salvando}
                placeholder="Nome"
              />
            </div>

            <div className="form-field">
              <label htmlFor="usuarioSobrenome">Sobrenome</label>
              <input
                id="usuarioSobrenome"
                value={sobrenome}
                onChange={(event) => setSobrenome(event.target.value)}
                maxLength={150}
                autoComplete="family-name"
                disabled={salvando}
                placeholder="Sobrenome"
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="usuarioCargo">Cargo</label>
              <input
                id="usuarioCargo"
                value={cargo}
                onChange={(event) => setCargo(event.target.value)}
                maxLength={150}
                disabled={salvando}
                placeholder="Cargo ou função"
              />
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="usuarioEmail">
                E-mail <span className="required-mark">*</span>
              </label>
              <input
                id="usuarioEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                disabled={salvando}
                maxLength={254}
                placeholder="nome@exemplo.com"
              />
              {editando && (
                <small>
                  O novo e-mail será aplicado pela administração do sistema.
                </small>
              )}
            </div>

            <div className="form-field form-field-full">
              <label htmlFor="usuarioSenha">
                {editando ? 'Nova senha' : 'Senha inicial'}
                {!editando && <span className="required-mark"> *</span>}
              </label>
              <input
                id="usuarioSenha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required={!editando}
                disabled={salvando}
                placeholder={
                  editando
                    ? 'Deixe em branco para manter a senha atual'
                    : 'Mínimo de 8 caracteres'
                }
              />
              <small>
                {editando
                  ? 'Preencha somente se desejar redefinir a senha.'
                  : 'Informe uma senha inicial com pelo menos 8 caracteres.'}
              </small>
            </div>

            <div className="form-field">
              <label htmlFor="usuarioPerfil">
                Perfil de acesso <span className="required-mark">*</span>
              </label>
              <select
                id="usuarioPerfil"
                value={perfil}
                onChange={(event) =>
                  setPerfil(event.target.value as PerfilUsuario)
                }
                required
                disabled={salvando}
              >
                <option value="servidor">Servidor</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </div>
        </section>

        {erroValidacao && (
          <div className="message-card error" role="alert">
            {erroValidacao}
          </div>
        )}

        {erro && (
          <div className="message-card error" role="alert">
            {erro}
          </div>
        )}

        <div className="form-footer">
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
              {salvando
                ? 'Salvando...'
                : editando
                  ? 'Salvar alterações'
                  : 'Cadastrar usuário'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
