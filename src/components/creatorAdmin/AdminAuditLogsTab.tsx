import React from 'react';
import { History, RefreshCw, Zap } from 'lucide-react';
import { ReelMetricAuditLog } from '../../types';

interface AdminAuditLogsTabProps {
  auditLogs: ReelMetricAuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = ({
  auditLogs,
  loading,
  onRefresh
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase mb-1">
            <History size={12} /> System Audit Trail
          </div>
          <h2 className="text-xl font-black text-slate-900">Reel Performance Verification Logs</h2>
          <p className="text-xs text-slate-500">Immutable record of admin manual metric overrides and points adjustments.</p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            Loading metric audit logs...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            No admin verified metric adjustments logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Timestamp & Admin</th>
                  <th className="px-4 py-3">Reel ID</th>
                  <th className="px-4 py-3">Previous Metrics</th>
                  <th className="px-4 py-3">New Verified Metrics</th>
                  <th className="px-4 py-3">Point Delta</th>
                  <th className="px-4 py-3">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {auditLogs.map((log) => {
                  const prevPts = log.previousPerformance?.points || 0;
                  const newPts = log.newPerformance?.points || 0;
                  const diff = newPts - prevPts;

                  return (
                    <tr key={log.auditLogId} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="text-[10px] text-blue-600 font-mono font-bold block">By: {log.adminId}</span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {log.creatorReelId}
                      </td>

                      <td className="px-4 py-3 text-[11px]">
                        {log.previousPerformance ? (
                          <span>
                            {log.previousPerformance.views} views, {log.previousPerformance.likes} likes, {log.previousPerformance.comments} comments
                          </span>
                        ) : (
                          <span className="text-slate-400">Initial State</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[11px] font-bold text-slate-900">
                        {log.newPerformance.views} views, {log.newPerformance.likes} likes, {log.newPerformance.comments} comments
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                          diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          <Zap size={10} className={diff >= 0 ? 'fill-emerald-500 text-emerald-500' : 'fill-rose-500 text-rose-500'} />
                          {diff >= 0 ? `+${diff}` : diff} pts
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                        {log.reason || 'Admin verified metrics update'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
