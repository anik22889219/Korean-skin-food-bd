import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Eye
} from 'lucide-react';
import { CreatorProfile } from '../../types';

interface AdminCreatorsTabProps {
  creators: CreatorProfile[];
  loading: boolean;
  updatingCreatorId: string | null;
  onStatusChange: (creatorId: string, status: 'approved' | 'suspended' | 'pending') => Promise<void>;
  onViewDetails: (creator: CreatorProfile) => void;
}

export const AdminCreatorsTab: React.FC<AdminCreatorsTabProps> = ({
  creators,
  loading,
  updatingCreatorId,
  onStatusChange,
  onViewDetails
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const pendingCount = creators.filter(c => c.status === 'pending').length;
  const approvedCount = creators.filter(c => c.status === 'approved').length;
  const suspendedCount = creators.filter(c => c.status === 'suspended').length;

  const filteredCreators = creators.filter(c => {
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    const matchesSearch = !searchQuery.trim() || 
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Creator Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Applications</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{creators.length}</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block flex items-center gap-1">
            <Clock size={12} /> Pending Review
          </span>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved Creators
          </span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</div>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
          <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block flex items-center gap-1">
            <XCircle size={12} /> Suspended
          </span>
          <div className="text-2xl font-black text-rose-900 mt-1">{suspendedCount}</div>
        </div>
      </div>

      {/* Filters & View Modes */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search creators by handle, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0">Filter Status:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'approved', label: 'Approved' },
            { id: 'suspended', label: 'Suspended' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap border ${
                selectedStatus === tab.id
                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Creators List / Grid */}
      {filteredCreators.length === 0 ? (
        <div className="py-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
          {loading ? 'Loading creators database...' : 'No creator accounts match your criteria.'}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW WITH ALL 10 REQUIRED FIELDS */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3 text-center">Reels</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Likes</th>
                  <th className="px-4 py-3 text-right">Comments</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCreators.map((c) => (
                  <tr key={c.creatorId} className="hover:bg-slate-50/80 transition">
                    {/* 1. Creator */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.profileImage}
                          alt={c.displayName}
                          className="w-10 h-10 rounded-xl object-cover border border-pink-200 bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-900 block truncate">{c.displayName}</span>
                          <span className="text-[11px] font-mono text-pink-600 font-bold block truncate">@{c.username}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{c.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : c.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* 3. Level */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 block">Lvl {c.level}</span>
                      <span className="text-[10px] text-slate-500 block">{c.levelName}</span>
                    </td>

                    {/* 4. Points */}
                    <td className="px-4 py-3 whitespace-nowrap font-black text-amber-600">
                      <span className="flex items-center gap-1">
                        <Zap size={13} className="fill-amber-500 text-amber-500" />
                        {c.totalPoints.toLocaleString()}
                      </span>
                    </td>

                    {/* 5. Reels */}
                    <td className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                      {c.totalReels}
                    </td>

                    {/* 6. Views */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      {c.totalViews.toLocaleString()}
                    </td>

                    {/* 7. Likes */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      {c.totalLikes.toLocaleString()}
                    </td>

                    {/* 8. Comments */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      {c.totalComments.toLocaleString()}
                    </td>

                    {/* 9. Joined */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    {/* 10. Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetails(c)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
                          title="View full profile, reels & performance"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {c.status !== 'approved' && (
                          <button
                            onClick={() => onStatusChange(c.creatorId, 'approved')}
                            disabled={updatingCreatorId === c.creatorId}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {c.status !== 'suspended' && (
                          <button
                            onClick={() => onStatusChange(c.creatorId, 'suspended')}
                            disabled={updatingCreatorId === c.creatorId}
                            className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle size={13} />
                            <span>Suspend</span>
                          </button>
                        )}

                        {c.status === 'suspended' && (
                          <button
                            onClick={() => onStatusChange(c.creatorId, 'pending')}
                            disabled={updatingCreatorId === c.creatorId}
                            className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreators.map((c) => (
            <div key={c.creatorId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-pink-200 bg-slate-100 shrink-0">
                    <img src={c.profileImage} alt={c.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-slate-900 text-sm truncate">{c.displayName}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                        c.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : c.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-pink-600 font-bold block truncate">@{c.username}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{c.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-bold">
                  <span className="text-slate-600">Lvl {c.level}: {c.levelName}</span>
                  <span className="text-amber-600 font-black flex items-center gap-1">
                    <Zap size={12} className="fill-amber-500 text-amber-500" />
                    {c.totalPoints} pts
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[10px] font-mono text-center">
                  <div>
                    <span className="text-slate-400 block text-[8px] uppercase font-black">Views</span>
                    <span className="font-bold text-slate-800">{c.totalViews.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] uppercase font-black">Likes</span>
                    <span className="font-bold text-slate-800">{c.totalLikes.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[8px] uppercase font-black">Comments</span>
                    <span className="font-bold text-slate-800">{c.totalComments.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onViewDetails(c)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>

                <div className="flex items-center gap-1">
                  {c.status !== 'approved' && (
                    <button
                      onClick={() => onStatusChange(c.creatorId, 'approved')}
                      disabled={updatingCreatorId === c.creatorId}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                  )}

                  {c.status !== 'suspended' && (
                    <button
                      onClick={() => onStatusChange(c.creatorId, 'suspended')}
                      disabled={updatingCreatorId === c.creatorId}
                      className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle size={13} />
                      <span>Suspend</span>
                    </button>
                  )}

                  {c.status === 'suspended' && (
                    <button
                      onClick={() => onStatusChange(c.creatorId, 'pending')}
                      disabled={updatingCreatorId === c.creatorId}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
