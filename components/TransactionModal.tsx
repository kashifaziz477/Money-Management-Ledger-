
import React, { useState, useEffect } from 'react';
import { Transaction, Member, TransactionType } from '../types';
import { CATEGORIES } from '../constants';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  members: Member[];
  editData?: Transaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, members, editData }) => {
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'INCOME',
    amount: 0,
    description: '',
    category: CATEGORIES[0],
    memberId: ''
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        date: editData.date,
        type: editData.type,
        amount: editData.amount,
        description: editData.description,
        category: editData.category,
        memberId: editData.memberId || ''
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'INCOME',
        amount: 0,
        description: '',
        category: CATEGORIES[0],
        memberId: ''
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{editData ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...formData, id: editData?.id });
        }}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Entry Type</label>
            <div className="flex gap-4">
              <label className="flex-1">
                <input 
                  type="radio" 
                  className="sr-only peer" 
                  name="type" 
                  checked={formData.type === 'INCOME'} 
                  onChange={() => setFormData(prev => ({ ...prev, type: 'INCOME' }))} 
                />
                <div className="p-2 text-center rounded-lg border-2 border-slate-100 dark:border-slate-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/20 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400 cursor-pointer font-medium transition-all">
                  Income
                </div>
              </label>
              <label className="flex-1">
                <input 
                  type="radio" 
                  className="sr-only peer" 
                  name="type" 
                  checked={formData.type === 'EXPENSE'} 
                  onChange={() => setFormData(prev => ({ ...prev, type: 'EXPENSE' }))} 
                />
                <div className="p-2 text-center rounded-lg border-2 border-slate-100 dark:border-slate-800 peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-900/20 peer-checked:text-rose-700 dark:peer-checked:text-rose-400 cursor-pointer font-medium transition-all">
                  Expense
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input 
                type="date" 
                required 
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-slate-200"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (PKR)</label>
              <input 
                type="number" 
                required 
                min="0"
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-slate-200"
                value={formData.amount || ''}
                onChange={e => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. Monthly committee deposit"
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-slate-200"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select 
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-slate-200"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formData.type === 'INCOME' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Associated Member</label>
              <select 
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:text-slate-200"
                value={formData.memberId}
                onChange={e => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
              >
                <option value="">Select Member (Optional)</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
            >
              {editData ? 'Update Record' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
