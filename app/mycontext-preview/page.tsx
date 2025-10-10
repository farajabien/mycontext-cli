import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

interface ComponentInfo {
  name: string;
  description: string;
  type: string;
  group: string;
  mobilePath: string;
  desktopPath: string;
  validation: {
    typescript: boolean;
    accessibility: boolean;
    responsive: boolean;
    tokens: boolean;
    imports: boolean;
    schema: boolean;
  };
  issues: string[];
}

interface ComponentPreviewProps {
  component: ComponentInfo;
  variant: "mobile" | "desktop";
  onValidate: (componentName: string, variant: "mobile" | "desktop") => void;
  onRefine: (componentName: string, variant: "mobile" | "desktop") => void;
}

function ComponentPreview({
  component,
  variant,
  onValidate,
  onRefine,
}: ComponentPreviewProps) {
  const validation = component.validation;
  const allValid = Object.values(validation).every(Boolean);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{component.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {component.description}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{component.type}</Badge>
              <Badge variant="outline">{component.group}</Badge>
              <Badge variant={variant === "mobile" ? "default" : "secondary"}>
                {variant}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onValidate(component.name, variant)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Validate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefine(component.name, variant)}
            >
              Refine
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Validation Status */}
          <div>
            <h4 className="text-sm font-medium mb-2">Validation Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                {validation.typescript ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">TypeScript</span>
              </div>
              <div className="flex items-center gap-2">
                {validation.accessibility ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Accessibility</span>
              </div>
              <div className="flex items-center gap-2">
                {validation.responsive ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Responsive</span>
              </div>
              <div className="flex items-center gap-2">
                {validation.tokens ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Design Tokens</span>
              </div>
              <div className="flex items-center gap-2">
                {validation.imports ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Imports</span>
              </div>
              <div className="flex items-center gap-2">
                {validation.schema ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Schema</span>
              </div>
            </div>
          </div>

          {/* Issues */}
          {component.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Issues Found
              </h4>
              <ul className="space-y-1">
                {component.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-yellow-600">
                    • {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Overall Status */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              {allValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    All validations passed
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-600">
                    {component.issues.length} issue(s) found
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComponentLibraryPreview() {
  const [components, setComponents] = React.useState<ComponentInfo[]>([]);
  const [selectedVariant, setSelectedVariant] = React.useState<
    "mobile" | "desktop"
  >("mobile");
  const [validatedComponents, setValidatedComponents] = React.useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = React.useState(true);

  // Load components from .mycontext/components directory
  React.useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      // This would typically load from the file system
      // For now, we'll use mock data
      const mockComponents: ComponentInfo[] = [
        {
          name: "UserCard",
          description: "Display user information in card format",
          type: "display",
          group: "user-management",
          mobilePath: ".mycontext/components/mobile/UserCard.tsx",
          desktopPath: ".mycontext/components/desktop/UserCard.tsx",
          validation: {
            typescript: true,
            accessibility: true,
            responsive: false,
            tokens: true,
            imports: true,
            schema: true,
          },
          issues: ["Mobile responsive design needs improvement"],
        },
        {
          name: "LoginForm",
          description: "User login form with email and password",
          type: "form",
          group: "authentication",
          mobilePath: ".mycontext/components/mobile/LoginForm.tsx",
          desktopPath: ".mycontext/components/desktop/LoginForm.tsx",
          validation: {
            typescript: true,
            accessibility: false,
            responsive: true,
            tokens: true,
            imports: true,
            schema: true,
          },
          issues: ["Missing ARIA labels for form inputs"],
        },
        {
          name: "ProductList",
          description: "Display list of products with filtering",
          type: "list",
          group: "product-management",
          mobilePath: ".mycontext/components/mobile/ProductList.tsx",
          desktopPath: ".mycontext/components/desktop/ProductList.tsx",
          validation: {
            typescript: true,
            accessibility: true,
            responsive: true,
            tokens: true,
            imports: true,
            schema: true,
          },
          issues: [],
        },
      ];

      setComponents(mockComponents);
    } catch (error) {
      console.error("Failed to load components:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = (
    componentName: string,
    variant: "mobile" | "desktop"
  ) => {
    console.log(`Validating ${componentName} (${variant})`);
    // This would trigger actual validation
    setValidatedComponents(
      (prev) => new Set([...prev, `${componentName}-${variant}`])
    );
  };

  const handleRefine = (
    componentName: string,
    variant: "mobile" | "desktop"
  ) => {
    console.log(`Refining ${componentName} (${variant})`);
    // This would trigger refinement workflow
  };

  const filteredComponents = components.filter((comp) => {
    const variantPath =
      selectedVariant === "mobile" ? comp.mobilePath : comp.desktopPath;
    return variantPath; // In real implementation, check if file exists
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading component library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Component Library Preview</h1>
          <p className="text-muted-foreground">
            Validate and refine your generated components before using them in
            your app.
          </p>
        </div>

        {/* Variant Toggle */}
        <div className="mb-6">
          <Tabs
            value={selectedVariant}
            onValueChange={(value) =>
              setSelectedVariant(value as "mobile" | "desktop")
            }
          >
            <TabsList>
              <TabsTrigger value="mobile">Mobile Variants</TabsTrigger>
              <TabsTrigger value="desktop">Desktop Variants</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{components.length}</div>
              <div className="text-sm text-muted-foreground">
                Total Components
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {
                  components.filter((c) =>
                    Object.values(c.validation).every(Boolean)
                  ).length
                }
              </div>
              <div className="text-sm text-muted-foreground">Validated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {components.filter((c) => c.issues.length > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Need Refinement
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredComponents.map((component) => (
            <ComponentPreview
              key={`${component.name}-${selectedVariant}`}
              component={component}
              variant={selectedVariant}
              onValidate={handleValidate}
              onRefine={handleRefine}
            />
          ))}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No components found</h3>
            <p className="text-muted-foreground mb-4">
              Generate components first with:{" "}
              <code className="bg-muted px-2 py-1 rounded">
                mycontext generate:components --core-only
              </code>
            </p>
            <Button onClick={loadComponents}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
