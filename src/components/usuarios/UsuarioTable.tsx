
import { useMemo, useState } from 'react'
import type { Usuario } from '../../pages/Usuarios'

type UsuarioTableProps = {
  usuarios: Usuario[]
  carregando: boolean
  onEditar: (usuario: Usuario) => void
  onExcluir: (usuario: Usuario) => void
  onAtualizar: () => void
}

function formatarData(data: string) {
  if (!data) return '—'

  const dataValida = new Date(data)

  if (Number.isNaN(dataValida.getTime())) return '—'

  return dataValida.toLocaleDateString('pt-BR')
}

export default function UsuarioTable({
  usuarios,
  carregando,
  onEditar,
  onExcluir,
  onAtualizar,
}: UsuarioTableProps) {
  const [busca, setBusca] = useState('')

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.toLocaleLowerCase('pt-BR').trim()

    if (!termo) return usuarios

    return usuarios.filter((usuario) =>
      [
        usuario.nome,
        usuario.sobrenome ?? '',
        usuario.cargo ?? '',
        usuario.email,
        usuario.perfil,
      ].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      ),
    )
  }, [usuarios, busca])

  function confirmarExclusao(usuario: Usuario) {
    const nomeCompleto = [usuario.nome, usuario.sobrenome]
      .filter(Boolean)
      .join(' ')

    const confirmado = window.confirm(
      `Deseja realmente excluir o usuário "${nomeCompleto}" (${usuario.email})?\n\nEssa ação não poderá ser desfeita.`,
    )

    if (confirmado) onExcluir(usuario)
  }

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Buscar por nome, cargo ou e-mail..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          aria-label="Buscar usuários"
        />

        <button
          type="button"
          className="secondary-button"
          onClick={onAtualizar}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>

      {carregando ? (
        <div className="empty-state">Carregando usuários...</div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="empty-state">
          <strong>
            {busca
              ? 'Nenhum usuário encontrado'
              : 'Nenhum usuário cadastrado'}
          </strong>

          {busca && <p>Tente buscar usando outro termo.</p>}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="process-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Sobrenome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id}>
                  <td>
                    <strong>{usuario.nome}</strong>
                  </td>

                  <td>{usuario.sobrenome || '—'}</td>
                  <td>{usuario.cargo || '—'}</td>
                  <td>{usuario.email}</td>

                  <td>
                    <span
                      className={`status-badge ${
                        usuario.perfil === 'administrador'
                          ? 'finished'
                          : 'ongoing'
                      }`}
                    >
                      {usuario.perfil === 'administrador'
                        ? 'Administrador'
                        : 'Servidor'}
                    </span>
                  </td>

                  <td>{formatarData(usuario.criado_em)}</td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="icon-action-button"
                        onClick={() => onEditar(usuario)}
                        aria-label={`Editar usuário ${usuario.nome}`}
                        title="Editar usuário"
                        disabled={carregando}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="icon-action-button"
                        onClick={() => confirmarExclusao(usuario)}
                        aria-label={`Excluir usuário ${usuario.nome}`}
                        title="Excluir usuário"
                        disabled={carregando}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="m19 6-1 14H6L5 6" />
                          <path d="M10 11v5M14 11v5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
