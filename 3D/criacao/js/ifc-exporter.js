import { evalValue, parameterMap, pointTo3D } from "./state.js";

const IFC_SCHEMA = {
  IFC2X3: "IFC2X3",
  IFC4: "IFC4",
};
const IFC_GUID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
const APP_NAME = "EngRodrigo Family Studio";

const IFC_CATEGORY_TYPES = {
  Mobiliário: {
    ifc2x3: "IFCFURNISHINGELEMENT",
    ifc4: "IFCFURNISHINGELEMENT",
    predefined: ".USERDEFINED.",
  },
  Equipamento: {
    ifc2x3: "IFCBUILDINGELEMENTPROXY",
    ifc4: "IFCBUILDINGELEMENTPROXY",
    predefined: ".USERDEFINED.",
  },
  "Modelo genérico": {
    ifc2x3: "IFCBUILDINGELEMENTPROXY",
    ifc4: "IFCBUILDINGELEMENTPROXY",
    predefined: ".USERDEFINED.",
  },
  Esquadria: {
    ifc2x3: "IFCBUILDINGELEMENTPROXY",
    ifc4: "IFCBUILDINGELEMENTPROXY",
    predefined: ".USERDEFINED.",
  },
  Hidrossanitário: {
    ifc2x3: "IFCBUILDINGELEMENTPROXY",
    ifc4: "IFCBUILDINGELEMENTPROXY",
    predefined: ".USERDEFINED.",
  },
};

const sanitize = (value) => String(value ?? "").replace(/'/g, "''");
const str = (value) => `'${sanitize(value)}'`;
const optStr = (value) => (value ? str(value) : "$ ".trim());
const num = (value) =>
  Number.isFinite(value) ? Number(value.toFixed(6)).toString() : "0";
const timestamp = () => Math.floor(Date.now() / 1000).toString();

function uuidBytes() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function compressUuidToIfcGuid(uuidHex) {
  let value = BigInt(`0x${uuidHex}`);
  const chars = Array(22).fill("0");
  for (let i = 21; i >= 0; i -= 1) {
    chars[i] = IFC_GUID_ALPHABET[Number(value & 63n)];
    value >>= 6n;
  }
  return chars.join("");
}

function createGuidFactory() {
  const used = new Set();
  return () => {
    let id;
    do {
      id = compressUuidToIfcGuid(uuidBytes());
    } while (used.has(id));
    used.add(id);
    return id;
  };
}

class IfcWriter {
  constructor(schema) {
    this.schema = schema;
    this.nextId = 1;
    this.lines = [];
    this.guid = createGuidFactory();
  }

  add(type, args) {
    const id = this.nextId++;
    this.lines.push(`#${id}=${type}(${args.join(",")});`);
    return id;
  }

  ref(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Referência IFC inválida: ${id}`);
    }
    return `#${id}`;
  }
  refs(ids) {
    return `(${ids.map((id) => this.ref(id)).join(",")})`;
  }

  rootArgs(ownerHistory, name, description = "$", objectType = "$") {
    return [str(this.guid()), this.ref(ownerHistory), str(name), description, objectType];
  }
}

function getElementInfo(category, schema) {
  const fallback = IFC_CATEGORY_TYPES["Modelo genérico"];
  const entry = IFC_CATEGORY_TYPES[category] || fallback;
  return {
    type: schema === IFC_SCHEMA.IFC4 ? entry.ifc4 : entry.ifc2x3,
    predefined: entry.predefined,
  };
}

function createOwnerHistory(writer) {
  const person = writer.add("IFCPERSON", ["$", "'EngRodrigo'", "$", "$", "$", "$", "$", "$"]);
  const organization = writer.add("IFCORGANIZATION", ["$", str(APP_NAME), "$", "$", "$"]);
  const personAndOrganization = writer.add("IFCPERSONANDORGANIZATION", [
    writer.ref(person),
    writer.ref(organization),
    "$",
  ]);
  const application = writer.add("IFCAPPLICATION", [
    writer.ref(organization),
    "'1.0'",
    str(APP_NAME),
    "'ENGRODRIGO_FAMILY_STUDIO'",
  ]);
  return writer.add("IFCOWNERHISTORY", [
    writer.ref(personAndOrganization),
    writer.ref(application),
    "$",
    ".ADDED.",
    "$",
    writer.ref(personAndOrganization),
    writer.ref(application),
    timestamp(),
  ]);
  }

function createBaseGeometry(writer) {
  const lengthUnit = writer.add("IFCSIUNIT", ["*", ".LENGTHUNIT.", ".MILLI.", ".METRE."]);
  const planeAngleUnit = writer.add("IFCSIUNIT", ["*", ".PLANEANGLEUNIT.", "$", ".RADIAN."]);
  const unitAssignment = writer.add("IFCUNITASSIGNMENT", [writer.refs([lengthUnit, planeAngleUnit])]);
  const origin = writer.add("IFCCARTESIANPOINT", ["(0.,0.,0.)"]);
  const axisZ = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const axisX = writer.add("IFCDIRECTION", ["(1.,0.,0.)"]);
  const placement3d = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(origin), writer.ref(axisZ), writer.ref(axisX)]);
  const worldPlacement = writer.add("IFCLOCALPLACEMENT", ["$", writer.ref(placement3d)]);
  const context = writer.add("IFCGEOMETRICREPRESENTATIONCONTEXT", [
    "$",
    "'Model'",
    "3",
    "1.E-05",
    writer.ref(placement3d),
    "$",
  ]);
  return { unitAssignment, placement3d, worldPlacement, context };
}

function createIfc4SpatialStructure(writer, projectName, ownerHistory) {
  const base = createBaseGeometry(writer);
  const project = writer.add("IFCPROJECT", [
    ...writer.rootArgs(ownerHistory, projectName),
    "$",
    "$",
    `(${writer.ref(base.context)})`,
    writer.ref(base.unitAssignment),
  ]);
  const site = writer.add("IFCSITE", [
    ...writer.rootArgs(ownerHistory, "Terreno"),
    writer.ref(base.worldPlacement),
    "$",
    "$",
    ".ELEMENT.",
    "$",
    "$",
    "$",
    "$",
    "$",
  ]);
  const building = writer.add("IFCBUILDING", [
    ...writer.rootArgs(ownerHistory, "Edificação"),
    writer.ref(base.worldPlacement),
    "$",
    "$",
    ".ELEMENT.",
    "$",
    "$",
    "$",
  ]);
  const storey = writer.add("IFCBUILDINGSTOREY", [
    ...writer.rootArgs(ownerHistory, "Nível 0"),
    writer.ref(base.worldPlacement),
    "$",
    "'Nível 0'",
    "$",
    ".ELEMENT.",
    "0.",
  ]);
  addAggregates(writer, ownerHistory, project, site, building, storey);
  return { ...base, project, storey };
}

function createIfc2x3SpatialStructure(writer, projectName, ownerHistory) {
  const base = createBaseGeometry(writer);
  const project = writer.add("IFCPROJECT", [
    ...writer.rootArgs(ownerHistory, projectName),
    "$",
    `(${writer.ref(base.context)})`,
    writer.ref(base.unitAssignment),
  ]);
  const site = writer.add("IFCSITE", [
    ...writer.rootArgs(ownerHistory, "Terreno"),
    writer.ref(base.worldPlacement),
    "$",
    "$",
    ".ELEMENT.",
    "$",
    "$",
    "$",
    "$",
    "$",
  ]);
  const building = writer.add("IFCBUILDING", [
    ...writer.rootArgs(ownerHistory, "Edificação"),
    writer.ref(base.worldPlacement),
    "$",
    "$",
    ".ELEMENT.",
    "$",
    writer.ref(site),
    `(${writer.ref(building)})`,
  ]);
  writer.add("IFCRELAGGREGATES", [
    `'${guid()}'`,
    "$",
    "$",
  ]);
  const storey = writer.add("IFCBUILDINGSTOREY", [
    ...writer.rootArgs(ownerHistory, "Nível 0"),
    writer.ref(base.worldPlacement),
    "$",
    "$",
    ".ELEMENT.",
    "0.",
  ]);
  addAggregates(writer, ownerHistory, project, site, building, storey);
  return { ...base, project, storey };
}

function addAggregates(writer, ownerHistory, project, site, building, storey) {
  [[project, site], [site, building], [building, storey]].forEach(([parent, child]) => {
    writer.add("IFCRELAGGREGATES", [
      ...writer.rootArgs(ownerHistory, "Agregação", "$", "$"),
      writer.ref(parent),
      writer.refs([child]),
    ]);
  });
}

function createElement(writer, state, extrusion, localPlacement, productShape, ownerHistory) {
  const info = getElementInfo(state.category, writer.schema);
  const baseArgs = [
    ...writer.rootArgs(ownerHistory, extrusion.name),
    writer.ref(localPlacement),
    writer.ref(productShape),
    "$",
  ];
  if (writer.schema === IFC_SCHEMA.IFC4 && info.type === "IFCBUILDINGELEMENTPROXY") {
    return writer.add(info.type, [...baseArgs, info.predefined]);
  }
  return writer.add(info.type, baseArgs);
}

function addExtrusion(writer, state, extrusion, profile, params, context, ownerHistory) {
  const depth = Math.max(evalValue(extrusion.depth, params), 0.001);
  const offset = Number(extrusion.offset) || 0;
  const points3d = profile.points.map((point) => pointTo3D(point, profile.view, offset));
  const min = points3d.reduce(
    (acc, point) => ({
      x: Math.min(acc.x, point.x),
      y: Math.min(acc.y, point.y),
      z: Math.min(acc.z, point.z),
    }),
    { x: Infinity, y: Infinity, z: Infinity },
  );
  const elementOrigin = writer.add("IFCCARTESIANPOINT", [`(${num(min.x)},${num(min.y)},${num(min.z)})`]);
  const axisZ = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const axisX = writer.add("IFCDIRECTION", ["(1.,0.,0.)"]);
  const placement3d = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(elementOrigin), writer.ref(axisZ), writer.ref(axisX)]);
  const localPlacement = writer.add("IFCLOCALPLACEMENT", [writer.ref(context.worldPlacement), writer.ref(placement3d)]);
  const pointIds = profile.points.map((point) =>
    writer.add("IFCCARTESIANPOINT", [`(${num(point.x)},${num(point.y)})`]),
  );
  if (pointIds[0] !== pointIds.at(-1)) pointIds.push(pointIds[0]);
  const polyline = writer.add("IFCPOLYLINE", [writer.refs(pointIds)]);
  const profileDef = writer.add("IFCARBITRARYCLOSEDPROFILEDEF", [
    ".AREA.",
    optStr(profile.name),
    writer.ref(polyline),
  ]);
  const solidPlacement = writer.add("IFCAXIS2PLACEMENT3D", [writer.ref(elementOrigin), writer.ref(axisZ), writer.ref(axisX)]);
  const direction = writer.add("IFCDIRECTION", ["(0.,0.,1.)"]);
  const solid = writer.add("IFCEXTRUDEDAREASOLID", [writer.ref(profileDef), writer.ref(solidPlacement), writer.ref(direction), num(depth)]);
  const representation = writer.add("IFCSHAPEREPRESENTATION", [
    writer.ref(context.context),
    "'Body'",
    "'SweptSolid'",
    writer.refs([solid]),
  ]);
  const productShape = writer.add("IFCPRODUCTDEFINITIONSHAPE", ["$", "$", writer.refs([representation])]);
  return createElement(writer, state, extrusion, localPlacement, productShape, ownerHistory);
}

function createModel(writer, state) {
  const ownerHistory = createOwnerHistory(writer);
  const context = writer.schema === IFC_SCHEMA.IFC4
    ? createIfc4SpatialStructure(writer, state.name, ownerHistory)
    : createIfc2x3SpatialStructure(writer, state.name, ownerHistory);
  const params = parameterMap(state);
  const elementIds = [];
  for (const extrusion of state.extrusions.filter((item) => item.visible !== false)) {
    const profile = state.profiles.find((item) => item.id === extrusion.profileId && item.visible !== false);
    if (!profile || profile.points.length < 3) continue;
    elementIds.push(addExtrusion(writer, state, extrusion, profile, params, context, ownerHistory));
  }
  if (!elementIds.length) {
    throw new Error("Crie ao menos uma extrusão visível antes de exportar IFC.");
  }
  writer.add("IFCRELCONTAINEDINSPATIALSTRUCTURE", [
    ...writer.rootArgs(ownerHistory, "Contenção espacial", "$", "$"),
    writer.refs(elementIds),
    writer.ref(context.storey),
  ]);
}

export function exportFamilyToIfc(state, schema = IFC_SCHEMA.IFC4) {
  if (!Object.values(IFC_SCHEMA).includes(schema)) {
    throw new Error("Escolha IFC2X3 ou IFC4.");
  }
  const writer = new IfcWriter(schema);
  createModel(writer, state);
  return [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');",
    `FILE_NAME('${sanitize(state.name)}.ifc','${new Date().toISOString()}',('EngRodrigo'),('EngRodrigo'),'${APP_NAME}','${APP_NAME}','');`,
    `FILE_SCHEMA(('${schema}'));`,
    "ENDSEC;",
    "DATA;",
    ...writer.lines,
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n");
}