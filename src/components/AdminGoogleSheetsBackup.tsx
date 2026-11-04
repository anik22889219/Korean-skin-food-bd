import React from 'react';
import {
  Archive, Clock3, Cloud, ExternalLink, FileSpreadsheet, Info,
  RefreshCw, ShieldCheck, Workflow, Database, Package, ShoppingCart,
  Users, Wallet, Boxes, AlertTriangle
} from 'lucide-react';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1K9A-EX_v_q-q_PL7fAUBAneZYZ5L4FTTrzEbWRo0G-8/edit';
const APPS_SCRIPT_URL = 'https://script.google.com/home/projects';

const backupGroups = [
  { name: 'Products', collection: 'products', icon: Package, note: 'পণ্যের তথ্য, মূল্য ও স্টক' },
  { name: 'Orders', collection: 'orders', icon: ShoppingCart, note: 'অনলাইন ও POS অর্ডার' },
  { name: 'Inventory Logs', collection: 'inventory_logs', icon: Boxes, note: 'স্টক পরিবর্তনের রেকর্ড' },
  { name: 'Customers', collection: 'users', icon: Users, note: 'গ্রাহক ও অ্যাকাউন্ট তথ্য' },
  { name: 'Wholesale', collection: 'wholesale_orders', icon: Database, note: 'হোলসেল অর্ডার' },
  { name: 'Expenses', collection: 'expenses', icon: Wallet, note: 'ব্যবসায়িক খরচ' },
  { name: 'Finance', collection: 'finance_transactions', icon: Archive, note: 'আর্থিক লেনদেন' },
];

export const AdminGoogleSheetsBackup: React.FC = () => {
  const openSheet = () => window.open(SHEET_URL, '_blank', 'noopener,noreferrer');
  const openAppsScript = () => window.open(APPS_SCRIPT_URL, '_blank', 'noopener,noreferrer');

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <FileSpreadsheet size={15} /> Data Protection & Backup
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Google Sheets Backup Center</h1>
          <p className="mt-1 text-sm text-slate-500">Firestore ডেটার Google Sheets ব্যাকআপ, Apps Script এবং ব্যাকআপ শিডিউল পরিচালনা করুন।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openSheet} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            <FileSpreadsheet size={16} /> Open Backup Sheet <ExternalLink size={14} />
          </button>
          <button onClick={openAppsScript} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Workflow size={16} /> Apps Script <ExternalLink size={14} />
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between text-amber-800"><span className="text-xs font-bold uppercase tracking-wide">Connection</span><Cloud size={18} /></div>
          <div className="mt-2 text-xl font-black text-amber-900">Setup required</div>
          <p className="mt-1 text-xs text-amber-800">Apps Script Web App এখনো Dashboard-এর সঙ্গে যুক্ত নয়।</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase tracking-wide">Full Backup</span><Archive size={18} /></div>
          <div className="mt-2 text-xl font-black text-slate-900">Daily · 01:00</div>
          <p className="mt-1 text-xs text-slate-500">সময়: Asia/Dhaka · প্রথম রান যাচাই বাকি</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase tracking-wide">Incremental Sync</span><RefreshCw size={18} /></div>
          <div className="mt-2 text-xl font-black text-slate-900">Every 15 min</div>
          <p className="mt-1 text-xs text-slate-500">প্রথম Full Backup-এর পর চালু হবে</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-bold uppercase tracking-wide">Backup Collections</span><Database size={18} /></div>
          <div className="mt-2 text-xl font-black text-slate-900">{backupGroups.length}</div>
          <p className="mt-1 text-xs text-slate-500">Allow-list-এ থাকা Firestore collection</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Database className="text-emerald-700" size={19} />
          <div>
            <h2 className="font-bold text-slate-900">Backup Data Groups</h2>
            <p className="text-xs text-slate-500">এই collection-গুলো Apps Script-এর backup job-এ নির্ধারিত। Live row count পেতে Script status endpoint যুক্ত করতে হবে।</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {backupGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.collection} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm"><Icon size={18} /></div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800">{group.name}</div>
                  <div className="text-xs text-slate-500">{group.note}</div>
                  <code className="mt-1 block text-[10px] text-slate-400">{group.collection}</code>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Not verified</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><Workflow className="text-indigo-600" size={19} /><h2 className="font-bold text-slate-900">Google Apps Script Connection</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">নিরাপদ সংযোগের জন্য Apps Script-এ একটি authenticated status/action endpoint প্রয়োজন। বর্তমান runner-এ scheduled backup functions আছে, কিন্তু Dashboard-এর জন্য status API ও manual-run handler এখনো যোগ করা হয়নি।</p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Connection pending</div>
            <p className="mt-1 text-xs leading-5">শুধু Apps Script project URL বসালেই নিরাপদে backup চালানো যাবে না। API key server-side Script Properties-এ থাকবে; Dashboard-এ secret প্রকাশ করা হবে না।</p>
          </div>
          <button onClick={openAppsScript} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700">
            Open Apps Script Project <ExternalLink size={14} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-700" size={19} /><h2 className="font-bold text-slate-900">Setup Checklist</h2></div>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">1</span><span>Spreadsheet-এ Apps Script খুলে repository-এর <code>apps-script/Code.gs</code> কোড যোগ করুন।</span></li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">2</span><span>Script Properties-এ <code>SPREADSHEET_ID</code>, <code>BACKUP_API_URL</code> ও <code>BACKUP_API_KEY</code> সেট করুন।</span></li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">3</span><span>প্রথমে <code>installBackupTriggers</code>, এরপর <code>runFullBackup</code> চালিয়ে অনুমতি দিন ও ফলাফল যাচাই করুন।</span></li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">4</span><span>Dashboard-এ live status ও manual controls চালুর আগে Apps Script status/action API এবং secure backend proxy deploy করতে হবে।</span></li>
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><Info size={15} className="mt-0.5 shrink-0" /> Google Sheet-এ customer ও finance data থাকতে পারে। Sheet sharing সীমিত রাখুন। এটি operational backup, পূর্ণ Firestore restore নয়।</div>
          <button onClick={openSheet} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
            Open Google Backup Spreadsheet <ExternalLink size={14} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminGoogleSheetsBackup;
