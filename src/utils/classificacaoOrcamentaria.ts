
export type ParteClassificacao = {
  codigo: string | null | undefined
}

/**
 * Monta o código completo da classificação orçamentária,
 * separando os códigos por pontos.
 */
export function montarCodigoOrcamentario(
  partes: ParteClassificacao[],
): string {
  return partes
    .map((parte) => parte.codigo?.trim() || '—')
    .join('.')
}
