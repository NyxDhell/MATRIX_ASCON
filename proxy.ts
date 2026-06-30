import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Di Next.js 16, fungsi ini harus bernama "proxy" (bukan "middleware" lagi)
export function proxy(request: NextRequest) {
  // Cek apakah ada tiket login di browser
  const isAuthenticated = request.cookies.get('isLoggedIn'); 

  // Jika mencoba buka root (dashboard) tapi belum login, tendang ke /login
  if (!isAuthenticated && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login, silakan masuk
  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Rute yang dijaga ketat oleh satpam
};