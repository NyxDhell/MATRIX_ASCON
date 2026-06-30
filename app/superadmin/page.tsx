'use client';

import React, { useState, useEffect } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ShieldCheck, UserCheck, UserX, Trash2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });

export default function SuperAdminPage() {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/users', {
      method: 'PUT',
      body: JSON.stringify({ id, status })
    });
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if(confirm("Hapus akses user ini?")) {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 p-8 ${pjs.className}`}>
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <ShieldCheck className="text-indigo-600" size={32}/> SUPERADMIN PANEL
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manajemen Akses Engineer & Approval</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="rounded-xl border-slate-200"><ArrowLeft size={16} className="mr-2"/> Kembali ke Hub</Button>
          </Link>
        </header>

        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
              <tr>
                <th className="p-6">Nama Engineer</th>
                <th className="p-6">Username</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Aksi Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.isArray(users) && users.map((u: any) => (
                <tr key={u.id} className="text-sm group hover:bg-slate-50">
                  <td className="p-6 font-bold text-slate-700">{u.name || 'Anonymous'}</td>
                  <td className="p-6 font-mono text-indigo-600">{u.username}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                      u.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status === 'PENDING' ? (
                        <Button onClick={() => updateStatus(u.id, 'APPROVED')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl text-[10px] font-black">ACC</Button>
                      ) : (
                        <Button onClick={() => updateStatus(u.id, 'PENDING')} size="sm" variant="outline" className="text-amber-600 border-amber-100 rounded-xl text-[10px] font-black">SUSPEND</Button>
                      )}
                      <Button onClick={() => deleteUser(u.id)} variant="ghost" size="icon" className="text-red-400"><Trash2 size={16}/></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
