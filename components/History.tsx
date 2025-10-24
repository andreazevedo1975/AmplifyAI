import React from 'react';
import type { PostData } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { RegenerateIcon } from './icons/RegenerateIcon';
import { EyeIcon } from './icons/EyeIcon';
import { EmptyHistoryIllustration } from './illustrations/EmptyHistoryIllustration';

interface HistoryProps {
  items: PostData[];
  onSelect: (post: PostData) => void;
  onDelete: (id: string) => void;
  onRegenerate: (post: PostData) => void;
  onClear: () => void;
}

export const History: React.FC<HistoryProps> = ({ items, onSelect, onDelete, onRegenerate, onClear }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 border-t border-slate-700 mt-12 flex flex-col items-center">
        <EmptyHistoryIllustration />
        <h2 className="text-xl font-bold text-slate-400 mt-6 mb-2">Seu histórico está vazio</h2>
        <p className="text-slate-500 max-w-sm">
          Quando você gerar seu primeiro post, ele aparecerá aqui para você visualizar, editar ou reutilizar.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-700 pt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-300">Histórico de Posts</h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full text-red-300 bg-red-900/50 hover:bg-red-900 hover:text-red-200 transition-all duration-200"
          aria-label="Limpar todo o histórico"
        >
          <TrashIcon />
          <span>Limpar Histórico</span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((post) => (
          <div key={post.id} className="bg-slate-800/60 rounded-lg shadow-lg border border-slate-700 overflow-hidden flex flex-col group animate-fade-in">
            <div className="aspect-video bg-slate-900 overflow-hidden relative">
                <img src={post.imageUrl} alt={`Imagem para ${post.theme}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <p className="text-xs text-fuchsia-400 mb-1 font-medium">{post.platform}</p>
              <p className="font-semibold text-slate-200 line-clamp-2 flex-grow h-12">{post.theme}</p>
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-end items-center gap-2">
                 <button onClick={() => onSelect(post)} title="Visualizar" className="p-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all"><EyeIcon /></button>
                 <button onClick={() => onRegenerate(post)} title="Gerar Novo" className="p-2 rounded-full text-slate-300 bg-slate-700/50 hover:bg-slate-700 hover:text-white transition-all"><RegenerateIcon /></button>
                 <button onClick={() => onDelete(post.id)} title="Excluir" className="p-2 rounded-full text-red-400 bg-red-900/30 hover:bg-red-900/60 hover:text-red-300 transition-all"><TrashIcon /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};