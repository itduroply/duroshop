# Duroshop - Inventory & POP Distribution Management System

A production-ready Next.js 14 admin dashboard for managing inventory and POP (Point of Purchase) distribution across multiple branches.

## Features

- 🔐 Role-based authentication (Super Admin, HR, Manager, Inventory Requester)
- 📦 Inventory management with branch-level stock tracking
- 📋 Stock request workflow (Branch → Head Office)
- 🎯 POP distribution management with multi-level approval
- 👥 Receiver management (Employees, Architects, Dealers, Contractors)
- 📊 Reports and activity logs
- 🎨 Professional SaaS UI with Tailwind CSS & shadcn/ui
- ⚡ Built with Next.js 14 App Router and TypeScript

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Auth, Postgres, Storage)
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Icons**: Lucide React

## Project Structure

```
duroshop/
├── app/                          # Next.js App Router pages
│   ├── dashboard/                # Dashboard page
│   ├── inventory/                # Inventory management
│   ├── stock-requests/           # Stock requests (Branch → HO)
│   ├── distributions/            # POP distributions
│   ├── receivers/                # Receiver management
│   ├── reports/                  # Reports
│   ├── activity-logs/            # Activity logs
│   ├── login/                    # Login page
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── dashboard/                # Dashboard-specific components
├── features/                     # Feature modules
│   ├── inventory/                # Inventory features
│   ├── stock-requests/           # Stock request features
│   ├── distributions/            # Distribution features
│   └── receivers/                # Receiver features
├── lib/
│   ├── supabase/                 # Supabase client & server helpers
│   ├── auth/                     # Authentication utilities
│   ├── rbac/                     # Role-based access control
│   └── utils.ts                  # Utility functions
├── types/                        # TypeScript type definitions
├── hooks/                        # Custom React hooks
├── supabase/                     # Supabase schema and migrations
└── middleware.ts                 # Next.js middleware for auth
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Set Up Database

Run the SQL schema in your Supabase SQL Editor:

1. Open your Supabase project
2. Go to SQL Editor
3. Copy the contents of `supabase/schema.sql`
4. Execute the SQL

This will create:
- All necessary tables (users, branches, inventory, etc.)
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for auto-updating timestamps

### 5. Create Your First User

**Option A: Using the Setup Page (Recommended)**

1. Run the development server:
   ```bash
   npm run dev
   ```
2. Visit [http://localhost:3000/setup](http://localhost:3000/setup)
3. Fill in the form to create your first Super Admin account
4. Login at [http://localhost:3000/login](http://localhost:3000/login)

**Option B: Manual Setup via Supabase Dashboard**

1. Go to Authentication → Users
2. Add a new user with email/password
3. Copy the user's UUID (you'll see it in the users table)
4. Go to Table Editor → user_profiles
5. Click "Insert" and add a new row:
   - id: (paste the auth user's UUID)
   - email: (user's email)
   - full_name: "Admin User"
   - role: "super_admin"
   - branch_id: leave as NULL
6. Click "Save"

### 6. Login and Start Using

Open [http://localhost:3000](http://localhost:3000) and login with your credentials.

## Troubleshooting Login Issues

If you can't login:

1. **Check your environment variables**: Ensure `.env.local` has valid Supabase URL and anon key
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Verify the database schema**: Make sure you ran the SQL in `supabase/schema.sql`

3. **Check user profile exists**: After creating a user in Supabase Auth, you MUST create a matching record in `user_profiles` table

4. **View browser console**: Open DevTools (F12) to see detailed error messages

5. **Common errors**:
   - "User profile not found" → Create a record in `user_profiles` table
   - "Invalid login credentials" → Check email/password in Supabase Auth
   - "Failed to fetch" → Check your Supabase URL and anon key

## User Roles & Permissions

### Super Admin
- Full access to all modules
- Can manage all data across branches

### HR
- View dashboard
- View and approve employee distributions
- Access reports and activity logs

### Manager
- View dashboard and inventory
- Approve stock requests and distributions
- Manage receivers
- Access reports and logs

### Inventory Requester
- Create stock requests
- Create distributions
- View inventory and receivers
- View own requests and distributions

## Approval Workflow

### Stock Requests (Branch → Head Office)
1. Requester creates request
2. Manager approves
3. Admin dispatches stock

### POP Distributions
- **For Employees**: Manager + HR approval required
- **For Others** (Architect, Dealer, Contractor): Manager approval only
- After approval, stock is issued and branch quantity is reduced

## Key Features

### Authentication
- Email/password login via Supabase Auth
- Protected routes with middleware
- Role-based redirects

### Dashboard
- Real-time statistics
- Branch stock summary
- Pending approvals count
- Recent activity feed

### Inventory Management
- CRUD operations for items
- Branch-level stock tracking
- Stock transaction history
- Low stock alerts

### Reports
- Distribution history
- Stock movement analysis
- Exportable data (future enhancement)

## Development

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Lint Code

```bash
npm run lint
```

## Database Schema Overview

- **user_profiles**: User accounts with roles
- **branches**: Branch locations
- **inventory_items**: Product catalog
- **branch_stock**: Stock levels per branch
- **stock_requests**: Branch to HO requests
- **receivers**: External receivers (non-login users)
- **distributions**: POP distribution records
- **activity_logs**: Audit trail of actions

## Next Steps

To extend this project:

1. **Add CRUD Forms**: Implement forms for creating/editing inventory, requests, distributions
2. **Implement TanStack Table**: Add sortable, filterable data tables
3. **Real-time Updates**: Use Supabase Realtime for live data
4. **File Uploads**: Add support for attachments using Supabase Storage
5. **Advanced Reports**: Add charts with Recharts or similar
6. **Notifications**: Implement email/in-app notifications
7. **Export Features**: Add CSV/PDF export for reports

## Contributing

This is a production-ready starter template. Feel free to customize and extend based on your requirements.

## License

MIT

---

Built with ❤️ using Next.js, Supabase, and shadcn/ui




<html>
      <h1>Welcome to login page</h1>
      <p> This is the duroacademy's login page</p>
      <p>You can directly login in this page uding your mail id and password</p>
</html>