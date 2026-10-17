/**
 * Responsive sx от ширины container query, не viewport.
 * Предку нужен `containerType: "inline-size"` (см. buildQuizPlayContainerSx).
 * `@` — базовый размер; `@sm` — от theme sm (600px) ширины контейнера.
 */
export function pcq<Base, AtSm = Base>(base: Base, atSm: AtSm): { "@": Base; "@sm": AtSm } {
  return { "@": base, "@sm": atSm };
}
