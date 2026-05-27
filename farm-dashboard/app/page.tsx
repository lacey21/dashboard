import { readFile } from 'fs/promises';
import path from 'path';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const filePath = path.join(process.cwd(), 'public', 'dashboard_data.json');
  const data = JSON.parse(await readFile(filePath, 'utf-8'));

  return <DashboardClient initialData={data} />;
}