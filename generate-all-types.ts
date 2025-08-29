#!/usr/bin/env node

/**
 * Gerador Unificado de Tipos TypeBox para CMS Components
 * 
 * Este script processa:
 * 1. content-types.json → configurationSchemaSets → configurations → schema
 * 2. sections.json → schema (propriedade direta)
 * 
 * Gera tipos TypeBox em:
 * - node_modules/@cms-types/content-types/ (8 tipos)
 * - node_modules/@cms-types/sections/ (44 tipos)
 * 
 * Para executar:
 *   - npm run generate-all-types
 *   - bun scripts/generate-all-types.ts
 *   - npx tsx scripts/generate-all-types.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONVERSOR JSON SCHEMA → TYPEBOX CODE
// ============================================================================

function jsonSchemaToTypeBoxCode(jsonSchema: any, typeName: string): string {
  function convertProperty(prop: any): string {
    if (prop.type === 'string') {
      let code = 'Type.String()';
      
      // Adicionar enum se existir
      if (prop.enum) {
        const enumValues = prop.enum.map((val: string) => `"${val}"`).join(', ');
        code = `Type.Union([${enumValues}])`;
      }
      
      return code;
    }
    
    if (prop.type === 'number' || prop.type === 'integer') {
      return prop.type === 'integer' ? 'Type.Integer()' : 'Type.Number()';
    }
    
    if (prop.type === 'boolean') {
      return 'Type.Boolean()';
    }
    
    if (prop.type === 'array') {
      const itemType = prop.items ? convertProperty(prop.items) : 'Type.Any()';
      return `Type.Array(${itemType})`;
    }
    
    if (prop.type === 'object') {
      const properties: string[] = [];
      
      for (const [key, subProp] of Object.entries(prop.properties || {})) {
        const propCode = convertProperty(subProp);
        const isRequired = prop.required?.includes(key);
        
        if (isRequired) {
          properties.push(`  ${key}: ${propCode}`);
        } else {
          properties.push(`  ${key}: Type.Optional(${propCode})`);
        }
      }
      
      return `Type.Object({
${properties.join(',\n')}
})`;
    }
    
    // Handle null type
    if (prop.type === 'null') {
      return 'Type.Null()';
    }
    
    return 'Type.Any()';
  }
  
  const typeBoxCode = convertProperty(jsonSchema);
  
  return `export const ${typeName}Schema = ${typeBoxCode};

export type ${typeName}Type = Static<typeof ${typeName}Schema>;`;
}

// ============================================================================
// UTILITÁRIOS PARA NOMES
// ============================================================================

function cleanTypeName(name: string): string {
  return name
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-zA-Z0-9]/g, '') // Remover caracteres especiais
    .replace(/^[0-9]/, 'T$&'); // TypeScript não permite nomes começando com número
}

function createTypeFile(typeName: string, schema: any, typeCode: string): string {
  return `import { Type, Static } from '@sinclair/typebox';

/**
 * ${schema.title || typeName}
 * ${schema.description || 'Gerado automaticamente do CMS'}
 */

${typeCode}
`;
}

function createPackageJson(packageName: string, description: string): object {
  return {
    name: packageName,
    version: '1.0.0',
    description,
    main: 'index.ts',
    types: 'index.d.ts',
    private: true,
    dependencies: {
      '@sinclair/typebox': '^0.32.0'
    }
  };
}

// ============================================================================
// GERADOR DE CONTENT-TYPES
// ============================================================================

class ContentTypesGenerator {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  generate(): { count: number; exports: string[] } {
    console.log('📋 Gerando tipos de Content-Types...\n');
    
    try {
      const contentTypes = JSON.parse(fs.readFileSync('content-types.json', 'utf8'));
      
      const exports: string[] = [];
      const typeFiles: { name: string; content: string }[] = [];
      
      contentTypes.forEach((contentType: any) => {
        if (contentType.configurationSchemaSets) {
          contentType.configurationSchemaSets.forEach((schemaSet: any) => {
            if (schemaSet.configurations) {
              schemaSet.configurations.forEach((config: any) => {
                if (config.schema) {
                  const typeName = cleanTypeName(`${contentType.name}${schemaSet.name}${config.name}`);
                  const typeCode = jsonSchemaToTypeBoxCode(config.schema, typeName);
                  const content = createTypeFile(typeName, config.schema, typeCode);
                  
                  typeFiles.push({ name: `${typeName}.ts`, content });
                  exports.push(`export { ${typeName}Schema, ${typeName}Type } from './${typeName}';`);
                  
                  console.log(`✅ ${typeName} (${config.schema.title})`);
                }
              });
            }
          });
        }
      });
      
      // Salvar arquivos
      typeFiles.forEach(({ name, content }) => {
        fs.writeFileSync(path.join(this.basePath, name), content);
      });
      
      return { count: typeFiles.length, exports };
      
    } catch (error) {
      console.error('❌ Erro ao gerar content-types:', error);
      return { count: 0, exports: [] };
    }
  }
}

// ============================================================================
// GERADOR DE SECTIONS
// ============================================================================

class SectionsGenerator {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  generate(): { count: number; exports: string[] } {
    console.log('📄 Gerando tipos de Sections...\n');
    
    try {
      const sections = JSON.parse(fs.readFileSync('sections.json', 'utf8'));
      
      const exports: string[] = [];
      const typeFiles: { name: string; content: string }[] = [];
      
      sections.forEach((section: any, index: number) => {
        if (section.schema) {
          const baseName = section.name || `Section${index}`;
          const typeName = cleanTypeName(baseName);
          const typeCode = jsonSchemaToTypeBoxCode(section.schema, typeName);
          const content = createTypeFile(typeName, section.schema, typeCode);
          
          typeFiles.push({ name: `${typeName}.ts`, content });
          exports.push(`export { ${typeName}Schema, ${typeName}Type } from './${typeName}';`);
          
          console.log(`✅ ${typeName} (${section.schema.title})`);
        }
      });
      
      // Salvar arquivos
      typeFiles.forEach(({ name, content }) => {
        fs.writeFileSync(path.join(this.basePath, name), content);
      });
      
      return { count: typeFiles.length, exports };
      
    } catch (error) {
      console.error('❌ Erro ao gerar sections:', error);
      return { count: 0, exports: [] };
    }
  }
}

// ============================================================================
// GERADOR UNIFICADO PRINCIPAL
// ============================================================================

class UnifiedTypeGenerator {
  private nodeModulesPath: string;
  private cmsTypesPath: string;
  private contentTypesPath: string;
  private sectionsPath: string;
  
  constructor() {
    this.nodeModulesPath = path.join(process.cwd(), 'node_modules');
    this.cmsTypesPath = path.join(this.nodeModulesPath, '@cms-types');
    this.contentTypesPath = path.join(this.cmsTypesPath, 'content-types');
    this.sectionsPath = path.join(this.cmsTypesPath, 'sections');
    
    this.ensureDirectories();
  }
  
  private ensureDirectories() {
    [this.nodeModulesPath, this.cmsTypesPath, this.contentTypesPath, this.sectionsPath]
      .forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
  }
  
  private createIndexFile(packagePath: string, exports: string[], packageType: string) {
    const indexContent = `/**
 * Tipos TypeBox gerados automaticamente do ${packageType}
 * 
 * Para usar:
 * import { MenuMenuhotbarType, CarouselType } from '@cms-types/${packageType === 'content-types.json' ? 'content-types' : 'sections'}';
 */

import { Type, Static } from '@sinclair/typebox';

${exports.join('\n')}

// Re-export TypeBox utilities
export { Type, Static } from '@sinclair/typebox';
`;
    
    fs.writeFileSync(path.join(packagePath, 'index.ts'), indexContent);
    fs.writeFileSync(path.join(packagePath, 'index.d.ts'), indexContent);
  }
  
  private createPackageFile(packagePath: string, packageName: string, description: string) {
    const packageJson = createPackageJson(packageName, description);
    fs.writeFileSync(
      path.join(packagePath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }
  
  generateAll(): { contentTypes: number; sections: number; total: number } {
    console.log('🔨 Gerador Unificado de Tipos TypeBox CMS\n');
    console.log('=' .repeat(70));
    
    // Gerar Content-Types
    console.log('\n📋 CONTENT-TYPES');
    const contentTypesGen = new ContentTypesGenerator(this.contentTypesPath);
    const contentTypesResult = contentTypesGen.generate();
    
    if (contentTypesResult.count > 0) {
      this.createIndexFile(this.contentTypesPath, contentTypesResult.exports, 'content-types.json');
      this.createPackageFile(
        this.contentTypesPath, 
        '@cms-types/content-types', 
        'Generated TypeBox types from content-types.json'
      );
      console.log(`📦 Package criado: @cms-types/content-types`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // Gerar Sections
    console.log('\n📄 SECTIONS');
    const sectionsGen = new SectionsGenerator(this.sectionsPath);
    const sectionsResult = sectionsGen.generate();
    
    if (sectionsResult.count > 0) {
      this.createIndexFile(this.sectionsPath, sectionsResult.exports, 'sections.json');
      this.createPackageFile(
        this.sectionsPath, 
        '@cms-types/sections', 
        'Generated TypeBox types from sections.json'
      );
      console.log(`📦 Package criado: @cms-types/sections`);
    }
    
    console.log('\n' + '=' .repeat(70));
    
    // Resumo final
    const total = contentTypesResult.count + sectionsResult.count;
    console.log('\n🎉 BUILD COMPLETO!');
    console.log(`📊 Total: ${total} tipos gerados`);
    console.log(`   📋 Content-types: ${contentTypesResult.count} tipos`);
    console.log(`   📄 Sections: ${sectionsResult.count} tipos`);
    
    console.log('\n📚 Como usar:');
    console.log('```typescript');
    console.log('// Content-types');
    console.log('import { MenuMenuhotbarType } from "@cms-types/content-types";');
    console.log('');
    console.log('// Sections');
    console.log('import { CarouselType, BannerHeaderType } from "@cms-types/sections";');
    console.log('');
    console.log('// Validação runtime');
    console.log('import { Value } from "@sinclair/typebox/value";');
    console.log('const isValid = Value.Check(MenuMenuhotbarSchema, data);');
    console.log('```');
    
    console.log('\n📁 Localização dos tipos:');
    console.log(`   📋 Content-types: node_modules/@cms-types/content-types/`);
    console.log(`   📄 Sections: node_modules/@cms-types/sections/`);
    
    return {
      contentTypes: contentTypesResult.count,
      sections: sectionsResult.count,
      total
    };
  }
  
  generateContentTypesOnly(): number {
    console.log('📋 Gerando apenas Content-Types...\n');
    
    const contentTypesGen = new ContentTypesGenerator(this.contentTypesPath);
    const result = contentTypesGen.generate();
    
    if (result.count > 0) {
      this.createIndexFile(this.contentTypesPath, result.exports, 'content-types.json');
      this.createPackageFile(
        this.contentTypesPath, 
        '@cms-types/content-types', 
        'Generated TypeBox types from content-types.json'
      );
      
      console.log(`\n📦 ${result.count} tipos de content-types gerados em @cms-types/content-types`);
    }
    
    return result.count;
  }
  
  generateSectionsOnly(): number {
    console.log('📄 Gerando apenas Sections...\n');
    
    const sectionsGen = new SectionsGenerator(this.sectionsPath);
    const result = sectionsGen.generate();
    
    if (result.count > 0) {
      this.createIndexFile(this.sectionsPath, result.exports, 'sections.json');
      this.createPackageFile(
        this.sectionsPath, 
        '@cms-types/sections', 
        'Generated TypeBox types from sections.json'
      );
      
      console.log(`\n📦 ${result.count} tipos de sections gerados em @cms-types/sections`);
    }
    
    return result.count;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function showHelp() {
  console.log('🔨 CMS Types Generator v2.0.0\n');
  console.log('📋 Comandos disponíveis:');
  console.log('   --all, -a          Gerar todos os tipos (content-types + sections)');
  console.log('   --content-types    Gerar apenas content-types');
  console.log('   --sections         Gerar apenas sections');
  console.log('   --help, -h         Mostrar esta ajuda');
  console.log('');
  console.log('📚 Exemplos:');
  console.log('   npm run generate-all-types');
  console.log('   npx tsx scripts/generate-all-types.ts --content-types');
  console.log('   bun scripts/generate-all-types.ts --sections');
}

function main() {
  const args = process.argv.slice(2);
  const generator = new UnifiedTypeGenerator();
  
  // Processar argumentos
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return 0;
  }
  
  if (args.includes('--content-types')) {
    const count = generator.generateContentTypesOnly();
    return count > 0 ? 0 : 1;
  }
  
  if (args.includes('--sections')) {
    const count = generator.generateSectionsOnly();
    return count > 0 ? 0 : 1;
  }
  
  // Default: gerar todos
  const result = generator.generateAll();
  return result.total > 0 ? 0 : 1;
}

// ============================================================================
// FUNÇÕES DE UTILIDADE PARA IMPORTAÇÃO
// ============================================================================

/**
 * Lista todos os tipos disponíveis
 */
export function listAvailableTypes(): void {
  console.log('📦 Tipos disponíveis para importação:\n');
  
  try {
    // Content-types
    const contentTypesIndex = path.join(process.cwd(), 'node_modules/@cms-types/content-types/index.ts');
    if (fs.existsSync(contentTypesIndex)) {
      console.log('📋 Content-Types (@cms-types/content-types):');
      const content = fs.readFileSync(contentTypesIndex, 'utf8');
      const exports = content.match(/export \{ (\w+)Type \}/g) || [];
      exports.forEach((exp, i) => {
        const typeName = exp.match(/(\w+)Type/)?.[1];
        console.log(`   ${i + 1}. ${typeName}Type`);
      });
    }
    
    console.log('');
    
    // Sections
    const sectionsIndex = path.join(process.cwd(), 'node_modules/@cms-types/sections/index.ts');
    if (fs.existsSync(sectionsIndex)) {
      console.log('📄 Sections (@cms-types/sections):');
      const content = fs.readFileSync(sectionsIndex, 'utf8');
      const exports = content.match(/export \{ (\w+)Type \}/g) || [];
      exports.forEach((exp, i) => {
        const typeName = exp.match(/(\w+)Type/)?.[1];
        console.log(`   ${i + 1}. ${typeName}Type`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro ao listar tipos. Execute o build primeiro: npm run generate-all-types');
  }
}

/**
 * Verifica se os tipos estão atualizados
 */
export function checkTypesStatus(): boolean {
  const contentTypesPath = path.join(process.cwd(), 'node_modules/@cms-types/content-types/index.ts');
  const sectionsPath = path.join(process.cwd(), 'node_modules/@cms-types/sections/index.ts');
  
  const contentTypesExists = fs.existsSync(contentTypesPath);
  const sectionsExists = fs.existsSync(sectionsPath);
  
  console.log('🔍 Status dos tipos:');
  console.log(`   📋 Content-types: ${contentTypesExists ? '✅ Gerados' : '❌ Não encontrados'}`);
  console.log(`   📄 Sections: ${sectionsExists ? '✅ Gerados' : '❌ Não encontrados'}`);
  
  if (!contentTypesExists || !sectionsExists) {
    console.log('\n💡 Para gerar os tipos: npm run generate-all-types');
    return false;
  }
  
  return true;
}

// ============================================================================
// EXECUTAR SE CHAMADO DIRETAMENTE
// ============================================================================

if (require.main === module) {
  const exitCode = main();
  
  if (exitCode === 0) {
    console.log('\n✅ Geração concluída com sucesso!');
  } else {
    console.log('\n❌ Falha na geração de tipos');
  }
  
  process.exit(exitCode);
}

// Exportar classes para uso programático
export { UnifiedTypeGenerator, ContentTypesGenerator, SectionsGenerator };
