#!/bin/bash

# --- DEKLARASI WARNA TERMINAL ---
GREEN='\033[0;32m'
TEAL='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- MENCARI LOKASI FOLDER PROGRAM ---
if [ ! -f "package.json" ]; then
    if [ -f "plc-dashboard/package.json" ]; then
        cd plc-dashboard || exit
    else
        echo -e "${RED}[ERROR] File package.json tidak ditemukan!${NC}"
        echo "Pastikan file setup-matrix.sh berada di dalam atau di dekat folder plc-dashboard."
        exit 1
    fi
fi

# --- FUNGSI MENU UTAMA ---
show_menu() {
    clear
    echo -e "${TEAL}====================================================================${NC}"
    echo -e "${GREEN}            ASCON MATRIX SCADA SYSTEM SETUP                        ${NC}"
    echo -e "${TEAL}====================================================================${NC}"
    echo "  [1] (STEP 1) Setup Database Awal (Auto-Import SQL)"
    echo "  [2] (STEP 2) Install Semua Library Jaringan (npm install)"
    echo "  [3] (STEP 3) Build & Jalankan Mode Produksi (Siap Pakai!)"
    echo "  ------------------------------------------------------------------"
    echo "  [4] Jalankan Mode Development (Hanya untuk Coding)"
    echo "  [5] Bersihkan Cache / Hapus Node_Modules"
    echo "  [6] Keluar"
    echo -e "${TEAL}====================================================================${NC}"
    echo ""
    read -p "Masukkan pilihan Anda (1-6): " choice

    case $choice in
        1) setup_db ;;
        2) install_libs ;;
        3) run_production ;;
        4) run_development ;;
        5) clean_cache ;;
        6) exit 0 ;;
        *) 
            echo -e "${RED}Pilihan tidak valid! Silakan masukkan nomor 1 sampai 6.${NC}"
            sleep 2
            show_menu
            ;;
    esac
}

# --- FUNGSI 1: SETUP DATABASE ---
setup_db() {
    clear
    echo -e "${TEAL}====================================================================${NC}"
    echo -e "${GREEN}                 AUTO-IMPORT DATABASE MYSQL                         ${NC}"
    echo -e "${TEAL}====================================================================${NC}"
    echo "Pastikan file database.sql berada di folder yang sama dengan package.json!"
    echo ""
    
    # Deteksi perintah MySQL (bisa mysql atau mariadb)
    MYSQL_CMD="mysql"
    if ! command -v mysql &> /dev/null; then
        echo -e "${RED}[ERROR] MySQL/MariaDB client tidak terdeteksi di server ini!${NC}"
        echo "Silakan install dengan: sudo apt install mysql-client"
        sleep 3
        show_menu
        return
    fi

    read -s -p "Masukkan Password ROOT MySQL Anda: " DBPASS
    echo ""
    echo -e "${YELLOW}⏳ Sedang membuat database 'plc_database' (jika belum ada)...${NC}"
    
    $MYSQL_CMD -u root -p"$DBPASS" -e "CREATE DATABASE IF NOT EXISTS plc_database;"
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Gagal masuk ke MySQL. Pastikan password benar dan layanan aktif!${NC}"
        read -p "Tekan Enter untuk kembali ke menu..."
        show_menu
        return
    fi

    echo -e "${YELLOW}⏳ Sedang meng-import tabel dari file database.sql...${NC}"
    $MYSQL_CMD -u root -p"$DBPASS" plc_database < database.sql
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Gagal import! Pastikan file 'database.sql' ada di folder ini.${NC}"
        read -p "Tekan Enter untuk kembali ke menu..."
        show_menu
        return
    fi

    echo ""
    echo -e "${GREEN}✅ [SUKSES] Database berhasil dibuat dan di-import!${NC}"
    echo "Silakan lanjut ke STEP 2 (Install Library)."
    read -p "Tekan Enter untuk kembali ke menu..."
    show_menu
}

# --- FUNGSI 2: INSTALL LIBRARIES ---
install_libs() {
    clear
    echo -e "${TEAL}🔍 Memeriksa lingkungan sistem (Node.js)...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}[ERROR] Node.js tidak terdeteksi di server Ubuntu ini!${NC}"
        echo "Silakan install Node.js versi LTS terlebih dahulu."
        read -p "Tekan Enter untuk kembali ke menu..."
        show_menu
        return
    fi

    echo -e "${GREEN}✅ Node.js terdeteksi.${NC}"
    echo -e "${YELLOW}📥 Memulai instalasi seluruh library dari package.json...${NC}"
    echo ""
    npm install
    
    echo ""
    echo -e "${YELLOW}⚙️ Menyiapkan Prisma Client (ORM Database)...${NC}"
    npx prisma generate
    
    echo ""
    echo -e "${GREEN}✅ [SUKSES] Semua library berhasil diisntall!${NC}"
    read -p "Tekan Enter untuk kembali ke menu..."
    show_menu
}

# --- FUNGSI 3: PRODUCTION ---
run_production() {
    clear
    echo -e "${YELLOW}🏗️ Memulai Kompilasi Final Aplikasi (npm run build)...${NC}"
    echo ""
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Proses Build gagal! Periksa error di atas.${NC}"
        read -p "Tekan Enter untuk kembali ke menu..."
        show_menu
        return
    fi

    echo ""
    echo -e "${GREEN}✅ Kompilasi berhasil!${NC}"
    echo -e "${TEAL}🚀 Menyalakan Server SCADA Mode Produksi...${NC}"
    echo "Server berjalan di port 3000. Jangan tutup terminal ini (atau gunakan 'pm2' untuk background)."
    echo ""
    npm run start
}

# --- FUNGSI 4: DEVELOPMENT ---
run_development() {
    clear
    echo -e "${TEAL}🚀 Menyalakan Server SCADA Mode Development (npm run dev)...${NC}"
    echo ""
    npm run dev
}

# --- FUNGSI 5: CLEAN CACHE ---
clean_cache() {
    clear
    echo -e "${RED}⚠️ PERINGATAN: Ini akan menghapus folder node_modules dan cache .next.${NC}"
    read -p "Apakah Anda yakin ingin melanjutkan? (Y/N): " confirm
    
    if [[ "$confirm" == [yY] || "$confirm" == [yY][eE][sS] ]]; then
        echo -e "${YELLOW}🗑️ Menghapus berkas lama...${NC}"
        rm -rf node_modules
        rm -rf .next
        rm -f package-lock.json
        echo -e "${GREEN}✅ Pembersihan selesai.${NC}"
    fi
    read -p "Tekan Enter untuk kembali ke menu..."
    show_menu
}

# --- JALANKAN PROGRAM ---
show_menu