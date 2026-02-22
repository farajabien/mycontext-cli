import Handlebars from 'handlebars'
import * as fs from 'fs-extra'
import * as path from 'path'

export class TemplateHelpers {
  private handlebars: typeof Handlebars

  constructor() {
    this.handlebars = Handlebars.create()
    this.registerHelpers()
  }

  private registerHelpers() {
    // String transformation helpers
    this.handlebars.registerHelper('lowercase', (str: string) => {
      if (!str) return ''
      return str.toLowerCase()
    })

    this.handlebars.registerHelper('uppercase', (str: string) => {
      if (!str) return ''
      return str.toUpperCase()
    })

    this.handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return ''
      return str.charAt(0).toUpperCase() + str.slice(1)
    })

    this.handlebars.registerHelper('camelCase', (str: string) => {
      if (!str) return ''
      return str.replace(/-([a-z])/g, (g: string) => (g[1] ? g[1].toUpperCase() : ''))
    })

    this.handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) return ''
      const camel = str.replace(/-([a-z])/g, (g: string) => (g[1] ? g[1].toUpperCase() : ''))
      return camel.charAt(0).toUpperCase() + camel.slice(1)
    })

    // Type mapping helpers for Zod
    this.handlebars.registerHelper('zodType', (aslType: string) => {
      const typeMap: Record<string, string> = {
        string: 'string()',
        text: 'string()',
        number: 'number()',
        boolean: 'boolean()',
        date: 'date()',
        json: 'any()',
        ref: 'string()',
        email: 'string().email()',
      }
      return typeMap[aslType] || 'string()'
    })

    // Type mapping helpers for TypeScript
    this.handlebars.registerHelper('tsType', (aslType: string) => {
      const typeMap: Record<string, string> = {
        string: 'string',
        text: 'string',
        number: 'number',
        boolean: 'boolean',
        date: 'Date',
        json: 'any',
        ref: 'string',
        email: 'string',
      }
      return typeMap[aslType] || 'string'
    })

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b
    })

    this.handlebars.registerHelper('neq', (a: any, b: any) => {
      return a !== b
    })

    this.handlebars.registerHelper('gt', (a: number, b: number) => {
      return a > b
    })

    this.handlebars.registerHelper('lt', (a: number, b: number) => {
      return a < b
    })

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: any[]) => {
      // Remove the Handlebars options object (last argument)
      const values = args.slice(0, -1)
      return values.every(Boolean)
    })

    this.handlebars.registerHelper('or', (...args: any[]) => {
      // Remove the Handlebars options object (last argument)
      const values = args.slice(0, -1)
      return values.some(Boolean)
    })

    this.handlebars.registerHelper('not', (value: any) => {
      return !value
    })

    // Array/iteration helpers
    this.handlebars.registerHelper('join', (arr: any[], separator: string = ', ') => {
      if (!Array.isArray(arr)) return ''
      return arr.join(separator)
    })

    this.handlebars.registerHelper('length', (arr: any[]) => {
      if (!Array.isArray(arr)) return 0
      return arr.length
    })

    // Index helpers for iterations
    this.handlebars.registerHelper('isFirst', function (this: any, index: number) {
      return index === 0
    })

    this.handlebars.registerHelper('isLast', function (this: any, index: number, array: any[]) {
      return index === array.length - 1
    })

    // JSON helpers
    this.handlebars.registerHelper('json', (context: any) => {
      return JSON.stringify(context, null, 2)
    })

    // Conditional helpers for field types
    this.handlebars.registerHelper('isTextField', (type: string) => {
      return type === 'string' || type === 'text' || type === 'email'
    })

    this.handlebars.registerHelper('isNumberField', (type: string) => {
      return type === 'number'
    })

    this.handlebars.registerHelper('isBooleanField', (type: string) => {
      return type === 'boolean'
    })

    this.handlebars.registerHelper('isDateField', (type: string) => {
      return type === 'date'
    })

    // Pluralization helper
    this.handlebars.registerHelper('pluralize', (str: string) => {
      if (!str) return ''
      // Simple pluralization logic
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies'
      }
      if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch')) {
        return str + 'es'
      }
      return str + 's'
    })

    // Singularize helper
    this.handlebars.registerHelper('singularize', (str: string) => {
      if (!str) return ''
      // Simple singularization logic
      if (str.endsWith('ies')) {
        return str.slice(0, -3) + 'y'
      }
      if (str.endsWith('es')) {
        return str.slice(0, -2)
      }
      if (str.endsWith('s')) {
        return str.slice(0, -1)
      }
      return str
    })
  }

  async render(templatePath: string, data: any): Promise<string> {
    const templateContent = await fs.readFile(templatePath, 'utf-8')
    const template = this.handlebars.compile(templateContent)
    return template(data)
  }

  async renderFromString(templateString: string, data: any): Promise<string> {
    const template = this.handlebars.compile(templateString)
    return template(data)
  }

  // Helper method to get file extension from template path
  getOutputExtension(templatePath: string): string {
    // Extract extension from .tsx.hbs or .ts.hbs or .css.hbs
    const match = templatePath.match(/\.([^.]+)\.hbs$/)
    return match ? `.${match[1]}` : ''
  }
}
