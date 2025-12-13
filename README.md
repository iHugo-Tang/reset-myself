This project is a personal goal tracking and self-management application built with Next.js, Cloudflare D1, and Supabase.
Key features include visual timeline recording, daily habit check-ins, and goal progress monitoring to help users continuously track personal growth.
With a clean, modern interface and efficient data synchronization, it allows users to focus on self-reset and improvement.

![demo](docs/images/demo.png)

## System Architecture

```mermaid
graph TD
    User["User"]

    subgraph Frontend ["Frontend (Next.js App Router)"]
        Page["Pages (SSR/CSR)"]
        Components["UI Components (Tailwind CSS)"]
        Middleware["Middleware (Auth)"]
    end

    subgraph Backend ["Backend Services (Cloudflare Pages)"]
        API["API Routes"]
        Actions["Server Actions"]
    end

    subgraph DataLayer ["Data & Storage"]
        D1[("Cloudflare D1 Database")]
        Supabase["Supabase Auth"]
    end

    User -->|"HTTPS Access"| Page
    Page -->|"Renders"| Components
    Page -->|"Data Fetching"| API
    Page -->|"Forms/Interactions"| Actions

    Middleware -->|"Session Validation"| Supabase
    API -->|"Drizzle ORM"| D1
    Actions -->|"Drizzle ORM"| D1
    Actions -->|"Auth Verification"| Supabase

    style D1 fill:#f9f,stroke:#333,stroke-width:2px
    style Supabase fill:#3ecf8e,stroke:#333,stroke-width:2px
    style Frontend fill:#e1f5fe,stroke:#333
    style Backend fill:#fff3e0,stroke:#333
```
