// src/app/page.tsx
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const res = await fetch('http://localhost:3000/dashboard_data.json', { cache: 'no-store' });
  const data = await res.json();

  return <DashboardClient initialData={data} />;
}