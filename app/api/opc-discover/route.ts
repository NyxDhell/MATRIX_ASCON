import { NextResponse } from 'next/server';
const { OPCUAClient, NodeClass } = require("node-opcua");

export async function POST(request: Request) {
  // Solusi Error TS: Tambahkan tipe data `: any` secara eksplisit
  let client: any = null;
  let session: any = null;
  
  try {
    const { endpoint_url, auth_type, username, password } = await request.json();

    client = OPCUAClient.create({
      endpointMustExist: false,
      connectionStrategy: { maxRetry: 1, initialDelay: 2000, maxDelay: 3000 }
    });

    console.log(`[SCANNER] Mencoba terhubung ke ${endpoint_url}...`);
    await client.connect(endpoint_url);

    if (auth_type === 'username') {
      console.log(`[SCANNER] Login menggunakan Username: ${username}`);
      session = await client.createSession({ userName: username, password: password });
    } else {
      console.log(`[SCANNER] Login sebagai Anonymous`);
      session = await client.createSession();
    }

    console.log(`[SCANNER] Berhasil masuk! Sedang memindai tag di dalam PLC...`);
    const discoveredTags: any[] = [];

    // Fungsi rekursif untuk masuk ke dalam folder-folder PLC (Max kedalaman: 4)
    async function browseNode(nodeId: string, currentPath: string, depth: number) {
      if (depth > 4) return;
      
      const browseResult = await session.browse(nodeId);
      
      for (const ref of browseResult.references) {
        const name = ref.displayName.text;
        const childNodeId = ref.nodeId.toString();
        const fullPath = currentPath ? `${currentPath}/${name}` : name;

        // Jika itu adalah Variable (Sensor/Data)
        if (ref.nodeClass === NodeClass.Variable) {
          // Abaikan variabel bawaan sistem OPC yang tidak penting
          if (!childNodeId.includes("i=22") && !fullPath.includes("Server/")) {
            discoveredTags.push({
              name: name,
              nodeId: childNodeId,
              path: fullPath
            });
          }
        } 
        // Jika itu adalah Folder (Object), selami lagi ke dalamnya!
        else if (ref.nodeClass === NodeClass.Object) {
          await browseNode(childNodeId, fullPath, depth + 1);
        }
      }
    }

    // Mulai menyelam dari folder utama (ObjectsFolder)
    await browseNode("ns=0;i=85", "", 0);

    console.log(`[SCANNER] Selesai! Menemukan ${discoveredTags.length} tags.`);

    await session.close();
    await client.disconnect();

    return NextResponse.json({ success: true, tags: discoveredTags });

  } catch (error: any) {
    console.error("\n❌ [SCANNER ERROR]:", error.message);
    
    if (session) await session.close().catch(()=>console.log("session close err"));
    if (client) await client.disconnect().catch(()=>console.log("client disc err"));
    
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}