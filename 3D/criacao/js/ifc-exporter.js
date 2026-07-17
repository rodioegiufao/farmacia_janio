import { wallLength } from "./state.js";

const IFC_GUID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
const IFC_GUID_RE = /^[0-3][0-9A-Za-z_$]{21}$/;

function stepString(value) {
  const text = String(value ?? "");
  let out = "";
  let unicodeBuffer = "";

  const flushUnicode = () => {
    if (!unicodeBuffer) return;
    out += `\\X2\\${unicodeBuffer}\\X0\\`;
    unicodeBuffer = "";
  };

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint >= 32 && codePoint <= 126 && char !== "\\") {
      flushUnicode();
      out += char === "'" ? "''" : char;
      continue;
    }

    unicodeBuffer += codePoint.toString(16).toUpperCase().padStart(4, "0");
  }

  flushUnicode();
  return `'${out}'`;
}

function stepReal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Número inválido para IFC: ${value}`);
  if (Math.abs(n) < 1e-9) return "0.";

  const rounded = Math.round(n * 1e9) / 1e9;
  const clean = Object.is(rounded, -0) ? 0 : rounded;
  let text = clean.toFixed(9).replace(/0+$/, "");
  if (text.endsWith(".")) text = text.slice(0, -1);
  return text.includes(".") ? text : `${text}.`;
}

function stepInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Inteiro inválido para IFC: ${value}`);
  return String(Math.trunc(n));
}

function uuidToIfcGuid(uuid) {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error(`UUID inválido para GlobalId IFC: ${uuid}`);
  }

  let value = BigInt(`0x${hex}`);
  let guid = "";
  for (let i = 0; i < 22; i += 1) {
    guid = IFC_GUID_ALPHABET[Number(value & 63n)] + guid;
    value >>= 6n;
  }

  if (!IFC_GUID_RE.test(guid)) {
    throw new Error(`GlobalId IFC inválido gerado: ${guid}`);
  }

  return guid;
}

function newIfcGuid(usedGuids) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const guid = uuidToIfcGuid(crypto.randomUUID());
    if (!usedGuids.has(guid)) {
      usedGuids.add(guid);
      return guid;
    }
  }
  throw new Error("Não foi possível gerar um GlobalId IFC único.");
}

function direction3(x, y, z) {
  return `IFCDIRECTION((${stepReal(x)},${stepReal(y)},${stepReal(z)}))`;
}

function point3(x, y, z) {
  return `IFCCARTESIANPOINT((${stepReal(x)},${stepReal(y)},${stepReal(z)}))`;
}

function isValidPoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

export function buildIfc(project) {
  if (!project.walls.length) throw new Error("Projeto vazio ao exportar IFC.");

  let id = 1;
  const rows = [];
  const usedGuids = new Set();
  const guid = () => newIfcGuid(usedGuids);
  const add = (value) => {
    rows.push(`#${id}=${value};`);
    return id++;
  };
  
  const person = add(
    `IFCPERSON($,${stepString("Damasceno")},${stepString("Rodrigo")},$,$,$,$,$)`,
  );
  const organization = add(
    `IFCORGANIZATION($,${stepString("EngRodrigo")},${stepString("EngRodrigo")},$,$)`,
  );
  const personAndOrganization = add(
    `IFCPERSONANDORGANIZATION(#${person},#${organization},$)`,
  );
  const application = add(
    `IFCAPPLICATION(#${organization},${stepString("1.0")},${stepString("EngRodrigo BIM")},${stepString("ERBIM")})`,
  );
  const ownerHistory = add(
    `IFCOWNERHISTORY(#${personAndOrganization},#${application},$,.ADDED.,$,$,$,${stepInt(Date.now() / 1000)})`,
  );

  const lengthUnit = add("IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)");
  const units = add(`IFCUNITASSIGNMENT((#${lengthUnit}))`);

  const origin = add(point3(0, 0, 0));
  const globalZ = add(direction3(0, 0, 1));
  const globalX = add(direction3(1, 0, 0));
  const worldPlacement = add(
    `IFCAXIS2PLACEMENT3D(#${origin},#${globalZ},#${globalX})`,
  );
  const context = add(
    `IFCGEOMETRICREPRESENTATIONCONTEXT($,${stepString("Model")},3,1.E-05,#${worldPlacement},$)`,
  );
  const bodyContext = add(
    `IFCGEOMETRICREPRESENTATIONSUBCONTEXT(${stepString("Body")},${stepString("Model")},*,*,*,*,#${context},$,.MODEL_VIEW.,$)`,
  );

  const projectId = add(
    `IFCPROJECT(${stepString(guid())},#${ownerHistory},${stepString(project.name || "Projeto sem nome")},$,$,$,$,(#${context}),#${units})`,
  );

  const siteAxis = add(`IFCAXIS2PLACEMENT3D(#${origin},#${globalZ},#${globalX})`);
  const sitePlacement = add(`IFCLOCALPLACEMENT($,#${siteAxis})`);
  const buildingAxis = add(`IFCAXIS2PLACEMENT3D(#${origin},#${globalZ},#${globalX})`);
  const buildingPlacement = add(
    `IFCLOCALPLACEMENT(#${sitePlacement},#${buildingAxis})`,
  );
  const storeyAxis = add(`IFCAXIS2PLACEMENT3D(#${origin},#${globalZ},#${globalX})`);
  const storeyPlacement = add(
    `IFCLOCALPLACEMENT(#${buildingPlacement},#${storeyAxis})`,
  );
  const site = add(
    `IFCSITE(${stepString(guid())},#${ownerHistory},${stepString("Terreno")},$,$,#${sitePlacement},$,$,.ELEMENT.,$,$,$,$,$)`,
  );
  const building = add(
    `IFCBUILDING(${stepString(guid())},#${ownerHistory},${stepString("Edificação")},$,$,#${buildingPlacement},$,$,.ELEMENT.,$,$,$)`,
  );
  const storey = add(
    `IFCBUILDINGSTOREY(${stepString(guid())},#${ownerHistory},${stepString("Pavimento térreo")},$,$,#${storeyPlacement},$,$,.ELEMENT.,0.)`,
  );
  add(
    `IFCRELAGGREGATES(${stepString(guid())},#${ownerHistory},${stepString("Projeto")},$,#${projectId},(#${site}))`,
  );
  add(
    `IFCRELAGGREGATES(${stepString(guid())},#${ownerHistory},${stepString("Terreno")},$,#${site},(#${building}))`,
  );
  add(
    `IFCRELAGGREGATES(${stepString(guid())},#${ownerHistory},${stepString("Edificação")},$,#${building},(#${storey}))`,
  );
  const wallIds = [];
  for (const [index, wallData] of project.walls.entries()) {
    if (!isValidPoint(wallData.start) || !isValidPoint(wallData.end)) {
      throw new Error(`Parede inválida na posição ${index + 1}.`);
    }

    const length = wallLength(wallData);
    if (!Number.isFinite(length) || length <= 1e-6) {
      throw new Error(`Parede com comprimento inválido na posição ${index + 1}.`);
    }

    const dx = wallData.end.x - wallData.start.x;
    const dy = wallData.end.y - wallData.start.y;
    const angle = Math.atan2(dy, dx);
    const midX = (wallData.start.x + wallData.end.x) / 2;
    const midY = (wallData.start.y + wallData.end.y) / 2;
    const baseElevation = Number(wallData.baseElevation) || 0;
    const height = Number(wallData.height) || 2.8;
    const thickness = Number(wallData.thickness) || 0.15;
    const name = wallData.name || `Parede ${String(index + 1).padStart(3, "0")}`;

    const wallOrigin = add(point3(midX, midY, baseElevation));
    const wallX = add(direction3(Math.cos(angle), Math.sin(angle), 0));
    const wallAxis = add(
      `IFCAXIS2PLACEMENT3D(#${wallOrigin},#${globalZ},#${wallX})`,
    );
    const wallPlacement = add(
      `IFCLOCALPLACEMENT(#${storeyPlacement},#${wallAxis})`,
    );
    const profile = add(
      `IFCRECTANGLEPROFILEDEF(.AREA.,${stepString(name)},$,${stepReal(length)},${stepReal(thickness)})`,
    );
    const solidAxis = add(
      `IFCAXIS2PLACEMENT3D(#${origin},#${globalZ},#${globalX})`,
    );
    const solid = add(
      `IFCEXTRUDEDAREASOLID(#${profile},#${solidAxis},#${globalZ},${stepReal(height)})`,
    );
    const rep = add(
      `IFCSHAPEREPRESENTATION(#${ctx},'Body','SweptSolid',(#${solid}))`,
    );
    const shape = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${rep}))`);
    const wall = add(
      `IFCWALL(${stepString(guid())},#${ownerHistory},${stepString(name)},$,$,#${wallPlacement},#${shape},$,.STANDARD.)`,
    );
    wallIds.push(`#${wall}`);
  }

  if (!wallIds.length) throw new Error("Nenhuma parede válida para exportar IFC.");

  add(
    `IFCRELCONTAINEDINSPATIALSTRUCTURE(${stepString(guid())},#${ownerHistory},${stepString("Paredes no térreo")},$,(${wallIds.join(",")}),#${storey})`,
  );
  
  return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((${stepString("ViewDefinition [ReferenceView_V1.2]")}),${stepString("2;1")});\nFILE_NAME(${stepString(`${project.name || "projeto"}.ifc`)},${stepString(new Date().toISOString())},(${stepString("EngRodrigo BIM")}),(${stepString("EngRodrigo")}),${stepString("EngRodrigo BIM")},${stepString("EngRodrigo BIM")},${stepString("")});\nFILE_SCHEMA((${stepString("IFC4")}));\nENDSEC;\nDATA;\n${rows.join("\n")}\nENDSEC;\nEND-ISO-10303-21;\n`;
}

export function ifcFileName(name) {
  return `${String(name || "projeto")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}_${new Date().toISOString().slice(0, 10)}.ifc`;
}