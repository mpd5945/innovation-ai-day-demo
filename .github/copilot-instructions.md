# Smeal AI Day — Chaos Engineering Demo

## Project Overview
- **Type**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Purpose**: National Grid Operations Center dashboard for Penn State Smeal AI Innovation Day
- **Key Libraries**: React Three Fiber, Three.js, PostProcessing

## Architecture
- Next.js dashboard polls four grid-sector microservices running in Kubernetes (`smeal-day` namespace)
- API routes proxy requests to K8s NodePort services (`/api/grid/[sector]`)
- LitmusChaos experiments target sectors to visually degrade the dashboard (nominal → degraded → offline)

## Development
- Run `npm run dev` from `smeal-chaos-litmus-demo/` to start the dev server
- Run `npm run build` to create a production build
- The `.vscode/tasks.json` includes tasks for dev server and build

## Deployment
- Grid-sector microservices: `docker build -t grid-sector-service:latest ./grid-service`
- Kubernetes: `kubectl apply -f k8s/grid-services.yml`
- Dashboard: `docker compose up -d --build` (exposes on port 3001)

## Coding Guidelines
- Use TypeScript strict mode
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Keep components in `src/app/components/`
- API routes live under `src/app/api/`
