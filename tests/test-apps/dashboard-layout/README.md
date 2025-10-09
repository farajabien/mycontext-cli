# Dashboard Layout Test App

Test case for multi-component feature generation combining multiple UI elements into a cohesive dashboard layout.

## Test Description

Validates the generation of a complete dashboard layout with multiple components including navigation, metrics cards, charts, data tables, and responsive design.

## Expected Component

A dashboard layout component with:

- Sidebar navigation
- Header with user info
- Metrics cards grid
- Chart components
- Data table
- Responsive layout
- Proper component composition
- State management
- Loading states

## Test Steps

### 1. Initialize Project

```bash
# From tests/test-apps/dashboard-layout/
mycontext init
```

### 2. Configure Environment

```bash
cp .env.example .mycontext/.env
# Add your ANTHROPIC_API_KEY
```

### 3. Test Design Analysis

```bash
mycontext design:analyze
```

### 4. Generate Dashboard Layout Component

```bash
mycontext generate:component "Create a dashboard layout with sidebar navigation, header, metrics cards, charts, and data table with responsive design"
```

**Expected Output**:

```typescript
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  DollarSign,
  Activity,
  Menu,
  Search,
  Bell,
  Settings,
} from "lucide-react";

interface DashboardProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  metrics: {
    totalUsers: number;
    revenue: number;
    orders: number;
    growth: number;
  };
  recentOrders: Array<{
    id: string;
    customer: string;
    amount: number;
    status: "pending" | "completed" | "cancelled";
    date: string;
  }>;
}

export function Dashboard({ user, metrics, recentOrders }: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "#", current: true },
    { name: "Users", href: "#", current: false },
    { name: "Orders", href: "#", current: false },
    { name: "Analytics", href: "#", current: false },
    { name: "Settings", href: "#", current: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <nav className="mt-6 px-3">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
                item.current
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="ml-4 lg:ml-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  Dashboard
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search..." className="pl-10 w-64" />
              </div>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="p-6">
          {/* Metrics cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{metrics.growth}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${metrics.revenue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{metrics.growth}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.orders.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{metrics.growth}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{metrics.growth}%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Monthly revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md">
                  <BarChart3 className="h-12 w-12 text-gray-400" />
                  <p className="ml-2 text-gray-500">
                    Chart component would go here
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent orders table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id}
                        </TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>${order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : order.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
```

### 5. Verify Generated Code

**Checklist**:

- [ ] TypeScript compiles without errors
- [ ] Uses multiple shadcn/ui components
- [ ] Includes responsive design
- [ ] Has proper component composition
- [ ] Includes state management
- [ ] Accessibility attributes present
- [ ] Proper layout structure
- [ ] Navigation functionality
- [ ] Data display components
- [ ] Loading states handling

## Test Results

### ✅ Pass Criteria

- [ ] Dashboard generates without errors
- [ ] TypeScript compilation succeeds
- [ ] All shadcn/ui components used correctly
- [ ] Responsive design works
- [ ] Component composition is correct
- [ ] State management functional
- [ ] Navigation works properly
- [ ] Data display components render
- [ ] Accessibility attributes present
- [ ] Layout is responsive

### ❌ Issues Found

- [ ] Issue 1: Description
- [ ] Issue 2: Description

### 📊 Performance Metrics

- **Generation Time**: \_\_\_ seconds
- **Code Quality**: \_\_\_/10
- **Pattern Adherence**: \_\_\_/10
- **Accessibility Score**: \_\_\_/10
- **Component Integration**: \_\_\_/10
- **Responsive Design**: \_\_\_/10

## Notes

Additional observations or recommendations:

---

**Test Date**: $(date)
**CLI Version**: v2.0.28
**Test Status**: ⏳ Pending
