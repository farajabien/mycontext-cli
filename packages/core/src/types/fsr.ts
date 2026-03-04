export interface FSREntryPoint {
  type: 'page' | 'api' | 'component' | 'other';
  path: string;
  component?: string;
  layout?: string;
}

export interface FSRComponentState {
  type: 'local_storage' | 'local_storage_form' | 'useState' | 'server_action_hook' | 'image_uploader' | 'asset_processing';
  model?: string;
  default?: any;
  target?: string;
}

export interface FSRComponent {
  name: string;
  type: 'server' | 'client';
  children?: string[]; // Components that this component renders
  contains?: string[]; // Content blocks or other elements
  triggers?: string[]; // Components triggered by this component (e.g., dialogs)
  props?: Record<string, string>; // Expected props
  dependencies?: string[]; // e.g., icons, third-party libraries
  state?: FSRComponentState; // Deterministically scaffolding state logic
  weight?: 'primary' | 'secondary' | 'hidden'; // Layout importance
}

export interface FSRServerAction {
  name: string;
  input?: string; // Type of the input
  output?: string; // Type of the output
  description?: string;
}

export interface FSRModelField {
  type: 'string' | 'boolean' | 'number' | 'date' | 'object' | 'array';
  required?: boolean;
  ref?: string; // If it refers to another model
}

export interface FSRModel {
  name: string;
  fields: Record<string, FSRModelField | string>; // Allow simple string types for shorthand
  relations?: Record<string, string>;
}

export interface FSRUiRules {
  [key: string]: string | boolean | number | undefined;
  testMode?: boolean;
}

export interface FSRContraints {
  [key: string]: string | boolean | number;
}

export interface FSR {
  featureId: string;
  description?: string;
  entryPoint: FSREntryPoint;
  components: FSRComponent[];
  serverActions?: FSRServerAction[];
  models?: FSRModel[];
  uiRules?: FSRUiRules;
  constraints?: FSRContraints;
}
