'use client';

import React, { useState, useEffect } from 'react';
import {
    Trash2, RefreshCw, AlertTriangle, File, Users, Database,
    Check, X, AlertCircle, HardDrive, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';

export default function OrphanManagerPage() {
    const [activeTab, setActiveTab] = useState<'leads' | 'storage' | 'assets'>('leads');
    const [loading, setLoading] = useState(false);

    // Data States
    const [orphanLeads, setOrphanLeads] = useState<any[]>([]);
    const [orphanFiles, setOrphanFiles] = useState<any[]>([]);
    const [brokenAssets, setBrokenAssets] = useState<any[]>([]);

    // Selection States
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Scan Status
    const [lastScan, setLastScan] = useState<Date | null>(null);

    // Fetch Data
    const scanAll = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            // Parallel fetch
            const [leadsRes, storageRes, assetsRes] = await Promise.all([
                fetch('/api/admin/orphans/leads'),
                fetch('/api/admin/orphans/storage'),
                fetch('/api/admin/orphans/assets')
            ]);

            const leadsData = await leadsRes.json();
            const storageData = await storageRes.json();
            const assetsData = await assetsRes.json();

            setOrphanLeads(Array.isArray(leadsData) ? leadsData : []);
            setOrphanFiles(Array.isArray(storageData) ? storageData : []);
            setBrokenAssets(Array.isArray(assetsData) ? assetsData : []);

            setLastScan(new Date());
        } catch (error) {
            console.error('Scan failed:', error);
            alert('Scan failed. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    // Initial Scan
    useEffect(() => {
        scanAll();
    }, []);

    // Selection Logic
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        let currentData: any[] = [];
        if (activeTab === 'leads') currentData = orphanLeads;
        if (activeTab === 'storage') currentData = orphanFiles;

        // Note: Broken Assets might not be deletable in bulk yet, depends on implementation
        // For now, let's allow selection only for Leads and Storage

        if (selectedIds.size === currentData.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set<string>();
            currentData.forEach((item: any) => {
                const id = activeTab === 'leads' ? item.id.toString() : item.name;
                newSet.add(id);
            });
            setSelectedIds(newSet);
        }
    };

    // Delete Logic
    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            if (activeTab === 'leads') {
                const leadIds = Array.from(selectedIds).map(id => parseInt(id));
                const res = await fetch('/api/admin/orphans/leads', {
                    method: 'DELETE',
                    body: JSON.stringify({ leadIds })
                });
                if (res.ok) {
                    setOrphanLeads(prev => prev.filter(l => !selectedIds.has(l.id.toString())));
                    setSelectedIds(new Set());
                }
            } else if (activeTab === 'storage') {
                const fileNames = Array.from(selectedIds);
                const res = await fetch('/api/admin/orphans/storage', {
                    method: 'DELETE',
                    body: JSON.stringify({ fileNames })
                });
                if (res.ok) {
                    setOrphanFiles(prev => prev.filter(f => !selectedIds.has(f.name)));
                    setSelectedIds(new Set());
                }
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed');
        } finally {
            setLoading(false);
        }
    };

    // Fix Broken Asset - Remove reference from config
    const handleFixBrokenAsset = async (item: any) => {
        if (!confirm(`Xóa reference đến asset "${item.assetId || item.assetPath}" khỏi project "${item.projectName}"?\n\nAsset này sẽ không còn hiển thị trong AR.`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/admin/orphans/assets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: item.projectId,
                    assetId: item.assetId,
                    assetPath: item.assetPath
                })
            });

            if (res.ok) {
                setBrokenAssets(prev => prev.filter(a =>
                    !(a.projectId === item.projectId && a.assetId === item.assetId)
                ));
                alert('Đã xóa asset reference thành công!');
            } else {
                const data = await res.json();
                alert('Lỗi: ' + data.error);
            }
        } catch (error) {
            console.error('Fix failed:', error);
            alert('Không thể xóa asset reference');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentData = () => {
        if (activeTab === 'leads') return orphanLeads;
        if (activeTab === 'storage') return orphanFiles;
        return brokenAssets;
    };

    const currentData = getCurrentData();

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                            Orphan Data Manager
                        </h1>
                        <p className="text-white/40 font-medium mt-2">
                            Scan and clean up unused data to save storage and improve performance.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {lastScan && (
                            <span className="text-xs text-white/30 font-mono">
                                Last scan: {lastScan.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={scanAll}
                            disabled={loading}
                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Scanning...' : 'Scan All'}
                        </button>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => setActiveTab('leads')} className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'leads' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[#0c0c0c] border-white/5 hover:border-white/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest">Orphan Leads</h3>
                            <Users size={20} className={activeTab === 'leads' ? 'text-blue-500' : 'text-white/20'} />
                        </div>
                        <p className="text-3xl font-black text-white">{orphanLeads.length}</p>
                    </div>

                    <div onClick={() => setActiveTab('storage')} className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'storage' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-[#0c0c0c] border-white/5 hover:border-white/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest">Orphan Files</h3>
                            <HardDrive size={20} className={activeTab === 'storage' ? 'text-purple-500' : 'text-white/20'} />
                        </div>
                        <p className="text-3xl font-black text-white">{orphanFiles.length}</p>
                        <p className="text-[10px] text-white/40 mt-1">
                            ~{(orphanFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>

                    <div onClick={() => setActiveTab('assets')} className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'assets' ? 'bg-red-500/10 border-red-500/50' : 'bg-[#0c0c0c] border-white/5 hover:border-white/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest">Broken Assets</h3>
                            <LinkIcon size={20} className={activeTab === 'assets' ? 'text-red-500' : 'text-white/20'} />
                        </div>
                        <p className="text-3xl font-black text-white">{brokenAssets.length}</p>
                    </div>
                </div>

                {/* Main Content Actions */}
                <div className="flex justify-between items-center bg-[#0c0c0c] p-4 rounded-t-2xl border border-white/5 border-b-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {activeTab === 'leads' && <Users className="text-blue-500" />}
                        {activeTab === 'storage' && <HardDrive className="text-purple-500" />}
                        {activeTab === 'assets' && <LinkIcon className="text-red-500" />}
                        {activeTab === 'leads' && 'Orphan Leads List'}
                        {activeTab === 'storage' && 'Orphan Storage Files'}
                        {activeTab === 'assets' && 'Broken Projects Assets'}
                    </h2>

                    {activeTab !== 'assets' && (
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-white/40">
                                Selected: <span className="text-white font-bold">{selectedIds.size}</span>
                            </span>
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={handleDelete}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                                >
                                    <Trash2 size={14} /> Delete Selected
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-[#0c0c0c] rounded-b-2xl border border-white/5 overflow-hidden min-h-[400px]">
                    {currentData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
                            <Check size={40} className="text-green-500/50" />
                            <p className="text-sm font-medium uppercase tracking-widest">No issues found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5 text-[10px] uppercase font-black tracking-wider text-white/50">
                                    <tr>
                                        {activeTab !== 'assets' && (
                                            <th className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === currentData.length && currentData.length > 0}
                                                    onChange={toggleAll}
                                                    className="accent-orange-500"
                                                />
                                            </th>
                                        )}
                                        {activeTab === 'leads' && (
                                            <>
                                                <th className="p-4">Lead ID</th>
                                                <th className="p-4">Project ID (Missing)</th>
                                                <th className="p-4">Created At</th>
                                                <th className="p-4">User Data</th>
                                            </>
                                        )}
                                        {activeTab === 'storage' && (
                                            <>
                                                <th className="p-4">File Name</th>
                                                <th className="p-4">Size</th>
                                                <th className="p-4">Created At</th>
                                                <th className="p-4">Action</th>
                                            </>
                                        )}
                                        {activeTab === 'assets' && (
                                            <>
                                                <th className="p-4">Project</th>
                                                <th className="p-4">Asset Type</th>
                                                <th className="p-4">Reason</th>
                                                <th className="p-4">Broken URL</th>
                                                <th className="p-4">Action</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="text-xs text-white/70 divide-y divide-white/5">
                                    {currentData.map((item: any, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            {activeTab !== 'assets' && (
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(activeTab === 'leads' ? item.id.toString() : item.name)}
                                                        onChange={() => toggleSelection(activeTab === 'leads' ? item.id.toString() : item.name)}
                                                        className="accent-orange-500"
                                                    />
                                                </td>
                                            )}

                                            {/* Leads Rows */}
                                            {activeTab === 'leads' && (
                                                <>
                                                    <td className="p-4 font-mono text-white/40">#{item.id}</td>
                                                    <td className="p-4 font-mono text-white/30">{item.project_id}</td>
                                                    <td className="p-4">{new Date(item.created_at).toLocaleString()}</td>
                                                    <td className="p-4 max-w-xs truncate font-mono text-[10px] text-white/30">{JSON.stringify(item.user_data)}</td>
                                                </>
                                            )}

                                            {/* Storage Rows */}
                                            {activeTab === 'storage' && (
                                                <>
                                                    <td className="p-4 font-medium text-white break-all max-w-md">
                                                        <a href={item.publicUrl} target="_blank" className="hover:text-blue-400 flex items-center gap-2">
                                                            <File size={12} /> {item.name}
                                                        </a>
                                                    </td>
                                                    <td className="p-4 font-mono">{(item.size / 1024).toFixed(1)} KB</td>
                                                    <td className="p-4 text-white/40">{new Date(item.timeCreated).toLocaleDateString()}</td>
                                                    <td className="p-4">
                                                        <a href={item.publicUrl} target="_blank" className="text-blue-500 hover:text-blue-400 text-[10px] font-bold uppercase">View</a>
                                                    </td>
                                                </>
                                            )}

                                            {/* Assets Rows */}
                                            {activeTab === 'assets' && (
                                                <>
                                                    <td className="p-4">
                                                        <Link href={`/admin/projects/${item.projectId}`} className="text-blue-400 hover:underline font-bold">
                                                            {item.projectName}
                                                        </Link>
                                                    </td>
                                                    <td className="p-4 uppercase text-[10px] font-bold tracking-wider">{item.type}</td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block w-fit ${item.reason === 'FILE_DELETED' ? 'bg-red-500/20 text-red-400' :
                                                                item.reason === 'URL_ENCODING_MISMATCH' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                    item.reason === 'BUCKET_MISMATCH' ? 'bg-purple-500/20 text-purple-400' :
                                                                        'bg-gray-500/20 text-gray-400'
                                                                }`}>
                                                                {item.reason || 'UNKNOWN'}
                                                            </span>
                                                            <span className="text-[10px] text-white/40 max-w-[200px]">
                                                                {item.reasonDescription}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 max-w-[200px] truncate text-red-400 font-mono text-[10px]" title={item.url}>{item.url}</td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => handleFixBrokenAsset(item)}
                                                            disabled={loading}
                                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-50"
                                                        >
                                                            <Trash2 size={12} /> Xóa Reference
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
