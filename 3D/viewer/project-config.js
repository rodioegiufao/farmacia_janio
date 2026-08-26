// Configuração compartilhada dos projetos; nenhum módulo técnico é importado aqui.
const IPER_MODELS = [
    { id: "IFC_ELE", src: "/3D/iper/modelo-01.xkt" },
    { id: "IFC_LOG", src: "/3D/iper/modelo-02.xkt" },
    { id: "IFC_HID", src: "/3D/iper/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/iper/modelo-04.xkt" },
    { id: "IFC_EST", src: "/3D/iper/modelo-05.xkt" },
    //{ id: "IFC_ARQ", src: "/3D/iper/modelo-06.xkt" },
    { id: "IFC_PLU", src: "/3D/iper/modelo-07.xkt" },
    { id: "IFC_SAN", src: "/3D/iper/modelo-08.xkt" },
    { id: "IFC_INC", src: "/3D/iper/modelo-09.xkt" },
    { id: "IFC_EST_SQD", src: "/3D/iper/modelo-10.xkt" },
    { id: "IFC_EST_SUB", src: "/3D/iper/modelo-11.xkt" },
    { id: "IFC_EST_CT", src: "/3D/iper/modelo-12.xkt" },
    { id: "IFC_EST_MR", src: "/3D/iper/modelo-13.xkt" },
    { id: "IFC_EST_MRC", src: "/3D/iper/modelo-14.xkt" },
    { id: "IFC_FOT", src: "/3D/iper/modelo-15.xkt" },
    { id: "IFC_EMT_ESC", src: "/3D/iper/modelo-16.xkt" },
    { id: "IFC_EMT_COB", src: "/3D/iper/modelo-17.xkt" },
    { id: "IFC_CLI", src: "/3D/iper/modelo-18.xkt" },
    { id: "IFC_SPDA", src: "/3D/iper/modelo-19.xkt" },
    { id: "IFC_SUB", src: "/3D/iper/modelo-20.xkt" },
    { id: "IFC_ILUX", src: "/3D/iper/modelo-21.xkt" },
    { id: "IFC_TEF", src: "/3D/iper/modelo-22.xkt" },
    { id: "IFC_SDAI", src: "/3D/iper/modelo-23.xkt" },
    { id: "IFC_GLP", src: "/3D/iper/modelo-24.xkt" },
    { id: "IFC_IRRI", src: "/3D/iper/modelo-25.xkt" },
    { id: "IFC_SOM", src: "/3D/iper/modelo-26.xkt" },
];

const FARMACIA_MODELS = [
    { id: "IFC_LOG_TEF", src: "/3D/drogaria/modelo-05.xkt" },
    { id: "IFC_ELE", src: "/3D/drogaria/modelo-04.xkt" },
    //{ id: "IFC_ILUX", src: "/3D/drogaria/modelo-02.xkt" },
    { id: "IFC_EST", src: "/3D/drogaria/modelo-06.xkt" },
    { id: "IFC_SAN", src: "/3D/drogaria/modelo-08.xkt" },
    { id: "IFC_PLU", src: "/3D/drogaria/modelo-07.xkt" },
    { id: "IFC_ARQ", src: "/3D/drogaria/modelo-09.xkt" },
    { id: "IFC_FOT", src: "/3D/drogaria/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/drogaria/modelo-01.xkt" },
    { id: "IFC_CLI", src: "/3D/drogaria/modelo-10.xkt" },
    { id: "IFC_HID", src: "/3D/drogaria/modelo-11.xkt" },
    { id: "IFC_INC", src: "/3D/drogaria/modelo-12.xkt" },
    { id: "IFC_EXA", src: "/3D/drogaria/modelo-13.xkt" },
];

const POLICLINICA_MODELS = [
    { id: "IFC_EST_PP", src: "/3D/policlinica/modelo-01.xkt" },
    { id: "IFC_ELE_T_220", src: "/3D/policlinica/modelo-02.xkt" },
    { id: "IFC_PLU", src: "/3D/policlinica/modelo-03.xkt" },
    { id: "IFC_HID", src: "/3D/policlinica/modelo-04.xkt" },
    { id: "IFC_SAN", src: "/3D/policlinica/modelo-05.xkt" },
    { id: "IFC_ELE_S_220", src: "/3D/policlinica/modelo-06.xkt" },
    { id: "IFC_ITM", src: "/3D/policlinica/modelo-07.xkt" },
    { id: "IFC_ELE_A_220", src: "/3D/policlinica/modelo-08.xkt" },
    { id: "IFC_LOG", src: "/3D/policlinica/modelo-09.xkt" },
    { id: "IFC_TEF", src: "/3D/policlinica/modelo-10.xkt" },
    { id: "IFC_ALI_220", src: "/3D/policlinica/modelo-11.xkt" },
    { id: "IFC_ALI_380", src: "/3D/policlinica/modelo-12.xkt" },
    { id: "IFC_IRRI", src: "/3D/policlinica/modelo-13.xkt" },
];

const fecomercio_MODELS = [
    { id: "IFC_EST", src: "/3D/fecomercio/ifc-est-fecomercio.xkt" },
    { id: "IFC_ELE", src: "/3D/fecomercio/ifc-ele-fecomercio.xkt" },
    { id: "IFC_ARQ", src: "/3D/fecomercio/ifc-arq-fecomercio.xkt" },
    { id: "IFC_SAN_PLU", src: "/3D/fecomercio/ifc-san-plu-fecomercio.xkt" },
    { id: "IFC_HID", src: "/3D/fecomercio/ifc-hid-fecomercio.xkt" },
];

const CANAA_MODELS = [
    { id: "IFC_ELE", src: "/3D/esc_canaa/modelo-01.xkt" },
    { id: "IFC_ILUX", src: "/3D/esc_canaa/modelo-02.xkt" },
    { id: "IFC_LOG", src: "/3D/esc_canaa/modelo-03.xkt" },
    { id: "IFC_ALI", src: "/3D/esc_canaa/modelo-04.xkt" },
    { id: "IFC_INC", src: "/3D/esc_canaa/modelo-05.xkt" },
    { id: "IFC_EST_PP", src: "/3D/esc_canaa/modelo-06.xkt" },
    { id: "IFC_SUB", src: "/3D/esc_canaa/modelo-07.xkt" },
    { id: "IFC_CLI", src: "/3D/esc_canaa/modelo-08.xkt" },
    { id: "IFC_ILU", src: "/3D/esc_canaa/modelo-09.xkt" },
    { id: "IFC_SPDA", src: "/3D/esc_canaa/modelo-10.xkt" },
    { id: "IFC_HID", src: "/3D/esc_canaa/modelo-11.xkt" },
    { id: "IFC_SAN", src: "/3D/esc_canaa/modelo-12.xkt" },
    { id: "IFC_EXA", src: "/3D/esc_canaa/modelo-13.xkt" },
    { id: "IFC_ARQ", src: "/3D/esc_canaa/modelo-14.xkt" },
    { id: "IFC_PLU", src: "/3D/esc_canaa/modelo-15.xkt" },
    { id: "IFC_EST_EMT", src: "/3D/esc_canaa/modelo-16.xkt" },
    { id: "IFC_SDAI", src: "/3D/esc_canaa/modelo-17.xkt" },
    { id: "IFC_GLP", src: "/3D/esc_canaa/modelo-18.xkt" },
    { id: "IFC_IRRI", src: "/3D/esc_canaa/modelo-19.xkt" },
  ];

const SEBRAE_RR_MODELS = [
    { id: "IFC_ALI", src: "/3D/sebrae-rr/modelo-01.xkt" },
];

const SESC_CENTRO_ECOLOGICO_MODELS = [
    { id: "IFC_ARQ_SESC_GERAL", src: "/3D/sesc_centro_ecologico/XKT-ARQ-SESC-GERAL.xkt" },
];

const ESC_MODELO_MODELS = [
    { id: "IFC_EST_PP", src: "/3D/esc_modelo/modelo-01.xkt" },
    { id: "IFC_ARQ", src: "/3D/esc_modelo/modelo-02.xkt" },
    { id: "IFC_CLI", src: "/3D/esc_modelo/modelo-03.xkt" },
    { id: "IFC_SAN", src: "/3D/esc_modelo/modelo-04.xkt" },
    { id: "IFC_PLU", src: "/3D/esc_modelo/modelo-05.xkt" },
];

const defaultModels = [
    { id: "IFC_LOG_TEF", src: "/3D/lacen/modelo-01.xkt" },
    { id: "IFC_ELE", src: "/3D/lacen/modelo-02.xkt" },
    { id: "IFC_SPDA", src: "/3D/lacen/modelo-03.xkt" },
    { id: "IFC_ECX", src: "/3D/lacen/modelo-04.xkt" },
    { id: "IFC_ILUX", src: "/3D/lacen/modelo-05.xkt" },
    { id: "IFC_EST", src: "/3D/lacen/modelo-06.xkt" },
    { id: "IFC_SAN", src: "/3D/lacen/modelo-07.xkt" },
    { id: "IFC_INC", src: "/3D/lacen/modelo-08.xkt" },
    { id: "IFC_HID", src: "/3D/lacen/modelo-09.xkt" },
    { id: "IFC_PLU", src: "/3D/lacen/modelo-10.xkt" },
    { id: "IFC_GLP", src: "/3D/lacen/modelo-11.xkt" },
    //{ id: "IFC_ARQ", src: "/3D/lacen/modelo-12.xkt" },
    { id: "IFC_EST_SUB", src: "/3D/lacen/modelo-13.xkt" },
    { id: "IFC_CLI_DUT", src: "/3D/lacen/modelo-14.xkt" },
    { id: "IFC_EXA", src: "/3D/lacen/modelo-15.xkt" },
    { id: "IFC_CLI", src: "/3D/lacen/modelo-16.xkt" },
    { id: "IFC_EST_CT", src: "/3D/lacen/modelo-17.xkt" },
    { id: "IFC_ALI_220", src: "/3D/lacen/modelo-18.xkt" },
    { id: "IFC_ALI_380", src: "/3D/lacen/modelo-19.xkt" },
];

const IPER_MODEL_TRANSFORMS = {
    IFC_EST: { position: [-8.789, 0.4, 22.5] },
    IFC_SPDA: { position: [0.15, 0, -0.2], rotation: [0, 90, 0] },
    IFC_LOG: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
    IFC_TEF: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
    IFC_ELE: { position: [-13.93, 0, -0.19] },
    IFC_SAN: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
    IFC_SUB: { position: [2.74, -0.28, 2.65], rotation: [0, 96.1, 0] },
    IFC_INC: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_HID: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_PLU: { position: [0.15, 0, -0.19], rotation: [0, 90, 0] },
    IFC_FOT: { position: [0, 0, 0], rotation: [0, 90, 0]},
    IFC_CLI: { position: [0.16, 0, -0.2], rotation: [0, 90, 0]  },
    IFC_ALI: { position: [-13.94, 0, -0.17] },
    IFC_EST_SQD: { position: [18.655, -0.658, -15.215] },
    IFC_EST_SUB: { position: [27.7, -0.58, -22.4], rotation: [0, -84.1, 0] },
    IFC_EST_CT: { position: [-15.15, 1.44, -16.47], rotation: [0, 90, 0]  },
    IFC_EST_MR: { position: [35.25, 0, 20.2], rotation: [0, 90, 0]  },
    IFC_EST_MRC: { position: [-23, 0.35, 28.88] },
    IFC_EMT_ESC: { position: [0.14, 0.35, -0.15], rotation: [0, 90, 0]  },
    IFC_EMT_COB: { position: [0.14, 0, -0.15], rotation: [0, 90, 0]  },
    IFC_ILUX: { position: [-13.94, 0, 0]},
    IFC_ARQ: { position: [0.16, 0, -0.19], rotation: [0, 90, 0]  },
    IFC_SDAI: { position: [0.16, 0, -0.19] },
    IFC_GLP: { position: [0.16, 0, -0.17], rotation: [0, 90, 0] },
    IFC_IRRI: { position: [0.15, 0, 13.9], rotation: [0, 90, 0] },
    IFC_SOM: { position: [0.16, 0, -0.19], rotation: [0, 90, 0] },
};

const FARMACIA_MODEL_TRANSFORMS = {
    IFC_EST: { position: [2.22, 0, 2.61] },
    IFC_SAN: { position: [14.09, 0, 0] },
    IFC_HID: { position: [0, 0, 0] },
    //IFC_INC: { position: [14.09, 0, 0] },
    IFC_ILUX: { position: [14.09, 0, 0] },
    IFC_ALI: { position: [14.09, 0, 0] },
    IFC_FOT: { position: [14.09, 0, 0] },
    IFC_ARQ: { position: [14.09, 0, 0] },
    IFC_CLI: { position: [14.09, 0, 0] },
    //IFC_EXA: { position: [14.09, 0, 0] },
    IFC_ELE: { position: [14.09, 0, 0] },
    IFC_LOG_TEF: { position: [14.09, 0, 0] },
};

const POLICLINICA_MODEL_TRANSFORMS = {
    IFC_EST_PP: { position: [-80, 0.4, 50] },
    IFC_ELE_T_220: { position: [-78, 0, 40] },
    IFC_PLU: { position: [-78, 0, 40] },
    IFC_HID: { position: [-78, 0, 40] , rotation: [0, -45, 0] },
    IFC_ELE_S_220: { position: [-78, 0, 40], rotation: [0, -45, 0]  },
    IFC_ITM: { position: [-78, 0, 40] },
    IFC_ELE_A_220: { position: [-78, 0, 40], rotation: [0, -45, 0] },
    IFC_SAN: { position: [-78, 0, 40] },
    IFC_LOG: { position: [-78, 0, 40] },
    IFC_TEF: { position: [-78, 0, 40] },
    IFC_ALI_220: { position: [-78, 0, 40] },
    IFC_ALI_380: { position: [-78, 0, 40] },
    IFC_IRRI: { position: [-78, 0, 40], rotation: [0, -45, 0] },
};

const fecomercio_MODEL_TRANSFORMS = {
    IFC_EST: { position: [0, -0.1, 0] },
    IFC_ELE: { position: [0, 0, 0] },
    IFC_ARQ: { position: [-18.7, 0, 8.95] },
    IFC_SAN_PLU: { position: [50, 0, 0] },
    
};

const CANAA_MODEL_TRANSFORMS = {
    IFC_EST_PP: { position: [48.212, 0.385, -36.8995]},
    IFC_SAN: { position: [-0.03,-0.1, 0] },
    //IFC_PLU: { position: [0, 0, 0], rotation: [0, 180, 0] },
    IFC_ARQ: { position: [48.25, 0, -36.8695]},
    IFC_CLI: { position: [0, -0.05, 0]},
    IFC_EST_EMT: { position: [48.212, 0.075, -36.8995], rotation: [0, 180, 0]},
};

const SEBRAE_RR_MODEL_TRANSFORMS = {
    IFC_ALI: { position: [15, 0, 50] },
};

const SESC_CENTRO_ECOLOGICO_MODEL_TRANSFORMS = {
    IFC_ARQ_SESC_GERAL: { position: [257.26, 0, 33.02], rotation: [0, 16.4, 0]  },
};

const ESC_MODELO_MODEL_TRANSFORMS = {
    IFC_EST_PP: { position: [45, -2.05, 25], rotation: [0, 0, 0] },
    IFC_ARQ: { position: [354.6, 0, 3187.75], rotation: [0, 0, 0] },
    IFC_CLI: { position: [354.6, 0, 3187.75], rotation: [0, 0, 0] },
    IFC_SAN: { position: [354.6, 0, 3187.75], rotation: [0, 0, 0] },
    IFC_PLU: { position: [354.6, 0, 3187.75], rotation: [0, 0, 0] },
};

const DEFAULT_MODEL_TRANSFORMS = {
    IFC_ILUX: { position: [-14.08, 0, 0] },
    IFC_EST: { position: [-62.3, 0.4, 35.2] },
    IFC_LOG_TEF: { position: [-14.08, 0, 0] },
    IFC_ECX: { position: [-14.08, 0, 0] },
    IFC_SAN: { position: [-1, 0, -14.1] },
    IFC_INC: { position: [-1, 0, -14.1] },
    IFC_HID: { position: [-1, 0, -14.1] },
    IFC_PLU: { position: [13.03, 0, -14.05] },
    IFC_GLP: { position: [13.03, 0, -14.05] },
    //IFC_ARQ: { position: [13.03, 0, -14.05], rotation: [0, 90, 0]  },
    IFC_EST_SUB: { position: [-41.57, 0.4, 15.5], rotation: [0, 90, 0] },
    IFC_CLI_DUT: { position: [13, 0, 0], rotation: [0, 90, 0] },
    IFC_EXA: { position: [13.03, 0, -14.05] },
    IFC_CLI: { position: [-0.5, 0, -14.05] },
    IFC_EST_CT: { position: [-54, 0, -5.3] },
    IFC_ALI_220: { position: [-14.08, 0, 0] },
    IFC_ALI_380: { position: [-14.08, 0, 0] },
};

export const PROJECT_CONFIGS = {
    iper: { name: "IPER", models: IPER_MODELS, transforms: IPER_MODEL_TRANSFORMS },
    lacen: { name: "LACEN", models: defaultModels, transforms: DEFAULT_MODEL_TRANSFORMS },
    policlinica: { name: "Policlínica", models: POLICLINICA_MODELS, transforms: POLICLINICA_MODEL_TRANSFORMS },
    farmacia: { name: "Farmácia do Jânio", models: FARMACIA_MODELS, transforms: FARMACIA_MODEL_TRANSFORMS },
    fecomercio: { name: "Fecomércio", models: fecomercio_MODELS, transforms: fecomercio_MODEL_TRANSFORMS },
    esc_canaa: { name: "Escola Canaã", models: CANAA_MODELS, transforms: CANAA_MODEL_TRANSFORMS },
    sesc_centro_ecologico: { name: "SESC Centro Ecológico", models: SESC_CENTRO_ECOLOGICO_MODELS, transforms: SESC_CENTRO_ECOLOGICO_MODEL_TRANSFORMS },
    sebrae_rr: { name: "SEBRAE RR", models: SEBRAE_RR_MODELS, transforms: SEBRAE_RR_MODEL_TRANSFORMS },
    esc_modelo: { name: "Escola Modelo", models: ESC_MODELO_MODELS, transforms: ESC_MODELO_MODEL_TRANSFORMS }
};

export function getProjectConfig(projectKey) {
    return PROJECT_CONFIGS[projectKey] || PROJECT_CONFIGS.lacen;
}