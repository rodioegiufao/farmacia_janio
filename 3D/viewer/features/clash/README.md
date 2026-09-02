# Compatibilização BIM — arquitetura e auditoria

## Auditoria da implementação substituída

O colisor legado permanece temporariamente em `viewer-authenticated.js`. Ele compara AABBs de objetos XKT no navegador, expande os limites pela tolerância e agrupa os IDs que se sobrepõem. Portanto, uma sobreposição era uma **aproximação**, não evidência de interseção das geometrias IFC. O relatório e o isolamento legados também usavam esse agrupamento por objeto.

A conversão existente usa `@xeokit/xeokit-convert`/`web-ifc`. Os XKT observados contêm IDs no formato de `IfcRoot.GlobalId`, mas o repositório não contém os IFCs originais correspondentes para uma comparação automatizada elemento a elemento. A resolução foi, por isso, centralizada e testada para ID puro e IDs globalizados com prefixo de modelo. Uma auditoria de produção ainda deve confrontar uma amostra de `IfcBeam`, `IfcPipeSegment`, `IfcCableCarrierSegment` e `IfcDuctSegment` assim que `ifcSrc` for cadastrado.

## Decisão de execução

Vercel já executa funções Node e o conversor XKT usa um processo nativo, mas a instalação Python serverless não fornece garantia de ABI, binários e tempo/memória adequados ao IfcOpenShell. O Pyodide existente serve ao carregamento manual e ocorre na main thread; executar IfcClash ali seria pesado e não há garantia documentada de que todo o módulo clash esteja incluído na wheel WASM.

Foi escolhida uma integração com serviço especializado: `POST /api/clash` valida referências IFC relativas, classes, modo e tolerância e encaminha ao `IFC_CLASH_SERVICE_URL`, com token opcional em `IFC_CLASH_SERVICE_TOKEN`. Isso mantém binários Python fora do bundle/browser e permite que o serviço execute a API oficial `ifcopenshell.ifcclash.Clasher`. A API é assíncrona do ponto de vista da interface, embora a primeira versão aguarde uma resposta HTTP síncrona. Jobs e cache distribuído devem ser adicionados no serviço para análises que excedam o timeout.

Referências consultadas: [exemplo de clash detection da xeokit](https://xeokit.io/sdk-v2/examples/coordination#clashDetection) e [documentação oficial IfcClash](https://docs.ifcopenshell.org/ifcclash.html).

## Contrato e coordenadas

`src` continua apontando ao XKT de visualização. O novo campo opcional `ifcSrc` aponta ao IFC original usado pelo serviço. Sem `ifcSrc`, a interface não inventa IFC nem mistura o resultado AABB legado.

O adaptador normaliza respostas para `{id, setA, setB, objectA, objectB, position, distance, status, source}`. `resolveIfcGuidToSceneObjectId` é o único elo GlobalId → objeto xeokit. `transformClashPointToViewerCoordinates` aplica rotações Euler X/Y/Z em graus e depois a translação configurada do modelo; os modelos não são modificados.

## Viewer e BCF

O módulo inteiro só é importado depois do clique de admin/colaborador. Ele oferece A × B (inclusive A × A), presets, busca/status, agrupamento, anterior/próxima sem reanálise, foco pelo AABB combinado, isolamento, contexto XRayed, marcador e PDF normalizado. O objeto A usa highlight e o B usa selection para permanecerem distinguíveis sem alterar cores permanentemente.

`BCFViewpointsPlugin.getViewpoint()` cria o estado oficial da câmera, seleção, visibilidade e planos suportados pelo SDK. A entrega baixa JSON de **BCF Viewpoint** (`.bcfv`); não afirma criar BCFZIP. “Exportar viewpoints” produz um arquivo por clash e não inclui snapshots por padrão.

## Limitações deliberadas

- É necessário implantar/configurar o serviço IfcClash e cadastrar IFCs originais; nenhum IFC original foi encontrado no repositório.
- Upload local direto ao serviço, jobs, cache, filtros IFC editáveis, snapshots e BCFZIP ficam para a próxima fase.
- O fallback AABB permanece isolado no arquivo legado para comparação/regressão, mas a interface nova nunca identifica seu resultado como IfcClash.
- Um ponto calculado entre IFCs com transformações diferentes precisa ter no contrato a indicação do sistema/modelo de origem; atualmente aplica-se a transformação do Grupo A.