# CMS Components - Scripts

Este diretório contém scripts utilitários para o sistema de CMS Components.

## 🚀 Geração de Tipos TypeBox

O sistema automaticamente gera tipos TypeScript + TypeBox a partir dos arquivos de configuração JSON do CMS, disponibilizando-os via `node_modules` para fácil importação.

### 📁 Estrutura dos Tipos Gerados

```
node_modules/@cms-types/
├── content-types/          # Tipos do content-types.json
│   ├── PaginaSEOsiteMetadataWithSlug.ts
│   └── ...
└── sections/              # Tipos do sections.json  
    ├── Carousel.ts
    └── ...
```

### 🔨 Comandos de Build

```bash
# Gerar todos os tipos (content-types + sections)
npm run generate-all-types

# Utilitários
npm run list-types          # Listar todos os tipos disponíveis
npm run check-types         # Verificar status dos tipos
```

### 📖 Como Usar os Tipos

#### Importação

```typescript
// Content-Types
import { 
  PaginaSEOsiteMetadataWithSlugType,
  PaginaSEOsiteMetadataWithSlugSchema,
} from '@cms-types/content-types';

// Sections
import { 
  CarouselType,
  CarouselSchema,
} from '@cms-types/sections';

// Utilitários TypeBox
import { Value } from '@sinclair/typebox/value';
```

#### Validação Runtime

```typescript
// Validar dados vindos de API
function validateMenuData(data: unknown): data is MenuMenuhotbarType {
  return Value.Check(MenuMenuhotbarSchema, data);
}

// Uso prático
const menuFromAPI = await fetch('/api/menu').then(r => r.json());

if (validateMenuData(menuFromAPI)) {
  // menuFromAPI agora é tipado como MenuMenuhotbarType
  console.log(menuFromAPI.title); // TypeScript sabe que é string
} else {
  console.error('Dados do menu inválidos');
}
```

#### Tipagem de Funções

```typescript
// Funções com tipos automáticos
function processMenu(menu: MenuMenuhotbarType) {
  console.log(`Menu: ${menu.title}`);
  
  menu.menuItems?.forEach(item => {
    console.log(`- ${item.name} → ${item.href}`);
  });
}

function renderCarousel(carousel: CarouselType) {
  // TypeScript infere todos os tipos automaticamente
  carousel.images?.forEach(img => {
    console.log(`Image: ${img.src} (${img.alt})`);
  });
}
```

### 🛠️ Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `generate-all-types.ts` | **Script unificado** - Gera todos os tipos (content-types + sections) |

#### Argumentos do Script Principal

```bash
# Gerar tudo (padrão)
npx tsx generate-all-types.ts

# Gerar apenas content-types
npx tsx generate-all-types.ts --content-types

# Gerar apenas sections  
npx tsx generate-all-types.ts --sections

# Ajuda
npx tsx generate-all-types.ts --help
```

### 🔧 Configuração Avançada

#### Personalizar Nomes de Tipos

Os nomes são gerados automaticamente removendo acentos e caracteres especiais:

- `Página` → `Pagina`
- `Menu-Category` → `MenuCategory`
- `carousel-images-app` → `carouselimagesapp`

#### Regenerar Tipos

Sempre que `content-types.json` ou `sections.json` forem modificados:

```bash
npm run build-all-types
```

#### Estrutura dos Arquivos Gerados

Cada tipo gera um arquivo com:

```typescript
import { Type, Static } from '@sinclair/typebox';

/**
 * [Título do Schema]
 * [Descrição do Schema]
 */

export const [Nome]Schema = Type.Object({
  // Propriedades convertidas automaticamente
});

export type [Nome]Type = Static<typeof [Nome]Schema>;
```

### ⚡ Performance

- **Validação runtime**: TypeBox é extremamente rápido
- **Tipagem compile-time**: Zero overhead em produção
- **Build incremental**: Apenas schemas modificados são regenerados
- **Tree-shaking**: Importar apenas os tipos necessários

### 🐛 Troubleshooting

#### Erro de importação
```bash
# Regenerar todos os tipos
npm run build-all-types

# Verificar se os pacotes existem
ls node_modules/@cms-types/
```

#### Tipos desatualizados
```bash
# Limpar e regenerar
rm -rf node_modules/@cms-types/
npm run build-all-types
```

#### Erro de validação
```typescript
// Usar safeParse para debugging
const result = Value.Check(Schema, data);
if (!result) {
  console.log('Validation errors:', Value.Errors(Schema, data));
}
```

### 🎯 Exemplos Práticos

#### API Integration

```typescript
import { DynamicShelfType, DynamicShelfSchema } from '@cms-types/sections';
import { Value } from '@sinclair/typebox/value';

async function fetchShelfData(shelfId: string): Promise<DynamicShelfType | null> {
  const response = await fetch(`/api/shelves/${shelfId}`);
  const data = await response.json();
  
  if (Value.Check(DynamicShelfSchema, data)) {
    return data; // Tipado automaticamente
  } else {
    console.error('Invalid shelf data');
    return null;
  }
}
```

#### Form Validation

```typescript
import { MenuMenuhotbarType, MenuMenuhotbarSchema } from '@cms-types/content-types';

function validateMenuForm(formData: FormData): MenuMenuhotbarType | null {
  const data = Object.fromEntries(formData);
  
  if (Value.Check(MenuMenuhotbarSchema, data)) {
    return data;
  } else {
    // Mostrar erros específicos
    const errors = [...Value.Errors(MenuMenuhotbarSchema, data)];
    console.log('Form errors:', errors);
    return null;
  }
}
```

### 📚 Recursos Adicionais

- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [JSON Schema Specification](https://json-schema.org/)
- [TypeScript Static Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)

