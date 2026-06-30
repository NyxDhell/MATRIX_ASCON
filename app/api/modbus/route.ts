import { NextResponse } from 'next/server';
import ModbusRTU from 'modbus-serial';

const client = new ModbusRTU();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get('ip');
  const port = parseInt(searchParams.get('port') || '502'); // Ambil port dari query
  const addrsParam = searchParams.get('addrs');

  if (!ip) return NextResponse.json({ error: "IP diperlukan" }, { status: 400 });

  try {
    if (!client.isOpen) {
      await client.connectTCP(ip, { port: port }); // Gunakan port dinamis
      client.setID(1);
      client.setTimeout(500);
    }

    let values = [];
    if (addrsParam) {
      const addresses = addrsParam.split(',').map(addr => parseInt(addr) - 1);
      for (const addr of addresses) {
        const res = await client.readHoldingRegisters(Math.max(0, addr), 1);
        values.push(res.data[0]);
      }
    }

    return NextResponse.json({ success: true, data: values });
  } catch (error: any) {
    if (client.isOpen) client.close();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}