const { OPCUAClient, AttributeIds, ClientSubscription, TimestampsToReturn } = require("node-opcua");
const mysql = require("mysql2/promise");
const envUrl = process.env.DATABASE_URL || "";
// Regex ini bertugas mengambil IP VPN (teks setelah simbol '@' dan sebelum ':')
const hostMatch = envUrl.match(/@([^:\/]+)/); 
const dynamicHost = hostMatch ? hostMatch[1] : 'localhost';

const dbConfig = { 
  host: dynamicHost, // <-- Sekarang otomatis jadi '10.242.215.145' atau 'localhost' sesuai .env
  port: 3306, 
  user: 'root', 
  password: 'rahasia123', 
  database: 'plc_database' 
};

const latestDataBuffer = {}; 

async function startEngine() {
  console.log("🚀 [ASCON HIGH-SPEED ENGINE] Aktif - Mode 250ms...");
  
  try {
    const dbPool = await mysql.createPool(dbConfig);
    
    await dbPool.query("SELECT 1");
    console.log("✅ Database MySQL terhubung!");

    const [configs] = await dbPool.query("SELECT * FROM plc_config WHERE status = 'active'");
    if (configs.length === 0) return console.log("⚠️ Tidak ada konfigurasi mesin aktif di database.");

    for (const config of configs) runBridge(config, dbPool);

    // ==================================================================
    // 1. ENGINE REALTIME (Berdetak SUPER CEPAT: 250ms)
    // ==================================================================
    setInterval(async () => {
      for (const plcName in latestDataBuffer) {
        for (const tagName in latestDataBuffer[plcName]) {
          const entry = latestDataBuffer[plcName][tagName];
          
          try {
            await dbPool.execute(
              "INSERT INTO plc_data_realtime (plc_name, tag_name, tag_value, status_code, timestamp) VALUES (?, ?, ?, ?, NOW(3))",
              [plcName, tagName, entry.value, entry.quality]
            );
          } catch (err) {}
        }
      }
    }, 250);

    // ==================================================================
    // 2. ENGINE AUTO-CLEANUP (Berdetak Santai: 10 Detik)
    // ==================================================================
    // Node.js bertindak sebagai "Tukang Sapu" untuk mencegah database jebol
    setInterval(async () => {
      for (const plcName in latestDataBuffer) {
        try {
          // Hapus murni data yang usianya sudah lewat dari 60 detik (1 menit)
          await dbPool.execute(
            "DELETE FROM plc_data_realtime WHERE plc_name = ? AND timestamp < (NOW() - INTERVAL 1 MINUTE)", 
            [plcName]
          );
        } catch (err) {
          console.error(`❌ Gagal membersihkan tabel realtime untuk ${plcName}:`, err.message);
        }
      }
    }, 10000);

    // ==================================================================
    // 3. ENGINE HISTORIAN (Berdetak 10 Detik untuk data long-term)
    // ==================================================================
    setInterval(async () => {
      for (const plcName in latestDataBuffer) {
        for (const tagName in latestDataBuffer[plcName]) {
          const entry = latestDataBuffer[plcName][tagName];
          try {
            await dbPool.execute(
              "INSERT INTO plc_data_logs (plc_name, tag_name, tag_value, status_code) VALUES (?, ?, ?, ?)",
              [plcName, tagName, entry.value, entry.quality]
            );
          } catch (err) {}
        }
      }
    }, 10000); 

  } catch (dbError) {
    console.error("❌ FATAL DATABASE ERROR:", dbError.message);
  }
}

async function runBridge(config, dbPool) {
  const plcName = config.plc_name;
  const tags = JSON.parse(config.tags_json);
  const client = OPCUAClient.create({ endpointMustExist: false });

  try {
    await client.connect(config.endpoint_url);
    const session = config.auth_type === 'username' 
      ? await client.createSession({ userName: config.username, password: config.password })
      : await client.createSession();

    console.log(`🔌 [${plcName}] OPC UA Terhubung. Mode High-Speed 250ms.`);

    const subscription = ClientSubscription.create(session, {
      requestedPublishingInterval: 200, publishingEnabled: true,
    });

    latestDataBuffer[plcName] = {};

    for (const tag of tags) {
      const monitoredItem = await subscription.monitor(
        { nodeId: tag.nodeId, attributeId: AttributeIds.Value },
        { samplingInterval: 200, discardOldest: true, queueSize: 1 },
        TimestampsToReturn.Both
      );

      monitoredItem.on("changed", (dataValue) => {
        latestDataBuffer[plcName][tag.name] = {
          value: dataValue.value.value, quality: dataValue.statusCode.name
        };
      });
    }
  } catch (error) {
    console.error(`❌ [${plcName}] Error Koneksi OPC:`, error.message);
  }
}

startEngine();