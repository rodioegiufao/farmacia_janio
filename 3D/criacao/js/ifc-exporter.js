import { evalValue, parameterMap, pointTo3D } from "./state.js";

const IFC_SCHEMA = {
  IFC2X3: "IFC2X3",
  IFC4: "IFC4",
};

const IFC_CATEGORY_TYPES = {
  "Mobiliário": { ifc2x3: "IFCFURNISHINGELEMENT", ifc4: "IFCFURNISHINGELEMENT", predefined: ".USERDEFINED." },
  "Equipamento": { ifc2x3: "IFCBUILDINGELEMENTPROXY", ifc4: "IFCBUILDINGELEMENTPROXY", predefined: ".USERDEFINED." },
  "Modelo genérico": { ifc2x3: "IFCBUILDINGELEMENTPROXY", ifc4: "IFCBUILDINGELEMENTPROXY", predefined: ".USERDEFINED." },
  "Esquadria": { ifc2x3: "IFCBUILDINGELEMENTPROXY", ifc4: "IFCBUILDINGELEMENTPROXY", predefined: ".USERDEFINED." },
  "Hidrossanitário": { ifc2x3: "IFCFLOWSEGMENT", ifc4: "IFCFLOWSEGMENT", predefined: ".USERDEFINED." },
};

const sanitize = (value) => String(value ?? "").replace(/'/g, "''");
const num = (value) => Number.isFinite(value) ? Number(value.toFixed(6)).toString() : "0";
const guid = () => Math.random().toString(36).slice(2, 24).padEnd(22, "0").slice(0, 22);

class IfcWriter {
  constructor(schema) {
    this.schema = schema;
    this.nextId = 1;
    this.lines = [];
  }

  add(type, args) {
    const id = this.nextId++;
    this.lines.push(`#${id}=${type}(${args.join(",")});`);
    return id;
  }

  ref(id) {
    return `#${id}`;
  }
}

function getElementType(category, schema) {
  const fallback = IFC_CATEGORY_TYPES["Modelo genérico"];
  const entry = IFC_CATEGORY_TYPES[category] || fallback;
  return schema === IFC_SCHEMA.IFC4 ? entry.ifc4 : entry.ifc2x3;
}

function createSpatialStructure(writer, projectName) {
  const origin = writer.add("IFCCARTESIANPOINT", ["(0.,0.,0.)"]);
  const axisZ = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const axisX = writer.add("IFCDIRECTION", ["(1.,0.,0.)"]);
  const placement3d = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(origin), writer.ref(axisZ), writer.ref(axisX)]);
  const localPlacement = writer.add("IFCLOCALPLACEMENT", ["$", writer.ref(placement3d)]);
  const context = writer.add("IFCGEOMETRICREPRESENTATIONCONTEXT", ["$", "'Model'", "3", "1.E-05", writer.ref(placement3d), "$"]);
  const unitAssignment = writer.add("IFCUNITASSIGNMENT", ["(#1)"]);
  const project = writer.add("IFCPROJECT", [`'${guid()}'`, "$", `'${sanitize(projectName)}'`, "$", "$", "$", "$", `(${writer.ref(context)})`, writer.ref(unitAssignment)]);
  const site = writer.add("IFCSITE", [`'${guid()}'`, "$", "'Terreno'", "$", "$", writer.ref(localPlacement), "$", "$", ".ELEMENT.", "$", "$", "$", "$", "$"]);
  const building = writer.add("IFCBUILDING", [`'${guid()}'`, "$", "'Edificação'", "$", "$", writer.ref(localPlacement), "$", "$", ".ELEMENT.", "$", "$", "$"]);
  const storey = writer.add("IFCBUILDINGSTOREY", [`'${guid()}'`, "$", "'Nível 0'", "$", "$", writer.ref(localPlacement), "$", "$", ".ELEMENT.", "0."]);
  writer.add("IFCRELAGGREGATES", [`'${guid()}'`, "$", "$", "$", writer.ref(project), `(${writer.ref(site)})`]);
  writer.add("IFCRELAGGREGATES", [`'${guid()}'`, "$", "$", "$", writer.ref(site), `(${writer.ref(building)})`]);
  writer.add("IFCRELAGGREGATES", [`'${guid()}'`, "$", "$", "$", writer.ref(building), `(${writer.ref(storey)})`]);
  return { context, localPlacement, project, storey };
}

function addExtrusion(writer, state, extrusion, profile, params, context) {
  const depth = Math.max(evalValue(extrusion.depth, params), 0.001);
  const offset = Number(extrusion.offset) || 0;
  const points3d = profile.points.map((point) => pointTo3D(point, profile.view, offset));
  const min = points3d.reduce((acc, point) => ({ x: Math.min(acc.x, point.x), y: Math.min(acc.y, point.y), z: Math.min(acc.z, point.z) }), { x: Infinity, y: Infinity, z: Infinity });
  const local2d = profile.points.map((point) => ({ x: point.x, y: point.y }));
  const elementOrigin = writer.add("IFCCARTESIANPOINT", [`(${num(min.x)},${num(min.y)},${num(min.z)})`]);
  const axisZ = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const axisX = writer.add("IFCDIRECTION", ["(1.,0.,0.)"]);
  const placement3d = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(elementOrigin), writer.ref(axisZ), writer.ref(axisX)]);
  const localPlacement = writer.add("IFCLOCALPLACEMENT", [writer.ref(context.localPlacement), writer.ref(placement3d)]);
  const pointIds = local2d.map((point) => writer.add("IFCCARTESIANPOINT", [`(${num(point.x)},${num(point.y)})`]));
  if (pointIds[0] !== pointIds.at(-1)) pointIds.push(pointIds[0]);
  const polyline = writer.add("IFCPOLYLINE", [`(${pointIds.map((id) => writer.ref(id)).join(",")})`]);
  const profileDef = writer.add("IFCARBITRARYCLOSEDPROFILEDEF", [".AREA.", `'${sanitize(profile.name)}'`, writer.ref(polyline)]);
  const solidPlacement = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(elementOrigin), writer.ref(axisZ), writer.ref(axisX)]);
  const dir = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const solid = writer.add("IFCEXTRUDEDAREASOLID", [writer.ref(profileDef), writer.ref(solidPlacement), writer.ref(dir), num(depth)]);
  const representation = writer.add("IFCSHAPEREPRESENTATION", [writer.ref(context.context), "'Body'", "'SweptSolid'", `(${writer.ref(solid)})`]);
  const productShape = writer.add("IFCPRODUCTDEFINITIONSHAPE", ["$", "$", `(${writer.ref(representation)})`]);
  const type = getElementType(state.category, writer.schema);
  const element = writer.add(type, [`'${guid()}'`, "$", `'${sanitize(extrusion.name)}'`, "$", "$", writer.ref(localPlacement), writer.ref(productShape), "$"]);
  return element;
}

export function exportFamilyToIfc(state, schema = IFC_SCHEMA.IFC4) {
  if (!Object.values(IFC_SCHEMA).includes(schema)) throw new Error("Escolha IFC2X3 ou IFC4.");
  const writer = new IfcWriter(schema);
  writer.lines.push("#1=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);");
  writer.nextId = 2;
  const context = createSpatialStructure(writer, state.name);
  const params = parameterMap(state);
  const elementIds = [];
  for (const extrusion of state.extrusions.filter((item) => item.visible !== false)) {
    const profile = state.profiles.find((item) => item.id === extrusion.profileId && item.visible !== false);
    if (!profile || profile.points.length < 3) continue;
    elementIds.push(addExtrusion(writer, state, extrusion, profile, params, context));
  }
  if (!elementIds.length) throw new Error("Crie ao menos uma extrusão visível antes de exportar IFC.");
  writer.add("IFCRELCONTAINEDINSPATIALSTRUCTURE", [`'${guid()}'`, "$", "$", "$", `(${elementIds.map((id) => writer.ref(id)).join(",")})`, writer.ref(context.storey)]);

  return [
    "ISO-10303-21;",
    "HEADER;",
    `FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`,
    `FILE_NAME('${sanitize(state.name)}.ifc','${new Date().toISOString()}',('EngRodrigo'),('EngRodrigo'),'EngRodrigo Family Studio','EngRodrigo Family Studio','');`,
    `FILE_SCHEMA(('${schema}'));`,
    "ENDSEC;",
    "DATA;",
    ...writer.lines,
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n");
}