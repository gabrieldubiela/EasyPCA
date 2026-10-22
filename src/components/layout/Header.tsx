
type Exercicio = {
  id: string
  ano: number
  status: string
}

type HeaderProps = {
  paginaAtiva: string
  exercicioId: string
  exercicios: Exercicio[]
  carregando: boolean
  onSelecionarExercicio: (id: string) => void
}

export default function Header({
  paginaAtiva,
  exercicioId,
  exercicios,
  carregando,
  onSelecionarExercicio,
}: HeaderProps) {
  return (
    <header className="topbar">

      <div className="exercise-control">
        <label htmlFor="exercicio">Exercício</label>
        <select
          id="exercicio"
          value={exercicioId}
          onChange={(event) => onSelecionarExercicio(event.target.value)}
          disabled={carregando || exercicios.length === 0}
        >
          {exercicios.length === 0 && (
            <option value="">Nenhum exercício</option>
          )}

          {exercicios.map((exercicio) => (
            <option key={exercicio.id} value={exercicio.id}>
              {exercicio.ano}
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
