import React, { useState, useMemo } from 'react';
import type { PostData } from '../types';
import type { SyncStatus } from '../App';
import { TrashIcon } from './icons/TrashIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EmptyHistoryIllustration } from './illustrations/EmptyHistoryIllustration';
import { GoogleDriveIcon } from './icons/GoogleDriveIcon';
import { Spinner } from './Spinner';
import { CloudIcon } from './icons/CloudIcon';
import { SaveIcon } from './icons/SaveIcon';
import { CloudDownloadIcon } from './icons/CloudDownloadIcon';
import { InfoIcon } from './icons/InfoIcon';


interface HistoryProps {
  items: PostData[];
  onSelect: (post: PostData) => void;
  onDelete: (id: string) => void;
  onRegenerate: (post: PostData) => void;
  onClear: () => void;
  syncStatus: SyncStatus;
  syncError: string | null;
  onConnect: () => void;
  onManualSave: () => void;
  onManualLoad: () => void;
}

export const History: React.FC<HistoryProps> = ({ items, onSelect, onDelete, onRegenerate, onClear, syncStatus, syncError, onConnect, onManualSave, onManualLoad }) => {
  const [platformFilter, setPlatformFilter] = useState('Todas');

  const platforms = useMemo(() => {
    const platformSet = new Set(items.map(item => item.platform));
    return ['Todas', ...Array.from(platformSet).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (platformFilter === 'Todas') {
      return items;
    }
    return items.filter(item => item.platform === platformFilter);
  }, [items, platformFilter]);


  const renderSyncStatus = () => {
    switch (syncStatus) {
      case 'unauthenticated':
        return <span className="text-yellow-400">Requer autenticação</span>;
      case 'unconfigured':
         return <span className="text-yellow-400">Salvo Localmente</span>;
      case 'loading':
        return <span className="text-blue-400 flex items-center gap-2"><Spinner /> Carregando...</span>;
      case 'syncing':
        return <span className="text-blue-400 flex items-center gap-2"><Spinner /> Sincronizando...</span>;
      case 'idle':
        return <span className="text-green-400">Sincronizado</span>;
      case 'error':
        return <span className="text-red-400" title={syncError || ''}>Erro de Sincronização</span>;
      default:
        return null;
    }
  };

  if (items.length === 0 && syncStatus !== 'loading' && syncStatus !== 'unauthenticated') {
    return (
      <div className="text-center py-16 border-t border-slate-700/50 mt-12 flex flex-col items-center">
        <EmptyHistoryIllustration />
        <h2 className="text-2xl font-bold text-slate-300 mt-6 mb-2">Seu histórico está vazio</h2>
        <p className="text-slate-400 max-w-sm">
          Quando você gerar seu primeiro post, ele aparecerá aqui.
        </p>
      </div>
    );
  }

   if (syncStatus === 'unauthenticated') {
     return (
        <div className="text-center py-16 border-t border-slate-700/50 mt-12 flex flex-col items-center">
          <CloudIcon />
          <h2 className="text-2xl font-bold text-slate-300 mt-6 mb-2">Histórico na Nuvem</h2>
          <p className="text-slate-400 max-w-sm mb-6">
            Conecte sua conta Google para carregar e salvar seu histórico de posts de forma segura no Google Drive.
          </p>
          <button
              onClick={onConnect}
              disabled={syncStatus === 'loading'}
              className="mt-6 flex items-center gap-2 text-sm font-medium px-6 py-3 rounded-full text-slate-100 bg-slate-700/80 hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Conectar com Google Drive"
            >
              {syncStatus === 'loading' ? <Spinner /> : <GoogleDriveIcon />}
              <span>{syncStatus === 'loading' ? 'Conectando...' : 'Conectar com Google Drive'}</span>
            </button>
            {syncError && <p className="text-red-400 text-sm mt-4 max-w-sm">{syncError}</p>}
        </div>
     );
   }

  return (
    <div className="border-t border-slate-700/50 pt-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-3xl font-bold text-slate-200">Histórico de Posts</h2>
            {items.length > 0 && (
                <div className="relative">
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value)}
                        className="bg-slate-800/50 border-2 border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-300 focus:ring-fuchsia-500 focus:border-fuchsia-500 appearance-none transition-colors"
                        aria-label="Filtrar por plataforma"
                    >
                        {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs font-medium flex items-center gap-2 p-2 bg-slate-800/50 rounded-full ring-1 ring-slate-700" title="Status de sincronização">
                <CloudIcon status={syncStatus} />
                {renderSyncStatus()}
            </div>
            {syncStatus !== 'unconfigured' && (
              <>
                <button
                onClick={onManualLoad}
                disabled={syncStatus === 'syncing' || syncStatus === 'loading'}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-all duration-200 disabled:opacity-50"
                aria-label="Carregar do Google Drive"
                title="Carregar do Google Drive"
              >
                <CloudDownloadIcon />
              </button>
               <button
                onClick={onManualSave}
                disabled={syncStatus === 'syncing' || syncStatus === 'loading'}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-all duration-200 disabled:opacity-50"
                aria-label="Salvar no Google Drive"
                title="Salvar no Google Drive"
              >
                <SaveIcon />
              </button>
            </>
            )}
            <button
              onClick={onClear}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full text-red-300 bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/30 hover:ring-red-500/40 transition-all duration-200 disabled:opacity-50"
              aria-label="Limpar todo o histórico"
            >
              <TrashIcon />
            </button>
        </div>
      </div>
      
      {syncStatus === 'error' && syncError && (
        <div className="p-3 mb-6 rounded-lg border text-sm flex items-center gap-2 bg-red-500/10 text-red-300 border-red-500/30">
            <span><strong>Atenção:</strong> {syncError}</span>
        </div>
      )}
      
      {syncStatus === 'unconfigured' && syncError && (
        <div className="p-3 mb-6 rounded-lg border text-sm flex items-center gap-2 bg-blue-900/30 text-blue-300 border-blue-500/50">
            <InfoIcon className="h-5 w-5 flex-shrink-0" />
            <span>{syncError}</span>
        </div>
      )}

      {syncStatus === 'loading' && (
        <div className="text-center py-20">
          <Spinner />
          <p className="mt-4 text-slate-400">Carregando seu histórico...</p>
        </div>
      )}

      {syncStatus !== 'loading' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((post) => (
              <div key={post.id} className="bg-slate-900/50 rounded-2xl shadow-lg border border-slate-100/10 overflow-hidden flex flex-col group animate-fade-in transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/10 hover:border-slate-100/20 transform hover:-translate-y-1">
                <div className="aspect-video bg-slate-900 overflow-hidden relative">
                    <img src={post.imageUrl} alt={`Imagem para ${post.theme}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-4">
                        <p className="text-xs text-fuchsia-400 mb-1 font-bold uppercase tracking-wider">{post.platform}</p>
                        <p className="font-semibold text-slate-100 line-clamp-2 leading-tight">{post.theme}</p>
                    </div>
                </div>
                <div className="p-4 bg-slate-800/50 flex-grow flex flex-col justify-between">
                  <p className="text-sm text-slate-300 line-clamp-3 mb-3">
                    {post.caption}
                  </p>
                  <div className="flex justify-end items-center gap-2">
                    <button onClick={() => onSelect(post)} title="Visualizar" className="p-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all"><EyeIcon /></button>
                    <button onClick={() => onRegenerate(post)} title="Gerar Novo" className="p-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all"><RegenerateIcon /></button>
                    <button onClick={() => onDelete(post.id)} title="Excluir" className="p-2 rounded-full text-red-400 bg-red-900/30 hover:bg-red-900/60 hover:text-red-300 transition-all"><TrashIcon /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredItems.length === 0 && items.length > 0 && (
            <div className="text-center py-16">
              <p className="text-slate-400">Nenhum post encontrado para a plataforma "{platformFilter}".</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Simple icon to show sync status
const CloudIcon: React.FC<{status?: SyncStatus}> = ({ status }) => {
    let colorClass = 'text-slate-400';
    if (status === 'idle') colorClass = 'text-green-400';
    if (status === 'syncing' || status === 'loading') colorClass = 'text-blue-400 animate-pulse';
    if (status === 'error') colorClass = 'text-red-400';
    if (status === 'unauthenticated' || status === 'unconfigured') colorClass = 'text-yellow-400';

    return (
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={colorClass}>
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
        </svg>
    )
};