import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Menarik 1 data status jaringan PALING TERBARU dari database asli
    const latestStatus = await prisma.networkStatus.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!latestStatus) {
      return NextResponse.json({ error: "Belum ada data jaringan dari n8n" }, { status: 404 });
    }

    // Format ulang agar sesuai dengan frontend
    const formattedData = {
      router: {
        status: latestStatus.routerStatus,
        uplink: latestStatus.routerUplink,
        latency: latestStatus.routerLatency,
      },
      vpn: {
        status: latestStatus.vpnStatus,
        networkId: latestStatus.vpnNetworkId,
        activePeers: latestStatus.vpnPeers,
      }
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat dari database" }, { status: 500 });
  }
}