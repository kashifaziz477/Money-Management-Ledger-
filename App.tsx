
import React, { useState, useMemo, useEffect } from 'react';
import { Member, Transaction, AuditRecord, TransactionType } from './types';
import { INITIAL_MEMBERS, INITIAL_TRANSACTIONS } from './constants';
import StatCard from './components/StatCard';
import TransactionModal from './components/TransactionModal';
import { getFinancialInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CURRENCY = "Rs.";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const App: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [auditLog, setAuditLog] = useState<AuditRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TRANSACTIONS' | 'MEMBERS' | 'AUDIT'>('DASHBOARD');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [insights, setInsights] = useState<string>("Analyzing PKR financials...");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Month-wise tracking state
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonthIdx);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('ledger-dark-mode');
    return saved === 'true';
  });

  // Persist Dark Mode
  useEffect(() => {
    localStorage.setItem('ledger-dark-mode', darkMode.toString());
  }, [darkMode]);

  // Insights Loading
  useEffect(() => {
    const fetchInsights = async () => {
      const result = await getFinancialInsights(transactions, members);
      setInsights(result);
    };
    fetchInsights();
  }, [transactions, members]);

  // Filtered Transactions based on month/year
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesYear = tDate.getFullYear() === selectedYear;
        const matchesMonth = selectedMonth === 'ALL' || tDate.getMonth() === selectedMonth;
        return matchesSearch && matchesYear && matchesMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedYear, selectedMonth]);

  // Derived Data for the selected period
  const periodTotals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const allTimeBalance = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    return income - expense;
  }, [transactions]);

  const memberContributions = useMemo(() => {
    return members.map(member => ({
      ...member,
      total: transactions
        .filter(t => t.type === 'INCOME' && t.memberId === member.id)
        .reduce((acc, t) => acc + t.amount, 0)
    }));
  }, [members, transactions]);

  const monthlyChartData = useMemo(() => {
    const data: Record<string, { income: number; expense: number }> = {};
    // Ensure all months of the selected year are present for a full Jan-Dec view
    MONTHS.forEach((m, idx) => {
      const key = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      data[key] = { income: 0, expense: 0 };
    });

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate.getFullYear() === selectedYear) {
        const key = t.date.substring(0, 7); // YYYY-MM
        if (data[key]) {
          if (t.type === 'INCOME') data[key].income += t.amount;
          else data[key].expense += t.amount;
        }
      }
    });

    return Object.entries(data)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, values]) => ({
        month: MONTHS[parseInt(monthKey.split('-')[1]) - 1].substring(0, 3),
        ...values
      }));
  }, [transactions, selectedYear]);

  // Actions
  const addAudit = (action: AuditRecord['action'], entity: AuditRecord['entity'], details: string) => {
    const log: AuditRecord = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action,
      entity,
      details
    };
    setAuditLog(prev => [log, ...prev]);
  };

  const handleSaveTransaction = (data: Omit<Transaction, 'id'> & { id?: string }) => {
    if (data.id) {
      setTransactions(prev => prev.map(t => t.id === data.id ? { ...data, id: data.id } as Transaction : t));
      addAudit('UPDATE', 'TRANSACTION', `Updated transaction: ${data.description}`);
    } else {
      const newTx: Transaction = { ...data, id: Math.random().toString(36).substr(2, 9) };
      setTransactions(prev => [...prev, newTx]);
      addAudit('CREATE', 'TRANSACTION', `Added transaction: ${data.description} (${CURRENCY}${data.amount})`);
    }
    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    if (confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      addAudit('DELETE', 'TRANSACTION', `Deleted transaction: ${tx.description}`);
    }
  };

  const handleAddMember = () => {
    const name = prompt("Enter member name:");
    const email = prompt("Enter member email:");
    if (name && email) {
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      };
      setMembers(prev => [...prev, newMember]);
      addAudit('CREATE', 'MEMBER', `Added member: ${name}`);
    }
  };

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Sidebar */}
        <nav className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 sticky top-0 h-auto md:h-screen transition-colors duration-300">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">L</div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">LedgerPro</h1>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>

          <div className="space-y-1 flex-1">
            {[
              { id: 'DASHBOARD', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
              { id: 'TRANSACTIONS', label: 'Ledger', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { id: 'MEMBERS', label: 'Members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
              { id: 'AUDIT', label: 'Audit Trail', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 text-white shadow-xl">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest font-bold">Total Wallet</p>
              <p className="text-xl font-bold">{CURRENCY} {allTimeBalance.toLocaleString()}</p>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {activeTab === 'DASHBOARD' && 'Dashboard'}
                {activeTab === 'TRANSACTIONS' && 'Ledger'}
                {activeTab === 'MEMBERS' && 'Members'}
                {activeTab === 'AUDIT' && 'Audit Trail'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {selectedMonth === 'ALL' ? `Viewing all records for ${selectedYear}` : `Viewing ${MONTHS[selectedMonth as number]} ${selectedYear}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button 
                onClick={() => { setEditingTx(null); setIsTxModalOpen(true); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Entry
              </button>
            </div>
          </header>

          {/* Month Selector Ribbon */}
          <div className="flex overflow-x-auto pb-4 gap-2 mb-8 no-scrollbar scroll-smooth">
            <button
              onClick={() => setSelectedMonth('ALL')}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              All Year
            </button>
            {MONTHS.map((month, idx) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(idx)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedMonth === idx
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {month}
              </button>
            ))}
          </div>

          {activeTab === 'DASHBOARD' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label="Inflow" 
                  value={`${CURRENCY} ${periodTotals.income.toLocaleString()}`} 
                  icon={<svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>}
                  colorClass="bg-emerald-50 dark:bg-emerald-900/20"
                />
                <StatCard 
                  label="Outflow" 
                  value={`${CURRENCY} ${periodTotals.expense.toLocaleString()}`} 
                  icon={<svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>}
                  colorClass="bg-rose-50 dark:bg-rose-900/20"
                />
                <StatCard 
                  label="Net Flow" 
                  value={`${CURRENCY} ${periodTotals.balance.toLocaleString()}`} 
                  icon={<svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  colorClass="bg-blue-50 dark:bg-blue-900/20"
                />
              </div>

              {/* Cash Flow Chart */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6">Annual Cash Flow - {selectedYear}</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#1e293b" : "#f1f5f9"} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{backgroundColor: darkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', color: darkMode ? '#fff' : '#000'}}
                        itemStyle={{color: darkMode ? '#fff' : '#000'}}
                        cursor={{fill: darkMode ? '#1e293b' : '#f8fafc'}}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} name="In" />
                      <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} name="Out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Insights */}
                <div className="bg-indigo-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden flex flex-col min-h-[200px]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 rounded-full -mr-10 -mt-10 opacity-50 blur-3xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="p-2 bg-indigo-600 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </span>
                      <h3 className="font-bold uppercase tracking-widest text-xs">PKR Financial Analysis</h3>
                    </div>
                    <p className="text-indigo-50 text-base leading-relaxed mb-6 font-medium italic">
                      "{insights}"
                    </p>
                  </div>
                </div>

                {/* Top Members */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white">Contributions (All Time)</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {memberContributions.sort((a,b) => b.total - a.total).slice(0, 5).map(m => (
                        <div key={m.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{m.name}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{CURRENCY}{m.total.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-1000" 
                              style={{ width: `${(m.total / (transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 1) || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      {members.length === 0 && <p className="text-sm text-slate-400 italic">No members added yet.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TRANSACTIONS' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-4 duration-300 transition-colors duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative flex-1 w-full md:w-auto">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Search this period..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-slate-200"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {filteredTransactions.length} items listed
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{t.date}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t.description}</div>
                          {t.memberId && (
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                              From: {members.find(m => m.id === t.memberId)?.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold uppercase">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            t.type === 'INCOME' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {t.type === 'INCOME' ? '+' : '-'}{CURRENCY}{t.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => { setEditingTx(t); setIsTxModalOpen(true); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No records found for this selection.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'MEMBERS' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-end">
                <button 
                  onClick={handleAddMember}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Add Member
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {memberContributions.map(member => (
                  <div key={member.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {member.name.charAt(0)}
                      </div>
                      <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold uppercase">
                        {member.status}
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">{member.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{member.email}</p>
                    <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">All-time Contribution</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{CURRENCY}{member.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">No members in the database yet.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'AUDIT' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
               <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white">Audit History</h3>
               </div>
               <div className="divide-y divide-slate-50 dark:divide-slate-800">
                 {auditLog.length > 0 ? auditLog.map(log => (
                   <div key={log.id} className="p-4 flex gap-4 items-start hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                     <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                       log.action === 'CREATE' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
                       log.action === 'UPDATE' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                     }`}>
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                           log.action === 'CREATE' ? "M12 4v16m8-8H4" : 
                           log.action === 'UPDATE' ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"
                         } />
                       </svg>
                     </div>
                     <div className="flex-1">
                       <div className="flex justify-between items-start">
                         <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{log.details}</p>
                         <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-tighter">
                         {log.entity} • {new Date(log.timestamp).toLocaleDateString()}
                       </p>
                     </div>
                   </div>
                 )) : (
                   <div className="p-12 text-center text-slate-400 italic">No activity recorded for the current session.</div>
                 )}
               </div>
            </div>
          )}
        </main>

        <TransactionModal 
          isOpen={isTxModalOpen}
          onClose={() => { setIsTxModalOpen(false); setEditingTx(null); }}
          onSave={handleSaveTransaction}
          members={members}
          editData={editingTx}
        />
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
