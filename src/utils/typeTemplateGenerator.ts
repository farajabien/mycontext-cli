/**
 * Template-based type generation for when AI fails to use context properly
 */

export interface BusinessEntity {
  name: string;
  properties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  description?: string;
}

export interface TypeTemplate {
  database: string;
  enums: string;
  ui: string;
  utils: string;
  index: string;
}

/**
 * Detects if generated types are generic fallbacks
 */
export function isGenericTypes(content: string): boolean {
  const genericIndicators = [
    'interface User {',
    'interface Project {',
    'interface Component {',
    'interface Task {',
    'interface Item {',
    'interface Data {',
    'interface Model {',
    'interface Entity {',
    'interface Base {',
    'interface Generic {',
    'type User =',
    'type Project =',
    'type Component =',
    'type Task =',
    'type Item =',
    'type Data =',
    'type Model =',
    'type Entity =',
    'type Base =',
    'type Generic =',
  ];

  const contentLower = content.toLowerCase();
  const genericMatches = genericIndicators.filter(indicator => 
    contentLower.includes(indicator.toLowerCase())
  );

  // If more than 2 generic indicators are found, it's likely generic
  return genericMatches.length >= 2;
}

/**
 * Extracts business entities from context content
 */
export function extractBusinessEntities(contextContent: string): BusinessEntity[] {
  const entities: BusinessEntity[] = [];
  
  // Common business entity patterns
  const entityPatterns = [
    // Direct entity mentions
    /(?:interface|type|class)\s+(\w+)/gi,
    // Entity lists
    /(?:entities?|models?|objects?|types?):\s*([^.\n]+)/gi,
    // Business domain mentions
    /(?:manages?|tracks?|handles?|processes?)\s+(\w+)/gi,
  ];

  const foundEntities = new Set<string>();
  
  // Extract from patterns
  entityPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(contextContent)) !== null) {
      const entityName = match[1].trim();
      if (entityName && entityName.length > 2 && !foundEntities.has(entityName)) {
        foundEntities.add(entityName);
        
        // Try to extract properties for this entity
        const properties = extractEntityProperties(contextContent, entityName);
        
        entities.push({
          name: entityName,
          properties,
          description: extractEntityDescription(contextContent, entityName)
        });
      }
    }
  });

  // If no entities found, try to extract from common business terms
  if (entities.length === 0) {
    const businessTerms = [
      'Order', 'Customer', 'Product', 'Payment', 'Transaction',
      'User', 'Account', 'Profile', 'Session', 'Auth',
      'Item', 'Category', 'Inventory', 'Stock', 'Warehouse',
      'Booking', 'Reservation', 'Appointment', 'Schedule',
      'Report', 'Analytics', 'Metrics', 'Dashboard',
      'Notification', 'Message', 'Alert', 'Event',
      'File', 'Document', 'Attachment', 'Media',
      'Location', 'Address', 'Contact', 'Company',
      'Project', 'Task', 'Assignment', 'Workflow',
      'Review', 'Rating', 'Feedback', 'Comment',
      'Subscription', 'Plan', 'Billing', 'Invoice'
    ];

    businessTerms.forEach(term => {
      if (contextContent.toLowerCase().includes(term.toLowerCase())) {
        entities.push({
          name: term,
          properties: generateDefaultProperties(term),
          description: `Business entity for ${term}`
        });
      }
    });
  }

  return entities;
}

/**
 * Extracts properties for a specific entity from context
 */
function extractEntityProperties(contextContent: string, entityName: string): Array<{name: string; type: string; description?: string}> {
  const properties: Array<{name: string; type: string; description?: string}> = [];
  
  // Look for property patterns around the entity
  const entityContext = contextContent.toLowerCase();
  const entityIndex = entityContext.indexOf(entityName.toLowerCase());
  
  if (entityIndex === -1) return properties;
  
  // Extract context around the entity (500 chars before and after)
  const start = Math.max(0, entityIndex - 500);
  const end = Math.min(contextContent.length, entityIndex + 500);
  const context = contextContent.substring(start, end);
  
  // Common property patterns
  const propertyPatterns = [
    /(\w+):\s*(string|number|boolean|Date|Array|Object)/gi,
    /(\w+)\s*\([^)]*\)/gi,
    /has\s+(\w+)/gi,
    /contains?\s+(\w+)/gi,
    /includes?\s+(\w+)/gi,
  ];
  
  propertyPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(context)) !== null) {
      const propName = match[1].trim();
      if (propName && propName !== entityName && !properties.find(p => p.name === propName)) {
        properties.push({
          name: propName,
          type: match[2] || 'string',
          description: `Property of ${entityName}`
        });
      }
    }
  });
  
  // If no properties found, add common ones
  if (properties.length === 0) {
    properties.push(
      { name: 'id', type: 'string', description: 'Unique identifier' },
      { name: 'name', type: 'string', description: 'Name' },
      { name: 'createdAt', type: 'Date', description: 'Creation timestamp' },
      { name: 'updatedAt', type: 'Date', description: 'Last update timestamp' }
    );
  }
  
  return properties;
}

/**
 * Extracts description for a specific entity from context
 */
function extractEntityDescription(contextContent: string, entityName: string): string {
  const entityContext = contextContent.toLowerCase();
  const entityIndex = entityContext.indexOf(entityName.toLowerCase());
  
  if (entityIndex === -1) return `Business entity for ${entityName}`;
  
  // Look for description patterns around the entity
  const context = contextContent.substring(Math.max(0, entityIndex - 200), Math.min(contextContent.length, entityIndex + 200));
  
  // Common description patterns
  const descPatterns = [
    new RegExp(`${entityName}[^.]*\\.([^.]+\\.)`, 'i'),
    new RegExp(`(?:manages?|handles?|tracks?|processes?)\\s+${entityName}[^.]*\\.([^.]+\\.)`, 'i'),
    new RegExp(`${entityName}\\s+is\\s+([^.]+\\.)`, 'i'),
  ];
  
  for (const pattern of descPatterns) {
    const match = pattern.exec(context);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return `Business entity for ${entityName}`;
}

/**
 * Generates default properties for common business entities
 */
function generateDefaultProperties(entityName: string): Array<{name: string; type: string; description?: string}> {
  const commonProps = [
    { name: 'id', type: 'string', description: 'Unique identifier' },
    { name: 'name', type: 'string', description: 'Name' },
    { name: 'createdAt', type: 'Date', description: 'Creation timestamp' },
    { name: 'updatedAt', type: 'Date', description: 'Last update timestamp' }
  ];
  
  // Add entity-specific properties
  const specificProps: Array<{name: string; type: string; description?: string}> = [];
  
  switch (entityName.toLowerCase()) {
    case 'order':
      specificProps.push(
        { name: 'customerId', type: 'string', description: 'Customer ID' },
        { name: 'total', type: 'number', description: 'Order total' },
        { name: 'status', type: 'string', description: 'Order status' },
        { name: 'items', type: 'Array<OrderItem>', description: 'Order items' }
      );
      break;
    case 'customer':
      specificProps.push(
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'phone', type: 'string', description: 'Phone number' },
        { name: 'address', type: 'Address', description: 'Customer address' }
      );
      break;
    case 'product':
      specificProps.push(
        { name: 'price', type: 'number', description: 'Product price' },
        { name: 'description', type: 'string', description: 'Product description' },
        { name: 'category', type: 'string', description: 'Product category' },
        { name: 'inStock', type: 'boolean', description: 'In stock status' }
      );
      break;
    case 'payment':
      specificProps.push(
        { name: 'amount', type: 'number', description: 'Payment amount' },
        { name: 'method', type: 'string', description: 'Payment method' },
        { name: 'status', type: 'string', description: 'Payment status' },
        { name: 'transactionId', type: 'string', description: 'Transaction ID' }
      );
      break;
    case 'user':
      specificProps.push(
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'role', type: 'string', description: 'User role' },
        { name: 'isActive', type: 'boolean', description: 'Active status' }
      );
      break;
  }
  
  return [...commonProps, ...specificProps];
}

/**
 * Generates TypeScript types from business entities
 */
export function generateTypesFromTemplate(contextContent: string): string {
  const entities = extractBusinessEntities(contextContent);
  
  if (entities.length === 0) {
    return generateDefaultTypes();
  }
  
  const databaseTypes = generateDatabaseTypes(entities);
  const enumTypes = generateEnumTypes(entities);
  const uiTypes = generateUITypes(entities);
  const utilTypes = generateUtilTypes(entities);
  const indexTypes = generateIndexTypes(entities);
  
  return `# TypeScript Types Generated from Context

## Database Types (database.ts)
\`\`\`typescript
${databaseTypes}
\`\`\`

## Enum Types (enums.ts)
\`\`\`typescript
${enumTypes}
\`\`\`

## UI Types (ui.ts)
\`\`\`typescript
${uiTypes}
\`\`\`

## Utility Types (utils.ts)
\`\`\`typescript
${utilTypes}
\`\`\`

## Index Types (index.ts)
\`\`\`typescript
${indexTypes}
\`\`\`
`;
}

/**
 * Generates database types from entities
 */
function generateDatabaseTypes(entities: BusinessEntity[]): string {
  let content = `// Database types generated from business context\n\n`;
  
  entities.forEach(entity => {
    content += `export interface ${entity.name} {\n`;
    entity.properties.forEach(prop => {
      content += `  ${prop.name}: ${prop.type};\n`;
    });
    content += `}\n\n`;
  });
  
  return content;
}

/**
 * Generates enum types from entities
 */
function generateEnumTypes(entities: BusinessEntity[]): string {
  let content = `// Enum types generated from business context\n\n`;
  
  // Generate status enums for entities that might have status
  entities.forEach(entity => {
    if (entity.name.toLowerCase().includes('order') || 
        entity.name.toLowerCase().includes('payment') ||
        entity.name.toLowerCase().includes('user')) {
      content += `export enum ${entity.name}Status {\n`;
      content += `  PENDING = 'pending',\n`;
      content += `  ACTIVE = 'active',\n`;
      content += `  COMPLETED = 'completed',\n`;
      content += `  CANCELLED = 'cancelled'\n`;
      content += `}\n\n`;
    }
  });
  
  return content;
}

/**
 * Generates UI types from entities
 */
function generateUITypes(entities: BusinessEntity[]): string {
  let content = `// UI types generated from business context\n\n`;
  
  entities.forEach(entity => {
    content += `export interface ${entity.name}FormData {\n`;
    entity.properties.forEach(prop => {
      if (prop.name !== 'id' && prop.name !== 'createdAt' && prop.name !== 'updatedAt') {
        content += `  ${prop.name}: ${prop.type};\n`;
      }
    });
    content += `}\n\n`;
    
    content += `export interface ${entity.name}TableRow {\n`;
    entity.properties.forEach(prop => {
      content += `  ${prop.name}: ${prop.type};\n`;
    });
    content += `}\n\n`;
  });
  
  return content;
}

/**
 * Generates utility types from entities
 */
function generateUtilTypes(entities: BusinessEntity[]): string {
  let content = `// Utility types generated from business context\n\n`;
  
  entities.forEach(entity => {
    content += `export type ${entity.name}Id = string;\n`;
    content += `export type ${entity.name}CreateInput = Omit<${entity.name}, 'id' | 'createdAt' | 'updatedAt'>;\n`;
    content += `export type ${entity.name}UpdateInput = Partial<${entity.name}CreateInput>;\n\n`;
  });
  
  return content;
}

/**
 * Generates index types from entities
 */
function generateIndexTypes(entities: BusinessEntity[]): string {
  let content = `// Index types generated from business context\n\n`;
  
  content += `// Re-export all types\n`;
  entities.forEach(entity => {
    content += `export type { ${entity.name} } from './database';\n`;
  });
  
  content += `\n// Re-export enums\n`;
  entities.forEach(entity => {
    if (entity.name.toLowerCase().includes('order') || 
        entity.name.toLowerCase().includes('payment') ||
        entity.name.toLowerCase().includes('user')) {
      content += `export type { ${entity.name}Status } from './enums';\n`;
    }
  });
  
  content += `\n// Re-export UI types\n`;
  entities.forEach(entity => {
    content += `export type { ${entity.name}FormData, ${entity.name}TableRow } from './ui';\n`;
  });
  
  content += `\n// Re-export utility types\n`;
  entities.forEach(entity => {
    content += `export type { ${entity.name}Id, ${entity.name}CreateInput, ${entity.name}UpdateInput } from './utils';\n`;
  });
  
  return content;
}

/**
 * Generates default types when no entities are found
 */
function generateDefaultTypes(): string {
  return `# Default TypeScript Types

## Database Types (database.ts)
\`\`\`typescript
// Default database types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}
\`\`\`

## Enum Types (enums.ts)
\`\`\`typescript
// Default enum types
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}
\`\`\`

## UI Types (ui.ts)
\`\`\`typescript
// Default UI types
export interface UserFormData {
  email: string;
  name: string;
  role: string;
}

export interface UserTableRow extends User {}
\`\`\`

## Utility Types (utils.ts)
\`\`\`typescript
// Default utility types
export type UserId = string;
export type UserCreateInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UserUpdateInput = Partial<UserCreateInput>;
\`\`\`

## Index Types (index.ts)
\`\`\`typescript
// Default index types
export type { User, BaseEntity } from './database';
export type { UserRole, EntityStatus } from './enums';
export type { UserFormData, UserTableRow } from './ui';
export type { UserId, UserCreateInput, UserUpdateInput } from './utils';
\`\`\`
`;
}
