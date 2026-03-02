#!/bin/bash
# Install all canonical shadcn/ui components in a Next.js or React project using pnpm
echo "Installing all shadcn/ui components..."
pnpm dlx shadcn@latest add --all -y
echo "All shadcn/ui components installed."
