const VOID_KINDS = ["voidExtrusion", "voidBlend", "voidRevolve", "voidSweep", "voidSweptBlend"];
const isVoid = (kind) => VOID_KINDS.includes(kind);

export function collectVoidCutters(state, solidForm) {
  return (state.forms || []).filter((form) =>
    form.visible !== false &&
    isVoid(form.kind) &&
    form.kind === "voidExtrusion" &&
    form.profileId !== solidForm.profileId
  );
}

export function describeCsgStrategy() {
  return "MVP CSG: vazios de extrusão coplanares são aplicados como furos reais no perfil antes da geração da extrusão; demais vazios preservam metadados e visualização para evolução do motor booleano.";
}