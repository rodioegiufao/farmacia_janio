# Ferramentas IFC

Aplicação web local em HTML, CSS e JavaScript para transformar arquivos IFC e manter, em uma segunda aba, uma cópia do conversor `IFC → XKT` que antes ficava em `3D/ifc_to_xkt.html`.

## Instalação

Não há dependências obrigatórias para a interface. Basta servir a pasta `ifc-tools` com um servidor estático local para evitar restrições do navegador.

```bash
npx serve ifc-tools
```

Também é possível abrir `ifc-tools/index.html` diretamente, mas o servidor local é recomendado.

## Como executar

1. Acesse a pasta do projeto.
2. Execute `npx serve ifc-tools`.
3. Abra a URL indicada pelo terminal.
4. Use a aba **Transformar IFC** ou a aba **IFC → XKT**.

## Como carregar um IFC

Na aba **Transformar IFC**, arraste um arquivo `.ifc` para a área de upload ou clique em **Selecionar arquivo IFC**. A aplicação valida a extensão, lê o arquivo no navegador e verifica se a estrutura começa com `ISO-10303-21`, possui seção `DATA` e entidades STEP interpretáveis.

## Como configurar a rotação

Escolha uma das rotações rápidas: `0°`, `90° anti-horário`, `90° horário`, `180°` ou informe um ângulo personalizado. O modo padrão é **Rotação relativa**, somando o ângulo escolhido à orientação atual. Em **Rotação absoluta**, o ângulo informado passa a ser a orientação final em relação ao eixo X global.

## Como configurar os deslocamentos

Informe X, Y e Z e escolha entre **Deslocamento relativo** ou **Coordenada absoluta**. No modo relativo, os valores são somados à posição atual. No modo absoluto, substituem a posição do posicionamento IFC selecionado.

## Como escolher as unidades

A unidade interna é detectada por `IFCSIUNIT` com `.LENGTHUNIT.`. A entrada pode ser em metros, centímetros, milímetros ou unidade nativa do IFC. A aplicação converte os valores para a unidade interna antes de gravar o IFC.

## Pivô e rotação da posição

Por padrão, a rotação altera a orientação horizontal e mantém o ponto de implantação. Se marcar **Rotacionar também o vetor de posição existente**, a posição atual é rotacionada em torno do pivô selecionado e depois recebe o deslocamento. O pivô padrão é o ponto atual do `IfcSite` ou da entidade espacial encontrada.

## Como baixar o arquivo transformado

Após conferir o resumo, clique em **Aplicar transformação e gerar IFC**. O botão de download será liberado com o nome `nome-original_TRANSFORMADO.ifc`, ou com o sufixo personalizado informado.

## Limitações conhecidas

- A aplicação altera preferencialmente `IfcSite`, depois `IfcBuilding`, `IfcProject` ou outro objeto espacial com `IfcLocalPlacement`.
- Não altera geometrias internas, GUIDs, materiais, propriedades ou classificações.
- Se a estrutura de posicionamento não puder ser resolvida com segurança, o download é bloqueado.
- A opção de alterar `IfcMapConversion` fica bloqueada, pois a alteração segura de georreferenciamento depende do sistema cartográfico usado por cada projeto.

## Cuidados com arquivos georreferenciados

A aplicação detecta `IfcMapConversion`, `IfcProjectedCRS`, `IfcCoordinateReferenceSystem`, `RefLatitude`, `RefLongitude`, `RefElevation` e `TrueNorth`. Quando encontra essas informações, mostra um aviso, pois mover o posicionamento local pode causar divergência entre a visualização e as coordenadas cartográficas.

## Testes

Execute:

```bash
node ifc-tools/test.js
```

A rotina cobre rotações de 90° anti-horária e horária, rotação relativa sobre orientação existente, deslocamentos em centímetros, coordenada absoluta, preservação do eixo Z, fallback de entidade espacial, detecção de georreferenciamento e transformação STEP básica. Se `IFC-SDAI-IPER.ifc` existir na raiz do projeto, também será gerado `ifc-tools/IFC-SDAI-IPER_ROT90_GERADO.ifc`.