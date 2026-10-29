
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        setErro('Não foi possível entrar. Confira o e-mail e a senha.')
      }
    } catch {
      setErro('Ocorreu um erro ao tentar entrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-heading">
          <h1>Bem-vindo ao EasyPCA</h1>
        </div>

        <form className="login-form" onSubmit={entrar}>
          <div className="login-field">
            <label htmlFor="login-email">E-mail institucional</label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="seu.email@instituicao.gov.br"
              required
              disabled={carregando}
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-senha">Senha</label>

            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
              disabled={carregando}
            />
          </div>

          {erro && (
            <div className="message-card error" role="alert">
  {erro}
</div>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar no sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
