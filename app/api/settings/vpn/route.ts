import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const configPath = path.join(process.cwd(), 'next.config.ts');

// Helper untuk membaca daftar IP dari file next.config.ts
function getIPsFromConfig() {
  if (!fs.existsSync(configPath)) return [];
  const content = fs.readFileSync(configPath, 'utf8');
  
  // PERBAIKAN: Mengganti (.*?) dengan ([\s\S]*?) dan menghapus bendera /s agar bebas error TS
  const regex = /allowedDevOrigins:\s*\[([\s\S]*?)\]/;
  const match = content.match(regex);
  
  if (match) {
    return match[1]
      .split(',')
      .map(ip => ip.trim().replace(/['"]/g, ''))
      .filter(ip => ip !== '');
  }
  return [];
}

export async function GET() {
  try {
    const ips = getIPsFromConfig();
    return NextResponse.json({ success: true, data: ips });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}

export async function POST(req: Request) {
  try {
    const { ip, action } = await req.json();
    let content = fs.readFileSync(configPath, 'utf8');
    const ips = getIPsFromConfig();

    let newIps = [...ips];

    if (action === 'delete') {
      newIps = newIps.filter(item => item !== ip);
    } else {
      if (ips.includes(ip)) return NextResponse.json({ success: true, message: 'IP sudah ada' });
      newIps.push(ip);
    }

    const newArrayStr = newIps.map(item => `'${item}'`).join(', ');
    
    // PERBAIKAN: Mengganti .*? dengan [\s\S]*? dan menghapus bendera /s agar bebas error TS
    const regex = /allowedDevOrigins:\s*\[[\s\S]*?\]/;
    const newContent = content.replace(regex, `allowedDevOrigins: [${newArrayStr}]`);

    fs.writeFileSync(configPath, newContent, 'utf8');
    return NextResponse.json({ success: true, message: 'Config updated, rebooting server...' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}